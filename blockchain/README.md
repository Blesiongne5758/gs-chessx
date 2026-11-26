# GSX blockchain implementation

Dokumen ini menjelaskan workflow reproducible untuk GSXTokenMerkle tanpa menjalankan deployment atau transaksi dari repository.

## Komponen

- `contracts/GSXTokenMerkle.sol`: fixed-supply ERC-20 + Merkle claim.
- `scripts/merkle/generate-merkle.cjs`: CSV → `tree.json`, `proofs.json`, `root.txt`.
- `hardhat.config.cjs`: compiler 0.8.24, optimizer 200, local/Sepolia, Etherscan.
- `test/GSXTokenMerkle.cjs`: test constructor, proof, fake proof, double-claim, pause, root, window, owner, recovery.
- `scripts/deploy/deploy-gsx.cjs`: deploy only when operator explicitly runs it; refuses zero root and writes deployment metadata.
- `scripts/verify/verify-gsx.cjs`: verify an existing deployment through Hardhat/Etherscan.
- `services/gsx-proof-service`: Express read-only proof API.
- `services/gsx-proof-service/nginx/gsx-proof.conf`: TLS reverse proxy, CORS allowlist, rate limiting, no-store.
- `src/lib/claim.js`: frontend eligibility reader; no transaction write.

## Local setup

```bash
npm install
cp merkle/allocations.example.csv merkle/allocations.csv
npm run merkle:generate
npm run hardhat:compile
npm run hardhat:test
```

`merkle/allocations.csv`, generated proof files, deployment metadata, `.env`, and private keys are ignored by Git. Replace the example allocation data before any real campaign.

## Merkle contract compatibility

The generator uses OpenZeppelin `StandardMerkleTree` with:

```text
['uint256', 'address', 'uint256']
```

The resulting leaf is compatible with:

```solidity
keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))))
```

`amount` must be an unsigned integer in token base units. With 18 decimals, `1 GSX` is `1000000000000000000`.

## Testnet deployment, not automatic

After independently reviewing the dataset and choosing a network, set server-side variables in a local `.env` or secret manager:

```env
SEPOLIA_RPC_URL=https://...
DEPLOYER_PRIVATE_KEY=...
ETHERSCAN_API_KEY=...
GSX_INITIAL_ROOT=0x...
GSX_INITIAL_SUPPLY=1000000000
GSX_CLAIM_START=0
GSX_CLAIM_END=0
```

Then, only by explicit operator action:

```bash
npx hardhat run scripts/deploy/deploy-gsx.cjs --network sepolia
```

The script validates the non-zero root, converts display supply to base units, checks the on-chain root/supply/balance, and writes `deployments/gsx-sepolia.json` plus constructor args. It does not run automatically.

Verify after explorer indexing:

```bash
npx hardhat run scripts/verify/verify-gsx.cjs --network sepolia
```

Never put `DEPLOYER_PRIVATE_KEY` or `ETHERSCAN_API_KEY` in `VITE_*` variables.

## Proof service

Generate `merkle/proofs.json`, then copy it to the service data directory as `data/proofs.json` in the service deployment environment. Start locally:

```bash
npm install --prefix services/gsx-proof-service
FRONTEND_ORIGINS=http://localhost:5173 \
PROOF_FILE=$PWD/merkle/proofs.json \
npm --prefix services/gsx-proof-service start
```

The service exposes:

- `GET /health`
- `GET /eligibility?address=0x...`

It validates address, index, amount, proof node format, and root consistency. It returns no private key and does not sign or broadcast transactions. The service refuses a zero Merkle root and uses a per-IP rate limit.

## Nginx

Use the supplied Nginx template with a real TLS certificate and replace example domains. Nginx handles the edge CORS allowlist, `limit_req`, connection limiting, HTTPS redirect, and `Cache-Control: no-store`. Express remains responsible for proof data validation. Do not configure conflicting CORS headers in both layers.

Validate before reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Frontend boundary

The frontend reads proof data and can perform local preflight checks. It must compare the proof-service root with the configured/on-chain root and later read `claimed(index)` before presenting a claim option. The current GS-ChessX UI remains read-only: it does not call `claim`, request token approval, sign a claim, or broadcast a transaction.

A future write integration requires a deployed and independently reviewed address, final root, verified source, testnet validation, explicit user wallet approval, and a product decision about whether `msg.sender` must equal `account`.

## Operational checklist

1. Review and checksum the CSV dataset.
2. Generate and review the root/proofs.
3. Run Hardhat compile and tests.
4. Deploy to a testnet only through an operator-controlled command.
5. Verify source and constructor arguments.
6. Confirm on-chain `merkleRoot`, `maxSupply`, owner, and contract balance.
7. Deploy proof service with the same root and HTTPS.
8. Configure frontend public values only after the address is verified.
9. Keep owner key in a multisig or dedicated operations wallet.
10. Never deploy, sign, approve, transfer, or claim from CI without a separate explicit authorization and review.
