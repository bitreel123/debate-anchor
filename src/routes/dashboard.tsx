import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Wallet, Gavel, ArrowLeft, History, Send, Scale, Loader2, CheckCircle2, Circle, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import courtroom from "@/assets/courtroom-bg.jpg";
import judgeImg from "@/assets/judge-cartoon.png";
import agentAImg from "@/assets/agent-a-cartoon.png";
import agentBImg from "@/assets/agent-b-cartoon.png";
import ogFlag from "@/assets/og-flag.png";
import { useWallet } from "@/lib/wallet";
import { runDebate } from "@/lib/inference.functions";
import { pinTranscript } from "@/lib/storage.functions";
import { anchorDebate } from "@/lib/registry";
import { OG_GALILEO, VERDICT_REGISTRY_ADDRESS } from "@/lib/og-chain";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Verdict — Courtroom" },
      { name: "description", content: "Step into the OG Verdict courtroom. Submit a topic, watch two AI agents debate, anchor the verdict to 0G Chain." },
    ],
  }),
  component: Dashboard,
});

type Line = { role: "A" | "B" | "JUDGE"; round: number; text: string };
type Stage = "idle" | "thinking" | "ready-to-anchor" | "anchoring" | "anchored";
type DebateHistoryEntry = {
  id: string;
  topic: string;
  mode: "debate" | "research";
  createdAt: number;
  transcript: Line[];
  winner: string;
  storage?: { root: string; backend: string } | null;
  anchor?: { txHash: string; explorerUrl: string; transcriptHash: string } | null;
};

const HISTORY_KEY = "og-verdict-history-v1";

function short(a?: string | null) { return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : ""; }

function loadDebateHistory(): DebateHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistDebateHistory(items: DebateHistoryEntry[]) {
  const next = items.slice(0, 40);
  if (typeof window !== "undefined") window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

function createHistoryId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function Dashboard() {
  const wallet = useWallet();
  const runDebateFn = useServerFn(runDebate);
  const pinTranscriptFn = useServerFn(pinTranscript);

  const [mode, setMode] = useState<"debate" | "research">("debate");
  const [activePanel, setActivePanel] = useState<"court" | "history">("court");
  const [prompt, setPrompt] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState<Line[]>([]);
  const [winner, setWinner] = useState<string>("");
  const [speaking, setSpeaking] = useState<"judge" | "a" | "b" | null>("judge");
  const [welcome, setWelcome] = useState("Welcome to OG Verdict Court. Submit a topic and I'll convene the agents.");
  const [storage, setStorage] = useState<{ root: string; backend: string } | null>(null);
  const [anchor, setAnchor] = useState<{ txHash: string; explorerUrl: string; transcriptHash: string } | null>(null);
  const [history, setHistory] = useState<DebateHistoryEntry[]>(() => loadDebateHistory());

  const onConnect = async () => {
    try {
      if (wallet.address) { wallet.disconnect(); toast("Wallet disconnected"); return; }
      await wallet.connect();
      toast.success("Connected to 0G Galileo");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) { toast("Enter a topic first"); return; }
    const topic = prompt.trim();
    setActivePanel("court");
    setStage("thinking");
    setTranscript([]); setWinner(""); setStorage(null); setAnchor(null);
    setWelcome(mode === "debate" ? "Court is in session. Three rounds." : "Researchers — investigate.");
    setSpeaking("judge");

    try {
      const result = await runDebateFn({ data: { topic, mode } });
      setTranscript(result.transcript);
      setWinner(result.winner);

      // Animate speakers in sequence
      result.transcript.forEach((line, i) => {
        setTimeout(() => {
          setSpeaking(line.role === "A" ? "a" : line.role === "B" ? "b" : "judge");
        }, i * 250);
      });

      // Pin to 0G Storage
      const pin = await pinTranscriptFn({ data: { transcript: result.transcript, topic } });
      const storageRef = { root: pin.storageRoot, backend: pin.backend };
      setStorage(storageRef);
      setHistory(prev => persistDebateHistory([{ id: createHistoryId(), topic, mode, createdAt: Date.now(), transcript: result.transcript, winner: result.winner, storage: storageRef, anchor: null }, ...prev]));
      setStage("ready-to-anchor");
      toast.success("Debate complete. Anchor to 0G Chain to finalize.");
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Inference failed");
      setStage("idle");
    }
  };

  const handleAnchor = async () => {
    if (!wallet.address) { toast("Connect wallet first"); await onConnect(); return; }
    if (!storage) return;
    if (!VERDICT_REGISTRY_ADDRESS) {
      toast.error("Contract not deployed yet — see contracts/README.md");
      return;
    }
    setStage("anchoring");
    try {
      const signer = await wallet.getSigner();
      const res = await anchorDebate(signer, {
        transcript, storageRoot: storage.root, topic: prompt, winner, mode,
      });
      const anchorRef = { txHash: res.txHash, explorerUrl: res.explorerUrl, transcriptHash: res.transcriptHash };
      setAnchor(anchorRef);
      setHistory(prev => persistDebateHistory(prev.map(item => item.topic === prompt && item.winner === winner ? { ...item, anchor: anchorRef } : item)));
      setStage("anchored");
      toast.success("Anchored to 0G Chain ✓");
    } catch (e) {
      toast.error((e as Error).message || "Tx failed");
      setStage("ready-to-anchor");
    }
  };

  const restoreHistory = (item: DebateHistoryEntry) => {
    setActivePanel("court");
    setMode(item.mode);
    setPrompt(item.topic);
    setTranscript(item.transcript);
    setWinner(item.winner);
    setStorage(item.storage ?? null);
    setAnchor(item.anchor ?? null);
    setStage(item.anchor ? "anchored" : item.storage ? "ready-to-anchor" : "idle");
    setSpeaking("judge");
    setWelcome("Loaded from history.");
  };

  const deleteHistory = (id: string) => {
    setHistory(prev => persistDebateHistory(prev.filter(item => item.id !== id)));
    toast("Removed from history");
  };

  const clearHistory = () => {
    setHistory(persistDebateHistory([]));
    toast("History cleared");
  };

  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col">
      <Toaster position="top-center" />

      {/* Top bar */}
      <header className="flex items-center justify-between p-3 gap-3 z-30">
        <div className="flex items-center gap-2">
          <Link to="/" className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-ink/10 flex items-center gap-2 hover:bg-ink/5">
            <ArrowLeft className="size-4" />
            <span className="font-display font-black">Verdict</span>
          </Link>
          <div className="hidden md:flex items-center gap-2 px-3 py-2.5 text-sm">
            <Scale className="size-4" /><span className="font-semibold">OG Verdict Court</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-2xl p-1 border border-ink/10 shadow-sm">
            {(["debate", "research"] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${mode === m ? "bg-ink text-paper" : "text-ink/70 hover:text-ink"}`}>
                {m}
              </button>
            ))}
          </div>

          <button onClick={onConnect} disabled={wallet.connecting}
            className={`rounded-2xl px-5 py-2.5 font-semibold text-sm flex items-center gap-2 transition shadow-sm border-2 ${
              wallet.address ? "bg-accent-mint text-ink border-ink" : "bg-ink text-paper border-ink hover:bg-ink/90"
            }`}>
            <Wallet className="size-4" />
            {wallet.connecting ? "Connecting…" : wallet.address ? `${short(wallet.address)} · 0G` : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Courtroom stage */}
      <section className="relative flex-1 mx-3 mb-3 rounded-3xl overflow-hidden border-2 border-ink shadow-[6px_6px_0_var(--ink)] bg-[#3a2410] min-h-[560px]">
        <img src={courtroom} alt="Cartoon American courtroom" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-paper/95 pointer-events-none" />

        {/* 0G Flag — courtroom emblem, beside the judge */}
        <img src={ogFlag} alt="0G Labs flag" width={512} height={768} loading="lazy"
          className="absolute left-[63%] top-[14%] w-[70px] md:w-[88px] drop-shadow-xl pointer-events-none z-[6] -rotate-6" />

        {/* Judge */}
        <Character src={judgeImg} alt="Judge" label="Judge"
          className="left-1/2 top-[18%] -translate-x-1/2 w-[180px] sm:w-[220px] md:w-[240px]"
          bubble={lastLine(transcript, "JUDGE") ?? welcome}
          active={speaking === "judge"} color="bg-white" pos="top" />

        {/* Agent A */}
        <Character src={agentAImg} alt="Agent A" label={mode === "debate" ? "Agent A · Pro" : "Researcher Alpha"}
          className="left-[6%] md:left-[10%] bottom-[24%] w-[140px] sm:w-[170px] md:w-[190px]"
          bubble={lastLine(transcript, "A") ?? (mode === "debate" ? "Ready to argue the affirmative — submit a topic." : "Ready to investigate — submit a question.")}
          active={speaking === "a"} color="bg-accent-orange" pos="top" />

        {/* Agent B */}
        <Character src={agentBImg} alt="Agent B" label={mode === "debate" ? "Agent B · Con" : "Researcher Beta"}
          className="right-[6%] md:right-[10%] bottom-[24%] w-[140px] sm:w-[170px] md:w-[190px]"
          bubble={lastLine(transcript, "B") ?? (mode === "debate" ? "Ready to argue the opposition — submit a topic." : "Ready to investigate from a different angle.")}
          active={speaking === "b"} color="bg-accent-blue" textPaper pos="top" />


        {/* Composer */}
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 z-10">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-white rounded-3xl border-2 border-ink shadow-[6px_6px_0_var(--ink)] p-4">
            <div className="flex items-center justify-end gap-2 mb-3">
              {winner && <span className="text-xs font-mono px-2 py-1 rounded-full bg-accent-lemon border border-ink">Verdict: {winner}</span>}
            </div>

            <div className="flex items-end gap-3">
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} disabled={stage === "thinking"}
                placeholder={mode === "debate" ? "Should AI agents be allowed to own property?" : "What does recent research say about…?"}
                rows={2}
                className="flex-1 resize-none bg-transparent placeholder:text-ink/40 outline-none text-base p-2 disabled:opacity-60" />
              {stage === "ready-to-anchor" || stage === "anchoring" || stage === "anchored" ? (
                <button type="button" onClick={handleAnchor} disabled={stage === "anchoring" || stage === "anchored"}
                  className="bg-accent-mint text-ink rounded-2xl px-4 py-3 border-2 border-ink hover:scale-[1.03] transition shrink-0 flex items-center gap-2 font-semibold text-sm shadow-[3px_3px_0_var(--ink)] disabled:opacity-70">
                  {stage === "anchoring" ? <Loader2 className="size-4 animate-spin" /> :
                   stage === "anchored" ? <CheckCircle2 className="size-4" /> : <Scale className="size-4" />}
                  <span>{stage === "anchored" ? "Anchored" : stage === "anchoring" ? "Signing…" : "Anchor to 0G"}</span>
                </button>
              ) : (
                <button type="submit" disabled={stage === "thinking"}
                  className="bg-accent-lemon text-ink rounded-2xl px-4 py-3 border-2 border-ink hover:scale-[1.03] transition shrink-0 flex items-center gap-2 font-semibold text-sm shadow-[3px_3px_0_var(--ink)] disabled:opacity-70">
                  {stage === "thinking" ? <Loader2 className="size-4 animate-spin" /> : <Gavel className="size-4" />}
                  <span className="hidden sm:inline">{stage === "thinking" ? "Deliberating…" : "Call to Order"}</span>
                  <Send className="size-4 sm:hidden" />
                </button>
              )}
            </div>
            {storage && (
              <p className="mt-2 text-[11px] text-ink/70 font-mono break-all">
                📦 <b>0G Storage root:</b> <code className="bg-ink/10 px-1 rounded">{storage.root}</code> · backend <code className="bg-ink/10 px-1 rounded">{storage.backend}</code>
                <br />Retrieve anytime via <code className="bg-ink/10 px-1 rounded">GET https://indexer-storage-testnet-turbo.0g.ai/file?root={storage.root.startsWith("og://") ? "<sha256>" : storage.root}</code>
              </p>
            )}
            {anchor && (
              <p className="mt-1 text-[11px] text-ink/70 font-mono break-all">
                ⛓ <b>Anchored:</b> <a className="underline" href={anchor.explorerUrl} target="_blank" rel="noreferrer">{anchor.txHash.slice(0,10)}…</a> · hash <code className="bg-ink/10 px-1 rounded">{anchor.transcriptHash.slice(0,18)}…</code>
              </p>
            )}
            {!VERDICT_REGISTRY_ADDRESS && (
              <p className="mt-2 text-[11px] text-ink/60 font-mono flex items-center gap-1">
                <AlertCircle className="size-3" />
                Set <code className="bg-ink/10 px-1 rounded">VITE_VERDICT_REGISTRY_ADDRESS</code> after deploying — see <code className="bg-ink/10 px-1 rounded">contracts/README.md</code>. Faucet: <a className="underline" href="https://faucet.0g.ai" target="_blank" rel="noreferrer">faucet.0g.ai</a>. RPC: {OG_GALILEO.rpcUrls[0]}.
              </p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}

function lastLine(t: Line[], role: "A" | "B" | "JUDGE") {
  for (let i = t.length - 1; i >= 0; i--) if (t[i].role === role) return t[i].text;
  return null;
}

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="size-4 text-accent-mint shrink-0 mt-0.5" />
          : <Circle className="size-4 text-ink/30 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{label}</div>
        <div className="text-ink/50 font-mono truncate">{detail}</div>
      </div>
    </li>
  );
}


function Character({ src, alt, label, className, bubble, active, color, textPaper, pos }: {
  src: string; alt: string; label: string; className: string; bubble: string;
  active: boolean; color: string; textPaper?: boolean; pos: "top" | "left" | "right";
}) {
  const bp = pos === "top" ? "bottom-full mb-3 left-1/2 -translate-x-1/2"
           : pos === "left" ? "right-full mr-3 top-2" : "left-full ml-3 top-2";
  return (
    <div className={`absolute ${className}`}>
      <div className={`absolute ${bp} w-[260px] sm:w-[320px] md:w-[360px] transition-all duration-300 ${active ? "opacity-100 scale-100" : "opacity-95 scale-[0.97]"}`}>
        <div className={`${color} ${textPaper ? "text-paper" : "text-ink"} rounded-2xl px-4 py-3 border-2 border-ink shadow-[4px_4px_0_var(--ink)]`}>
          <div className={`text-[10px] font-mono uppercase mb-1 flex items-center justify-between gap-2 ${textPaper ? "text-paper/70" : "text-ink/50"}`}>
            <span className="truncate">{label}</span>
          </div>
          <div className="max-h-[260px] overflow-y-auto pr-1 nice-scroll">
            <p className="font-medium text-sm leading-snug whitespace-pre-wrap">{bubble}</p>
          </div>
        </div>
      </div>
      <img src={src} alt={alt} className={`w-full h-auto drop-shadow-2xl pointer-events-none ${active ? "animate-bounce-slow" : ""}`} />
    </div>
  );
}
