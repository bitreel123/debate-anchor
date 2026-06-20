import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, Gavel, ArrowLeft, History } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import courtroom from "@/assets/courtroom-scene.jpg";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Verdict — Arena" },
      { name: "description", content: "Submit a topic and watch two AI agents debate before a judge." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [mode, setMode] = useState<"debate" | "research">("debate");
  const [prompt, setPrompt] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Debate engine coming soon", { description: "Wallet + 0G integration in the next build." });
  };

  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col">
      <Toaster position="top-center" />

      {/* Top bar */}
      <header className="flex items-center justify-between p-3 gap-3 z-30">
        <div className="flex items-center gap-2">
          <Link to="/" className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-ink/5 flex items-center gap-2 hover:bg-ink/5 transition">
            <ArrowLeft className="size-4" />
            <span className="font-display font-black text-ink">Verdict</span>
          </Link>
          <div className="hidden md:flex items-center gap-2 px-3 py-2.5 text-sm text-ink/60">
            <span>/</span>
            <span className="font-semibold text-ink">New Debate</span>
          </div>
        </div>
        <button
          onClick={() => toast("Wallet connect coming soon", { description: "MetaMask + 0G Galileo in the next build." })}
          className="bg-ink text-paper rounded-2xl px-5 py-2.5 font-semibold text-sm flex items-center gap-2 hover:bg-ink/90 transition shadow-sm"
        >
          <Wallet className="size-4" />
          Connect Wallet
        </button>
      </header>

      {/* Courtroom stage */}
      <section className="relative flex-1 mx-3 rounded-3xl overflow-hidden border-2 border-ink shadow-[6px_6px_0_var(--ink)] bg-ink/5">
        <img
          src={courtroom}
          alt="Cartoon courtroom with judge and two debater agents"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-paper/95" />

        {/* Floating speech bubbles */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 max-w-sm">
          <SpeechBubble color="bg-white" border>
            <div className="text-xs font-mono uppercase text-ink/50 mb-1">Judge</div>
            <p className="text-ink font-medium">Awaiting verdict…</p>
          </SpeechBubble>
        </div>
        <div className="absolute top-32 left-4 md:left-12 max-w-[260px] hidden sm:block">
          <SpeechBubble color="bg-accent-orange" border>
            <div className="text-xs font-mono uppercase text-ink/60 mb-1">Agent A</div>
            <p className="text-ink font-medium">Ready to argue the case for…</p>
          </SpeechBubble>
        </div>
        <div className="absolute top-32 right-4 md:right-12 max-w-[260px] hidden sm:block">
          <SpeechBubble color="bg-accent-blue" textPaper border>
            <div className="text-xs font-mono uppercase text-paper/70 mb-1">Agent B</div>
            <p className="text-paper font-medium">Ready to argue the case against…</p>
          </SpeechBubble>
        </div>

        {/* Prompt composer */}
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-8">
          <form onSubmit={onSubmit} className="max-w-3xl mx-auto bg-white rounded-3xl border-2 border-ink shadow-[6px_6px_0_var(--ink)] p-4">
            <div className="flex items-center gap-2 mb-3">
              {(["debate", "research"] as const).map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition border-2 ${
                    mode === m ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-ink/10 hover:border-ink/30"
                  }`}
                >
                  {m}
                </button>
              ))}
              <div className="ml-auto text-xs text-ink/40 font-mono hidden sm:block">3 rounds · 2 agents · 1 judge</div>
            </div>
            <div className="flex items-end gap-3">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Enter a topic or research question…"
                rows={2}
                className="flex-1 resize-none bg-transparent text-ink placeholder:text-ink/40 outline-none text-base p-2"
              />
              <button
                type="submit"
                className="bg-accent-lemon text-ink rounded-2xl p-3 border-2 border-ink hover:scale-[1.03] transition shrink-0"
                aria-label="Start debate"
              >
                <Gavel className="size-5" strokeWidth={2.5} />
              </button>
            </div>
          </form>
        </div>

        {/* Recent debates rail */}
        <aside className="absolute top-4 right-4 hidden lg:block w-64">
          <div className="bg-white/95 backdrop-blur rounded-2xl border-2 border-ink p-4 shadow-[4px_4px_0_var(--ink)]">
            <div className="flex items-center gap-2 mb-3">
              <History className="size-4 text-ink" />
              <span className="font-display font-bold text-ink text-sm">Recent debates</span>
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
      </section>
      <div className="h-3" />
    </main>
  );
}

function SpeechBubble({ children, color, border, textPaper }: { children: React.ReactNode; color: string; border?: boolean; textPaper?: boolean }) {
  return (
    <div className={`${color} ${textPaper ? "text-paper" : "text-ink"} rounded-2xl px-4 py-3 ${border ? "border-2 border-ink" : ""} shadow-[4px_4px_0_var(--ink)]`}>
      {children}
    </div>
  );
}
