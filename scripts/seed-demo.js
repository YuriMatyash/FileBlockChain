const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");
const { BrowserProvider, Contract, formatEther, parseEther } = require("ethers");

const FRONTEND_CONFIG_PATH = path.join(__dirname, "..", "frontend", "src", "config", "contracts.json");

function readFrontendConfig() {
  if (!fs.existsSync(FRONTEND_CONFIG_PATH)) {
    throw new Error("Missing frontend/src/config/contracts.json. Run `npx hardhat run scripts/deploy.js --network localhost` first.");
  }
  return JSON.parse(fs.readFileSync(FRONTEND_CONFIG_PATH, "utf8"));
}

async function main() {
  const config = readFrontendConfig();
  const provider = new BrowserProvider(hre.network.provider, undefined, { cacheTimeout: -1 });
  const network = await provider.getNetwork();

  if (config.network.chainId !== network.chainId.toString()) {
    throw new Error(`Config chainId ${config.network.chainId} does not match current network chainId ${network.chainId}. Redeploy locally first.`);
  }

  const deployer = await provider.getSigner(0);
  const creator = await provider.getSigner(1);
  const deployerAddress = await deployer.getAddress();
  const creatorAddress = await creator.getAddress();

  const printToken = new Contract(config.contracts.PrintToken.address, config.contracts.PrintToken.abi, deployer);
  const printLicenseNFT = new Contract(config.contracts.PrintLicenseNFT.address, config.contracts.PrintLicenseNFT.abi, creator);
  const printMarketplace = new Contract(config.contracts.PrintMarketplace.address, config.contracts.PrintMarketplace.abi, creator);

  console.log("Seeding PrintChain local demo data...");
  console.log(`Network: ${hre.network.name} (chainId ${network.chainId})`);
  console.log(`Deployer/reward owner: ${deployerAddress}`);
  console.log(`Demo creator: ${creatorAddress}`);

  const rewardAmount = parseEther("100");
  await (await printToken.mintReward(creatorAddress, rewardAmount)).wait();
  console.log(`Minted demo reward tokens: ${formatEther(rewardAmount)} PRINT to ${creatorAddress}`);

  const initialPrice = parseEther("0.25");
  const metadataCid = "bafybeigdemo000000000000000000000000000000000000000metadata";
  const fileCid = "bafybeigdemo000000000000000000000000000000000000000stlfile";
  const previewCid = "bafybeigdemo000000000000000000000000000000000000preview";

  const mintTx = await printLicenseNFT.mintLicense(
    "Demo Parametric Bracket License",
    "Each NFT represents a license to use, print, or manufacture the digital model/file.",
    fileCid,
    metadataCid,
    `ipfs://${metadataCid}`,
    initialPrice
  );
  const mintReceipt = await mintTx.wait();
  const mintedEvent = mintReceipt.logs
    .map((log) => {
      try { return printLicenseNFT.interface.parseLog(log); } catch (_) { return null; }
    })
    .find((event) => event && event.name === "LicenseMinted");
  const tokenId = mintedEvent ? mintedEvent.args.tokenId : 1n;
  console.log(`Minted demo manufacturing/use license NFT tokenId ${tokenId}`);
  console.log(`Fake IPFS file CID: ${fileCid}`);
  console.log(`Fake IPFS metadata CID: ${metadataCid}`);
  console.log(`Fake IPFS preview CID for later UI phases: ${previewCid}`);

  const salePrice = parseEther("1");
  await (await printMarketplace.listLicense(tokenId, salePrice)).wait();
  console.log(`Listed tokenId ${tokenId} for ${formatEther(salePrice)} ETH through PrintMarketplace`);
  console.log("Seed complete. Demo data uses fake/mock IPFS CIDs. The final project includes the frontend and mock x402 backend demo.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
