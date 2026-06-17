// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721URIStorage, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PrintLicenseNFT
/// @notice ERC721 license NFTs for PrintChain manufacturing/use licenses.
/// @dev Each NFT represents a license to use, print, or manufacture the digital model/file.
///      The actual manufacturing file is stored off-chain on IPFS; this contract stores CIDs and metadata URI only.
contract PrintLicenseNFT is ERC721URIStorage, Ownable {
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

    struct OwnershipRecord {
        address previousOwner;
        address newOwner;
        uint256 price;
        uint256 timestamp;
        string actionType;
    }

    uint256 private _nextTokenId;
    address public transferController;

    mapping(uint256 tokenId => LicenseInfo) private _licenses;
    mapping(uint256 tokenId => OwnershipRecord[]) private _ownershipHistory;

    event LicenseMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string tokenURI,
        string fileCid,
        string metadataCid,
        uint256 timestamp
    );
    event OwnershipHistoryUpdated(
        uint256 indexed tokenId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 price,
        uint256 timestamp,
        string actionType
    );
    event TransferControllerUpdated(address indexed previousController, address indexed newController);

    error DirectTransfersRestricted();
    error LicenseDoesNotExist(uint256 tokenId);

    constructor() ERC721("PrintChain Manufacturing License", "PML") Ownable(msg.sender) {}

    /// @notice Mint a manufacturing/use license NFT for an IPFS-hosted digital file.
    function mintLicense(
        string calldata title,
        string calldata description,
        string calldata fileCid,
        string calldata metadataCid,
        string calldata metadataUri,
        uint256 initialPrice
    ) external returns (uint256 tokenId) {
        tokenId = ++_nextTokenId;
        uint256 timestamp = block.timestamp;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataUri);

        _licenses[tokenId] = LicenseInfo({
            tokenId: tokenId,
            creator: msg.sender,
            title: title,
            description: description,
            fileCid: fileCid,
            metadataCid: metadataCid,
            createdAt: timestamp,
            initialPrice: initialPrice
        });

        _recordOwnershipHistory(tokenId, address(0), msg.sender, initialPrice, timestamp, "MINT");

        emit LicenseMinted(tokenId, msg.sender, metadataUri, fileCid, metadataCid, timestamp);
    }

    /// @notice Set the future marketplace/controller address allowed to move licenses in controlled flows.
    /// @dev Phase 2 does not implement marketplace sale logic; this hook prepares for a later phase.
    function setTransferController(address newController) external onlyOwner {
        address previousController = transferController;
        transferController = newController;
        emit TransferControllerUpdated(previousController, newController);
    }

    /// @notice Controlled transfer hook for future marketplace/admin-managed ownership changes.
    /// @dev Direct wallet-to-wallet transfers remain restricted so royalties can be enforced later.
    function controlledTransferFrom(address from, address to, uint256 tokenId, uint256 price, string calldata actionType) external {
        if (msg.sender != owner() && msg.sender != transferController) {
            revert DirectTransfersRestricted();
        }

        uint256 timestamp = block.timestamp;
        _safeTransfer(from, to, tokenId, "");
        _recordOwnershipHistory(tokenId, from, to, price, timestamp, actionType);
    }

    function getLicenseInfo(uint256 tokenId) external view returns (LicenseInfo memory) {
        _requireExistingLicense(tokenId);
        return _licenses[tokenId];
    }

    function getOwnershipHistory(uint256 tokenId) external view returns (OwnershipRecord[] memory) {
        _requireExistingLicense(tokenId);
        return _ownershipHistory[tokenId];
    }

    function _recordOwnershipHistory(
        uint256 tokenId,
        address previousOwner,
        address newOwner,
        uint256 price,
        uint256 timestamp,
        string memory actionType
    ) internal {
        _ownershipHistory[tokenId].push(OwnershipRecord({
            previousOwner: previousOwner,
            newOwner: newOwner,
            price: price,
            timestamp: timestamp,
            actionType: actionType
        }));

        emit OwnershipHistoryUpdated(tokenId, previousOwner, newOwner, price, timestamp, actionType);
    }

    function _requireExistingLicense(uint256 tokenId) internal view {
        if (_ownerOf(tokenId) == address(0)) {
            revert LicenseDoesNotExist(tokenId);
        }
    }

    /// @dev Restrict normal ERC721 transfers. Minting is allowed; future marketplace/controller transfers are allowed.
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address previousOwner) {
        previousOwner = _ownerOf(tokenId);

        if (previousOwner != address(0) && to != address(0) && msg.sender != owner() && msg.sender != transferController) {
            revert DirectTransfersRestricted();
        }

        return super._update(to, tokenId, auth);
    }
}
