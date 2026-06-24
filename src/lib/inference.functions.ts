import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  topic: z.string().min(1).max(500),
  mode: z.enum(["debate", "research"]),
});

// Lovable AI Gateway models — Agent A uses Gemini, Agent B uses OpenAI (different
// families produce genuinely different reasoning instead of the same model role-playing).
// Lovable AI Gateway only currently exposes Google Gemini families; we pick two
// distinct tiers so Agent A and Agent B still reason differently.
const AGENT_A_MODEL = "google/gemini-2.5-pro";
const AGENT_B_MODEL = "google/gemini-2.5-flash";
const JUDGE_MODEL   = "google/gemini-2.5-pro";

const DETAIL_RULES = `
Write a DETAILED, evidence-led response (8-12 sentences, ~250-400 words).
Include:
  • concrete numbers, dates, version names, or named projects where possible
  • at least one named case study or real-world example
  • mechanism/"how it works" detail, not just claims
  • acknowledge the strongest counter-point and rebut it
Be sharp and specific. No filler, no hedging like "it depends".`.trim();

export const runDebate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
    const gw = createLovableAiGatewayProvider(lovableKey);

    async function speak(model: string, system: string, prompt: string) {
      try {
        const out = await generateText({ model: gw(model), system, prompt });
        return { text: out.text, model };
      } catch (err: unknown) {
        const msg = String((err as Error)?.message ?? err ?? "");
        if (/payment_required|Not enough credits|402/i.test(msg)) {
          throw new Error(
            "Out of Lovable AI credits — top up your workspace at Settings → Workspace → Usage to run the courtroom. (No wallet payment is needed; this is AI Gateway credits, not 0G gas.)",
          );
        }
        if (/rate.?limit|429/i.test(msg)) {
          throw new Error("Lovable AI Gateway rate-limited. Wait a few seconds and click Call to Order again.");
        }
        throw err;
      }
    }

    const transcript: Array<{ role: "A" | "B" | "JUDGE"; round: number; text: string; backend?: string; valid?: boolean }> = [];

    if (data.mode === "research") {
      const [a, b] = await Promise.all([
        speak(AGENT_A_MODEL, `You are Researcher Alpha (Gemini 2.5 Pro). ${DETAIL_RULES}`, `Question: ${data.topic}`),
        speak(AGENT_B_MODEL, `You are Researcher Beta (Gemini 2.5 Flash). Approach from a different angle than Alpha. ${DETAIL_RULES}`, `Question: ${data.topic}`),
      ]);
      transcript.push({ role: "A", round: 1, text: a.text, backend: a.model, valid: true });
      transcript.push({ role: "B", round: 1, text: b.text, backend: b.model, valid: true });

      const judge = await speak(JUDGE_MODEL,
        `You are the Judge. Synthesize both researcher answers into ONE authoritative final answer.
Structure your output as:
  **Reasoning:** 4-6 sentences weighing each side's strongest evidence.
  **Case Study:** name one concrete real-world example that grounds the conclusion.
  **Final Answer:** 3-5 sentences of definitive guidance.
End with EXACTLY one line: "Verdict: SYNTHESIS".`,
        `QUESTION: ${data.topic}\n\nALPHA:\n${a.text}\n\nBETA:\n${b.text}`,
      );
      transcript.push({ role: "JUDGE", round: 1, text: judge.text, backend: judge.model, valid: true });
      return { transcript, winner: "SYNTHESIS", backend: "lovable-ai-gateway" };
    }

    // 3-round debate
    let history = "";
    for (let round = 1; round <= 3; round++) {
      const a = await speak(AGENT_A_MODEL,
        `You are Agent A (Gemini 2.5 Pro) arguing FOR the proposition. Round ${round} of 3. ${DETAIL_RULES} ${
          round > 1 ? "Directly rebut Agent B's latest point before advancing your own." : "This is your opening statement."
        }`,
        `PROPOSITION: ${data.topic}\n\nPRIOR EXCHANGE:\n${history || "(none yet)"}`,
      );
      transcript.push({ role: "A", round, text: a.text, backend: a.model, valid: true });
      history += `\n\n[A r${round}] ${a.text}`;

      const b = await speak(AGENT_B_MODEL,
        `You are Agent B (Gemini 2.5 Flash) arguing AGAINST the proposition. Round ${round} of 3. ${DETAIL_RULES} Directly rebut Agent A's latest point with specifics.`,
        `PROPOSITION: ${data.topic}\n\nPRIOR EXCHANGE:\n${history}`,
      );
      transcript.push({ role: "B", round, text: b.text, backend: b.model, valid: true });
      history += `\n\n[B r${round}] ${b.text}`;
    }

    const judge = await speak(JUDGE_MODEL,
      `You are the Judge (Gemini 2.5 Pro). Read the full 3-round exchange and rule.
Structure your ruling EXACTLY as:
  **Reasoning:** 4-6 sentences explaining WHY the winning side argued better — cite specific points from the transcript.
  **How / Mechanism:** 2-3 sentences on the underlying mechanism that settled the question.
  **Case Study:** name one concrete real-world example that supports the ruling.
  **Ruling:** 2-3 sentences of definitive judgment.
End with EXACTLY one line: "Verdict: A" or "Verdict: B" or "Verdict: TIE".`,
      `PROPOSITION: ${data.topic}\n\nTRANSCRIPT:${history}`,
    );
    transcript.push({ role: "JUDGE", round: 4, text: judge.text, backend: judge.model, valid: true });

    const m = judge.text.match(/Verdict:\s*(A|B|TIE)/i);
    const winner = (m?.[1]?.toUpperCase() ?? "TIE") as "A" | "B" | "TIE";

    return { transcript, winner, backend: "lovable-ai-gateway" };
  });

// Kept as a no-op shim so existing imports don't break; the sidecar ledger
// path is no longer used now that inference runs through Lovable AI Gateway.
export const topUpSidecarLedger = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ amount: z.string().default("0.05") }).parse(d ?? {}))
  .handler(async () => ({ ok: true, wallet: "", status: "not-needed", ledger: undefined as string | undefined }));
