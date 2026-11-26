const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('csv-parse/sync');
const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
const { getAddress, isAddress } = require('ethers');

const inputPath = path.resolve(process.env.MERKLE_INPUT || 'merkle/allocations.csv');
const outputDir = path.resolve(process.env.MERKLE_OUTPUT_DIR || 'merkle');
const treePath = path.join(outputDir, 'tree.json');
const proofsPath = path.join(outputDir, 'proofs.json');
const rootPath = path.join(outputDir, 'root.txt');

function fail(message) {
  throw new Error(message);
}

function readRows() {
  if (!fs.existsSync(inputPath)) fail(`CSV file not found: ${inputPath}`);
  const rows = parse(fs.readFileSync(inputPath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  if (!rows.length) fail('CSV allocation file is empty.');
  return rows;
}

function normalizeRows(rows) {
  const indexes = new Set();
  const allocations = rows.map((row, position) => {
    const index = String(row.index || '').trim();
    const rawAccount = String(row.account || '').trim();
    const amount = String(row.amount || '').trim();
    const line = position + 2;

    if (!/^\d+$/.test(index)) fail(`Invalid index at CSV row ${line}.`);
    if (!isAddress(rawAccount)) fail(`Invalid EVM address at CSV row ${line}.`);
    if (!/^\d+$/.test(amount) || amount === '0') {
      fail(`Amount must be a positive base-unit integer at CSV row ${line}.`);
    }
    if (indexes.has(index)) fail(`Duplicate allocation index: ${index}`);
    indexes.add(index);

    return { index, account: getAddress(rawAccount), amount };
  });

  allocations.sort((a, b) => (BigInt(a.index) < BigInt(b.index) ? -1 : 1));
  return allocations;
}

function buildOutputs(allocations) {
  const values = allocations.map(({ index, account, amount }) => [index, account, amount]);
  const tree = StandardMerkleTree.of(values, ['uint256', 'address', 'uint256']);
  const records = allocations.map((allocation, position) => ({
    ...allocation,
    proof: tree.getProof(position),
    merkleRoot: tree.root,
  }));
  const byAddress = {};
  for (const record of records) {
    const key = record.account.toLowerCase();
    if (!byAddress[key]) byAddress[key] = [];
    byAddress[key].push(record);
  }
  const total = allocations.reduce((sum, item) => sum + BigInt(item.amount), 0n);
  return {
    tree,
    root: tree.root,
    treeOutput: {
      merkleRoot: tree.root,
      totalAllocations: allocations.length,
      totalAmountBaseUnits: total.toString(),
      types: ['uint256', 'address', 'uint256'],
      allocations,
      tree: tree.dump(),
    },
    proofsOutput: { merkleRoot: tree.root, records, byAddress },
  };
}

function main() {
  const allocations = normalizeRows(readRows());
  const { root, treeOutput, proofsOutput } = buildOutputs(allocations);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(treePath, `${JSON.stringify(treeOutput, null, 2)}\n`);
  fs.writeFileSync(proofsPath, `${JSON.stringify(proofsOutput, null, 2)}\n`);
  fs.writeFileSync(rootPath, `${root}\n`);
  console.log(JSON.stringify({ root, allocations: allocations.length, treePath, proofsPath, rootPath }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`Merkle generation failed: ${error.message}`);
  process.exitCode = 1;
}
