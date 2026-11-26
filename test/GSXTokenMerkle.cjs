const { expect } = require('chai');
const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
const { ethers } = require('hardhat');

function fixtureValues(accounts) {
  return [
    ['0', accounts[0].address, ethers.parseUnits('100', 18).toString()],
    ['1', accounts[1].address, ethers.parseUnits('250', 18).toString()],
    ['2', accounts[2].address, ethers.parseUnits('50', 18).toString()],
  ];
}

describe('GSXTokenMerkle', function () {
  let factory;
  let token;
  let owner;
  let claimant;
  let second;
  let outsider;
  let tree;
  let values;
  let allocation;
  let proof;
  const supply = ethers.parseUnits('1000000', 18);

  beforeEach(async function () {
    [owner, claimant, second, outsider] = await ethers.getSigners();
    values = fixtureValues([claimant, second, outsider]);
    tree = StandardMerkleTree.of(values, ['uint256', 'address', 'uint256']);
    allocation = values[0];
    proof = tree.getProof(0);
    factory = await ethers.getContractFactory('GSXTokenMerkle');
    token = await factory.deploy('GSX Meme Coin', 'GSX', supply, tree.root, 0, 0);
    await token.waitForDeployment();
  });

  it('mints all fixed supply to the contract and sets owner/root', async function () {
    const address = await token.getAddress();
    expect(await token.totalSupply()).to.equal(supply);
    expect(await token.maxSupply()).to.equal(supply);
    expect(await token.balanceOf(address)).to.equal(supply);
    expect(await token.owner()).to.equal(owner.address);
    expect(await token.merkleRoot()).to.equal(tree.root);
  });

  it('claims a valid allocation and marks its index', async function () {
    const [index, account, amount] = allocation;
    await expect(token.connect(claimant).claim(index, account, amount, proof))
      .to.emit(token, 'Claimed').withArgs(index, account, amount);
    expect(await token.balanceOf(claimant.address)).to.equal(BigInt(amount));
    expect(await token.claimed(index)).to.equal(true);
  });

  it('rejects a fake proof', async function () {
    const fakeProof = [...proof];
    fakeProof[0] = ethers.keccak256(ethers.toUtf8Bytes('fake-proof'));
    const [index, account, amount] = allocation;
    await expect(token.claim(index, account, amount, fakeProof))
      .to.be.revertedWithCustomError(token, 'InvalidProof');
  });

  it('rejects manipulated index, account, or amount', async function () {
    const [, account, amount] = allocation;
    await expect(token.claim('99', account, amount, proof)).to.be.revertedWithCustomError(token, 'InvalidProof');
    await expect(token.claim('0', second.address, amount, proof)).to.be.revertedWithCustomError(token, 'InvalidProof');
    await expect(token.claim('0', account, ethers.parseUnits('101', 18), proof)).to.be.revertedWithCustomError(token, 'InvalidProof');
  });

  it('rejects a double claim', async function () {
    await token.connect(claimant).claim(...allocation, proof);
    await expect(token.connect(claimant).claim(...allocation, proof))
      .to.be.revertedWithCustomError(token, 'AlreadyClaimed');
  });

  it('enforces pause and owner-only controls', async function () {
    await expect(token.connect(claimant).pause()).to.be.revertedWithCustomError(token, 'OwnableUnauthorizedAccount');
    await token.pause();
    await expect(token.connect(claimant).claim(...allocation, proof)).to.be.revertedWithCustomError(token, 'EnforcedPause');
    await token.unpause();
    await expect(token.connect(claimant).claim(...allocation, proof)).to.emit(token, 'Claimed');
  });

  it('updates root and rejects proofs from the previous root', async function () {
    const newTree = StandardMerkleTree.of([['0', claimant.address, ethers.parseUnits('1', 18).toString()]], ['uint256', 'address', 'uint256']);
    await expect(token.setMerkleRoot(newTree.root)).to.emit(token, 'MerkleRootUpdated').withArgs(tree.root, newTree.root);
    await expect(token.claim(...allocation, proof)).to.be.revertedWithCustomError(token, 'InvalidProof');
    await expect(token.setMerkleRoot(ethers.ZeroHash)).to.be.revertedWithCustomError(token, 'InvalidRoot');
  });

  it('enforces claim window', async function () {
    const block = await ethers.provider.getBlock('latest');
    const futureStart = block.timestamp + 3600;
    const future = await factory.deploy('GSX Meme Coin', 'GSX', supply, tree.root, futureStart, 0);
    await future.waitForDeployment();
    await expect(future.connect(claimant).claim(...allocation, proof)).to.be.revertedWithCustomError(future, 'ClaimNotStarted');

    const expiring = await factory.deploy('GSX Meme Coin', 'GSX', supply, tree.root, 0, block.timestamp + 100);
    await expiring.waitForDeployment();
    await ethers.provider.send('evm_setNextBlockTimestamp', [block.timestamp + 101]);
    await ethers.provider.send('evm_mine');
    await expect(expiring.connect(claimant).claim(...allocation, proof)).to.be.revertedWithCustomError(expiring, 'ClaimEnded');
  });

  it('validates window updates and owner access', async function () {
    await expect(token.connect(claimant).setClaimWindow(1, 2)).to.be.revertedWithCustomError(token, 'OwnableUnauthorizedAccount');
    await expect(token.setClaimWindow(2, 1)).to.be.revertedWithCustomError(token, 'InvalidWindow');
    await expect(token.setClaimWindow(100, 200)).to.emit(token, 'ClaimWindowUpdated').withArgs(100, 200);
  });

  it('recovers tokens only after a non-zero claim end', async function () {
    await expect(token.recoverUnclaimed(owner.address, 1)).to.be.revertedWithCustomError(token, 'ClaimEnded');
    const block = await ethers.provider.getBlock('latest');
    const expiring = await factory.deploy('GSX Meme Coin', 'GSX', supply, tree.root, 0, block.timestamp + 100);
    await expiring.waitForDeployment();
    await ethers.provider.send('evm_setNextBlockTimestamp', [block.timestamp + 101]);
    await ethers.provider.send('evm_mine');
    const before = await expiring.balanceOf(owner.address);
    const amount = ethers.parseUnits('10', 18);
    await expect(expiring.recoverUnclaimed(owner.address, amount)).to.emit(expiring, 'UnclaimedRecovered').withArgs(owner.address, amount);
    expect(await expiring.balanceOf(owner.address)).to.equal(before + amount);
  });
});
