# AGENTS.md

## Project

Build **PrintChain**, a Web3 DApp marketplace for digital manufacturing files.

The project is similar in structure to a music-license NFT marketplace, but instead of audio files, it focuses on files used for 3D printing, CNC, fabrication, and technical manufacturing.

Each NFT represents a **manufacturing/use license** for a digital file, not just a simple collectible. Example files include:

- STL
- STEP
- 3MF
- G-code
- CNC files
- ZIP packages
- PDF instructions
- technical drawings
- preview images or renders

The project is educational and should run on a local Hardhat network and/or Sepolia testnet. Do not use mainnet or real money.

## Main idea

A designer uploads a digital manufacturing file to IPFS.

The system stores the file CID and metadata CID on-chain.

The designer mints an NFT license for the file.

A buyer can purchase the license NFT from the marketplace.

The NFT can later be resold.

Whenever the license NFT is sold, the original creator automatically receives a 10% royalty.

The system also keeps ownership history, price history, and timestamps inside the smart contracts.

## Required features

The final project must demonstrate:

- A DApp frontend.
- MetaMask wallet connection.
- Smart contracts written in Solidity.
- An ERC20 reward token.
- An ERC721 NFT license token.
- ERC2981 royalty support.
- A marketplace contract.
- 10% royalty paid to the original creator on resale.
- Ownership history stored on-chain.
- Price history stored on-chain.
- Important dates/timestamps stored on-chain.
- Uploading files and metadata to IPFS.
- CIDs stored in the NFT metadata.
- Web3 integration in the frontend.
- Basic x402 / HTTP 402 payment demo for protected access to a file, preview, or API route.

## Important design decision

The NFT should be described as a **license NFT**.

Do not describe it only as "owning an STL file."

Use this wording:

> Each NFT represents a license to use, print, or manufacture the digital model/file.

This is important because it makes the project closer to a real marketplace for licenses, similar to a music license NFT marketplace.

## Token model

The project must include an ERC20 token called:

```text
PrintToken
Symbol: PRINT
```

`PRINT` is mainly a **reward token**, not the main payment currency.

Use `PRINT` for:

- rewarding creators when they mint a new license NFT
- rewarding buyers when they purchase a license NFT
- showing ERC20 functionality in the project
- possible future governance or loyalty features

Marketplace purchases should primarily use **ETH** on the test network.

This is intentional because the reference proposal uses an ERC20 token as a participation/reward token while purchases are handled separately.

## NFT model

Create an ERC721 contract for manufacturing/use licenses.

Suggested contract name:

```text
ManufacturingLicenseNFT.sol
```

or:

```text
PrintLicenseNFT.sol
```

Each NFT should store or expose enough human-readable display information that buyers understand the manufacturing/use license being listed, not just the token ID and wallet addresses. The current contracts should keep core on-chain fields minimal and important; extra display fields can live in the ERC721 metadata JSON on IPFS and be rendered by the frontend later.

Core on-chain or contract-readable fields should include:

- token ID
- original creator/designer address
- current owner
- title
- short summary or description
- category
- file type
- IPFS file CID
- IPFS metadata CID or tokenURI
- optional preview image/render CID or URL
- mint timestamp
- original price
- ownership history
- price history

Additional buyer-facing details can be stored in metadata JSON/IPFS, including longer documentation, software/tool compatibility, assembly notes, license notes, or a documentation CID. Do not add contract storage just to duplicate display-only metadata if the current contracts already expose the fields needed for Phase 5 marketplace cards and details.

The NFT should support ERC2981 royalties.

Royalty should be:

```text
10% to the original creator
```

## Marketplace model

Create a marketplace contract.

Suggested contract name:

```text
PrintMarketplace.sol
```

The marketplace should allow:

- listing a license NFT for sale
- canceling a listing
- buying a listed license NFT with ETH
- transferring the NFT to the buyer
- paying the seller
- paying 10% royalty to the original creator
- rewarding buyer and/or seller with PRINT tokens
- storing sale timestamp
- storing ownership history
- storing price history
- reading active listings

Expected sale behavior:

```text
Sale price: 1 ETH

0.1 ETH goes to the original creator
0.9 ETH goes to the current seller

NFT ownership moves to the buyer
Sale timestamp is saved
Ownership history is updated
Price history is updated
Buyer may receive PRINT reward
```

For first sale, if the seller is also the creator, the logic can either:

- send the full payment to the creator, or
- still calculate royalty but avoid double payment confusion

Choose the simpler and cleaner implementation, then document it.

## Royalty enforcement

The marketplace must enforce the 10% royalty during marketplace purchases.

ERC2981 should also be implemented so the contract exposes royalty information in a standard way.

Important note:

ERC2981 by itself does not force every external marketplace to pay royalties. For this project, royalty enforcement is done inside our own marketplace contract.

Document this clearly in the README.

## Transfer rules

Prefer a design where normal NFT transfers are restricted or discouraged, so that ownership changes happen through the marketplace.

This helps keep the ownership history accurate and ensures royalties are paid on sales.

Acceptable options:

Option A, simpler:
- allow normal ERC721 transfers
- document that royalties and sale history are enforced only through the marketplace

Option B, stronger:
- restrict transfers so only approved marketplace functions can transfer license NFTs
- allow minting and marketplace sales
- document why this was done

Use Option B if it can be implemented cleanly without making the project too fragile. Otherwise use Option A and document the limitation.

## IPFS model

Files and metadata should be stored on IPFS.

Use Pinata, local IPFS, or a simple adapter.

The blockchain should not store the full file.

The blockchain should store only:

- file CID
- metadata CID / tokenURI
- creator
- ownership records
- price records
- timestamps

Metadata JSON should follow a simple ERC721-compatible structure and should provide the human-readable listing information used by future marketplace screens:

```json
{
  "name": "Example 3D Model License",
  "description": "Short buyer-facing summary of the manufacturing/use license.",
  "image": "ipfs://PREVIEW_IMAGE_CID",
  "external_url": "ipfs://FILE_CID",
  "documentation": "Longer text documentation, instructions, or license notes entered by the creator.",
  "documentation_cid": "ipfs://OPTIONAL_DOCUMENTATION_CID",
  "attributes": [
    {
      "trait_type": "File Type",
      "value": "STL"
    },
    {
      "trait_type": "Category",
      "value": "3D Printing"
    },
    {
      "trait_type": "License Type",
      "value": "Manufacturing/Use License"
    },
    {
      "trait_type": "Software Compatibility",
      "value": "Fusion 360, PrusaSlicer"
    }
  ]
}
```

The preview image/render can be manually provided by the creator for now. Do not implement automatic STL/3D preview generation yet. If no preview image is available, the frontend should eventually show a simple placeholder. Automatic file summarization is not required; documentation can be creator-entered text or a documentation CID in metadata.

Do not commit real Pinata keys or any private API keys.

Use `.env.example` for placeholders.

## x402 / HTTP 402 requirement

Add a small x402-style demo.

Do not make x402 the most complicated part of the project.

The core project is the NFT license marketplace.

The x402 part can be a backend route that protects access to a file, preview, or API response.

Suggested route:

```text
GET /api/paid-preview/:tokenId
```

or:

```text
GET /api/download/:tokenId
```

Expected behavior:

- User requests a protected file/preview.
- Server checks whether the request has valid payment information.
- If not paid, server returns HTTP 402 Payment Required.
- After payment verification, server returns the protected resource, CID, or preview data.

If full x402 settlement is hard to configure in the local environment, implement the route structure and mock the payment verification clearly.

If anything is mocked, write that clearly in the README and demo documentation.

## Frontend requirements

Build a simple web interface.

Use:

- HTML/CSS/JavaScript or React
- web3.js for blockchain calls
- MetaMask for wallet connection

Do not use ethers.js in the frontend unless absolutely necessary. The project requirement is web3.js.

Frontend pages/screens:

### Home / Marketplace

Shows active license NFTs for sale.

Display each marketplace listing as a clear manufacturing/use license offering, not just a token ID and wallet addresses. Buyer-facing listing cards or rows should eventually show:

- title
- short summary
- preview image/render if available, or a simple placeholder when absent
- file type, such as STL, STEP, 3MF, CNC, ZIP, or PDF
- category, such as 3D Printing, CNC, Technical Drawing, or Assembly Instructions
- creator/designer address
- current owner/seller address
- price in ETH
- buy button

Detailed views should also show the longer description/documentation, file CID, metadata CID/tokenURI, ownership history, price history, and timestamps.

### Upload / Mint License

Allows a creator to:

- connect wallet
- upload file
- upload preview image if available
- enter title
- enter description
- enter category
- enter initial price
- upload metadata to IPFS
- mint license NFT
- receive PRINT reward

### NFT Details

Shows:

- title
- description
- creator
- current owner
- token ID
- file CID
- metadata CID / tokenURI
- mint timestamp
- ownership history
- price history
- royalty percentage
- current listing status

### My Licenses

Shows NFTs owned by the connected wallet.

Allows owner to:

- list NFT for sale
- cancel listing
- view history

### Rewards / Token Info

Shows:

- connected wallet PRINT balance
- token name
- token symbol
- reward explanation

## Smart contracts

Create three main contracts.

### PrintToken.sol

ERC20 reward token.

Requirements:

- name: `PrintToken`
- symbol: `PRINT`
- mint initial supply to deployer
- marketplace or deployer can reward users
- expose normal ERC20 functions
- use OpenZeppelin

### PrintLicenseNFT.sol

ERC721 license NFT.

Requirements:

- mint manufacturing/use license NFTs
- store creator address
- store IPFS CIDs
- store timestamps
- store ownership history
- store price history
- support ERC2981
- expose read functions for frontend
- use OpenZeppelin

Important functions:

```text
mintLicense(...)
tokenURI(...)
royaltyInfo(...)
getLicenseInfo(...)
getOwnershipHistory(...)
getPriceHistory(...)
recordSale(...)
```

Only allow `recordSale` to be called by the marketplace.

### PrintMarketplace.sol

Marketplace for license NFTs.

Requirements:

- list license
- cancel listing
- buy license with ETH
- pay 10% royalty to original creator
- pay 90% to seller
- reward creator/buyer with PRINT if desired
- update NFT history
- emit events
- expose active listings

Important functions:

```text
listLicense(tokenId, price)
cancelListing(tokenId)
buyLicense(tokenId)
getListing(tokenId)
getActiveListings()
```

## Events

Emit clear events from contracts.

Suggested events:

```text
LicenseMinted(tokenId, creator, tokenURI, timestamp)
LicenseListed(tokenId, seller, price, timestamp)
LicenseSold(tokenId, seller, buyer, price, royaltyAmount, timestamp)
LicenseDelisted(tokenId, seller, timestamp)
OwnershipHistoryUpdated(tokenId, previousOwner, newOwner, price, timestamp)
RewardPaid(user, amount, reason)
```

## Testing requirements

Write tests for smart contracts.

Minimum tests:

### PrintToken tests

- token name is correct
- token symbol is correct
- initial supply exists
- transfers work
- rewards/minting works according to chosen design

### PrintLicenseNFT tests

- creator can mint license NFT
- NFT stores creator correctly
- tokenURI is correct
- mint timestamp is saved
- ownership history starts with first owner
- royaltyInfo returns 10%

### PrintMarketplace tests

- owner can list NFT
- non-owner cannot list NFT
- buyer can buy NFT with ETH
- seller receives correct amount
- creator receives 10% royalty
- NFT transfers to buyer
- ownership history updates
- price history updates
- listing is removed after sale
- cancel listing works

## Repository structure

Use this structure:

```text
contracts/
  PrintToken.sol
  PrintLicenseNFT.sol
  PrintMarketplace.sol

scripts/
  deploy.js
  seed-demo.js

test/
  PrintToken.test.js
  PrintLicenseNFT.test.js
  PrintMarketplace.test.js

frontend/
  src/
    components/
    pages/
    web3/
    ipfs/
    config/
  package.json

backend/
  server.js
  x402.js
  package.json

docs/
  SETUP.md
  DEMO_FLOW.md
  PROJECT_PLAN.md

.env.example
README.md
hardhat.config.js
package.json
```

## Development phases

Work only one phase at a time.

Do not jump ahead.

After each phase:

- run the relevant tests
- fix errors before continuing
- summarize what was completed
- mention what files changed

## Phase 0 — Project setup

Goal: initialize the project.

Tasks:

- create Hardhat project
- install OpenZeppelin
- create frontend app
- install web3.js
- create backend folder
- create `.env.example`
- create README skeleton
- create docs folder

Acceptance:

- dependencies install
- Hardhat compile works
- frontend starts
- folder structure exists

## Phase 1 — ERC20 reward token

Goal: implement `PrintToken`.

Tasks:

- create ERC20 contract
- mint initial supply
- add controlled reward minting or transfer reward logic
- write tests

Acceptance:

- all PrintToken tests pass

## Phase 2 — License NFT contract

Goal: implement NFT license contract.

Tasks:

- create ERC721 contract
- implement manufacturing/use license minting
- store IPFS CIDs
- store creator
- store timestamps
- implement ownership history
- implement price history structure
- implement ERC2981 royalty info
- write tests

Acceptance:

- all NFT tests pass
- royalty returns 10%
- history is readable

## Phase 3 — Marketplace contract

Goal: implement sales and royalties.

Tasks:

- create listing logic
- create buying logic with ETH
- pay 10% to creator
- pay 90% to seller
- transfer NFT
- update ownership history
- update price history
- remove listing after sale
- emit events
- write tests

Acceptance:

- sale flow works
- royalty logic is tested
- ownership and price history are tested

## Phase 4 — Deployment scripts

Goal: make contracts easy to deploy.

Tasks:

- deploy PrintToken
- deploy PrintLicenseNFT
- deploy PrintMarketplace
- configure contract permissions
- save deployed addresses
- create optional seed script

Acceptance:

- local deployment works
- frontend can read contract addresses from config

## Phase 5 — Frontend wallet and marketplace

Goal: build the user interface.

Tasks:

- connect MetaMask
- show wallet address
- show network status
- load active listings
- display NFT details
- support buying license NFT with ETH
- show errors clearly

Acceptance:

- user can connect wallet
- user can view marketplace
- user can buy listed NFT

## Phase 6 — Upload and mint flow

Goal: support IPFS upload and NFT minting.

Tasks:

- implement file upload
- implement metadata creation
- upload file and metadata to IPFS
- mint license NFT using returned CID/tokenURI
- reward creator with PRINT
- show transaction status

Acceptance:

- user can upload a file
- user can mint a license NFT
- token appears in UI

## Phase 7 — My Licenses and history

Goal: let users manage their owned NFTs.

Tasks:

- show NFTs owned by connected wallet
- allow listing
- allow delisting
- show ownership history
- show price history
- show timestamps in readable format

Acceptance:

- owner can list NFT
- owner can cancel listing
- history appears correctly

## Phase 8 — x402 demo

Goal: demonstrate HTTP 402 payment behavior.

Tasks:

- create backend route for paid preview or download
- return HTTP 402 when no payment is provided
- allow successful access after mock or real payment verification
- document what is real and what is mocked
- connect simple frontend button if practical

Acceptance:

- protected route works
- unpaid request receives 402
- paid/mock-paid request receives resource
- documentation explains setup

## Phase 9 — Documentation and final demo

Goal: make the project easy to present.

Tasks:

- finish README
- write setup guide
- write demo flow
- write project explanation
- explain how each course requirement is satisfied
- include screenshots if useful

Acceptance:

- reviewer can understand and run the project
- demo flow is clear

## School requirement mapping

The project must clearly map to these requirements:

```text
DApp
React/HTML frontend + Solidity smart contracts

ERC20 token
PrintToken.sol

NFT
PrintLicenseNFT.sol

NFT with owner memory
On-chain ownership history

10% transfer to creator
Marketplace sale logic and ERC2981 royalty info

Dates stored in contracts
block.timestamp for mint/list/sale/transfer

History accumulation
ownership history and price history arrays

IPFS document upload
file CID and metadata CID stored with NFT

MetaMask
wallet connection and transaction signing

web3.js
frontend contract interaction

Complex smart contract
NFT + marketplace + royalties + history + rewards

x402
HTTP 402 paid preview/download/API demo
```

## Final demo scenario

The final demo should show this flow:

1. Open the website.
2. Connect MetaMask.
3. Show PRINT token balance.
4. Upload an STL or sample manufacturing file.
5. Upload metadata to IPFS.
6. Mint a manufacturing/use license NFT.
7. Show the NFT details and IPFS CID.
8. Show that creator received PRINT reward.
9. List the NFT for sale in ETH.
10. Switch to another wallet.
11. Buy the NFT.
12. Show that 10% royalty went to the original creator.
13. Show that 90% went to the seller.
14. Show that NFT ownership changed.
15. Show ownership history.
16. Show price history.
17. Show timestamps.
18. Demonstrate x402 paid preview/download route.

## Coding rules

- Keep the implementation simple and readable.
- Use OpenZeppelin contracts.
- Prefer clear function names.
- Do not over-engineer the system.
- Do not store full files on-chain.
- Do not commit private keys.
- Do not commit real API keys.
- Do not claim something is fully implemented if it is mocked.
- If using a mock for IPFS or x402, clearly label it.
- Always run tests before moving to the next phase.
- Update documentation as the project changes.

## First Codex command

After this file is placed at the repo root, start Codex with:

```text
Read AGENTS.md and implement Phase 0 only. Do not implement later phases yet. Initialize the project structure, install the required dependencies, and stop after the project compiles and the frontend starts.
```
