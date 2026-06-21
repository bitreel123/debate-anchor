// One-shot script: add OG into the broker ledger so /chat calls can be paid.
// Usage:  BROKER_PRIVATE_KEY=0x... node scripts/topup.js 0.05
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";

const RPC = process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai";
const PK  = process.env.BROKER_PRIVATE_KEY;
const AMOUNT = process.argv[2] || "0.05";

if (!PK) { console.error("BROKER_PRIVATE_KEY required"); process.exit(1); }

const wallet = new ethers.Wallet(PK, new ethers.JsonRpcProvider(RPC));
const broker = await createZGComputeNetworkBroker(wallet);

try {
  await broker.ledger.addLedger(AMOUNT);
  console.log(`✓ ledger created with ${AMOUNT} OG`);
} catch {
  await broker.ledger.depositFund(AMOUNT);
  console.log(`✓ deposited ${AMOUNT} OG into existing ledger`);
}
const ledger = await broker.ledger.getLedger();
console.log("ledger:", ledger);
