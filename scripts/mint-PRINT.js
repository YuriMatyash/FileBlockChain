// This script mints PRINT tokens to a specified recipient address.
// usage:
// npx hardhat run scripts/mint-print.js --network localhost

const hre = require("hardhat");
const contracts = require("../frontend/src/config/contracts.json");

// =====================
// Hyperparameters
// =====================
const RECIPIENT_ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const AMOUNT_PRINT = "100";
// =====================

async function main() {
  const [owner] = await hre.ethers.getSigners();

  const printTokenAddress = contracts.PrintToken;

  const printToken = await hre.ethers.getContractAt(
    "PrintToken",
    printTokenAddress
  );

  const balanceBefore = await printToken.balanceOf(RECIPIENT_ADDRESS);

  console.log("=================================");
  console.log("Mint PRINT Tokens");
  console.log("=================================");
  console.log("Owner address:     ", owner.address);
  console.log("PrintToken address:", printTokenAddress);
  console.log("Recipient address: ", RECIPIENT_ADDRESS);
  console.log("Amount to mint:    ", AMOUNT_PRINT, "PRINT");
  console.log("---------------------------------");
  console.log(
    "Balance before:   ",
    hre.ethers.formatEther(balanceBefore),
    "PRINT"
  );

  const tx = await printToken
    .connect(owner)
    .mintReward(
      RECIPIENT_ADDRESS,
      hre.ethers.parseEther(AMOUNT_PRINT)
    );

  console.log("Mint transaction:  ", tx.hash);

  await tx.wait();

  const balanceAfter = await printToken.balanceOf(RECIPIENT_ADDRESS);

  console.log(
    "Balance after:    ",
    hre.ethers.formatEther(balanceAfter),
    "PRINT"
  );
  console.log("---------------------------------");
  console.log("Mint complete.");
  console.log("=================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});