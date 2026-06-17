const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");
const { BrowserProvider, ContractFactory, formatEther, parseEther } = require("ethers");

const FRONTEND_CONFIG_PATH = path.join(__dirname, "..", "frontend", "src", "config", "contracts.json");

async function deployContract(contractName, signer, args = []) {
  const artifact = await hre.artifacts.readArtifact(contractName);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return { contract, artifact };
}

function writeFrontendConfig({ chainId, networkName, deployer, contracts }) {
  const config = {
    generatedAt: new Date().toISOString(),
    network: {
      name: networkName,
      chainId: chainId.toString(),
      note: "Local development deployment only. Do not use with mainnet or real funds."
    },
    deployer,
    contracts
  };

  fs.mkdirSync(path.dirname(FRONTEND_CONFIG_PATH), { recursive: true });
  fs.writeFileSync(FRONTEND_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
  return config;
}

async function main() {
  const provider = new BrowserProvider(hre.network.provider, undefined, { cacheTimeout: -1 });
  const deployer = await provider.getSigner(0);
  const deployerAddress = await deployer.getAddress();
  const network = await provider.getNetwork();

  console.log("Deploying PrintChain Phase 4 local contracts...");
  console.log(`Network: ${hre.network.name} (chainId ${network.chainId})`);
  console.log(`Deployer: ${deployerAddress}`);

  const initialPrintSupply = parseEther("1000000");

  const { contract: printToken, artifact: printTokenArtifact } = await deployContract("PrintToken", deployer, [initialPrintSupply]);
  const printTokenAddress = await printToken.getAddress();
  console.log(`PrintToken deployed: ${printTokenAddress}`);
  console.log(`Initial PRINT supply minted to deployer: ${formatEther(initialPrintSupply)} PRINT`);

  const { contract: printLicenseNFT, artifact: printLicenseNFTArtifact } = await deployContract("PrintLicenseNFT", deployer);
  const printLicenseNFTAddress = await printLicenseNFT.getAddress();
  console.log(`PrintLicenseNFT deployed: ${printLicenseNFTAddress}`);

  const { contract: printMarketplace, artifact: printMarketplaceArtifact } = await deployContract("PrintMarketplace", deployer, [printLicenseNFTAddress]);
  const printMarketplaceAddress = await printMarketplace.getAddress();
  console.log(`PrintMarketplace deployed: ${printMarketplaceAddress}`);

  const controllerTx = await printLicenseNFT.setTransferController(printMarketplaceAddress);
  await controllerTx.wait();
  console.log(`PrintLicenseNFT transfer controller set to marketplace: ${printMarketplaceAddress}`);

  const config = writeFrontendConfig({
    chainId: network.chainId,
    networkName: hre.network.name,
    deployer: deployerAddress,
    contracts: {
      PrintToken: {
        address: printTokenAddress,
        abi: printTokenArtifact.abi
      },
      PrintLicenseNFT: {
        address: printLicenseNFTAddress,
        abi: printLicenseNFTArtifact.abi
      },
      PrintMarketplace: {
        address: printMarketplaceAddress,
        abi: printMarketplaceArtifact.abi
      }
    }
  });

  console.log(`Frontend contract config written to ${path.relative(process.cwd(), FRONTEND_CONFIG_PATH)}`);
  console.log("PRINT remains a reward token contract; marketplace purchases use ETH.");
  console.log(JSON.stringify({
    chainId: config.network.chainId,
    PrintToken: printTokenAddress,
    PrintLicenseNFT: printLicenseNFTAddress,
    PrintMarketplace: printMarketplaceAddress
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
