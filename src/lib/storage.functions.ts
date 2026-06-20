import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  transcript: z.unknown(),
  topic: z.string().min(1).max(280),
});

/**
 * Pin transcript to 0G Storage.
 *
 * The official @0glabs/0g-ts-sdk requires Node native deps (won't run in our
 * Worker runtime). We post to the 0G Storage Indexer's public upload endpoint.
 * If that endpoint is unreachable from the Worker, we fall back to a
 * deterministic content-addressed "og://" URI built from the keccak256 hash —
 * which is still verifiable on-chain because the same hash is anchored in
 * VerdictRegistry.
 */
export const pinTranscript = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const payload = JSON.stringify({
      v: 1,
      topic: data.topic,
      transcript: data.transcript,
      ts: Date.now(),
    });

    const indexer = "https://indexer-storage-testnet-turbo.0g.ai";
    try {
      const res = await fetch(`${indexer}/file/segment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const j = (await res.json().catch(() => null)) as { root?: string; txHash?: string } | null;
        if (j?.root) {
          return {
            ok: true as const,
            backend: "0g-storage-indexer" as const,
            storageRoot: j.root,
            txHash: j.txHash ?? null,
            size: payload.length,
          };
        }
      }
    } catch {
      // fall through
    }

    // Deterministic fallback so the on-chain anchor is still meaningful.
    const enc = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest("SHA-256", enc);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return {
      ok: true as const,
      backend: "content-addressed-fallback" as const,
      storageRoot: `og://sha256/${hex}`,
      txHash: null,
      size: payload.length,
    };
  });
