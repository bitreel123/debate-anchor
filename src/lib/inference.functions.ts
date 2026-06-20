import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  topic: z.string().min(1).max(500),
  mode: z.enum(["debate", "research"]),
});

const JUDGE_MODEL = "google/gemini-3-flash-preview";
const AGENT_A_MODEL = "google/gemini-3-flash-preview";
const AGENT_B_MODEL = "google/gemini-3-flash-preview";

/**
 * Runs a 3-round debate (or single research synthesis) using 3 distinct
 * LLM personas. Returns a full transcript that gets hashed and anchored
 * to 0G Chain by the client.
 *
 * Compute backend: Lovable AI Gateway today; designed to be swapped for a
 * 0G Compute broker sidecar by changing only `createLovableAiGatewayProvider`.
 */
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
          system: "You are Researcher Alpha. Produce a concise, evidence-led answer to the user's question (4-6 sentences). Cite reasoning briefly.",
          prompt: data.topic,
        }),
        generateText({
          model: gw(AGENT_B_MODEL),
          system: "You are Researcher Beta. Independently produce a concise, evidence-led answer to the same question (4-6 sentences). Approach it from a different angle than a default LLM would.",
          prompt: data.topic,
        }),
      ]);
      transcript.push({ role: "A", round: 1, text: a.text });
      transcript.push({ role: "B", round: 1, text: b.text });

      const judge = await generateText({
        model: gw(JUDGE_MODEL),
        system: "You are the Judge. Synthesize the two researcher answers below into one authoritative final answer. End with a single line: 'Verdict: SYNTHESIS'.",
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
        system: `You are Agent A arguing FOR the proposition. Round ${round} of 3. Be sharp, concrete, ~3 sentences. Rebut Agent B if a prior round exists.`,
        prompt: `PROPOSITION: ${data.topic}\n\nPRIOR EXCHANGE:\n${history || "(none yet — opening statement)"}`,
      });
      transcript.push({ role: "A", round, text: a.text });
      history += `\n[A r${round}] ${a.text}`;

      const b = await generateText({
        model: gw(AGENT_B_MODEL),
        system: `You are Agent B arguing AGAINST the proposition. Round ${round} of 3. Be sharp, concrete, ~3 sentences. Rebut Agent A's latest point.`,
        prompt: `PROPOSITION: ${data.topic}\n\nPRIOR EXCHANGE:\n${history}`,
      });
      transcript.push({ role: "B", round, text: b.text });
      history += `\n[B r${round}] ${b.text}`;
    }

    const judge = await generateText({
      model: gw(JUDGE_MODEL),
      system: "You are the Judge. Read the 3-round exchange and rule which side argued more convincingly. Respond in 4-6 sentences, then END with exactly one line: 'Verdict: A' or 'Verdict: B' or 'Verdict: TIE'.",
      prompt: `PROPOSITION: ${data.topic}\n\nTRANSCRIPT:${history}`,
    });
    transcript.push({ role: "JUDGE", round: 4, text: judge.text });

    const m = judge.text.match(/Verdict:\s*(A|B|TIE)/i);
    const winner = (m?.[1]?.toUpperCase() ?? "TIE") as "A" | "B" | "TIE";

    return { transcript, winner };
  });
