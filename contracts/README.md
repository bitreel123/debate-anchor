# VerdictRegistry — 0G Chain contract

Anchors every debate's transcript hash + storage root on **0G Galileo testnet** (chainId `16601`).

## Deploy (one-time)

```bash
cd contracts
npm install --no-save hardhat @nomicfoundation/hardhat-ethers ethers dotenv
echo "DEPLOYER_PRIVATE_KEY=0xYOUR_FUNDED_TESTNET_KEY" > .env
npx hardhat --config hardhat.config.cjs run scripts/deploy.cjs --network galileo
```

You need testnet **OG** in the deployer wallet — faucet: <https://faucet.0g.ai>.

The script prints the deployed address. Paste it as a project secret:

```
VITE_VERDICT_REGISTRY_ADDRESS=0x...
```

After that, the dashboard's "Anchor to 0G Chain" button will write each debate
to your contract from the user's connected MetaMask wallet.
