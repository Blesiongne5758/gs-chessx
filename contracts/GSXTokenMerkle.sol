// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title GSX Meme Coin + Merkle Distributor
/// @notice Fixed-supply ERC-20. All tokens start in this contract and can be claimed
///         only with an owner-published Merkle root. The contract never holds user keys.
contract GSXTokenMerkle is ERC20, Ownable, Pausable, ReentrancyGuard {
    uint256 public immutable maxSupply;
    bytes32 public merkleRoot;
    uint64 public claimStart;
    uint64 public claimEnd;

    mapping(uint256 => bool) public claimed;

    event MerkleRootUpdated(bytes32 indexed previousRoot, bytes32 indexed newRoot);
    event ClaimWindowUpdated(uint64 start, uint64 end);
    event Claimed(uint256 indexed index, address indexed account, uint256 amount);
    event UnclaimedRecovered(address indexed to, uint256 amount);

    error InvalidSupply();
    error InvalidRoot();
    error InvalidWindow();
    error ClaimNotStarted();
    error ClaimEnded();
    error AlreadyClaimed();
    error InvalidProof();

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        bytes32 initialRoot_,
        uint64 claimStart_,
        uint64 claimEnd_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        if (initialSupply_ == 0) revert InvalidSupply();
        _validateWindow(claimStart_, claimEnd_);

        maxSupply = initialSupply_;
        merkleRoot = initialRoot_;
        claimStart = claimStart_;
        claimEnd = claimEnd_;
        _mint(address(this), initialSupply_);
    }

    function setMerkleRoot(bytes32 newRoot) external onlyOwner {
        if (newRoot == bytes32(0)) revert InvalidRoot();
        emit MerkleRootUpdated(merkleRoot, newRoot);
        merkleRoot = newRoot;
    }

    function setClaimWindow(uint64 newStart, uint64 newEnd) external onlyOwner {
        _validateWindow(newStart, newEnd);
        claimStart = newStart;
        claimEnd = newEnd;
        emit ClaimWindowUpdated(newStart, newEnd);
    }

    function claim(
        uint256 index,
        address account,
        uint256 amount,
        bytes32[] calldata proof
    ) external nonReentrant whenNotPaused {
        if (claimStart != 0 && block.timestamp < claimStart) revert ClaimNotStarted();
        if (claimEnd != 0 && block.timestamp > claimEnd) revert ClaimEnded();
        if (claimed[index]) revert AlreadyClaimed();

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))));
        if (!MerkleProof.verifyCalldata(proof, merkleRoot, leaf)) revert InvalidProof();

        claimed[index] = true;
        _transfer(address(this), account, amount);
        emit Claimed(index, account, amount);
    }

    /// @notice Recover remaining distribution tokens only after the claim window closes.
    function recoverUnclaimed(address to, uint256 amount) external onlyOwner {
        if (claimEnd == 0 || block.timestamp <= claimEnd) revert ClaimEnded();
        _transfer(address(this), to, amount);
        emit UnclaimedRecovered(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _validateWindow(uint64 start, uint64 end) internal pure {
        if (end != 0 && end <= start) revert InvalidWindow();
    }

    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
}
