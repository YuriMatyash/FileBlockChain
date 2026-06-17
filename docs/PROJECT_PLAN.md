# PrintChain Project Plan

PrintChain is implemented strictly in phases. This repository currently contains Phase 2 NFT license contract work in addition to the earlier setup and PrintToken phases.

Later phases will add contracts, tests, deployment scripts, frontend marketplace flows, IPFS, and the x402 demo.

## Solidity version note

Phase 0 configures Hardhat to compile Solidity `0.8.28`. Future contracts should use a compatible pragma such as `^0.8.20`, which is compatible with OpenZeppelin Contracts 5.x and this compiler setting.


## Phase 2 status

Phase 2 adds `contracts/PrintLicenseNFT.sol` and `test/PrintLicenseNFT.test.js`. The NFT is a manufacturing/use license token, stores IPFS CIDs and token URI data, records the first ownership history entry at mint time, and restricts direct wallet transfers so future marketplace sales can enforce royalties and history updates.


## Phase 3 marketplace status

Phase 3 adds `PrintMarketplace.sol` for ETH-denominated license NFT sales. Owners can list and cancel listings, buyers must send the exact ETH price, and the marketplace enforces a 10% royalty to the original creator/designer with 90% paid to the current seller. Purchases use the controlled NFT transfer path so direct wallet transfers remain restricted and sale history is recorded on-chain. Frontend, IPFS upload, deployment, and x402 work remain later phases.

## Product display clarification before Phase 5

Phase 5 should present each marketplace item as a clear manufacturing/use license listing. Buyers should see human-readable information before buying, rather than only a token ID, creator wallet, seller wallet, and price. The eventual UI should show the license title, short summary, longer description or documentation, file type, category, optional preview image/render, file CID, metadata CID/token URI, creator/designer, current owner/seller, price, ownership history, price history, and relevant timestamps.

Creators may manually provide a preview image/render CID or URL. Automatic STL/3D preview generation is not required yet. If a listing has no preview image, the frontend should show a simple placeholder. Automatic file summarization is also not required; longer documentation can be entered by the creator or referenced through metadata.

The contracts do not need to store every buyer-facing display field directly on-chain. Keep on-chain storage focused on important fields such as creator, title/description/category/file type, CIDs, price/history records, timestamps, and royalty-related state. Extra display fields can live in the ERC721 metadata JSON on IPFS, including `name`, `description`, optional `image`, `external_url` or file reference, `attributes` for file type/category/license type/software compatibility, and optional `documentation` text or `documentation_cid`.
