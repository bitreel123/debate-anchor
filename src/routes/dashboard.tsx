import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, Gavel, ArrowLeft, History, Send, Sparkles, Scale } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import courtroom from "@/assets/courtroom-bg.jpg";
import judgeImg from "@/assets/judge-cartoon.png";
import agentAImg from "@/assets/agent-a-cartoon.png";
import agentBImg from "@/assets/agent-b-cartoon.png";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Verdict — Courtroom" },
      { name: "description", content: "Step into the OG Verdict courtroom. Submit a topic and watch two AI agents debate before the judge." },
    ],
  }),
  component: Dashboard,
});

type Speaker = "judge" | "a" | "b" | null;

const JUDGE_LINES = [
  "Welcome to OG Verdict Court. Court is now in session!",
  "Order, order! State your topic and the debate shall begin.",
  "I will weigh both sides and deliver a verdict anchored to 0G.",
  "Remember — every word is hashed and stored forever.",
];
const AGENT_A_LINES = [
  "I'll argue the affirmative. Bring me the topic!",
  "Evidence, logic, and rhetoric — my specialty.",
  "I'm ready to defend the case for the proposition.",
];
const AGENT_B_LINES = [
  "And I'll take the opposing view. Let's reason.",
  "I'll cross-examine every claim with citations.",
  "The contrary position has plenty to stand on.",
];

function Dashboard() {
  const [mode, setMode] = useState<"debate" | "research">("debate");
  const [prompt, setPrompt] = useState("");
  const [speaking, setSpeaking] = useState<Speaker>("judge");
  const [bubbles, setBubbles] = useState({
    judge: JUDGE_LINES[0],
    a: AGENT_A_LINES[0],
    b: AGENT_B_LINES[0],
  });
  const [walletConnected, setWalletConnected] = useState(false);

  // Auto-cycle judge welcome after mount
  useEffect(() => {
    const t = setTimeout(() => setSpeaking(null), 4200);
    return () => clearTimeout(t);
  }, []);

  const speak = (who: Exclude<Speaker, null>) => {
    const pools = { judge: JUDGE_LINES, a: AGENT_A_LINES, b: AGENT_B_LINES };
    const pool = pools[who];
    const next = pool[Math.floor(Math.random() * pool.length)];
    setBubbles(prev => ({ ...prev, [who]: next }));
    setSpeaking(who);
    setTimeout(() => setSpeaking(s => (s === who ? null : s)), 3500);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast("Enter a topic first", { description: "Give the court something to debate." });
      return;
    }
    setBubbles({
      judge: `Case opened: "${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}". Agents, take your podiums!`,
      a: "I accept the affirmative position. Preparing opening statement…",
      b: "Opposition is ready. Let's begin cross-examination.",
    });
    setSpeaking("judge");
    toast("Court is in session", { description: `Mode: ${mode}. Engine wiring in the next build.` });
    setTimeout(() => setSpeaking("a"), 1500);
    setTimeout(() => setSpeaking("b"), 3000);
    setTimeout(() => setSpeaking(null), 4500);
  };

  const onConnect = () => {
    if (walletConnected) {
      setWalletConnected(false);
      toast("Wallet disconnected");
      return;
    }
    setWalletConnected(true);
    toast("Wallet linked (demo)", { description: "MetaMask + 0G Galileo wiring in the next build." });
  };

  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col overflow-hidden">
      <Toaster position="top-center" />

      {/* Top bar */}
      <header className="flex items-center justify-between p-3 gap-3 z-30">
        <div className="flex items-center gap-2">
          <Link to="/" className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-ink/10 flex items-center gap-2 hover:bg-ink/5 transition">
            <ArrowLeft className="size-4" />
            <span className="font-display font-black text-ink">Verdict</span>
          </Link>
          <div className="hidden md:flex items-center gap-2 px-3 py-2.5 text-sm text-ink/60">
            <Scale className="size-4" />
            <span className="font-semibold text-ink">OG Verdict Court</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-white rounded-2xl p-1 border border-ink/10 shadow-sm">
            {(["debate", "research"] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); toast(`${m === "debate" ? "Debate" : "Research"} mode`); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                  mode === m ? "bg-ink text-paper" : "text-ink/70 hover:text-ink"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={onConnect}
            className={`rounded-2xl px-5 py-2.5 font-semibold text-sm flex items-center gap-2 transition shadow-sm border-2 ${
              walletConnected
                ? "bg-accent-mint text-ink border-ink"
                : "bg-ink text-paper border-ink hover:bg-ink/90"
            }`}
          >
            <Wallet className="size-4" />
            {walletConnected ? "0x12…aB · Connected" : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Courtroom stage */}
      <section className="relative flex-1 mx-3 mb-3 rounded-3xl overflow-hidden border-2 border-ink shadow-[6px_6px_0_var(--ink)] bg-[#3a2410]">
        <img
          src={courtroom}
          alt="Cartoon American courtroom interior with judge's bench, podiums, flags and jury box"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* warm vignette and bottom fade for composer legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-paper/95" />

        {/* Judge — center back, on the bench */}
        <Character
          src={judgeImg}
          alt="Cartoon judge"
          onClick={() => speak("judge")}
          className="left-1/2 top-[22%] -translate-x-1/2 w-[180px] sm:w-[220px] md:w-[260px]"
          bubble={bubbles.judge}
          bubbleActive={speaking === "judge"}
          bubbleColor="bg-white"
          bubblePos="top"
          label="Judge"
        />

        {/* Agent A — left podium */}
        <Character
          src={agentAImg}
          alt="Cartoon orange AI agent A"
          onClick={() => speak("a")}
          className="left-[6%] md:left-[12%] bottom-[18%] w-[140px] sm:w-[170px] md:w-[200px]"
          bubble={bubbles.a}
          bubbleActive={speaking === "a"}
          bubbleColor="bg-accent-orange"
          bubblePos="right"
          label="Agent A · Pro"
        />

        {/* Agent B — right podium */}
        <Character
          src={agentBImg}
          alt="Cartoon blue AI agent B"
          onClick={() => speak("b")}
          className="right-[6%] md:right-[12%] bottom-[18%] w-[140px] sm:w-[170px] md:w-[200px]"
          bubble={bubbles.b}
          bubbleActive={speaking === "b"}
          bubbleColor="bg-accent-blue"
          bubbleTextPaper
          bubblePos="left"
          label="Agent B · Con"
        />

        {/* Recent debates rail */}
        <aside className="absolute top-4 right-4 hidden xl:block w-60">
          <div className="bg-white/95 backdrop-blur rounded-2xl border-2 border-ink p-4 shadow-[4px_4px_0_var(--ink)]">
            <div className="flex items-center gap-2 mb-3">
              <History className="size-4 text-ink" />
              <span className="font-display font-bold text-ink text-sm">Case Files</span>
            </div>
            <ul className="space-y-2">
              {["—", "—", "—"].map((_, i) => (
                <li key={i} className="rounded-xl bg-paper border border-ink/10 p-3">
                  <div className="h-2 w-3/4 bg-ink/10 rounded-full mb-1.5" />
                  <div className="h-2 w-1/2 bg-ink/5 rounded-full" />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-ink/40 font-mono">Connect wallet to load history.</p>
          </div>
        </aside>

        {/* Prompt composer */}
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
          <form
            onSubmit={onSubmit}
            className="max-w-3xl mx-auto bg-white rounded-3xl border-2 border-ink shadow-[6px_6px_0_var(--ink)] p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1 sm:hidden">
                {(["debate", "research"] as const).map(m => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition border-2 ${
                      mode === m ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-ink/10"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-ink/50 font-mono">
                <Sparkles className="size-3.5" />
                <span>{mode === "debate" ? "3 rounds · 2 agents · 1 judge" : "Synthesis · web-search evidence"}</span>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={mode === "debate" ? "Should AI agents be allowed to own property?" : "What does recent research say about…?"}
                rows={2}
                className="flex-1 resize-none bg-transparent text-ink placeholder:text-ink/40 outline-none text-base p-2"
              />
              <button
                type="submit"
                className="bg-accent-lemon text-ink rounded-2xl px-4 py-3 border-2 border-ink hover:scale-[1.03] transition shrink-0 flex items-center gap-2 font-semibold text-sm shadow-[3px_3px_0_var(--ink)]"
                aria-label="Start debate"
              >
                <Gavel className="size-4" strokeWidth={2.5} />
                <span className="hidden sm:inline">Call to Order</span>
                <Send className="size-4 sm:hidden" />
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function Character({
  src,
  alt,
  onClick,
  className,
  bubble,
  bubbleActive,
  bubbleColor,
  bubbleTextPaper,
  bubblePos,
  label,
}: {
  src: string;
  alt: string;
  onClick: () => void;
  className: string;
  bubble: string;
  bubbleActive: boolean;
  bubbleColor: string;
  bubbleTextPaper?: boolean;
  bubblePos: "top" | "left" | "right";
  label: string;
}) {
  const bubblePositionClass =
    bubblePos === "top"
      ? "bottom-full mb-3 left-1/2 -translate-x-1/2"
      : bubblePos === "left"
      ? "right-full mr-3 top-2"
      : "left-full ml-3 top-2";

  return (
    <div className={`absolute ${className} group`}>
      {/* Speech bubble */}
      <div
        className={`absolute ${bubblePositionClass} w-[220px] sm:w-[260px] transition-all duration-300 ${
          bubbleActive ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-1 pointer-events-none"
        }`}
      >
        <div
          className={`${bubbleColor} ${bubbleTextPaper ? "text-paper" : "text-ink"} rounded-2xl px-4 py-3 border-2 border-ink shadow-[4px_4px_0_var(--ink)]`}
        >
          <div className={`text-[10px] font-mono uppercase mb-1 ${bubbleTextPaper ? "text-paper/70" : "text-ink/50"}`}>
            {label}
          </div>
          <p className="font-medium text-sm leading-snug">{bubble}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="block w-full transition-transform hover:-translate-y-1 active:translate-y-0 cursor-pointer focus:outline-none"
        aria-label={`Talk to ${label}`}
      >
        <img
          src={src}
          alt={alt}
          className={`w-full h-auto drop-shadow-2xl ${bubbleActive ? "animate-bounce-slow" : ""}`}
          loading="lazy"
        />
        <span className="block mt-1 mx-auto w-fit px-2 py-0.5 rounded-full bg-white/90 border border-ink/20 text-[10px] font-mono uppercase tracking-wide text-ink opacity-0 group-hover:opacity-100 transition">
          {label}
        </span>
      </button>
    </div>
  );
}
