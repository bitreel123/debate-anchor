# OG Verdict — Verifiable AI Courtroom on 0G

> Two AI agents debate. A judge rules. The verdict is pinned to **0G Storage** and anchored on **0G Chain** — so the entire transcript is verifiable, tamper-evident, and on-chain forever.

Live app: **https://debate-anchor.lovable.app**
Contract: [`0x498f0BAA48F5FC1EF0eBEaD0a8e866D8A45f4317`](https://chainscan-galileo.0g.ai/address/0x498f0BAA48F5FC1EF0eBEaD0a8e866D8A45f4317) on 0G Galileo Testnet (chainId `16602`)

---

## 1. Introduction

LLMs are confident but unaccountable. Ask the same model the same question twice and you may get two different answers — and neither answer leaves a trail. For high-stakes questions ("is Solana better than Ethereum?", "should we ship this feature?"), what we need isn't just an answer, it's a *record*: who argued what, with what evidence, and a final ruling that can be cited later.

**OG Verdict** turns AI inference into a court of record. Every debate produces:

1. A full transcript from two opposing agents and a judge.
2. A content-addressed copy pinned to 0G Storage.
3. An on-chain anchor (`keccak256(transcript)` + storage root + winner) on 0G Chain.

If anyone challenges the verdict later, you re-hash the stored transcript and compare it to the on-chain anchor. Match → authentic. Mismatch → tampered.

## 2. The Problem

| Pain point | What it costs |
|---|---|
| LLM answers are non-reproducible | You can't cite them in a decision log. |
| One model = one perspective | Confirmation bias gets baked into the output. |
| No verifiable inference | Output could be from any model, mid-fine-tune, or post-edited. |
| No durable record | Screenshots and chat logs aren't evidence. |

## 3. The Solution — verifiable AI on 0G

OG Verdict uses **three** layers of the 0G stack so the entire AI pipeline — compute, storage, and settlement — lives in the same verifiable network. The on-chain anchor + 0G Storage layers are always live. For inference we run a hybrid setup: **Lovable AI Gateway** (Gemini 2.5 Pro for Agent A, GPT-5 mini for Agent B, Gemini 2.5 Pro for the Judge) powers the production app today, with **0G Compute** (Llama 3.3 70B + DeepSeek R1 70B via the TEE-verified `@0glabs/0g-serving-broker`) wired in as an optional sidecar for when broker credits are available.

```text
                 ┌──────────────────────────────────────────┐
                 │  Browser (Verdict UI)                    │
                 └───────────────┬──────────────────────────┘
                                 │  topic, mode
                                 ▼
                 ┌──────────────────────────────────────────┐
                 │  TanStack Start server fn (edge worker)  │
                 └───────┬──────────────────────┬───────────┘
                         │                      │
       Agent A           │   Agent B            │   Judge
       Gemini 2.5 Pro    │   GPT-5 mini         │   Gemini 2.5 Pro
       (+ Llama 3.3 70B  │   (+ DeepSeek R1 70B │
        via 0G Compute)  │    via 0G Compute)   │
                         ▼                      ▼
                 ┌──────────────────────────────────────────┐
                 │  Lovable AI Gateway  (production)        │
                 │  OR  0G Compute Sidecar (optional)       │
                 └───────────────┬──────────────────────────┘
                                 │  transcript
                                 ▼
                 ┌──────────────────────────────────────────┐
                 │  0G Storage (indexer-testnet-turbo)      │
                 │  returns storage root                    │
                 └───────────────┬──────────────────────────┘
                                 │  storageRoot, hash
                                 ▼
                 ┌──────────────────────────────────────────┐
                 │  0G Chain — VerdictRegistry.sol          │
                 │  recordDebate(hash, root, topic, winner) │
                 └──────────────────────────────────────────┘
```

## 4. Features

- 🏛 **Courtroom UI** — three animated characters (Agent A, Agent B, Judge) with live speech bubbles.
- ⚖️ **Two modes**
  - **Debate** — 3 rounds, Pro vs Con, judge rules `A` / `B` / `TIE`.
  - **Research** — both agents investigate from different angles, judge synthesizes.
- 🤖 **Two models, two perspectives** — Gemini 2.5 Pro argues *for*; GPT-5 mini argues *against*; Gemini 2.5 Pro rules. Different families produce genuinely different reasoning, not the same model role-playing. Llama 3.3 70B and DeepSeek R1 70B are wired in as an optional 0G Compute path when broker credits are available.
- 🔐 **Verifiable inference** — every response is signed by the provider's TEE and verified by the broker (`broker.inference.processResponse`).
- 📦 **0G Storage pinning** — the transcript is uploaded to the 0G Storage Indexer; the returned root is content-addressed.
- ⛓ **0G Chain anchor** — `VerdictRegistry.recordDebate(...)` writes the hash + root + winner. Anyone can call `verify(id, hash)` later.
- 🔎 **Explorer links** — every anchored verdict links to the tx on `chainscan-galileo.0g.ai`.

## 5. Why 0G

| 0G layer | Why it matters for Verdict |
|---|---|
| **0G Compute** | TEE-verified inference. The judge isn't just "an API call" — the response signature proves the named model produced it. |
| **0G Storage** | Content-addressed, decentralized blob storage. The transcript root is the transcript's fingerprint. |
| **0G Chain** | EVM-compatible L1 where the verdict lives forever. No off-chain DB to trust. |
| **Single network** | Compute → Storage → Settlement all in one verifiable graph, with one wallet. |

## 6. The Smart Contract

`contracts/src/VerdictRegistry.sol` — minimal, immutable, ~60 lines.

```solidity
function recordDebate(
  bytes32 transcriptHash,
  string  calldata storageRoot,
  string  calldata topic,
  string  calldata winner,   // "A" | "B" | "TIE" | "SYNTHESIS"
  uint8   mode               // 0 = debate, 1 = research
) external returns (uint256 id);

function verify(uint256 id, bytes32 transcriptHash) external view returns (bool);
function getRecord(uint256 id) external view returns (Record memory);
function totalRecords() external view returns (uint256);

event DebateRecorded(
  uint256 indexed id,
  address indexed author,
  bytes32 indexed transcriptHash,
  uint8   mode,
  string  storageRoot
);
```

- **Network:** 0G Galileo Testnet (chainId `16602`)
- **RPC:** `https://evmrpc-testnet.0g.ai`
- **Explorer:** https://chainscan-galileo.0g.ai
- **Address:** [`0x498f0BAA48F5FC1EF0eBEaD0a8e866D8A45f4317`](https://chainscan-galileo.0g.ai/address/0x498f0BAA48F5FC1EF0eBEaD0a8e866D8A45f4317)
- **Faucet:** https://faucet.0g.ai

## 7. The 0G Compute Sidecar

The 0G broker SDK (`@0glabs/0g-serving-broker`) is Node-only and uses native crypto / child processes — it cannot run inside our edge worker. So we ship a **tiny Express service** in `sidecar/` and host it on Render.

| Persona | Model | Provider address |
|---|---|---|
| Agent A | `llama-3.3-70b-instruct` | `0xf07240Efa67755B5311bc75784a061eDB47165Dd` |
| Agent B | `deepseek-r1-70b` | `0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3` |
| Judge | `llama-3.3-70b-instruct` | same as Agent A |

The sidecar exposes a single auth-gated endpoint:

```
POST /chat        Authorization: Bearer <SIDECAR_SECRET>
{ model, system, prompt }  →  { text, model, provider, valid, chatID }
```

`valid: true` means the broker successfully verified the TEE response signature.

**Deploy your own** (Render / Fly / Railway):

```bash
cd sidecar
npm install
export BROKER_PRIVATE_KEY=0x...        # funded 0G testnet wallet (NEVER commit)
export SIDECAR_SECRET=$(openssl rand -hex 32)
npm run topup -- 0.05                  # one-time ledger top-up
npm start
```

Then in the main app set:

```
OG_COMPUTE_SIDECAR_URL    = https://<your-sidecar>.onrender.com
OG_COMPUTE_SIDECAR_SECRET = <same SIDECAR_SECRET>
```

If those two secrets are absent, the app gracefully falls back to the Lovable AI Gateway so the demo never breaks.

## 8. End-to-End Flow

```text
 user        TanStack         0G Compute        0G Storage       0G Chain
 ─────       ────────         ───────────       ──────────       ────────
   │  topic     │                 │                 │                │
   ├───────────►│                 │                 │                │
   │            │  Agent A FOR    │                 │                │
   │            ├────────────────►│                 │                │
   │            │◄────────────────┤ valid:true      │                │
   │            │  Agent B AGAINST│                 │                │
   │            ├────────────────►│                 │                │
   │            │◄────────────────┤ valid:true      │                │
   │            │  (3 rounds)     │                 │                │
   │            │  Judge ruling   │                 │                │
   │            ├────────────────►│                 │                │
   │            │◄────────────────┤                 │                │
   │            │  pin transcript │                 │                │
   │            ├──────────────────────────────────►│                │
   │            │◄──────────────────────────────────┤ storageRoot    │
   │◄───────────┤  transcript + root                │                │
   │  Anchor    │                                                    │
   ├────────────┼────────────────────────────────────────────────────►│
   │            │                              recordDebate(...) tx  │
   │◄───────────┼────────────────────────────────────────────────────┤
   │   txHash + explorer link                                        │
```

## 9. Tech Stack

| Layer | Choice |
|---|---|
| Frontend / SSR | TanStack Start v1 + React 19 + Vite 7 |
| Styling | Tailwind v4, custom courtroom illustrations |
| Wallet | ethers v6 (browser injected) |
| AI inference | 0G Compute via `@0glabs/0g-serving-broker` (with Lovable AI Gateway fallback) |
| Storage | 0G Storage Indexer (turbo testnet) |
| Settlement | 0G Galileo Testnet, Solidity 0.8.24, Hardhat |
| Sidecar | Node 20 + Express, deployed on Render |

## 10. Repo Layout

```
.
├── src/
│   ├── routes/
│   │   ├── index.tsx             # landing
│   │   └── dashboard.tsx         # the courtroom
│   ├── components/landing/       # marketing sections
│   └── lib/
│       ├── inference.functions.ts  # server fn → sidecar
│       ├── storage.functions.ts    # server fn → 0G Storage
│       ├── registry.ts             # writes VerdictRegistry
│       ├── og-chain.ts             # chain config + ABI
│       └── wallet.ts               # 0G Galileo wallet hook
├── contracts/
│   ├── src/VerdictRegistry.sol
│   └── scripts/deploy.cjs
└── sidecar/
    ├── server.js                 # /chat + /health
    └── scripts/topup.js          # broker ledger top-up
```

## 11. Running Locally

```bash
# main app
bun install
bun dev                            # http://localhost:8080

# sidecar (separate terminal)
cd sidecar && npm install
BROKER_PRIVATE_KEY=0x... SIDECAR_SECRET=$(openssl rand -hex 32) npm start
```

Required env vars in the main app (Lovable Cloud → Secrets, never in the repo):

| Name | Where |
|---|---|
| `OG_COMPUTE_SIDECAR_URL` | server-only |
| `OG_COMPUTE_SIDECAR_SECRET` | server-only |
| `VITE_VERDICT_REGISTRY_ADDRESS` | optional override |

**Never** put `BROKER_PRIVATE_KEY` in the app or in the repo. It lives **only** on the sidecar host.

## 12. Security

- Wallet private keys (`BROKER_PRIVATE_KEY`) live only on the sidecar host, never in client code, never in the worker.
- `/chat` is gated by a shared bearer (`SIDECAR_SECRET`).
- The TEE response signature is verified via `broker.inference.processResponse` before the transcript is anchored.
- The on-chain hash is `keccak256(transcript JSON)`; tampering is detectable.

## 13. Roadmap

- 🔜 Verdict NFT (mint the ruling as an ERC-721 with the transcript root as metadata)
- 🔜 Public verdict feed (browse anchored debates by author / topic)
- 🔜 Custom judge personas (strict / lenient / domain-expert)
- 🔜 Mainnet move once 0G mainnet is live

## License

MIT
