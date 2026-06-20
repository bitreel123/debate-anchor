import { Contract, keccak256, toUtf8Bytes, type JsonRpcSigner } from "ethers";
import { VERDICT_REGISTRY_ABI, VERDICT_REGISTRY_ADDRESS, OG_GALILEO } from "./og-chain";

export function transcriptHash(transcript: unknown): `0x${string}` {
  const canon = JSON.stringify(transcript);
  return keccak256(toUtf8Bytes(canon)) as `0x${string}`;
}

export async function anchorDebate(
  signer: JsonRpcSigner,
  args: {
    transcript: unknown;
    storageRoot: string;
    topic: string;
    winner: string;
    mode: "debate" | "research";
  },
) {
  if (!VERDICT_REGISTRY_ADDRESS) {
    throw new Error(
      "VerdictRegistry contract not configured. Deploy the contract (see contracts/README.md) and set VITE_VERDICT_REGISTRY_ADDRESS."
    );
  }
  const hash = transcriptHash(args.transcript);
  const c = new Contract(VERDICT_REGISTRY_ADDRESS, [...VERDICT_REGISTRY_ABI], signer);
  const modeEnum = args.mode === "debate" ? 0 : 1;
  const tx = await c.recordDebate(
    hash,
    args.storageRoot,
    args.topic.slice(0, 280),
    args.winner.slice(0, 64),
    modeEnum,
  );
  const receipt = await tx.wait();
  return {
    txHash: tx.hash as `0x${string}`,
    blockNumber: receipt?.blockNumber ?? null,
    transcriptHash: hash,
    explorerUrl: `${OG_GALILEO.blockExplorerUrls[0]}/tx/${tx.hash}`,
  };
}
