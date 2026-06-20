export function TopBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-40 flex items-stretch justify-between p-3 gap-3 pointer-events-none">
      <div className="pointer-events-auto bg-white rounded-2xl px-5 py-3 shadow-sm border border-ink/5">
        <span className="font-display font-black text-ink tracking-tight text-lg">Verdict 2026</span>
      </div>
      <div className="pointer-events-auto bg-ink rounded-2xl px-5 py-3 flex items-center gap-2 text-accent-blue font-mono text-sm">
        <span className="opacity-60">{"<verdict>"}</span>
        <span className="text-paper font-semibold">AI Debate Arena</span>
        <span className="opacity-60">{"</verdict>"}</span>
      </div>
    </header>
  );
}
