# PrintChain

PrintChain is a Web3 DApp marketplace for digital manufacturing files. Each NFT in the finished project will represent a license to use, print, or manufacture the digital model/file.

> Current status: **Phase 2**. The repository now includes the `PrintToken` ERC20 reward token and the `PrintLicenseNFT` ERC721 manufacturing/use license NFT with minting, IPFS CID metadata storage, and on-chain ownership history. Marketplace, IPFS upload, frontend, and x402 functionality are intentionally not implemented yet.

## Project structure

```text
contracts/              Solidity contracts, including PrintToken and PrintLicenseNFT
scripts/                Hardhat deployment and demo seed scripts
test/                   Smart contract tests for PrintToken and PrintLicenseNFT
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

Phase 2 intentionally does not include:

- marketplace implementation
- IPFS upload implementation
- x402 payment verification
- real deployment or testnet configuration

Those features will be added in later phases only.

## Phase 1 — PrintToken reward token

`PrintToken` (`PRINT`) is the ERC20 reward token for PrintChain. It is intended for creator and buyer participation rewards in later phases, not as the primary marketplace payment currency. NFT license purchases will be implemented later through ETH-based marketplace flows and the x402-style demo.

The Phase 1 contract mints an initial supply to the deployer and lets only the contract owner mint additional reward tokens with `mintReward(address to, uint256 amount)`.


## Phase 2 — PrintLicenseNFT manufacturing/use licenses

`PrintLicenseNFT` (`PML`) is an ERC721 token where each NFT represents a license to use, print, or manufacture the digital model/file. The contract stores license metadata such as title, description, creator address, IPFS file CID, metadata CID/token URI, creation timestamp, suggested initial price, and ownership/license history. It does not store the manufacturing file itself on-chain.

Direct wallet-to-wallet NFT transfer is intentionally restricted because creator royalties must be enforced by the marketplace in a later phase. Minting is allowed, and the contract owner or a configured future transfer controller can perform controlled transfers for later marketplace integration. Phase 2 does not implement marketplace buying, ETH payments, IPFS upload logic, x402, or frontend UI.
