# PrintChain

PrintChain is a Web3 DApp marketplace for digital manufacturing files. Each NFT in the finished project will represent a license to use, print, or manufacture the digital model/file.

> Current status: **Phase 4**. The repository now includes local deployment and demo seed scripts for `PrintToken`, `PrintLicenseNFT`, and `PrintMarketplace`. The deploy script configures the NFT transfer controller and writes frontend-readable local contract addresses/ABIs to `frontend/src/config/contracts.json`. IPFS upload, frontend marketplace UI, testnet deployment, and x402 functionality are intentionally not implemented yet.

## Project structure

```text
contracts/              Solidity contracts, including PrintToken, PrintLicenseNFT, and PrintMarketplace
scripts/                Hardhat deployment and demo seed scripts
test/                   Smart contract tests for PrintToken, PrintLicenseNFT, and PrintMarketplace
frontend/               Vite + React frontend using web3.js
backend/                Placeholder backend for the optional x402 demo
docs/                   Setup, demo, and planning documentation
hardhat.config.js       Local Hardhat configuration
package.json            Root Hardhat workspace scripts
.env.example            Root environment placeholders
```

## Prerequisites

- Node.js 20+
- npm 10+
- MetaMask for later frontend wallet phases

## Install

Install root Hardhat dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
npm install --prefix frontend
```

Install backend dependencies if you want to run the placeholder backend:

```bash
npm install --prefix backend
```

## Environment files

Copy examples before local development:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

All values are placeholders. Do not commit real private keys, seed phrases, API keys, or mainnet configuration.


## Solidity compiler target

The local Hardhat compiler targets the Cancun EVM while keeping Solidity `0.8.28`. This is required because OpenZeppelin Contracts 5.x utilities can compile to bytecode that uses Cancun-compatible instructions such as `MCOPY`. No real deployment keys, Sepolia RPC URLs, mainnet settings, or secrets are included in this configuration.

## Run commands

Compile the Solidity project:

```bash
npm run compile
```

Start the local Hardhat network:

```bash
npm run node
```

Start the frontend:

```bash
npm run frontend:start
```

Start the placeholder backend:

```bash
npm run backend:start
```

## Phase boundaries

Phase 4 intentionally does not include:

- frontend marketplace implementation
- IPFS upload implementation
- x402 payment verification
- Sepolia, mainnet, real private keys, seed phrases, API keys, or secrets

Those features will be added in later phases only.

## Phase 1 — PrintToken reward token

`PrintToken` (`PRINT`) is the ERC20 reward token for PrintChain. It is intended for creator and buyer participation rewards, not as the primary marketplace payment currency. Phase 3 marketplace purchases use ETH.

The Phase 1 contract mints an initial supply to the deployer and lets only the contract owner mint additional reward tokens with `mintReward(address to, uint256 amount)`.


## Phase 2 — PrintLicenseNFT manufacturing/use licenses

`PrintLicenseNFT` (`PML`) is an ERC721 token where each NFT represents a license to use, print, or manufacture the digital model/file. The contract stores license metadata such as title, description, creator address, IPFS file CID, metadata CID/token URI, creation timestamp, suggested initial price, and ownership/license history. It does not store the manufacturing file itself on-chain.

Direct wallet-to-wallet NFT transfer is intentionally restricted because creator royalties must be enforced by the marketplace. Minting is allowed, and the contract owner or configured marketplace transfer controller can perform controlled transfers. Phase 2 did not implement marketplace buying, ETH payments, IPFS upload logic, x402, or frontend UI.


## Phase 3 — PrintMarketplace ETH sales and royalties

`PrintMarketplace` lets license NFT owners list manufacturing/use license NFTs for sale in ETH, cancel their own listings, and sell to buyers who send the exact listed ETH price. PRINT remains a reward token and is not used as the marketplace purchase currency.

The marketplace enforces the project royalty rule during its own purchase flow: 10% of every sale is paid to the original creator/designer recorded in `PrintLicenseNFT`, and 90% is paid to the current seller. ERC2981-style royalty information may be exposed by the NFT contract, but royalty enforcement for this project happens inside the PrintChain marketplace purchase function.

Direct wallet-to-wallet NFT transfers remain restricted. Marketplace purchases use the NFT controlled transfer mechanism so each sale records a `SALE` ownership history entry with the previous owner, new owner, ETH price, and timestamp. Listings are cleared after cancellation or purchase.

## Phase 4 — Local deployment and demo seed

Phase 4 adds local Hardhat deployment support only. The deployment script deploys `PrintToken`, `PrintLicenseNFT`, and `PrintMarketplace` in order, then authorizes the marketplace as the NFT transfer controller by calling `setTransferController`. This keeps the stronger transfer model from earlier phases: normal wallet-to-wallet license transfers are restricted, while marketplace sales can update on-chain ownership history.

Run a local node first:

```bash
npm run node
```

Deploy to the local node from a second terminal:

```bash
npm run deploy:local
```

The deploy script prints deployed addresses and writes a frontend-readable config file at `frontend/src/config/contracts.json` containing local addresses and ABIs. This config is for local development only and must not be treated as mainnet or production configuration.

To create demo data after deployment, run:

```bash
npm run seed:local
```

The seed script reads the generated config, mints demo PRINT rewards to a local creator account, mints one sample manufacturing/use license NFT with fake IPFS CIDs, and lists it for sale in ETH through the marketplace. No real IPFS upload happens in Phase 4.

`PRINT` remains a reward token contract. Marketplace purchases use local test ETH, not PRINT.
