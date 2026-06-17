# PrintChain

PrintChain is a Web3 DApp marketplace for digital manufacturing files. Each NFT in the finished project will represent a license to use, print, or manufacture the digital model/file.

> Current status: **Phase 1**. The repository now includes the `PrintToken` ERC20 reward token and its unit tests. NFT, marketplace, IPFS, and x402 functionality are intentionally not implemented yet.

## Project structure

```text
contracts/              Solidity contracts, including the Phase 1 PrintToken reward token
scripts/                Hardhat deployment and demo seed scripts
test/                   Smart contract tests, including PrintToken unit tests
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

Phase 0 intentionally does not include:

- license NFT implementation
- marketplace implementation
- IPFS upload implementation
- x402 payment verification
- real deployment or testnet configuration

Those features will be added in later phases only.


## Phase 1 — PrintToken reward token

`PrintToken` (`PRINT`) is the ERC20 reward token for PrintChain. It is intended for creator and buyer participation rewards in later phases, not as the primary marketplace payment currency. NFT license purchases will be implemented later through ETH-based marketplace flows and the x402-style demo.

The Phase 1 contract mints an initial supply to the deployer and lets only the contract owner mint additional reward tokens with `mintReward(address to, uint256 amount)`.
