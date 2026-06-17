// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPrintLicenseNFT {
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

    function ownerOf(uint256 tokenId) external view returns (address);
    function getLicenseInfo(uint256 tokenId) external view returns (LicenseInfo memory);
    function controlledTransferFrom(address from, address to, uint256 tokenId, uint256 price, string calldata actionType) external;
}

/// @title PrintMarketplace
/// @notice ETH marketplace for PrintChain manufacturing/use license NFTs.
/// @dev PRINT is not used as purchase currency. This marketplace enforces a 10% creator royalty on each sale.
contract PrintMarketplace is ReentrancyGuard {
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        uint256 listedAt;
        bool active;
    }

    uint96 public constant ROYALTY_BASIS_POINTS = 1_000;
    uint96 public constant BASIS_POINTS = 10_000;

    IPrintLicenseNFT public immutable licenseNFT;

    mapping(uint256 tokenId => Listing) private _listings;
    uint256[] private _activeTokenIds;
    mapping(uint256 tokenId => uint256) private _activeTokenIndexPlusOne;

    event LicenseListed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 timestamp);
    event LicenseDelisted(uint256 indexed tokenId, address indexed seller, uint256 timestamp);
    event LicenseSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 royaltyAmount,
        uint256 timestamp
    );

    error NotLicenseOwner(uint256 tokenId, address caller);
    error ZeroPrice();
    error AlreadyListed(uint256 tokenId);
    error NotListed(uint256 tokenId);
    error NotListingSeller(uint256 tokenId, address caller);
    error CannotBuyOwnListing(uint256 tokenId);
    error IncorrectEthAmount(uint256 expected, uint256 actual);
    error EthTransferFailed(address recipient, uint256 amount);

    constructor(address licenseNFTAddress) {
        licenseNFT = IPrintLicenseNFT(licenseNFTAddress);
    }

    /// @notice List a license NFT for sale in ETH.
    function listLicense(uint256 tokenId, uint256 price) external {
        if (price == 0) {
            revert ZeroPrice();
        }

        address owner = licenseNFT.ownerOf(tokenId);
        if (owner != msg.sender) {
            revert NotLicenseOwner(tokenId, msg.sender);
        }

        if (_listings[tokenId].active) {
            revert AlreadyListed(tokenId);
        }

        _listings[tokenId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            listedAt: block.timestamp,
            active: true
        });
        _activeTokenIndexPlusOne[tokenId] = _activeTokenIds.length + 1;
        _activeTokenIds.push(tokenId);

        emit LicenseListed(tokenId, msg.sender, price, block.timestamp);
    }

    /// @notice Cancel the caller's active listing.
    function cancelListing(uint256 tokenId) external {
        Listing memory listing = _listings[tokenId];
        if (!listing.active) {
            revert NotListed(tokenId);
        }
        if (listing.seller != msg.sender) {
            revert NotListingSeller(tokenId, msg.sender);
        }

        _clearListing(tokenId);

        emit LicenseDelisted(tokenId, msg.sender, block.timestamp);
    }

    /// @notice Buy a listed license NFT with exact ETH payment.
    function buyLicense(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = _listings[tokenId];
        if (!listing.active) {
            revert NotListed(tokenId);
        }
        if (listing.seller == msg.sender) {
            revert CannotBuyOwnListing(tokenId);
        }
        if (msg.value != listing.price) {
            revert IncorrectEthAmount(listing.price, msg.value);
        }

        IPrintLicenseNFT.LicenseInfo memory info = licenseNFT.getLicenseInfo(tokenId);
        uint256 royaltyAmount = (listing.price * ROYALTY_BASIS_POINTS) / BASIS_POINTS;
        uint256 sellerAmount = listing.price - royaltyAmount;

        _clearListing(tokenId);
        licenseNFT.controlledTransferFrom(listing.seller, msg.sender, tokenId, listing.price, "SALE");

        _sendEth(info.creator, royaltyAmount);
        _sendEth(listing.seller, sellerAmount);

        emit LicenseSold(tokenId, listing.seller, msg.sender, listing.price, royaltyAmount, block.timestamp);
    }

    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return _listings[tokenId];
    }

    function getActiveListings() external view returns (Listing[] memory activeListings) {
        activeListings = new Listing[](_activeTokenIds.length);
        for (uint256 i = 0; i < _activeTokenIds.length; i++) {
            activeListings[i] = _listings[_activeTokenIds[i]];
        }
    }

    function _clearListing(uint256 tokenId) internal {
        delete _listings[tokenId];

        uint256 indexPlusOne = _activeTokenIndexPlusOne[tokenId];
        if (indexPlusOne != 0) {
            uint256 index = indexPlusOne - 1;
            uint256 lastIndex = _activeTokenIds.length - 1;

            if (index != lastIndex) {
                uint256 lastTokenId = _activeTokenIds[lastIndex];
                _activeTokenIds[index] = lastTokenId;
                _activeTokenIndexPlusOne[lastTokenId] = index + 1;
            }

            _activeTokenIds.pop();
            delete _activeTokenIndexPlusOne[tokenId];
        }
    }

    function _sendEth(address recipient, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) {
            revert EthTransferFailed(recipient, amount);
        }
    }
}
