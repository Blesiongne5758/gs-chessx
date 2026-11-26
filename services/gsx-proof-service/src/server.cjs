require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { getAddress, isAddress } = require('ethers');

const app = express();
const port = Number(process.env.PORT || 8787);
const proofFile = path.resolve(process.env.PROOF_FILE || './data/proofs.json');
const allowedOrigins = new Set((process.env.FRONTEND_ORIGINS || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean));

function loadProofData() {
  if (!fs.existsSync(proofFile)) throw new Error(`Proof file not found: ${proofFile}`);
  const data = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
  if (!/^0x[0-9a-fA-F]{64}$/.test(data.merkleRoot || '') || data.merkleRoot === `0x${'0'.repeat(64)}`) {
    throw new Error('Proof file must contain a non-zero Merkle root.');
  }
  if (!data.byAddress || typeof data.byAddress !== 'object') throw new Error('Proof file must contain byAddress.');
  return data;
}

function validateRecord(record, requestedAddress, root) {
  const index = String(record?.index || '');
  const account = String(record?.account || '');
  const amount = String(record?.amount || '');
  const proof = record?.proof;
  if (!/^\d+$/.test(index)) throw new Error('Invalid proof index.');
  if (!isAddress(account) || getAddress(account).toLowerCase() !== getAddress(requestedAddress).toLowerCase()) throw new Error('Proof account mismatch.');
  if (!/^\d+$/.test(amount) || amount === '0') throw new Error('Invalid proof amount.');
  if (!Array.isArray(proof) || proof.some((node) => !/^0x[0-9a-fA-F]{64}$/.test(node))) throw new Error('Invalid Merkle proof.');
  if (record.merkleRoot && record.merkleRoot.toLowerCase() !== root.toLowerCase()) throw new Error('Proof root mismatch.');
  return { index, account: getAddress(account), amount, proof, merkleRoot: root };
}

const proofData = loadProofData();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(cors({ origin(origin, callback) { callback(null, !origin || allowedOrigins.has(origin)); }, methods: ['GET', 'OPTIONS'], allowedHeaders: ['Accept', 'Content-Type'] }));
const limiter = rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.RATE_LIMIT_PER_MINUTE || 60), standardHeaders: 'draft-7', legacyHeaders: false, handler: (_request, response) => response.status(429).json({ eligible: false, reason: 'Too many eligibility requests. Try again later.' }) });

app.get('/health', (_request, response) => response.json({ ok: true, merkleRoot: proofData.merkleRoot }))
  .get('/eligibility', limiter, (request, response) => {
    const rawAddress = String(request.query.address || '').trim();
    if (!isAddress(rawAddress)) return response.status(400).json({ eligible: false, reason: 'A valid EVM wallet address is required.' });
    const records = proofData.byAddress[rawAddress.toLowerCase()] || [];
    if (!records.length) return response.json({ eligible: false, reason: 'This wallet is not included in the allocation.', merkleRoot: proofData.merkleRoot });
    try {
      const allocation = validateRecord(records[0], rawAddress, proofData.merkleRoot);
      response.set('Cache-Control', 'no-store');
      return response.json({ eligible: true, ...allocation });
    } catch {
      return response.status(500).json({ eligible: false, reason: 'Stored proof data failed server validation.' });
    }
  });

app.use((_request, response) => response.status(404).json({ error: 'Not found.' }));
app.use((error, _request, response, _next) => { console.error(error.message); response.status(500).json({ error: 'Internal server error.' }); });
app.listen(port, '127.0.0.1', () => console.log(`GSX proof service listening on 127.0.0.1:${port}`));
