const assert = require("node:assert/strict");
const hre = require("hardhat");
const { ContractFactory, BrowserProvider, ZeroAddress } = require("ethers");

async function deployPrintLicenseNFT() {
  const provider = new BrowserProvider(hre.network.provider);
  const deployer = await provider.getSigner(0);
  const artifact = await hre.artifacts.readArtifact("PrintLicenseNFT");
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const nft = await factory.deploy();
  await nft.waitForDeployment();

  return { provider, deployer, nft };
}

async function mintExampleLicense(nft, creator) {
  const initialPrice = 1_500_000_000_000_000_000n;
  const tx = await nft.connect(creator).mintLicense(
    "Parametric CNC Bracket License",
    "Each NFT represents a license to use, print, or manufacture the digital model/file.",
    "bafy-file-cid",
    "bafy-metadata-cid",
    "ipfs://bafy-metadata-cid",
    initialPrice
  );
  const receipt = await tx.wait();
  const block = await creator.provider.getBlock(receipt.blockNumber);

  return { tokenId: 1n, initialPrice, timestamp: BigInt(block.timestamp) };
}

async function assertReverts(promise, expectedMessage) {
  try {
    await promise;
  } catch (error) {
    const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
    assert.ok(serialized.includes(expectedMessage), `Expected ${expectedMessage}, received ${serialized}`);
    return;
  }

  assert.fail(`Expected transaction to revert with ${expectedMessage}`);
}

function collectErrorData(error, values = []) {
  if (!error || typeof error !== "object") {
    return values;
  }

  if (typeof error.data === "string") {
    values.push(error.data);
  }

  if (typeof error.info?.error?.data === "string") {
    values.push(error.info.error.data);
  }

  if (typeof error.error?.data === "string") {
    values.push(error.error.data);
  }

  if (error.cause && error.cause !== error) {
    collectErrorData(error.cause, values);
  }

  return values;
}

async function assertRevertsWithSelector(promise, expectedSelector) {
  try {
    await promise;
  } catch (error) {
    const revertDataValues = collectErrorData(error);
    assert.ok(
      revertDataValues.some((data) => data.toLowerCase().startsWith(expectedSelector.toLowerCase())),
      `Expected revert selector ${expectedSelector}, received ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
    );
    return;
  }

  assert.fail(`Expected transaction to revert with selector ${expectedSelector}`);
}

describe("PrintLicenseNFT", function () {
  let provider;
  let deployer;
  let creator;
  let buyer;
  let nft;

  beforeEach(async function () {
    ({ provider, deployer, nft } = await deployPrintLicenseNFT());
    creator = await provider.getSigner(1);
    buyer = await provider.getSigner(2);
  });

  it("has the correct NFT name and symbol", async function () {
    assert.equal(await nft.name(), "PrintChain Manufacturing License");
    assert.equal(await nft.symbol(), "PML");
  });

  it("mints a manufacturing/use license NFT and stores the token URI", async function () {
    const { tokenId } = await mintExampleLicense(nft, creator);

    assert.equal(await nft.ownerOf(tokenId), await creator.getAddress());
    assert.equal(await nft.tokenURI(tokenId), "ipfs://bafy-metadata-cid");
  });

  it("stores and returns license information", async function () {
    const { tokenId, initialPrice, timestamp } = await mintExampleLicense(nft, creator);

    const info = await nft.getLicenseInfo(tokenId);

    assert.equal(info.tokenId, tokenId);
    assert.equal(info.creator, await creator.getAddress());
    assert.equal(info.title, "Parametric CNC Bracket License");
    assert.equal(info.description, "Each NFT represents a license to use, print, or manufacture the digital model/file.");
    assert.equal(info.fileCid, "bafy-file-cid");
    assert.equal(info.metadataCid, "bafy-metadata-cid");
    assert.equal(info.createdAt, timestamp);
    assert.equal(info.initialPrice, initialPrice);
  });

  it("records the first owner in ownership history", async function () {
    const { tokenId, initialPrice, timestamp } = await mintExampleLicense(nft, creator);

    const history = await nft.getOwnershipHistory(tokenId);

    assert.equal(history.length, 1);
    assert.equal(history[0].previousOwner, ZeroAddress);
    assert.equal(history[0].newOwner, await creator.getAddress());
    assert.equal(history[0].price, initialPrice);
    assert.equal(history[0].timestamp, timestamp);
    assert.equal(history[0].actionType, "MINT");
  });

  it("emits mint and ownership history events", async function () {
    const tx = await nft.connect(creator).mintLicense(
      "STL Fixture License",
      "License for a fixture model.",
      "bafy-fixture-file",
      "bafy-fixture-metadata",
      "ipfs://bafy-fixture-metadata",
      42n
    );
    const receipt = await tx.wait();

    const eventNames = receipt.logs
      .map((log) => {
        try {
          return nft.interface.parseLog(log)?.name;
        } catch (_error) {
          return undefined;
        }
      })
      .filter(Boolean);

    assert.ok(eventNames.includes("LicenseMinted"));
    assert.ok(eventNames.includes("OwnershipHistoryUpdated"));
  });

  it("fails when reading invalid tokens", async function () {
    await assertReverts(nft.getLicenseInfo(999n), "LicenseDoesNotExist");
    await assertReverts(nft.getOwnershipHistory(999n), "LicenseDoesNotExist");
    await assertReverts(nft.tokenURI(999n), "ERC721NonexistentToken");
  });

  it("restricts direct wallet-to-wallet transfers", async function () {
    const { tokenId } = await mintExampleLicense(nft, creator);

    const directTransfersRestrictedSelector = nft.interface.getError("DirectTransfersRestricted").selector;

    await assertRevertsWithSelector(
      nft.connect(creator).transferFrom(await creator.getAddress(), await buyer.getAddress(), tokenId),
      directTransfersRestrictedSelector
    );

    assert.equal(await nft.ownerOf(tokenId), await creator.getAddress());
  });

  it("still allows minting new licenses while direct transfers are restricted", async function () {
    await mintExampleLicense(nft, creator);

    await nft.connect(buyer).mintLicense(
      "STEP Enclosure License",
      "License for a STEP enclosure model.",
      "bafy-step-file",
      "bafy-step-metadata",
      "ipfs://bafy-step-metadata",
      100n
    );

    assert.equal(await nft.ownerOf(2n), await buyer.getAddress());
    const secondInfo = await nft.getLicenseInfo(2n);
    assert.equal(secondInfo.creator, await buyer.getAddress());
  });

  it("allows owner-controlled transfers for future marketplace integration and records history", async function () {
    const { tokenId } = await mintExampleLicense(nft, creator);
    const controlledPrice = 2_000_000_000_000_000_000n;

    const tx = await nft.controlledTransferFrom(
      await creator.getAddress(),
      await buyer.getAddress(),
      tokenId,
      controlledPrice,
      "CONTROLLED_TRANSFER"
    );
    const receipt = await tx.wait();
    const block = await provider.getBlock(receipt.blockNumber);

    assert.equal(await nft.ownerOf(tokenId), await buyer.getAddress());

    const history = await nft.getOwnershipHistory(tokenId);
    assert.equal(history.length, 2);
    assert.equal(history[1].previousOwner, await creator.getAddress());
    assert.equal(history[1].newOwner, await buyer.getAddress());
    assert.equal(history[1].price, controlledPrice);
    assert.equal(history[1].timestamp, BigInt(block.timestamp));
    assert.equal(history[1].actionType, "CONTROLLED_TRANSFER");
  });
});
