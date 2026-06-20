import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

export function TopBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-40 flex items-stretch justify-between p-3 gap-3 pointer-events-none">
      <div className="pointer-events-auto bg-white rounded-2xl px-5 py-3 shadow-sm border border-ink/5">
        <span className="font-display font-black text-ink tracking-tight text-lg">Verdict 2026</span>
      </div>
      <Link
        to="/dashboard"
        className="pointer-events-auto bg-ink text-paper rounded-2xl px-5 py-3 font-semibold text-sm flex items-center gap-2 hover:bg-ink/90 transition shadow-sm"
      >
        Launch App
        <ArrowUpRight className="size-4" />
      </Link>
    </header>
  );
}
