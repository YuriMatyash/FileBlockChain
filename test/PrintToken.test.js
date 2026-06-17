const assert = require("node:assert/strict");
const hre = require("hardhat");
const { ContractFactory, BrowserProvider, parseEther, ZeroAddress } = require("ethers");

async function deployPrintToken(initialSupply) {
  const provider = new BrowserProvider(hre.network.provider);
  const deployer = await provider.getSigner(0);
  const artifact = await hre.artifacts.readArtifact("PrintToken");
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const token = await factory.deploy(initialSupply);
  await token.waitForDeployment();

  return { provider, deployer, token };
}

async function assertRejectsWith(promise, message) {
  try {
    await promise;
  } catch (error) {
    assert.match(error.message, message);
    return;
  }

  assert.fail("Expected transaction to revert");
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
    const rewardAmount = parseEther("100");

    await assertRejectsWith(
      token.connect(nonOwner).mintReward(await recipient.getAddress(), rewardAmount),
      /OwnableUnauthorizedAccount/
    );
  });

  it("prevents minting rewards to the zero address", async function () {
    const rewardAmount = parseEther("100");

    await assertRejectsWith(
      token.mintReward(ZeroAddress, rewardAmount),
      /ERC20InvalidReceiver/
    );
  });
});
