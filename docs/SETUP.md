# PrintChain Setup Guide

This guide shows how to run PrintChain locally for review. PrintChain is an educational local DApp marketplace where each NFT represents a license to use, print, or manufacture a digital manufacturing model/file.

## Safety and scope

- Use only the local Hardhat network (`31337`).
- Do not use mainnet or real funds.
- Do not commit real API keys, private keys, seed phrases, Pinata keys, or payment credentials.
- The default IPFS behavior is mock/demo CID generation.
- The x402 route is a mock/demo HTTP `402 Payment Required` flow with no real settlement.

## 1. Install dependencies

From the repository root:

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

## 2. Compile and test contracts

```bash
npm run compile
npm test
```

## 3. Start the local Hardhat chain

Open terminal 1:

```bash
npx hardhat node
```

Keep this terminal running. It prints local test account addresses and private keys. Use those keys only for this local demo.

## 4. Deploy local contracts

Open terminal 2:

```bash
npm run deploy:local
```

The deploy script deploys:

1. `PrintToken`
2. `PrintLicenseNFT`
3. `PrintMarketplace`

It also calls `PrintLicenseNFT.setTransferController(PrintMarketplace)` so marketplace sales can transfer NFTs while direct wallet-to-wallet transfers remain restricted.

Deployment writes local frontend config to:

```text
frontend/src/config/contracts.json
```

That file contains local addresses and ABIs. It is not mainnet configuration.

## 5. Seed demo data

With the Hardhat node still running:

```bash
npm run seed:local
```

The seed script:

- Uses Hardhat account #1 as the demo creator/seller.
- Mints demo PRINT rewards to the creator.
- Mints one sample manufacturing/use license NFT.
- Uses fake/demo IPFS CIDs.
- Lists the NFT for sale in ETH.

## 6. Start the backend mock x402 route

Open terminal 3:

```bash
npm run backend
```

Default backend URL:

```text
http://127.0.0.1:4000
```

Health check:

```bash
curl http://127.0.0.1:4000/health
```

## 7. Start the frontend

Open terminal 4:

```bash
npm run frontend
```

Default Vite URL:

```text
http://127.0.0.1:5173
```

## 8. Connect MetaMask to Hardhat 31337

Add/select this network in MetaMask:

- Network name: `Hardhat Localhost 31337`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Recommended local account roles:

| Role | Hardhat account | Purpose |
| --- | --- | --- |
| Deployer / reward owner | Account #0 | Deploys contracts and owns PRINT minting permission. |
| Creator / seller | Account #1 | Mints or owns the first demo license NFT. |
| Buyer | Account #2 | Buys the first listing. |
| Resale buyer | Account #3 | Buys from the buyer during resale. |

Import the local private keys printed by `npx hardhat node` for these accounts. Do not reuse those keys outside local development.

## Environment files

Example files contain placeholders only:

- `.env.example`
- `frontend/.env.example`
- `backend/.env.example`

Optional local copies:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Leave `VITE_IPFS_UPLOAD_ENDPOINT` empty for safe mock/demo CID generation. Do not put real IPFS provider secrets in frontend environment files.

## Testing x402 manually

Unpaid request should return HTTP `402`:

```bash
curl -i http://127.0.0.1:4000/api/paid-preview/1
```

Mock-paid request should return HTTP `200` protected demo JSON:

```bash
curl -i -H "x-printchain-demo-payment: paid" http://127.0.0.1:4000/api/paid-preview/1
```

Equivalent mock-paid query form:

```bash
curl -i "http://127.0.0.1:4000/api/paid-preview/1?demoPaid=true"
```
