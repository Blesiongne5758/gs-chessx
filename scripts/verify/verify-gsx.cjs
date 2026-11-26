const fs = require('node:fs');
const path = require('node:path');
const hre = require('hardhat');

async function main() {
  const network = hre.network.name;
  const file = path.resolve('deployments', `gsx-${network}.json`);
  if (!fs.existsSync(file)) throw new Error(`Deployment metadata not found: ${file}`);
  const deployment = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`Verifying ${deployment.address} on ${network}...`);
  await hre.run('verify:verify', {
    address: deployment.address,
    constructorArguments: deployment.constructorArgs,
  });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
