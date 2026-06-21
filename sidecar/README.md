# 0G Compute Sidecar

Tiny Node service that lets the Verdict app run inference through the real
**0G Compute broker** (verifiable TEE inference on Llama 3.3 70B and
DeepSeek R1 70B). The broker SDK is Node-only and can't run inside the
Cloudflare Worker that hosts the app — this service stands in front of it.

```
Browser ──▶ Verdict server fn (Worker) ──▶ Sidecar (this) ──▶ 0G Compute provider
                                                    │
                                                    └── ledger settled by your wallet
```

## Models

| Persona  | 0G model                  | Provider address |
|----------|---------------------------|------------------|
| Agent A  | `llama-3.3-70b-instruct`  | `0xf07240Efa67755B5311bc75784a061eDB47165Dd` |
| Agent B  | `deepseek-r1-70b`         | `0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3` |
| Judge    | `llama-3.3-70b-instruct`  | same as Agent A |

## Setup (local)

```bash
cd sidecar
npm install

# Fund the broker wallet with testnet OG from https://faucet.0g.ai
export BROKER_PRIVATE_KEY=0xyour_funded_wallet_private_key
export SIDECAR_SECRET=$(openssl rand -hex 32)

# One time: open ledger + deposit ~0.05 OG
npm run topup -- 0.05

# Run
npm start         # → http://localhost:8787
curl localhost:8787/health
```

## Deploy

Any Node host works. Recommended free tiers: **Render**, **Fly.io**, **Railway**.

1. Push the `sidecar/` folder to its own repo (or set the service root to `sidecar/`).
2. Build command: `npm install`  ·  Start command: `npm start`
3. Set env vars:
   - `BROKER_PRIVATE_KEY` — wallet with OG testnet balance
   - `SIDECAR_SECRET` — long random string
   - `ZG_RPC_URL` (optional) — defaults to `https://evmrpc-testnet.0g.ai`
4. Note the public URL, e.g. `https://verdict-0g-sidecar.onrender.com`

## Wire the Verdict app to the sidecar

In the **main app** (not this folder), add two runtime secrets:

```
OG_COMPUTE_SIDECAR_URL = https://verdict-0g-sidecar.onrender.com
OG_COMPUTE_SIDECAR_SECRET = <same SIDECAR_SECRET as above>
```

`src/lib/inference.functions.ts` automatically uses 0G Compute when
both are set, and falls back to the Lovable AI Gateway otherwise.

## Security

- `BROKER_PRIVATE_KEY` lives **only** on the sidecar host. Never ship it
  to the browser or to the Worker.
- Every `/chat` request must include `Authorization: Bearer $SIDECAR_SECRET`.
- The sidecar verifies the TEE response signature via
  `broker.inference.processResponse` and returns `valid: true|false`.
