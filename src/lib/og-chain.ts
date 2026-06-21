// 0G Galileo testnet config (https://docs.0g.ai)
export const OG_GALILEO = {
  chainIdHex: "0x40da", // 16602
  chainIdDec: 16602,
  chainName: "0G-Galileo-Testnet",
  rpcUrls: ["https://evmrpc-testnet.0g.ai"],
  blockExplorerUrls: ["https://chainscan-galileo.0g.ai"],
  nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
} as const;

// Deployed VerdictRegistry on 0G Galileo (chainId 16602)
// https://chainscan-galileo.0g.ai/address/0x498f0BAA48F5FC1EF0eBEaD0a8e866D8A45f4317
export const VERDICT_REGISTRY_ADDRESS: string =
  (import.meta.env.VITE_VERDICT_REGISTRY_ADDRESS as string | undefined) ??
  "0x498f0BAA48F5FC1EF0eBEaD0a8e866D8A45f4317";

export const VERDICT_REGISTRY_ABI = [
  "function recordDebate(bytes32 transcriptHash, string storageRoot, string topic, string winner, uint8 mode) returns (uint256)",
  "function verify(uint256 id, bytes32 transcriptHash) view returns (bool)",
  "function getRecord(uint256 id) view returns (tuple(address author, bytes32 transcriptHash, string storageRoot, string topic, string winner, uint8 mode, uint64 timestamp))",
  "function totalRecords() view returns (uint256)",
  "event DebateRecorded(uint256 indexed id, address indexed author, bytes32 indexed transcriptHash, uint8 mode, string storageRoot)",
] as const;
