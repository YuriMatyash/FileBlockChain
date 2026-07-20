// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PrintToken
/// @notice ERC20 reward token for PrintChain participation rewards.
/// @dev PRINT is a reward/loyalty token; marketplace purchases are intended to use ETH in later phases.
// creates the ERC20 token of the project. 
// name: PrintToken, symbol: PRINT, type: ERC20, role: reward token for PrintChain participation rewards, owner: deployer of the contract
// PRINT is not used to buy NFTs in the marketplace, but is a reward/loyalty token for participants of PrintChain.
contract PrintToken is ERC20, Ownable {
    /// @notice Marketplace address authorized to mint automatic buyer rewards.
    address public rewardMinter;

    event RewardMinterUpdated(address indexed previousRewardMinter, address indexed newRewardMinter);

    error UnauthorizedRewardMinter(address caller);

    constructor(uint256 initialSupply) ERC20("PrintToken", "PRINT") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    /// @notice Set the marketplace (or another trusted reward service) allowed to mint PRINT rewards.
    /// @dev The owner retains manual reward minting rights after this address is configured.
    function setRewardMinter(address newRewardMinter) external onlyOwner {
        address previousRewardMinter = rewardMinter;
        rewardMinter = newRewardMinter;
        emit RewardMinterUpdated(previousRewardMinter, newRewardMinter);
    }

    /// @notice Mint PRINT reward tokens to a participant.
    /// @dev Only the owner or configured marketplace reward minter can mint; PRINT is never purchase currency.
    /// @param to Reward recipient address.
    /// @param amount Amount of PRINT tokens to mint, denominated in wei-style token units.
    function mintReward(address to, uint256 amount) external {
        if (msg.sender != owner() && msg.sender != rewardMinter) {
            revert UnauthorizedRewardMinter(msg.sender);
        }
        _mint(to, amount);
    }
}
