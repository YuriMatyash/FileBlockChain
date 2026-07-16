// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721URIStorage, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PrintLicenseNFT
/// @notice ERC721 license NFTs for PrintChain manufacturing/use licenses.
/// @dev Each NFT represents a license to use, print, or manufacture the digital model/file.
///      The actual manufacturing file is stored off-chain on IPFS; this contract stores CIDs and metadata URI only.
// This is the NFT license contract
// it creates the ERC721 token of the project, where each token represents a license to use, print, or manufacture the digital model/file.
contract PrintLicenseNFT is ERC721URIStorage, Ownable {
    // Main metadata stored on-chain for each license NFT.
    // The actual file is not stored directly on-chain, the contract stores CIDs/URI
    // that point to off-chain or mock/demo IPFS metadata.
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

    // One historical ownership/action record for a license NFT.
    // Used to remember mint and sale events, including previous owner,
    // new owner, price, timestamp, and action type such as MINT or SALE.
    struct OwnershipRecord {
        address previousOwner;
        address newOwner;
        uint256 price;
        uint256 timestamp;
        string actionType;
    }

    uint256 private _nextTokenId;   // Counter used to assign a unique tokenId to every newly minted license NFT.
    address public transferController;  // who is allowed to transfer the NFT, basically the marketplace contract address so users can't directly transfer

    // tokenId => license information such as creator, title, file CID, metadata CID, and initial price.
    mapping(uint256 tokenId => LicenseInfo) private _licenses;

    // tokenId => accumulated mint/sale ownership history.
    mapping(uint256 tokenId => OwnershipRecord[]) private _ownershipHistory;

    // Emitted when a new manufacturing/use license NFT is minted.
    // The frontend can read this event to discover minted token IDs.
    event LicenseMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string tokenURI,
        string fileCid,
        string metadataCid,
        uint256 timestamp
    );

    // Emitted whenever the NFT ownership/history array receives a new record.
    event OwnershipHistoryUpdated(
        uint256 indexed tokenId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 price,
        uint256 timestamp,
        string actionType
    );

    // Emitted when the admin changes the marketplace/controller allowed to transfer NFTs.
    event TransferControllerUpdated(address indexed previousController, address indexed newController);

    // Custom errors are cheaper than revert strings and make failures explicit.
    error DirectTransfersRestricted();
    error LicenseDoesNotExist(uint256 tokenId);

    // Deploys the NFT collection and sets the deployer as the contract owner.
    // Collection name: PrintChain Manufacturing License
    // Symbol: PML
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
        tokenId = ++_nextTokenId;   // Generate a new unique NFT token ID.
        uint256 timestamp = block.timestamp;    // Store the current block timestamp as the mint/creation time.

        // Mint the NFT to the creator/caller and attach the metadata URI.
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataUri);

        // Store the license information needed by the frontend and marketplace.
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

        // Record the first ownership history entry.
        // address(0) means this is a new mint, not a transfer from another owner.
        _recordOwnershipHistory(tokenId, address(0), msg.sender, initialPrice, timestamp, "MINT");

        // Emit a mint event so the frontend can discover and display this NFT.
        emit LicenseMinted(tokenId, msg.sender, metadataUri, fileCid, metadataCid, timestamp);
    }

    /// @notice Set the future marketplace/controller address allowed to move licenses in controlled flows.
    /// @dev Phase 2 does not implement marketplace sale logic; this hook prepares for a later phase.
    // Sets the marketplace/controller contract that is allowed to move NFTs.
    // This allows ownership transfers to happen only through controlled flows
    // where royalties and history can be enforced.
    function setTransferController(address newController) external onlyOwner {
        address previousController = transferController;
        transferController = newController;
        emit TransferControllerUpdated(previousController, newController);
    }

    /// @notice Controlled transfer hook for future marketplace/admin-managed ownership changes.
    /// @dev Direct wallet-to-wallet transfers remain restricted so royalties can be enforced later.
    // Transfers a license NFT through an approved controller, the marketplace.
    // This is used during sales so the contract can record price, timestamp, and SALE history.
    // Normal direct wallet-to-wallet transfers are blocked elsewhere.
    function controlledTransferFrom(address from, address to, uint256 tokenId, uint256 price, string calldata actionType) external {
        if (msg.sender != owner() && msg.sender != transferController) {    // Only the contract owner or configured marketplace/controller may perform controlled transfers.
            revert DirectTransfersRestricted();
        }

        uint256 timestamp = block.timestamp;
        // Transfer the NFT and then record the sale/ownership history.
        _safeTransfer(from, to, tokenId, "");
        _recordOwnershipHistory(tokenId, from, to, price, timestamp, actionType);
    }

    // Returns stored license information for a minted token.
    function getLicenseInfo(uint256 tokenId) external view returns (LicenseInfo memory) {
        _requireExistingLicense(tokenId);
        return _licenses[tokenId];
    }

    // Returns the full accumulated ownership/sale history for a minted token.
    function getOwnershipHistory(uint256 tokenId) external view returns (OwnershipRecord[] memory) {
        _requireExistingLicense(tokenId);
        return _ownershipHistory[tokenId];
    }
    
    // Internal helper that appends a new ownership/history record and emits an event.
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

    // Reverts if the tokenId was never minted.
    function _requireExistingLicense(uint256 tokenId) internal view {
        if (_ownerOf(tokenId) == address(0)) {
            revert LicenseDoesNotExist(tokenId);
        }
    }

    /// @dev Restrict normal ERC721 transfers. Minting is allowed; future marketplace/controller transfers are allowed.
    // Restricts normal ERC721 transfers.
    // Minting is allowed.
    // Marketplace/controller transfers are allowed.
    // Direct wallet-to-wallet transfers are blocked so users cannot bypass marketplace royalties/history.
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address previousOwner) {
        previousOwner = _ownerOf(tokenId);

        // If this is an existing token moving to a new owner, only the owner/admin or marketplace/controller may do it.
        if (previousOwner != address(0) && to != address(0) && msg.sender != owner() && msg.sender != transferController) {
            revert DirectTransfersRestricted();
        }

        return super._update(to, tokenId, auth);
    }
}
