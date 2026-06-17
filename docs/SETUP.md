# Setup

PrintChain is currently ready through **Phase 4** for local contract deployment and demo seeding.

## Install dependencies

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

## Compile and test contracts

```bash
npm run compile
npm test
```

## Local deployment

Open one terminal and start the local Hardhat chain:

```bash
npm run node
```

In a second terminal, deploy the Phase 4 contracts to that local chain:

```bash
npm run deploy:local
```

The deploy script deploys contracts in this order:

1. `PrintToken`
2. `PrintLicenseNFT`
3. `PrintMarketplace`

After deployment, it calls `PrintLicenseNFT.setTransferController(PrintMarketplace)` so marketplace purchases can perform controlled transfers and keep ownership history accurate.

The script prints all deployed addresses and writes a frontend-readable config file to:

```text
frontend/src/config/contracts.json
```

That file contains local-only addresses and ABIs for `PrintToken`, `PrintLicenseNFT`, and `PrintMarketplace`.

## Seed local demo data

After deployment, seed one sample manufacturing/use license NFT with fake IPFS CIDs and list it for sale in ETH:

```bash
npm run seed:local
```

The seed script:

- reads `frontend/src/config/contracts.json`
- mints demo PRINT reward tokens to a local creator account
- mints one sample license NFT using fake `ipfs://` metadata/file CIDs
- lists that NFT for `1 ETH` on `PrintMarketplace`

No real IPFS upload is performed in Phase 4.

## Payment and token notes

Marketplace purchases use local test ETH. `PRINT` is currently deployed as a reward token contract and is not the marketplace purchase currency.

## Not included yet

Phase 4 does **not** add frontend UI, IPFS upload, x402/HTTP 402 routes, Sepolia deployment, mainnet configuration, private keys, seed phrases, or API secrets.
