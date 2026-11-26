const fs = require('node:fs');
const path = require('node:path');
const hre = require('hardhat');
const { parseUnits, formatUnits, ZeroHash } = require('ethers');

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function uint64(name, fallback = '0') {
  const value = process.env[name] || fallback;
  if (!/^\d+$/.test(value) || BigInt(value) > 18446744073709551615n) {
    throw new Error(`${name} must be an unsigned uint64 value.`);
  }
  return BigInt(value);
}

function bytes32(name, value) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value) || value.toLowerCase() === ZeroHash) {
    throw new Error(`${name} must be a non-zero bytes32 Merkle root.`);
  }
  return value;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const name = process.env.GSX_NAME || 'GSX Meme Coin';
  const symbol = process.env.GSX_SYMBOL || 'GSX';
  const decimals = process.env.GSX_DECIMALS || '18';
  const root = bytes32('GSX_INITIAL_ROOT', required('GSX_INITIAL_ROOT'));
  const displaySupply = required('GSX_INITIAL_SUPPLY');
  if (!/^\d+(\.\d+)?$/.test(displaySupply)) throw new Error('GSX_INITIAL_SUPPLY must be a decimal token amount.');
  const initialSupply = parseUnits(displaySupply, decimals);
  const claimStart = uint64('GSX_CLAIM_START');
  const claimEnd = uint64('GSX_CLAIM_END');
  if (claimEnd !== 0n && claimEnd <= claimStart) throw new Error('GSX_CLAIM_END must be greater than GSX_CLAIM_START.');

  const constructorArgs = [name, symbol, initialSupply, root, claimStart, claimEnd];
  console.log(JSON.stringify({ network: network.name, chainId: network.chainId.toString(), deployer: deployer.address, name, symbol, decimals, initialSupply: initialSupply.toString(), root, claimStart: claimStart.toString(), claimEnd: claimEnd.toString() }, null, 2));

  const Factory = await hre.ethers.getContractFactory('GSXTokenMerkle');
  const contract = await Factory.deploy(...constructorArgs);
  const deploymentTx = contract.deploymentTransaction();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const onChainRoot = await contract.merkleRoot();
  const onChainSupply = await contract.maxSupply();
  const contractBalance = await contract.balanceOf(address);

  if (onChainRoot.toLowerCase() !== root.toLowerCase()) throw new Error('On-chain root mismatch.');
  if (onChainSupply !== initialSupply || contractBalance !== initialSupply) throw new Error('On-chain supply checks failed.');

  const outputDir = path.resolve('deployments');
  fs.mkdirSync(outputDir, { recursive: true });
  const metadata = { network: network.name, chainId: network.chainId.toString(), address, owner: await contract.owner(), deploymentTx: deploymentTx.hash, constructorArgs: constructorArgs.map((value) => value.toString()), merkleRoot: onChainRoot, maxSupply: onChainSupply.toString(), contractBalance: contractBalance.toString(), displaySupply: formatUnits(contractBalance, decimals) };
  fs.writeFileSync(path.join(outputDir, `gsx-${network.name}.json`), `${JSON.stringify(metadata, null, 2)}\n`);
  fs.writeFileSync(path.resolve('scripts/verify/gsx-constructor-args.cjs'), `module.exports = ${JSON.stringify(metadata.constructorArgs, null, 2)};\n`);
  console.log(JSON.stringify(metadata, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
