// Deploys VerdictRegistry to 0G Galileo testnet.
// Usage:
//   cd contracts
//   echo "DEPLOYER_PRIVATE_KEY=0x..." > .env
//   npx hardhat --config hardhat.config.cjs run scripts/deploy.cjs --network galileo
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(bal), "OG");

  const Factory = await hre.ethers.getContractFactory("VerdictRegistry");
  const c = await Factory.deploy();
  await c.waitForDeployment();
  const addr = await c.getAddress();
  console.log("\nVerdictRegistry deployed →", addr);
  console.log("Explorer: https://chainscan-galileo.0g.ai/address/" + addr);
  console.log("\nAdd this to your project .env:");
  console.log("VITE_VERDICT_REGISTRY_ADDRESS=" + addr);
}

main().catch((e) => { console.error(e); process.exit(1); });
