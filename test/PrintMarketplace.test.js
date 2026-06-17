const assert = require("node:assert/strict");
const hre = require("hardhat");
const { ContractFactory, BrowserProvider, parseEther } = require("ethers");

async function deployContract(name, signer, args = []) {
  const artifact = await hre.artifacts.readArtifact(name);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

async function deployFixture() {
  const provider = new BrowserProvider(hre.network.provider, undefined, { cacheTimeout: -1 });
  const deployer = await provider.getSigner(0);
  const creator = await provider.getSigner(1);
  const buyer = await provider.getSigner(2);
  const secondBuyer = await provider.getSigner(3);

  const nft = await deployContract("PrintLicenseNFT", deployer);
  const marketplace = await deployContract("PrintMarketplace", deployer, [await nft.getAddress()]);
  await (await nft.connect(deployer).setTransferController(await marketplace.getAddress())).wait();

  return { provider, deployer, creator, buyer, secondBuyer, nft, marketplace };
}

async function mintExampleLicense(nft, creator) {
  await (await nft.connect(creator).mintLicense(
    "Parametric CNC Bracket License",
    "Each NFT represents a license to use, print, or manufacture the digital model/file.",
    "bafy-file-cid",
    "bafy-metadata-cid",
    "ipfs://bafy-metadata-cid",
    parseEther("1")
  )).wait();

  return 1n;
}

function collectErrorData(error, values = []) {
  if (!error || typeof error !== "object") return values;
  if (typeof error.data === "string") values.push(error.data);
  if (typeof error.info?.error?.data === "string") values.push(error.info.error.data);
  if (typeof error.error?.data === "string") values.push(error.error.data);
  if (error.cause && error.cause !== error) collectErrorData(error.cause, values);
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

describe("PrintMarketplace", function () {
  let provider;
  let creator;
  let buyer;
  let secondBuyer;
  let nft;
  let marketplace;
  let tokenId;

  beforeEach(async function () {
    ({ provider, creator, buyer, secondBuyer, nft, marketplace } = await deployFixture());
    tokenId = await mintExampleLicense(nft, creator);
  });

  it("lists an owned NFT", async function () {
    const price = parseEther("1");
    const tx = await marketplace.connect(creator).listLicense(tokenId, price);
    const receipt = await tx.wait();
    const block = await provider.getBlock(receipt.blockNumber);

    const listing = await marketplace.getListing(tokenId);
    assert.equal(listing.tokenId, tokenId);
    assert.equal(listing.seller, await creator.getAddress());
    assert.equal(listing.price, price);
    assert.equal(listing.listedAt, BigInt(block.timestamp));
    assert.equal(listing.active, true);

    const activeListings = await marketplace.getActiveListings();
    assert.equal(activeListings.length, 1);
    assert.equal(activeListings[0].tokenId, tokenId);
  });

  it("rejects listing by non-owner", async function () {
    await assertRevertsWithSelector(
      marketplace.connect(buyer).listLicense(tokenId, parseEther("1")),
      marketplace.interface.getError("NotLicenseOwner").selector
    );
  });

  it("rejects zero-price listing", async function () {
    await assertRevertsWithSelector(
      marketplace.connect(creator).listLicense(tokenId, 0n),
      marketplace.interface.getError("ZeroPrice").selector
    );
  });

  it("rejects double listing", async function () {
    await (await marketplace.connect(creator).listLicense(tokenId, parseEther("1"))).wait();

    await assertRevertsWithSelector(
      marketplace.connect(creator).listLicense(tokenId, parseEther("2")),
      marketplace.interface.getError("AlreadyListed").selector
    );
  });

  it("cancels a listing", async function () {
    await (await marketplace.connect(creator).listLicense(tokenId, parseEther("1"))).wait();
    await (await marketplace.connect(creator).cancelListing(tokenId)).wait();

    const listing = await marketplace.getListing(tokenId);
    assert.equal(listing.active, false);
    assert.equal((await marketplace.getActiveListings()).length, 0);
  });

  it("rejects cancel by non-seller", async function () {
    await (await marketplace.connect(creator).listLicense(tokenId, parseEther("1"))).wait();

    await assertRevertsWithSelector(
      marketplace.connect(buyer).cancelListing(tokenId),
      marketplace.interface.getError("NotListingSeller").selector
    );
  });

  it("buys a listed NFT with ETH and transfers ownership to the buyer", async function () {
    const price = parseEther("1");
    await (await marketplace.connect(creator).listLicense(tokenId, price)).wait();

    await (await marketplace.connect(buyer).buyLicense(tokenId, { value: price })).wait();

    assert.equal(await nft.ownerOf(tokenId), await buyer.getAddress());
  });

  it("pays the original creator 10% royalty and the seller 90% on resale", async function () {
    const firstSalePrice = parseEther("1");
    await (await marketplace.connect(creator).listLicense(tokenId, firstSalePrice)).wait();
    await (await marketplace.connect(buyer).buyLicense(tokenId, { value: firstSalePrice })).wait();

    const resalePrice = parseEther("2");
    await (await marketplace.connect(buyer).listLicense(tokenId, resalePrice)).wait();

    const creatorBefore = await provider.getBalance(await creator.getAddress());
    const sellerBefore = await provider.getBalance(await buyer.getAddress());

    await (await marketplace.connect(secondBuyer).buyLicense(tokenId, { value: resalePrice })).wait();

    const creatorAfter = await provider.getBalance(await creator.getAddress());
    const sellerAfter = await provider.getBalance(await buyer.getAddress());

    assert.equal(creatorAfter - creatorBefore, resalePrice / 10n);
    assert.equal(sellerAfter - sellerBefore, (resalePrice * 9n) / 10n);
    assert.equal(await nft.ownerOf(tokenId), await secondBuyer.getAddress());
  });

  it("cleans up the listing after purchase", async function () {
    const price = parseEther("1");
    await (await marketplace.connect(creator).listLicense(tokenId, price)).wait();
    await (await marketplace.connect(buyer).buyLicense(tokenId, { value: price })).wait();

    const listing = await marketplace.getListing(tokenId);
    assert.equal(listing.active, false);
    assert.equal((await marketplace.getActiveListings()).length, 0);
  });

  it("adds a SALE record to NFT ownership history", async function () {
    const price = parseEther("1");
    await (await marketplace.connect(creator).listLicense(tokenId, price)).wait();
    const tx = await marketplace.connect(buyer).buyLicense(tokenId, { value: price });
    const receipt = await tx.wait();
    const block = await provider.getBlock(receipt.blockNumber);

    const history = await nft.getOwnershipHistory(tokenId);
    assert.equal(history.length, 2);
    assert.equal(history[1].previousOwner, await creator.getAddress());
    assert.equal(history[1].newOwner, await buyer.getAddress());
    assert.equal(history[1].price, price);
    assert.equal(history[1].timestamp, BigInt(block.timestamp));
    assert.equal(history[1].actionType, "SALE");
  });

  it("rejects purchase with wrong ETH amount", async function () {
    const price = parseEther("1");
    await (await marketplace.connect(creator).listLicense(tokenId, price)).wait();

    await assertRevertsWithSelector(
      marketplace.connect(buyer).buyLicense(tokenId, { value: parseEther("0.5") }),
      marketplace.interface.getError("IncorrectEthAmount").selector
    );
  });

  it("rejects buying your own listing", async function () {
    const price = parseEther("1");
    await (await marketplace.connect(creator).listLicense(tokenId, price)).wait();

    await assertRevertsWithSelector(
      marketplace.connect(creator).buyLicense(tokenId, { value: price }),
      marketplace.interface.getError("CannotBuyOwnListing").selector
    );
  });

  it("rejects buying unlisted NFT", async function () {
    await assertRevertsWithSelector(
      marketplace.connect(buyer).buyLicense(tokenId, { value: parseEther("1") }),
      marketplace.interface.getError("NotListed").selector
    );
  });

  it("keeps direct wallet-to-wallet NFT transfers restricted", async function () {
    await assertRevertsWithSelector(
      nft.connect(creator).transferFrom(await creator.getAddress(), await buyer.getAddress(), tokenId),
      nft.interface.getError("DirectTransfersRestricted").selector
    );
  });
});
