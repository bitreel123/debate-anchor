import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  topic: z.string().min(1).max(500),
  mode: z.enum(["debate", "research"]),
});

/**
 * Compute backend: routed through Lovable AI Gateway today, designed to
 * be swapped for a 0G Compute broker (Llama 3.3 70B + DeepSeek R1 70B)
 * sidecar by only changing `createLovableAiGatewayProvider`. Each persona
 * uses a DIFFERENT underlying model so arguments don't sound identical.
 */
const AGENT_A_MODEL = "google/gemini-2.5-pro";        // Pro side — strong reasoning
const AGENT_B_MODEL = "openai/gpt-5";                  // Con side — different "voice"
const JUDGE_MODEL   = "google/gemini-3-flash-preview"; // Neutral synthesizer

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
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing on server");
    const gw = createLovableAiGatewayProvider(key);

    const transcript: Array<{ role: "A" | "B" | "JUDGE"; round: number; text: string }> = [];

    if (data.mode === "research") {
      const [a, b] = await Promise.all([
        generateText({
          model: gw(AGENT_A_MODEL),
          system: `You are Researcher Alpha (Gemini 2.5 Pro persona). ${DETAIL_RULES}`,
          prompt: `Question: ${data.topic}`,
        }),
        generateText({
          model: gw(AGENT_B_MODEL),
          system: `You are Researcher Beta (GPT-5 persona). Independently answer the same question — approach it from a different angle than a default LLM would, and cross-check Alpha's likely framing. ${DETAIL_RULES}`,
          prompt: `Question: ${data.topic}`,
        }),
      ]);
      transcript.push({ role: "A", round: 1, text: a.text });
      transcript.push({ role: "B", round: 1, text: b.text });

      const judge = await generateText({
        model: gw(JUDGE_MODEL),
        system: `You are the Judge. Synthesize both researcher answers into ONE authoritative final answer.
Structure your output as:
  **Reasoning:** 4-6 sentences weighing each side's strongest evidence.
  **Case Study:** name one concrete real-world example that grounds the conclusion.
  **Final Answer:** 3-5 sentences of definitive guidance.
End with EXACTLY one line: "Verdict: SYNTHESIS".`,
        prompt: `QUESTION: ${data.topic}\n\nALPHA:\n${a.text}\n\nBETA:\n${b.text}`,
      });
      transcript.push({ role: "JUDGE", round: 1, text: judge.text });

      return { transcript, winner: "SYNTHESIS" };
    }

    // 3-round debate
    let history = "";
    for (let round = 1; round <= 3; round++) {
      const a = await generateText({
        model: gw(AGENT_A_MODEL),
        system: `You are Agent A arguing FOR the proposition. Round ${round} of 3. ${DETAIL_RULES} ${
          round > 1 ? "Directly rebut Agent B's latest point before advancing your own." : "This is your opening statement."
        }`,
        prompt: `PROPOSITION: ${data.topic}\n\nPRIOR EXCHANGE:\n${history || "(none yet)"}`,
      });
      transcript.push({ role: "A", round, text: a.text });
      history += `\n\n[A r${round}] ${a.text}`;

      const b = await generateText({
        model: gw(AGENT_B_MODEL),
        system: `You are Agent B arguing AGAINST the proposition. Round ${round} of 3. ${DETAIL_RULES} Directly rebut Agent A's latest point with specifics.`,
        prompt: `PROPOSITION: ${data.topic}\n\nPRIOR EXCHANGE:\n${history}`,
      });
      transcript.push({ role: "B", round, text: b.text });
      history += `\n\n[B r${round}] ${b.text}`;
    }

    const judge = await generateText({
      model: gw(JUDGE_MODEL),
      system: `You are the Judge. Read the full 3-round exchange and rule.
Structure your ruling EXACTLY as:
  **Reasoning:** 4-6 sentences explaining WHY the winning side argued better — cite specific points from the transcript.
  **How / Mechanism:** 2-3 sentences on the underlying mechanism that settled the question.
  **Case Study:** name one concrete real-world example that supports the ruling.
  **Ruling:** 2-3 sentences of definitive judgment.
End with EXACTLY one line: "Verdict: A" or "Verdict: B" or "Verdict: TIE".`,
      prompt: `PROPOSITION: ${data.topic}\n\nTRANSCRIPT:${history}`,
    });
    transcript.push({ role: "JUDGE", round: 4, text: judge.text });

    const m = judge.text.match(/Verdict:\s*(A|B|TIE)/i);
    const winner = (m?.[1]?.toUpperCase() ?? "TIE") as "A" | "B" | "TIE";

    return { transcript, winner };
  });
