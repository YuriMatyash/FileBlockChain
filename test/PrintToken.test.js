const assert = require("node:assert/strict");
const hre = require("hardhat");
const { ContractFactory, BrowserProvider, id, parseEther, ZeroAddress } = require("ethers");

const ERC20_INVALID_RECEIVER_SELECTOR = id("ERC20InvalidReceiver(address)").slice(0, 10);
const OWNABLE_UNAUTHORIZED_ACCOUNT_SELECTOR = id("OwnableUnauthorizedAccount(address)").slice(0, 10);

async function deployPrintToken(initialSupply) {
  const provider = new BrowserProvider(hre.network.provider);
  const deployer = await provider.getSigner(0);
  const artifact = await hre.artifacts.readArtifact("PrintToken");
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const token = await factory.deploy(initialSupply);
  await token.waitForDeployment();

  return { provider, deployer, token };
}

function collectErrorData(error, values = []) {
  if (!error || typeof error !== "object") {
    return values;
  }

  if (typeof error.data === "string") {
    values.push(error.data);
  }

  if (typeof error.error?.data === "string") {
    values.push(error.error.data);
  }

  if (typeof error.info?.error?.data === "string") {
    values.push(error.info.error.data);
  }

  if (Array.isArray(error.errors)) {
    for (const nestedError of error.errors) {
      collectErrorData(nestedError, values);
    }
  }

  if (error.cause) {
    collectErrorData(error.cause, values);
  }

  return values;
}

async function assertRevertsWithSelector(promise, expectedSelector) {
  try {
    await promise;
  } catch (error) {
    const revertData = collectErrorData(error);
    const serializedError = JSON.stringify(error, Object.getOwnPropertyNames(error));

    assert.ok(
      revertData.some((data) => data.startsWith(expectedSelector)) || serializedError.includes(expectedSelector),
      `Expected revert selector ${expectedSelector}, but received: ${JSON.stringify(revertData)}`
    );
    return;
  }

  assert.fail(`Expected transaction to revert with selector ${expectedSelector}`);
}

describe("PrintToken", function () {
  let provider;
  let token;
  let deployer;
  let recipient;
  let nonOwner;
  let initialSupply;

  beforeEach(async function () {
    initialSupply = parseEther("1000000");
    ({ provider, deployer, token } = await deployPrintToken(initialSupply));
    recipient = await provider.getSigner(1);
    nonOwner = await provider.getSigner(2);
  });

  it("has the correct token name", async function () {
    assert.equal(await token.name(), "PrintToken");
  });

  it("has the correct token symbol", async function () {
    assert.equal(await token.symbol(), "PRINT");
  });

  it("mints the initial supply to the deployer", async function () {
    assert.equal(await token.totalSupply(), initialSupply);
    assert.equal(await token.balanceOf(await deployer.getAddress()), initialSupply);
  });

  it("allows token transfers", async function () {
    const transferAmount = parseEther("250");

    await token.transfer(await recipient.getAddress(), transferAmount);

    assert.equal(await token.balanceOf(await recipient.getAddress()), transferAmount);
    assert.equal(await token.balanceOf(await deployer.getAddress()), initialSupply - transferAmount);
  });

  it("allows the owner to mint reward tokens", async function () {
    const rewardAmount = parseEther("100");

    await token.mintReward(await recipient.getAddress(), rewardAmount);

    assert.equal(await token.balanceOf(await recipient.getAddress()), rewardAmount);
    assert.equal(await token.totalSupply(), initialSupply + rewardAmount);
  });

  it("prevents non-owners from minting reward tokens", async function () {
    const recipientAddress = await recipient.getAddress();
    const rewardAmount = parseEther("100");

    await assertRevertsWithSelector(
      token.connect(nonOwner).mintReward(recipientAddress, rewardAmount),
      OWNABLE_UNAUTHORIZED_ACCOUNT_SELECTOR
    );

    assert.equal(await token.balanceOf(recipientAddress), 0n);
    assert.equal(await token.totalSupply(), initialSupply);
  });

  it("prevents minting rewards to the zero address", async function () {
    const rewardAmount = parseEther("100");

    await assertRevertsWithSelector(
      token.mintReward(ZeroAddress, rewardAmount),
      ERC20_INVALID_RECEIVER_SELECTOR
    );

    assert.equal(await token.totalSupply(), initialSupply);
  });
});
