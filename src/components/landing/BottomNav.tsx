import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

const items = [
  { id: "overview", label: "Overview" },
  { id: "how", label: "How it Works" },
  { id: "modes", label: "Modes" },
  { id: "verify", label: "Verifiability" },
  { id: "faq", label: "FAQ" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 p-3 flex gap-2 items-stretch pointer-events-none">
      <div className="pointer-events-auto flex-1 flex gap-1 bg-white rounded-2xl p-1.5 border border-ink/5 shadow-sm overflow-x-auto">
        {items.map((it, idx) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            className={`px-5 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition ${
              idx === 0 ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
            }`}
          >
            {it.label}
          </a>
        ))}
      </div>
      <Link
        to="/dashboard"
        className="pointer-events-auto bg-ink text-paper rounded-2xl px-6 py-3 font-semibold text-sm flex items-center gap-2 hover:bg-ink/90 transition"
      >
        Launch App
        <ArrowUpRight className="size-4" />
      </Link>
    </nav>
  );
}
