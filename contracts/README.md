# GSX Meme Coin + Merkle Claim

`GSXTokenMerkle.sol` is a fixed-supply ERC-20 distribution contract. It uses OpenZeppelin Contracts v5 imports and is intended to be compiled with Solidity `0.8.24` or newer in the `0.8.x` range.

## Security model

- The entire fixed supply is minted to the contract at deployment; there is no public mint function.
- A claim is valid only for a Merkle leaf `keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))))`.
- `claimed[index]` prevents a proof from being replayed.
- The owner can update the root, pause claims, and configure an optional claim window.
- Remaining tokens can only be recovered after a non-zero claim window has closed.
- The contract never stores or handles private keys.

## Deployment parameters

```text
name             e.g. GSX Meme Coin
symbol           e.g. GSX
initialSupply    base units, e.g. 1_000_000_000 * 10**18
initialRoot      bytes32 Merkle root; must be non-zero before claims
claimStart       unix timestamp; 0 means immediately
claimEnd         unix timestamp; 0 means no expiry (then recovery is disabled)
```

Do not deploy with a placeholder root or unknown owner. Use a multisig or an explicitly reviewed operations wallet for ownership. Verify the source on the target explorer and test on a testnet first.

## Merkle dataset

Each allocation record must contain a unique numeric `index`, a checksummed `account`, and an integer `amount` in token base units. Generate the root and proof using the exact double-hash leaf format above. Never accept a client-supplied amount without checking it against the server-owned allocation dataset.

## Frontend configuration

After deployment and independent review, configure:

```text
VITE_WALLET_CHAIN_NAME
VITE_WALLET_CHAIN_ID
VITE_MEMECOIN_SYMBOL=GSX
VITE_MEMECOIN_DECIMALS=18
VITE_MEMECOIN_CONTRACT=0x...
VITE_MEMECOIN_MERKLE_ROOT=0x...
VITE_MEMECOIN_PROOF_URL=https://your-trusted-api.example/gsx/eligibility
```

The application currently performs read-only eligibility checks. It does not deploy, sign, broadcast, or approve a token transaction.
