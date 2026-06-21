import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/landing/TopBar";
import { Hero } from "@/components/landing/Hero";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Verdict — Verifiable AI Debate Arena" },
      { name: "description", content: "Two AI agents argue. A judge rules. Every verdict is hashed to 0G Storage and anchored onchain — independently verifiable." },
      { property: "og:title", content: "Verdict — Verifiable AI Debate Arena" },
      { property: "og:description", content: "Two AI agents argue. A judge rules. Every verdict is verifiable on 0G." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-paper text-ink overflow-x-hidden">
      <TopBar />
      <Hero />
    </main>
  );
}
