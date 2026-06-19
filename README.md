# PrintChain

PrintChain is a local educational Web3 DApp marketplace for digital manufacturing files. Each NFT represents a license to use, print, or manufacture the digital model/file, such as an STL, STEP, 3MF, G-code, CNC file, ZIP package, PDF instructions, technical drawing, or preview render.

PrintChain is designed for a local Hardhat network only. Do not use mainnet, real money, real seed phrases, or private production API keys with this repository.

## Current status: final review / Phase 9 polish

The project includes:

- Solidity contracts for `PrintToken`, `PrintLicenseNFT`, and `PrintMarketplace`.
- A Vite + React frontend that uses `web3.js` and MetaMask.
- Local deployment and demo seeding scripts.
- A mock/demo IPFS upload adapter for local CIDs and metadata.
- A backend mock x402-style HTTP `402 Payment Required` route.
- Documentation for setup, demo flow, school requirement mapping, and what is real vs mocked.

## What PrintChain demonstrates

### License NFTs, not simple file ownership

A PrintChain NFT is a manufacturing/use **license NFT**. It is not described as merely owning an STL or source file. The intended legal/product framing is:

> Each NFT represents a license to use, print, or manufacture the digital model/file.

The NFT stores and exposes important license data such as creator/designer, title, short description, file CID, metadata CID/token URI, mint timestamp, initial price, and ownership history. The full manufacturing file is not stored on-chain.

### PRINT ERC20 reward token

`PrintToken` is an ERC20 token named `PrintToken` with symbol `PRINT`. It is mainly a reward/loyalty token for showing ERC20 functionality and rewarding participation. Marketplace purchases use ETH on the local Hardhat chain, not PRINT.

### ETH marketplace sales and creator royalty

`PrintMarketplace` lets owners list license NFTs, cancel listings, and buy listed licenses with exact ETH payment. The marketplace enforces a 10% royalty to the original creator/designer on each marketplace sale, with the remaining 90% paid to the seller. On a first sale where the seller is also the creator, both payments go to the same creator address, so the creator effectively receives the full sale price.

Royalty enforcement is implemented in the PrintChain marketplace purchase flow. The current contract implementation does not claim that external marketplaces are forced to pay royalties; direct wallet-to-wallet transfers are restricted so normal ownership changes happen through the marketplace.

### History and timestamps

The NFT contract records ownership history entries for minting and marketplace sales. History records include previous owner, new owner, price, timestamp, and action type such as `MINT` or `SALE`. Listing timestamps are stored in the marketplace listing structure.

### IPFS/mock upload behavior

The frontend includes a mock/demo upload adapter. By default, no real IPFS upload happens. Instead, the app generates mock CID-like values locally and stores lightweight metadata in browser session storage so the demo can render richer cards and detail views.

If a future backend upload proxy is configured through `VITE_IPFS_UPLOAD_ENDPOINT`, the frontend can be adapted for real IPFS uploads. Do not place Pinata, IPFS, or other provider secrets in frontend environment files.

### Preview image and metadata behavior

Creators can enter metadata fields and optionally select a preview image/render. Metadata follows an ERC721-compatible shape with fields such as `name`, `description`, `image`, `external_url`, `fileCid`, `documentation`, and attributes for file type, category, license type, and software/tool compatibility. Automatic STL/3D preview generation is not implemented.

### x402 / HTTP 402 mock demo

The backend provides:

```text
GET /api/paid-preview/:tokenId
```

This is a local x402-style mock/demo only. Unpaid requests return HTTP `402 Payment Required`. Requests with demo proof return protected demo JSON. There is no real x402 settlement, facilitator, payment credential, paid download, or real file delivery.

Accepted mock proofs:

- Header: `x-printchain-demo-payment: paid`
- Query: `?demoPaid=true`

## Project structure

```text
contracts/              Solidity contracts
scripts/                Local deployment and demo seed scripts
test/                   Hardhat contract tests
frontend/               Vite + React + web3.js frontend
backend/                Express mock x402 backend
docs/                   Setup, demo flow, and project plan docs
.env.example            Root placeholder environment file
hardhat.config.js       Local Hardhat config
package.json            Root scripts
```

## Prerequisites

- Node.js 20+
- npm 10+
- MetaMask browser extension

## Full local demo command order

Run these commands in order for the standard review flow:

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
npx hardhat node
npm run deploy:local
npm run seed:local
npm run backend
npm run frontend
```

Use separate terminals for the long-running Hardhat node, backend, and frontend.

## Package scripts

Root scripts that exist in `package.json`:

```bash
npm run compile
npm test
npm run node
npm run deploy:local
npm run seed:local
npm run backend
npm run frontend
npm run frontend:start
npm run backend:start
npm run frontend:install
npm run backend:install
```

Frontend scripts:

```bash
npm run dev --prefix frontend
npm run build --prefix frontend
npm run preview --prefix frontend
```

Backend scripts:

```bash
npm start --prefix backend
npm run dev --prefix backend
```

## MetaMask local Hardhat setup

Add or switch MetaMask to the local Hardhat network:

- Network name: `Hardhat Localhost 31337`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Recommended demo account roles:

| Role | Hardhat account |
| --- | --- |
| Deployer / reward owner | Account #0 |
| Creator / initial seller | Account #1 |
| Buyer | Account #2 |
| Resale buyer | Account #3 |

Import the private keys printed by `npx hardhat node` for those local test accounts only. They are public development keys for the local Hardhat network and must never be reused for real funds.

## How to test x402 mock route manually

Start the backend:

```bash
npm run backend
```

Unpaid request, expected HTTP `402`:

```bash
curl -i http://127.0.0.1:4000/api/paid-preview/1
```

Mock-paid request, expected HTTP `200` and protected demo JSON:

```bash
curl -i -H "x-printchain-demo-payment: paid" http://127.0.0.1:4000/api/paid-preview/1
```

## What is real vs mocked

| Area | Status |
| --- | --- |
| Solidity contracts | Real local Hardhat contracts |
| ERC20 PRINT token | Real ERC20 on local Hardhat |
| ERC721 license NFT | Real ERC721 on local Hardhat |
| Marketplace ETH purchase | Real local ETH transaction |
| 10% creator royalty in marketplace | Real in `PrintMarketplace.buyLicense` |
| Ownership history/timestamps | Real on-chain records |
| File storage | Mock/demo by default; full files are not stored on-chain |
| IPFS CIDs | Mock/demo CIDs by default unless a future backend proxy is configured |
| Preview images | Manually provided or mock/session metadata; no automatic 3D preview generation |
| x402 | Mock/demo HTTP 402 route only; no real settlement |
| Sepolia/mainnet | Not configured and intentionally not documented for this submission |

## School requirement mapping

| Requirement | How PrintChain satisfies it |
| --- | --- |
| DApp | React frontend plus Solidity contracts deployed to local Hardhat. |
| ERC20 token | `contracts/PrintToken.sol` implements `PrintToken` / `PRINT`. |
| NFT | `contracts/PrintLicenseNFT.sol` implements manufacturing/use license NFTs. |
| NFT with owner memory/history | NFT ownership history records mint and marketplace sale ownership changes. |
| 10% transfer to creator | `PrintMarketplace.buyLicense` calculates 10% royalty for the original creator/designer and 90% for the seller. |
| Dates stored in contracts | Mint, list, sale, and history timestamps use `block.timestamp`. |
| History accumulation | Ownership records accumulate in the NFT history array; listing and sale data are emitted and displayed. |
| IPFS document/file upload or mock/demo upload | Frontend mock upload creates CID-like values and metadata for local review; docs clearly label it as mocked. |
| MetaMask | Frontend connects to MetaMask and uses the connected wallet for transactions. |
| web3.js | Frontend imports and uses `web3` for contract interaction. |
| Complex smart contract | NFT + marketplace include license metadata, controlled transfers, royalties, listing lifecycle, and history. |
| x402 / HTTP 402 demo | Backend route returns `402` without mock proof and protected JSON with mock proof. |

## More documentation

- `docs/SETUP.md` — detailed setup and local deployment instructions.
- `docs/DEMO_FLOW.md` — ordered reviewer demo scenario.
- `docs/PROJECT_PLAN.md` — phase completion summary and project explanation.
