require("@nomicfoundation/hardhat-ethers");
require("dotenv").config({ path: __dirname + "/.env" });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: "./",
    artifacts: "./artifacts",
    cache: "./cache",
  },
  networks: {
    galileo: {
      url: "https://evmrpc-testnet.0g.ai",
      chainId: 16601,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};
