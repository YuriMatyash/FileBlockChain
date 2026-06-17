// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PrintToken
/// @notice ERC20 reward token for PrintChain participation rewards.
/// @dev PRINT is a reward/loyalty token; marketplace purchases are intended to use ETH in later phases.
contract PrintToken is ERC20, Ownable {
    constructor(uint256 initialSupply) ERC20("PrintToken", "PRINT") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    /// @notice Mint PRINT reward tokens to a participant.
    /// @param to Reward recipient address.
    /// @param amount Amount of PRINT tokens to mint, denominated in wei-style token units.
    function mintReward(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
