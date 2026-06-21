// 0G Compute broker sidecar
// ----------------------------------------------------------------------
// Why this exists:
//   `@0glabs/0g-serving-broker` is a Node-only SDK (uses child_process and
//   native crypto). It cannot run inside the Cloudflare Worker that hosts
//   the Verdict app's server functions. This tiny Express service stands
//   in front of the broker and exposes a plain `/chat` HTTP endpoint that
//   the Worker calls.
//
// Models routed through 0G Compute (Galileo testnet provider list):
//   - llama-3.3-70b-instruct  → 0xf07240Efa67755B5311bc75784a061eDB47165Dd
//   - deepseek-r1-70b         → 0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3
//
// Env required:
//   BROKER_PRIVATE_KEY  — the EOA that holds 0G testnet credits and signs
//                         broker requests (NEVER ship to the browser).
//   ZG_RPC_URL          — defaults to https://evmrpc-testnet.0g.ai
//   PORT                — defaults to 8787
//   SIDECAR_SECRET      — shared bearer the Worker sends in Authorization;
//                         rejects any other caller.
// ----------------------------------------------------------------------

import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";

const PROVIDERS = {
  "llama-3.3-70b-instruct": "0xf07240Efa67755B5311bc75784a061eDB47165Dd",
  "deepseek-r1-70b":        "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3",
};

const PORT = Number(process.env.PORT || 8787);
const RPC = process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai";
const PK = process.env.BROKER_PRIVATE_KEY;
const SHARED_SECRET = process.env.SIDECAR_SECRET;

if (!PK) { console.error("FATAL: BROKER_PRIVATE_KEY missing"); process.exit(1); }
if (!SHARED_SECRET) { console.error("FATAL: SIDECAR_SECRET missing"); process.exit(1); }

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PK, provider);

console.log("[0g-sidecar] wallet:", wallet.address);
const broker = await createZGComputeNetworkBroker(wallet);
console.log("[0g-sidecar] broker ready");

// Cache provider metadata (endpoint + model name) and an acknowledged flag.
const metaCache = new Map();
async function getMeta(providerAddr) {
  if (metaCache.has(providerAddr)) return metaCache.get(providerAddr);
  await broker.inference.acknowledgeProviderSigner(providerAddr).catch(() => {});
  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddr);
  const m = { endpoint, model };
  metaCache.set(providerAddr, m);
  return m;
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  if (req.path === "/health") return next();
  const auth = req.header("authorization") || "";
  if (auth !== `Bearer ${SHARED_SECRET}`) return res.status(401).json({ error: "unauthorized" });
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, wallet: wallet.address, models: Object.keys(PROVIDERS) });
});

// POST /chat { model, system, prompt }  →  { text, model, provider, valid }
app.post("/chat", async (req, res) => {
  const { model, system, prompt } = req.body || {};
  const providerAddr = PROVIDERS[model];
  if (!providerAddr) return res.status(400).json({ error: `unknown model "${model}"` });
  if (typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "prompt required" });

  try {
    const { endpoint, model: brokerModel } = await getMeta(providerAddr);
    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    // 0G broker signs a per-request header that the provider verifies.
    const headers = await broker.inference.getRequestHeaders(
      providerAddr,
      JSON.stringify(messages),
    );

    const r = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ messages, model: brokerModel }),
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: "provider error", status: r.status, body: t.slice(0, 500) });
    }
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    const chatID = data?.id;

    // Verify TEE response signature for verifiable inference.
    let valid = false;
    try {
      valid = await broker.inference.processResponse(providerAddr, text, chatID);
    } catch (e) {
      console.warn("[0g-sidecar] processResponse failed:", e?.message);
    }

    res.json({ text, model: brokerModel, provider: providerAddr, valid, chatID });
  } catch (e) {
    console.error("[0g-sidecar] /chat failed:", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.listen(PORT, () => console.log(`[0g-sidecar] listening on :${PORT}`));
