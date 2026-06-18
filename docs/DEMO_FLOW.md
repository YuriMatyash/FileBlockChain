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
