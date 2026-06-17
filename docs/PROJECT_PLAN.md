# PrintChain Project Plan

PrintChain is implemented strictly in phases. This repository currently contains Phase 2 NFT license contract work in addition to the earlier setup and PrintToken phases.

Later phases will add contracts, tests, deployment scripts, frontend marketplace flows, IPFS, and the x402 demo.

## Solidity version note

Phase 0 configures Hardhat to compile Solidity `0.8.28`. Future contracts should use a compatible pragma such as `^0.8.20`, which is compatible with OpenZeppelin Contracts 5.x and this compiler setting.


## Phase 2 status

Phase 2 adds `contracts/PrintLicenseNFT.sol` and `test/PrintLicenseNFT.test.js`. The NFT is a manufacturing/use license token, stores IPFS CIDs and token URI data, records the first ownership history entry at mint time, and restricts direct wallet transfers so future marketplace sales can enforce royalties and history updates.
