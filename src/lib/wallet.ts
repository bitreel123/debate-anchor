import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { OG_GALILEO } from "./og-chain";

type Eth = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...a: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...a: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isTrust?: boolean;
  isCoinbaseWallet?: boolean;
  isPhantom?: boolean;
  providers?: Eth[];
};

// Pick MetaMask specifically when multiple wallets inject window.ethereum.
// Trust/Coinbase/Phantom often hijack window.ethereum; EIP-5749/legacy `providers`
// array lets us pick the real MetaMask provider.
function pickMetaMask(eth: Eth): Eth | null {
  const isRealMM = (p: Eth) => !!p?.isMetaMask && !p.isTrust && !p.isCoinbaseWallet && !p.isPhantom;
  if (eth.providers && Array.isArray(eth.providers)) {
    const mm = eth.providers.find(isRealMM);
    if (mm) return mm;
  }
  if (isRealMM(eth)) return eth;
  return null;
}

function getEthereum(): Eth | null {
  if (typeof window === "undefined") return null;
  const root = (window as unknown as { ethereum?: Eth }).ethereum ?? null;
  if (!root) return null;
  return pickMetaMask(root) ?? root;
}

export async function ensureGalileo(eth: Eth) {
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: OG_GALILEO.chainIdHex }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902 || code === -32603) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: OG_GALILEO.chainIdHex,
          chainName: OG_GALILEO.chainName,
          rpcUrls: [...OG_GALILEO.rpcUrls],
          blockExplorerUrls: [...OG_GALILEO.blockExplorerUrls],
          nativeCurrency: OG_GALILEO.nativeCurrency,
        }],
      });
    } else {
      throw err;
    }
  }
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const eth = getEthereum();
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((accs) => {
      const a = (accs as string[])[0];
      if (a) setAddress(a);
    }).catch(() => {});
    eth.request({ method: "eth_chainId" }).then((c) => setChainId(c as string)).catch(() => {});

    const onAccounts = (...args: unknown[]) => {
      const accs = args[0] as string[];
      setAddress(accs?.[0] ?? null);
    };
    const onChain = (...args: unknown[]) => setChainId(args[0] as string);
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) throw new Error("MetaMask not detected. Install from metamask.io");
    setConnecting(true);
    try {
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAddress(accs[0] ?? null);
      await ensureGalileo(eth);
      const cid = (await eth.request({ method: "eth_chainId" })) as string;
      setChainId(cid);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  const getSigner = useCallback(async (): Promise<JsonRpcSigner> => {
    const eth = getEthereum();
    if (!eth) throw new Error("No wallet");
    await ensureGalileo(eth);
    const provider = new BrowserProvider(eth as unknown as ConstructorParameters<typeof BrowserProvider>[0]);
    return provider.getSigner();
  }, []);

  return {
    address,
    chainId,
    connecting,
    isGalileo: chainId === OG_GALILEO.chainIdHex,
    connect,
    disconnect,
    getSigner,
  };
}
