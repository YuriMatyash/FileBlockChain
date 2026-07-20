// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// This is the marketplace contract.
// It handles:
// listing NFTs for sale
// canceling listings
// buying listed NFTs with ETH
// splitting ETH payment
// transferring NFT ownership
// triggering sale history recording

// 10% of each marketplace sale goes to the original creator
// 90% goes to the current seller

// Minimal interface for the NFT contract.
// The marketplace only needs ownership checks, license info, and controlled transfers.
interface IPrintLicenseNFT {
    // Mirrors the LicenseInfo struct from PrintLicenseNFT.
    // The marketplace mainly needs creator to calculate the 10% royalty recipient.
    struct LicenseInfo {
        uint256 tokenId;
        address creator;
        string title;
        string description;
        string fileCid;
        string metadataCid;
        uint256 createdAt;
        uint256 initialPrice;
    }

    // Returns the current owner of a license NFT.
    function ownerOf(uint256 tokenId) external view returns (address);
    // Returns metadata and creator information for royalty calculation.
    function getLicenseInfo(uint256 tokenId) external view returns (LicenseInfo memory);
    // Transfers the NFT through the controlled marketplace flow and records SALE history.
    function controlledTransferFrom(address from, address to, uint256 tokenId, uint256 price, string calldata actionType) external;
}

/// @dev Minimal PRINT reward token interface. ETH remains the marketplace purchase currency.
interface IPrintToken {
    function mintReward(address to, uint256 amount) external;
}

/// @title PrintMarketplace
/// @notice ETH marketplace for PrintChain manufacturing/use license NFTs.
/// @dev PRINT is not used as purchase currency. This marketplace enforces a 10% creator royalty on each sale.
contract PrintMarketplace is ReentrancyGuard {
    // Represents one active marketplace listing.
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        uint256 listedAt;
        bool active;
    }

    // Royalty is represented in basis points.
    // 10,000 basis points = 100%.
    // 1,000 basis points = 10%.
    uint96 public constant ROYALTY_BASIS_POINTS = 1_000;
    uint96 public constant BASIS_POINTS = 10_000;
    // One whole PRINT token in the ERC20's 18-decimal units. This is a buyer reward, not payment.
    uint256 public constant BUYER_REWARD_AMOUNT = 1 ether;

    IPrintLicenseNFT public immutable licenseNFT;
    IPrintToken public immutable printToken;

    // listing storage:
    // tokenId => listing data.
    mapping(uint256 tokenId => Listing) private _listings;
    // List of token IDs that currently have active listings.
    uint256[] private _activeTokenIds;
    // tokenId => index in _activeTokenIds plus one.
    // Using plus one lets zero mean "not active".
    mapping(uint256 tokenId => uint256) private _activeTokenIndexPlusOne;

    // Emitted when an owner lists a license NFT for sale.
    event LicenseListed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 timestamp);
    // Emitted when a seller cancels an active listing.
    event LicenseDelisted(uint256 indexed tokenId, address indexed seller, uint256 timestamp);
    // Emitted when a listed license NFT is bought.
    event LicenseSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 royaltyAmount,
        uint256 timestamp
    );
    // Emitted only after a successful ETH marketplace purchase mints its buyer reward.
    event BuyerRewardMinted(address indexed buyer, uint256 indexed tokenId, uint256 amount);

    // Custom errors define precise failure reasons
    error NotLicenseOwner(uint256 tokenId, address caller);
    error ZeroPrice();
    error AlreadyListed(uint256 tokenId);
    error NotListed(uint256 tokenId);
    error NotListingSeller(uint256 tokenId, address caller);
    error CannotBuyOwnListing(uint256 tokenId);
    error IncorrectEthAmount(uint256 expected, uint256 actual);
    error EthTransferFailed(address recipient, uint256 amount);

    // Stores the NFT contract address so this marketplace can check ownership,
    // read creator information, and transfer NFTs through the controlled flow.
    constructor(address licenseNFTAddress, address printTokenAddress) {
        licenseNFT = IPrintLicenseNFT(licenseNFTAddress);
        printToken = IPrintToken(printTokenAddress);
    }

    /// @notice List a license NFT for sale in ETH.
    // Lists a license NFT for sale in ETH.
    // Only the current NFT owner can list, and the price must be greater than zero.
    function listLicense(uint256 tokenId, uint256 price) external {
        if (price == 0) {   // Listing for zero ETH is not allowed.
            revert ZeroPrice();
        }

        address owner = licenseNFT.ownerOf(tokenId);    // Only the current NFT owner is allowed to create a listing.
        if (owner != msg.sender) {
            revert NotLicenseOwner(tokenId, msg.sender);
        }

        if (_listings[tokenId].active) {    // Prevent duplicate active listings for the same token.
            revert AlreadyListed(tokenId);
        }

        _listings[tokenId] = Listing({  // Store the listing on-chain with seller, price, timestamp, and active status.
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            listedAt: block.timestamp,
            active: true
        });
        // Track this tokenId in the active listings array so the frontend can fetch all listings.
        _activeTokenIndexPlusOne[tokenId] = _activeTokenIds.length + 1;
        _activeTokenIds.push(tokenId);

        emit LicenseListed(tokenId, msg.sender, price, block.timestamp);
    }

    /// @notice Cancel the caller's active listing.
    // Cancels an active listing.
    // Only the seller who created the listing can cancel it.
    function cancelListing(uint256 tokenId) external {
        Listing memory listing = _listings[tokenId];    // Load the listing and verify it is currently active.
        if (!listing.active) {
            revert NotListed(tokenId);
        }
        if (listing.seller != msg.sender) { // Only the original listing seller may cancel the listing.
            revert NotListingSeller(tokenId, msg.sender);
        }

        _clearListing(tokenId); // Remove listing state and active-listing tracking.

        emit LicenseDelisted(tokenId, msg.sender, block.timestamp);
    }

    /// @notice Buy a listed license NFT with exact ETH payment.
    // Buys a listed license NFT using exact ETH payment.
    // Splits payment as 10% to the original creator and 90% to the current seller.
    function buyLicense(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = _listings[tokenId];    // Load active listing and validate that it can be bought.
        if (!listing.active) {
            revert NotListed(tokenId);
        }
        if (listing.seller == msg.sender) { // Seller cannot buy their own listing.
            revert CannotBuyOwnListing(tokenId);
        }
        if (msg.value != listing.price) {   // Buyer must send exactly the listing price in ETH.
            revert IncorrectEthAmount(listing.price, msg.value);
        }

        // Read the original creator from the NFT contract for royalty payment.
        IPrintLicenseNFT.LicenseInfo memory info = licenseNFT.getLicenseInfo(tokenId);
        // Calculate the 10% creator royalty and 90% seller amount.
        uint256 royaltyAmount = (listing.price * ROYALTY_BASIS_POINTS) / BASIS_POINTS;
        uint256 sellerAmount = listing.price - royaltyAmount;

        _clearListing(tokenId);
        licenseNFT.controlledTransferFrom(listing.seller, msg.sender, tokenId, listing.price, "SALE");

        _sendEth(info.creator, royaltyAmount);
        _sendEth(listing.seller, sellerAmount);

        // Purchases are paid in ETH. PRINT is minted separately as a 1 PRINT buyer loyalty reward.
        printToken.mintReward(msg.sender, BUYER_REWARD_AMOUNT);

        emit LicenseSold(tokenId, listing.seller, msg.sender, listing.price, royaltyAmount, block.timestamp);
        emit BuyerRewardMinted(msg.sender, tokenId, BUYER_REWARD_AMOUNT);
    }

    // Returns the listing data for a specific tokenId.
    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return _listings[tokenId];
    }

    // Returns all currently active marketplace listings.
    function getActiveListings() external view returns (Listing[] memory activeListings) {
        activeListings = new Listing[](_activeTokenIds.length);
        for (uint256 i = 0; i < _activeTokenIds.length; i++) {
            activeListings[i] = _listings[_activeTokenIds[i]];
        }
    }

    // Internal helper that removes a token from listing storage and active listing tracking.
    function _clearListing(uint256 tokenId) internal {
        delete _listings[tokenId];  // Delete listing data from the mapping.

        // If the token is tracked as active, remove it from the active token array.
        uint256 indexPlusOne = _activeTokenIndexPlusOne[tokenId];
        if (indexPlusOne != 0) {
            uint256 index = indexPlusOne - 1;
            uint256 lastIndex = _activeTokenIds.length - 1;

            // Swap-and-pop removal keeps array deletion gas-efficient.
            if (index != lastIndex) {
                uint256 lastTokenId = _activeTokenIds[lastIndex];
                _activeTokenIds[index] = lastTokenId;
                _activeTokenIndexPlusOne[lastTokenId] = index + 1;
            }

            _activeTokenIds.pop();
            delete _activeTokenIndexPlusOne[tokenId];
        }
    }

    // Internal helper for sending ETH to creator/seller.
    // Reverts the whole transaction if payment fails. 
    function _sendEth(address recipient, uint256 amount) internal {
        if (amount == 0) {  // Skip zero-value transfers.
            return;
        }

        // Send ETH using call, the recommended low-level ETH transfer pattern.
        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) {
            revert EthTransferFailed(recipient, amount);
        }
    }
}
