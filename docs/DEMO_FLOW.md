# Demo Flow

The full demo flow will be documented in Phase 9. Phase 0 only initializes the workspace.

## Marketplace listing display expectation

When Phase 5 starts, the marketplace demo should make listings understandable to buyers as manufacturing/use licenses. A listing should eventually show a title, short summary, file type, category, optional manually supplied preview image/render or a placeholder, creator/designer, current seller, and ETH price. Detail screens should add longer documentation, file CID, metadata CID/token URI, ownership history, price history, and timestamps.

No automatic STL/3D preview generation, IPFS upload flow, x402 route, or frontend UI was added as part of this clarification. Those remain future phase work.

## Phase 6 upload/mint demo

1. Start the local Hardhat node and deploy contracts as in the setup guide.
2. Start the frontend with `npm run frontend`.
3. Connect MetaMask to the local Hardhat network.
4. In **Upload and mint license NFT**, choose a manufacturing file such as STL, STEP, 3MF, CNC, ZIP, PDF, or a technical drawing.
5. Optionally choose a preview image/render.
6. Enter title, summary, documentation text, file type, category, optional software/tool compatibility, and suggested initial price.
7. Submit the form. With no upload endpoint configured, the app clearly reports mock/demo CIDs. These are not real IPFS uploads.
8. Confirm the mint transaction. The NFT stores the file CID and metadata CID/tokenURI only; the full file remains off-chain or mocked for the local demo.
9. List, cancel, and buy flows continue to use the existing ETH marketplace behavior.

Do not demonstrate x402 in Phase 6; that is reserved for Phase 8.

## Phase 8 x402 / HTTP 402 protected preview demo

Phase 8 demonstrates a small x402-style access gate for protected manufacturing/use license preview data. It is intentionally a mock local flow so the core PrintChain marketplace stays focused on license NFTs, ETH purchases, royalties, PRINT rewards, and history.

### What is real

1. `GET /api/paid-preview/:tokenId` exists in the backend.
2. Requests without mock payment proof return HTTP `402 Payment Required` with JSON explaining how to provide demo proof.
3. Requests with accepted mock proof return protected preview/download information for the selected token.
4. The frontend license details view can trigger both the unpaid and mock-paid requests.

### What is mocked

- Payment verification is mocked with either the `x-printchain-demo-payment: paid` header or the `?demoPaid=true` query parameter.
- No real x402 settlement, payment facilitator, API keys, secrets, private keys, or real funds are used.
- Returned preview CIDs are demo values.
- Marketplace NFT purchases remain real smart-contract calls on the local Hardhat network using ETH through `PrintMarketplace`; this backend route does not buy or transfer NFTs.

### Run and test

1. Install and start the backend:

   ```bash
   npm install --prefix backend
   npm run backend
   ```

2. Confirm health:

   ```bash
   curl http://127.0.0.1:4000/health
   ```

3. Confirm unpaid protected access returns `402`:

   ```bash
   curl -i http://127.0.0.1:4000/api/paid-preview/1
   ```

4. Confirm mock-paid access returns protected JSON:

   ```bash
   curl -i -H "x-printchain-demo-payment: paid" http://127.0.0.1:4000/api/paid-preview/1
   ```

5. Start the frontend:

   ```bash
   npm run frontend
   ```

6. Select any license NFT details view. Click **Request unpaid preview (expect 402)**, then click **Mock pay / authorize demo access** to show the successful protected response.
