# AGENTS.md

## Project

Build **PrintChain**, a Web3 DApp for uploading, registering, buying, selling, and tracking ownership of 3D printing and CNC files.

The project must demonstrate:

* An ERC20 token called `PrintToken` with symbol `PRINT`.
* An ERC721 NFT contract where each NFT represents one digital file such as STL, STEP, CNC, ZIP, PDF, or a technical drawing.
* Owner history stored on-chain for each NFT.
* Dates/timestamps stored in the contracts for creation, listing, sale, and ownership transfer.
* A marketplace where NFT resale automatically pays 10% of the sale price to the original creator and 90% to the seller.
* File upload to IPFS, storing the resulting CID on-chain.
* MetaMask wallet connection.
* A web frontend using **web3.js**.
* A basic x402 integration for paid access to a file, preview, or API route.

This is an educational/testnet project. Do not use real money, mainnet deployments, or production private keys.

## Important naming note

Codex should use this file as the main project instruction file. The file name must be exactly `AGENTS.md` at the repository root.

## Preferred stack

Use:

* Solidity
* Hardhat
* OpenZeppelin Contracts
* JavaScript or TypeScript
* React with Vite for the frontend
* web3.js for blockchain communication
* MetaMask for wallet connection
* IPFS through a provider such as Pinata, local IPFS, or a simple upload adapter
* Node/Express for the optional backend/x402 demo
* A test network such as Sepolia or a local Hardhat network

Do not use ethers.js in the frontend unless absolutely necessary. The project requirement is web3.js.

## Repository structure

Create or maintain this structure:

```text
contracts/
  PrintToken.sol
  PrintNFT.sol
  PrintMarketplace.sol
scripts/
  deploy.js
  seed-demo.js
frontend/
  src/
    components/
    pages/
    web3/
    ipfs/
backend/
  server.js
  x402.js
test/
  PrintToken.test.js
  PrintNFT.test.js
  PrintMarketplace.test.js
docs/
  PROJECT_PLAN.md
  SETUP.md
  DEMO_FLOW.md
.env.example
README.md
```

## Work method

Work in phases. Do not jump ahead. Before implementing each phase, briefly inspect the current repo state and write what files will be changed. After each phase, run relevant tests or checks and summarize what was completed.

If a task is too large, split it into smaller steps and complete one step at a time.

Do not skip tests. If tests fail, fix them before moving to the next phase.

Never commit or print private keys, API secrets, seed phrases, or real wallet credentials. Use `.env.example` with placeholder values only.

## Phase 0 — Initialize project

Goal: create a clean development environment.

Tasks:

* Initialize a Hardhat project.
* Add OpenZeppelin Contracts.
* Add a React/Vite frontend.
* Add web3.js to the frontend.
* Add a simple backend folder for x402/IPFS demo routes if needed.
* Add `.env.example`.
* Add basic README with setup commands.

Acceptance:

* Project installs successfully.
* Hardhat compiles an empty or sample contract.
* Frontend starts successfully.

## Phase 1 — ERC20 token

Goal: implement the demo payment token.

Create `PrintToken.sol`.

Requirements:

* ERC20 token name: `PrintToken`.
* Symbol: `PRINT`.
* Initial supply minted to deployer.
* Optional faucet function for demo/testing, protected or limited enough for a school project.

Acceptance:

* Contract compiles.
* Tests verify name, symbol, initial supply, balances, and transfers.

## Phase 2 — NFT contract

Goal: implement NFT registration for uploaded files.

Create `PrintNFT.sol`.

Requirements:

* ERC721 token.
* Each token represents one uploaded file.
* Store creator address.
* Store title, description, file CID, metadata CID, and created timestamp.
* Store ownership history for each token.
* Add events for minting and ownership history updates.
* The first owner should be recorded when minting.

## Phase 3 — Marketplace contract

Goal: implement listing, buying, ownership transfer, and 10% creator royalty.

Create `PrintMarketplace.sol`.

Requirements:

* Sellers can list NFTs for sale in `PRINT` tokens.
* Buyers buy using `PRINT`, after approving the marketplace to spend tokens.
* On sale, 10% goes automatically to the original creator.
* 90% goes to the current seller.
* NFT ownership moves to the buyer.
* Sale timestamp is recorded.
* Ownership history is updated.
* Emit clear events for list, cancel, and sale.

Important:

* Prevent bypassing the royalty mechanism as much as reasonable for a class project.
* Prefer transfers through the marketplace.
* If direct ERC721 transfers are allowed, clearly document that royalties are enforced only for marketplace sales.
* Better option: restrict NFT transfers so ownership changes must go through marketplace functions.

## Phase 4 — Frontend with MetaMask and web3.js

Goal: create a simple usable DApp interface.

Pages:

* Marketplace page: show NFTs for sale.
* Upload/Mint page: upload/register a file and mint NFT.
* NFT Details page: show creator, current owner, CID, timestamps, and ownership history.
* My NFTs page: show NFTs owned by connected wallet.

Requirements:

* Connect MetaMask.
* Show connected wallet address.
* Detect wrong network and show a helpful message.
* Use web3.js for contract calls.
* Support token approval before buying.
* Support listing and buying NFTs.

## Phase 5 — IPFS upload

Goal: upload files to IPFS and store CIDs on-chain.

Requirements:

* Add an IPFS upload adapter in the frontend or backend.
* Upload file and metadata JSON.
* Store file CID and metadata CID in `PrintNFT`.
* Add clear error messages if IPFS credentials are missing.

Important:

* Do not commit IPFS API keys.
* Use `.env.example` placeholders.
* For local demo, a mocked CID is acceptable only if real IPFS upload is not configured, but document the difference clearly.

## Phase 6 — x402 integration

Goal: demonstrate x402 usage without overcomplicating the project.

Implement a minimal paid HTTP route, for example:

```text
GET /api/paid-preview/:tokenId
```

or:

```text
GET /api/download/:tokenId
```

Expected behavior:

* If the request does not include a valid x402 payment, return HTTP 402 Payment Required.
* After payment verification, return a protected resource such as preview data, a file CID, or a download response.

Important:

* Keep x402 integration small and well documented.
* It is acceptable to make this a demo route separate from the core NFT marketplace.
* If full x402 payment settlement cannot be completed in the local environment, implement the route structure and document what must be configured for a real x402 payment flow.

## Phase 7 — Deployment scripts and demo data

Goal: make the project easy to run and demonstrate.

Tasks:

* Add deployment script for local Hardhat network.
* Add optional deployment script for Sepolia.
* Save deployed contract addresses to frontend config.
* Add demo seed script that mints sample NFTs and lists them.

## Phase 8 — Documentation and final polish

Goal: make the project understandable for review.

Docs required:

* `README.md`: what the project is and how to run it.
* `docs/SETUP.md`: installation, env variables, MetaMask setup, local network setup.
* `docs/DEMO_FLOW.md`: step-by-step demo scenario.
* `docs/PROJECT_PLAN.md`: short explanation of phases and completed requirements.

## School requirement mapping

The final project must clearly show:

```text
DApp                         -> React frontend + smart contracts
ERC20 token                  -> PrintToken.sol
NFT                          -> PrintNFT.sol
NFT owner memory/history     -> Ownership history mapping/array
10% transfer to creator      -> Marketplace royalty logic
Dates in contracts           -> block.timestamp fields
History accumulation         -> ownership/sale history records
IPFS documents/files         -> CID stored on-chain
MetaMask                     -> wallet connection in frontend
web3.js                      -> frontend contract calls
Complex contract             -> NFT + Marketplace + royalty + history
x402                         -> paid HTTP route demo
```

## Quality rules

* Keep code simple and readable.
* Prefer explicit names over clever abstractions.
* Add comments only where logic is not obvious.
* Use OpenZeppelin instead of writing token standards from scratch.
* Write tests for contract logic.
* Handle failed transactions gracefully in the frontend.
* Avoid fake claims in the README. If something is mocked, say it is mocked.

## Final demo scenario

The final demo should support this flow:

1. Open the website.
2. Connect MetaMask.
3. Deploy or use existing demo contracts.
4. Mint or receive demo `PRINT` tokens.
5. Upload an STL/sample file to IPFS.
6. Mint an NFT for the file.
7. List the NFT for sale.
8. Switch to another wallet.
9. Approve `PRINT` spending.
10. Buy the NFT.
11. Show that 10% went to the creator and 90% went to the seller.
12. Show that the NFT owner changed.
13. Show the ownership history and dates.
14. Show the IPFS CID.
15. Demonstrate the x402 paid route.
