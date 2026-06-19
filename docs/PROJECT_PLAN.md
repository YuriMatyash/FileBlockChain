# PrintChain Project Plan and Final Status

PrintChain was built in phases as a local educational Web3 DApp marketplace for digital manufacturing files. The final submission focuses on local Hardhat review rather than testnet/mainnet deployment.

## Project summary

PrintChain lets creators mint manufacturing/use license NFTs for digital manufacturing files. Supported examples include STL, STEP, 3MF, G-code, CNC files, ZIP packages, PDF instructions, technical drawings, and preview renders.

The required product wording is central to the project:

> Each NFT represents a license to use, print, or manufacture the digital model/file.

## Final architecture

| Layer | Implementation |
| --- | --- |
| Contracts | Hardhat + Solidity + OpenZeppelin |
| Reward token | `PrintToken` ERC20 (`PRINT`) |
| License NFT | `PrintLicenseNFT` ERC721-style manufacturing/use license token |
| Marketplace | `PrintMarketplace` ETH listings, purchases, royalties, and sales |
| Frontend | Vite + React + `web3.js` + MetaMask |
| Upload | Mock/demo IPFS adapter by default |
| Backend | Express mock x402-style HTTP 402 route |
| Network | Local Hardhat chain `31337` |

## Phase completion summary

### Phase 0 — Project setup

Completed. The repository includes root Hardhat workspace files, frontend and backend folders, environment examples, docs folder, and local npm scripts.

### Phase 1 — ERC20 reward token

Completed. `PrintToken` is an ERC20 reward token named `PrintToken` with symbol `PRINT`. It mints an initial supply to the deployer and lets the owner mint reward tokens.

### Phase 2 — License NFT contract

Completed. `PrintLicenseNFT` mints manufacturing/use license NFTs, stores creator and CID metadata, records mint timestamps, and starts ownership history on mint.

### Phase 3 — Marketplace contract

Completed. `PrintMarketplace` supports listing, canceling, and buying license NFTs with local test ETH. It calculates a 10% creator royalty and pays 90% to the seller during marketplace purchases.

### Phase 4 — Deployment scripts

Completed. `scripts/deploy.js` deploys all contracts locally and writes frontend-readable addresses/ABIs. `scripts/seed-demo.js` mints demo rewards, mints a sample license, and lists it for sale.

### Phase 5 — Frontend wallet and marketplace

Completed. The frontend connects MetaMask, uses `web3.js`, reads local contract config, shows marketplace listings, and supports buying listed NFTs.

### Phase 6 — Upload and mint flow

Completed with mock/demo upload behavior. The frontend builds ERC721-compatible metadata and uses mock CID generation by default. No real IPFS provider credentials are included.

### Phase 7 — My Licenses and history

Completed. The frontend can show licenses owned by the connected wallet, list/cancel owned licenses, and display ownership/history information.

### Phase 8 — x402 demo

Completed as a mock/demo. The backend route `GET /api/paid-preview/:tokenId` returns HTTP `402` without mock proof and protected demo JSON with mock proof. No real x402 settlement is implemented.

### Phase 9 — Documentation and final polish

Completed in this phase. README, setup guide, demo flow, and project plan were updated for final review.

## What is intentionally not included

- Mainnet configuration.
- Sepolia deployment instructions.
- Real private keys or seed phrases.
- Real IPFS provider API keys.
- Real x402 settlement/facilitator integration.
- Automatic STL/3D preview generation.
- Storage of full manufacturing files on-chain.

## Real vs mocked implementation

| Feature | Real | Mock/demo |
| --- | --- | --- |
| ERC20 PRINT contract | Yes | No |
| ERC721 license NFT contract | Yes | No |
| Marketplace ETH purchases | Yes, on local Hardhat | No |
| 10% creator royalty in marketplace | Yes | No |
| Ownership history and timestamps | Yes, on-chain | No |
| IPFS upload | No default real upload | Yes, mock CID-like values |
| Metadata rendering | Yes for local/session metadata | Mock CID storage by default |
| x402 route shape and HTTP 402 status | Yes | Payment proof/settlement is mocked |

## School requirement mapping

| School requirement | PrintChain mapping |
| --- | --- |
| DApp | React/Vite frontend plus Solidity contracts on Hardhat. |
| ERC20 token | `PrintToken.sol` implements `PrintToken` / `PRINT`. |
| NFT | `PrintLicenseNFT.sol` implements manufacturing/use license NFTs. |
| NFT with owner memory/history | Ownership history records owner changes with timestamps and prices. |
| 10% transfer to creator | `PrintMarketplace.buyLicense` pays 10% of sale price to the original creator/designer. |
| Dates stored in contracts | Minting, listing, sale, and history use `block.timestamp`. |
| History accumulation | NFT history arrays accumulate `MINT` and `SALE` records; listings and sales emit events. |
| IPFS document/file upload or mock/demo upload | Frontend creates mock/demo CIDs and metadata locally; docs identify that this is not real IPFS by default. |
| MetaMask | Frontend connects to MetaMask for accounts, network, and transaction signing. |
| web3.js | Frontend imports and uses `web3` for contract calls and transactions. |
| Complex smart contract | NFT + marketplace combine controlled transfers, ETH sale flow, creator royalties, timestamps, and history. |
| x402 / HTTP 402 demo | Backend route returns HTTP 402 without mock proof and protected JSON with mock proof. |

## Review readiness checklist

- Documentation explains PrintChain and license NFT framing.
- README and docs clearly label mock IPFS and mock x402 behavior.
- Demo command order is documented.
- MetaMask local Hardhat chain `31337` setup is documented.
- Demo account roles are documented.
- Marketplace flow covers mint, list, cancel, buy, resale, royalty, and history.
- No real secrets are required or documented.
