import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  topic: z.string().min(1).max(500),
  mode: z.enum(["debate", "research"]),
});

// 0G Compute model IDs (resolved by the sidecar to provider addresses).
const OG_LLAMA    = "llama-3.3-70b-instruct";
const OG_DEEPSEEK = "deepseek-r1-70b";

// Fallback only — used if the sidecar isn't configured yet.
const FALLBACK_MODEL = "google/gemini-3-flash-preview";

const DETAIL_RULES = `
Write a DETAILED, evidence-led response (8-12 sentences, ~250-400 words).
Include:
  • concrete numbers, dates, version names, or named projects where possible
  • at least one named case study or real-world example
  • mechanism/"how it works" detail, not just claims
  • acknowledge the strongest counter-point and rebut it
Be sharp and specific. No filler, no hedging like "it depends".`.trim();

type Persona = { label: "A" | "B" | "JUDGE"; ogModel: string };

function normalizeSidecarSecret(secret: string) {
  return secret
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["'](.+)["']$/, "$1")
    .trim();
}

async function callOG(opts: { sidecar: string; secret: string; model: string; system: string; prompt: string }) {
  const secret = normalizeSidecarSecret(opts.secret);
  const r = await fetch(`${opts.sidecar.replace(/\/$/, "")}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${secret}`, "x-sidecar-secret": secret },
    body: JSON.stringify({ model: opts.model, system: opts.system, prompt: opts.prompt }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`0G sidecar ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = (await r.json()) as { text: string; valid?: boolean; provider?: string; chatID?: string };
  return j;
}

export const runDebate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const sidecar = process.env.OG_COMPUTE_SIDECAR_URL;
    const secret  = process.env.OG_COMPUTE_SIDECAR_SECRET;
    const useOG   = Boolean(sidecar && secret);

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!useOG && !lovableKey) throw new Error("Neither 0G sidecar nor LOVABLE_API_KEY is configured");
    const gw = lovableKey ? createLovableAiGatewayProvider(lovableKey) : null;

    async function speak(p: Persona, system: string, prompt: string) {
      if (useOG) {
        const out = await callOG({ sidecar: sidecar!, secret: secret!, model: p.ogModel, system, prompt });
        return { text: out.text, meta: { backend: "0g-compute" as const, provider: out.provider, valid: out.valid, chatID: out.chatID } };
      }
      const out = await generateText({ model: gw!(FALLBACK_MODEL), system, prompt });
      return { text: out.text, meta: { backend: "lovable-ai-gateway-fallback" as const } };
    }

    const A: Persona = { label: "A", ogModel: OG_LLAMA };
    const B: Persona = { label: "B", ogModel: OG_DEEPSEEK };
    const J: Persona = { label: "JUDGE", ogModel: OG_LLAMA };

    const transcript: Array<{ role: "A" | "B" | "JUDGE"; round: number; text: string; backend?: string; valid?: boolean }> = [];

    if (data.mode === "research") {
      const [a, b] = await Promise.all([
        speak(A, `You are Researcher Alpha (Llama 3.3 70B via 0G Compute). ${DETAIL_RULES}`, `Question: ${data.topic}`),
        speak(B, `You are Researcher Beta (DeepSeek R1 70B via 0G Compute). Approach from a different angle than a default LLM. ${DETAIL_RULES}`, `Question: ${data.topic}`),
      ]);
      transcript.push({ role: "A", round: 1, text: a.text, backend: a.meta.backend, valid: a.meta.valid });
      transcript.push({ role: "B", round: 1, text: b.text, backend: b.meta.backend, valid: b.meta.valid });

      const judge = await speak(J,
        `You are the Judge. Synthesize both researcher answers into ONE authoritative final answer.
Structure your output as:
  **Reasoning:** 4-6 sentences weighing each side's strongest evidence.
  **Case Study:** name one concrete real-world example that grounds the conclusion.
  **Final Answer:** 3-5 sentences of definitive guidance.
End with EXACTLY one line: "Verdict: SYNTHESIS".`,
        `QUESTION: ${data.topic}\n\nALPHA:\n${a.text}\n\nBETA:\n${b.text}`,
      );
      transcript.push({ role: "JUDGE", round: 1, text: judge.text, backend: judge.meta.backend, valid: judge.meta.valid });
      return { transcript, winner: "SYNTHESIS", backend: useOG ? "0g-compute" : "fallback" };
    }

    // 3-round debate
    let history = "";
    for (let round = 1; round <= 3; round++) {
      const a = await speak(A,
        `You are Agent A (Llama 3.3 70B via 0G Compute) arguing FOR the proposition. Round ${round} of 3. ${DETAIL_RULES} ${
          round > 1 ? "Directly rebut Agent B's latest point before advancing your own." : "This is your opening statement."
        }`,
        `PROPOSITION: ${data.topic}\n\nPRIOR EXCHANGE:\n${history || "(none yet)"}`,
      );
      transcript.push({ role: "A", round, text: a.text, backend: a.meta.backend, valid: a.meta.valid });
      history += `\n\n[A r${round}] ${a.text}`;

      const b = await speak(B,
        `You are Agent B (DeepSeek R1 70B via 0G Compute) arguing AGAINST the proposition. Round ${round} of 3. ${DETAIL_RULES} Directly rebut Agent A's latest point with specifics.`,
        `PROPOSITION: ${data.topic}\n\nPRIOR EXCHANGE:\n${history}`,
      );
      transcript.push({ role: "B", round, text: b.text, backend: b.meta.backend, valid: b.meta.valid });
      history += `\n\n[B r${round}] ${b.text}`;
    }

    const judge = await speak(J,
      `You are the Judge (Llama 3.3 70B via 0G Compute). Read the full 3-round exchange and rule.
Structure your ruling EXACTLY as:
  **Reasoning:** 4-6 sentences explaining WHY the winning side argued better — cite specific points from the transcript.
  **How / Mechanism:** 2-3 sentences on the underlying mechanism that settled the question.
  **Case Study:** name one concrete real-world example that supports the ruling.
  **Ruling:** 2-3 sentences of definitive judgment.
End with EXACTLY one line: "Verdict: A" or "Verdict: B" or "Verdict: TIE".`,
      `PROPOSITION: ${data.topic}\n\nTRANSCRIPT:${history}`,
    );
    transcript.push({ role: "JUDGE", round: 4, text: judge.text, backend: judge.meta.backend, valid: judge.meta.valid });

    const m = judge.text.match(/Verdict:\s*(A|B|TIE)/i);
    const winner = (m?.[1]?.toUpperCase() ?? "TIE") as "A" | "B" | "TIE";

    return { transcript, winner, backend: useOG ? "0g-compute" : "fallback" };
  });
