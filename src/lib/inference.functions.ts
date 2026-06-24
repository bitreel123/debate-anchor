import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  topic: z.string().min(1).max(500),
  mode: z.enum(["debate", "research"]),
});

// Direct Google Generative Language API — no Lovable Gateway, no credits used.
// User supplies GEMINI_API_KEY from https://aistudio.google.com/apikey (free tier).
const AGENT_A_MODEL = "gemini-2.5-pro";
const AGENT_B_MODEL = "gemini-2.5-flash";
const JUDGE_MODEL   = "gemini-2.5-pro";

const DETAIL_RULES = `
Write a DETAILED, evidence-led response (8-12 sentences, ~250-400 words).
Include:
  • concrete numbers, dates, version names, or named projects where possible
  • at least one named case study or real-world example
  • mechanism/"how it works" detail, not just claims
  • acknowledge the strongest counter-point and rebut it
Be sharp and specific. No filler, no hedging like "it depends".`.trim();

async function callGemini(apiKey: string, model: string, system: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 2048, topP: 0.95 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Gemini rate-limited. Wait a few seconds and click Call to Order again.");
    if (res.status === 403 || res.status === 401) throw new Error("GEMINI_API_KEY is invalid or has no access — generate a fresh key at https://aistudio.google.com/apikey.");
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };
  if (json.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt (${json.promptFeedback.blockReason}). Try rephrasing the topic.`);
  }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response. Try again or rephrase the topic.");
  return text;
}

export const runDebate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Get a free key at https://aistudio.google.com/apikey and add it as a secret named GEMINI_API_KEY.",
      );
    }

    async function speak(model: string, system: string, prompt: string) {
      const text = await callGemini(apiKey!, model, system, prompt);
      return { text, model };
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
      return { transcript, winner: "SYNTHESIS", backend: "google-gemini-direct" };
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

    return { transcript, winner, backend: "google-gemini-direct" };
  });

// Kept as a no-op shim so existing imports don't break.
export const topUpSidecarLedger = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ amount: z.string().default("0.05") }).parse(d ?? {}))
  .handler(async () => ({ ok: true, wallet: "", status: "not-needed", ledger: undefined as string | undefined }));
