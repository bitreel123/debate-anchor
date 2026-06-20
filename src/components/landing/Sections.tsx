import { Gavel, Scale, FileText, Users, ShieldCheck, Hash, Link2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function HowItWorks() {
  const steps = [
    { n: "01", title: "Submit a topic", desc: "Drop a research question or a debate prompt. Pick Debate or Research mode.", color: "bg-accent-orange", Icon: FileText },
    { n: "02", title: "Agents debate live", color: "bg-accent-blue", Icon: Users, desc: "Two independent AI agents argue opposing positions across three rounds — opening, rebuttal, closing." },
    { n: "03", title: "Lock to 0G", color: "bg-accent-mint", Icon: ShieldCheck, desc: "Transcript + verdict are hashed, uploaded to 0G Storage, and anchored onchain via 0G Chain." },
  ];
  return (
    <section id="how" className="px-6 md:px-12 py-24 max-w-[1600px] mx-auto">
      <h2 className="font-display font-black text-ink text-5xl md:text-7xl mb-12">How it works</h2>
      <div className="grid md:grid-cols-3 gap-5">
        {steps.map(s => (
          <article key={s.n} className="rounded-3xl bg-white border-2 border-ink p-7 shadow-[6px_6px_0_var(--ink)]">
            <div className={`${s.color} size-14 rounded-2xl flex items-center justify-center border-2 border-ink mb-5`}>
              <s.Icon className="size-7 text-ink" strokeWidth={2.5} />
            </div>
            <div className="font-mono text-xs text-ink/50 mb-2">{s.n}</div>
            <h3 className="font-display font-black text-2xl text-ink mb-2">{s.title}</h3>
            <p className="text-ink/70">{s.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Modes() {
  return (
    <section id="modes" className="px-6 md:px-12 py-24 max-w-[1600px] mx-auto">
      <h2 className="font-display font-black text-ink text-5xl md:text-7xl mb-12">Two modes</h2>
      <div className="grid md:grid-cols-2 gap-5">
        <article className="rounded-3xl bg-accent-orange border-2 border-ink p-10 shadow-[6px_6px_0_var(--ink)]">
          <Gavel className="size-12 text-ink mb-6" strokeWidth={2.5} />
          <h3 className="font-display font-black text-4xl text-ink">Debate</h3>
          <p className="mt-3 text-ink/80 text-lg">Pro vs Con. Pick a position or let the agents pick. The judge declares a winner with reasoning.</p>
        </article>
        <article className="rounded-3xl bg-accent-blue border-2 border-ink p-10 shadow-[6px_6px_0_var(--ink)]">
          <Scale className="size-12 text-paper mb-6" strokeWidth={2.5} />
          <h3 className="font-display font-black text-4xl text-paper">Research</h3>
          <p className="mt-3 text-paper/90 text-lg">Two interpretations. The judge synthesizes the strongest points into a single, balanced answer.</p>
        </article>
      </div>
    </section>
  );
}

export function Verifiability() {
  return (
    <section id="verify" className="px-6 md:px-12 py-24 max-w-[1600px] mx-auto">
      <div className="rounded-3xl bg-ink text-paper p-10 md:p-16 border-2 border-ink shadow-[6px_6px_0_var(--accent-lemon)]">
        <h2 className="font-display font-black text-5xl md:text-7xl mb-6">Verifiable by anyone.</h2>
        <p className="text-paper/70 text-lg max-w-2xl">Every debate produces an immutable record. Anyone can independently confirm a past verdict hasn't been altered — no trust in the platform required.</p>
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {[
            { Icon: Hash, label: "SHA-256 hash", desc: "Canonical transcript + verdict are hashed deterministically." },
            { Icon: FileText, label: "0G Storage", desc: "Content uploaded to decentralized storage, addressable by root." },
            { Icon: Link2, label: "0G Chain anchor", desc: "Hash + storage root committed onchain in one tx." },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-paper/5 border border-paper/10 p-5">
              <s.Icon className="size-6 text-accent-lemon mb-3" />
              <div className="font-display font-bold text-xl">{s.label}</div>
              <p className="text-sm text-paper/60 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const qs = [
    { q: "Which models power the agents?", a: "Two debater agents and one judge agent run on independent inference. v1 uses fast frontier models; later versions will move to TEE-verified inference on 0G Compute." },
    { q: "What gets stored onchain?", a: "Only the content hash and storage root are stored on 0G Chain. The full transcript lives on 0G Storage." },
    { q: "Do I need a wallet?", a: "Yes — connect MetaMask to sign the storage transaction when locking a debate. Reading public debates is wallet-free." },
    { q: "Can I share a debate?", a: "Every locked debate has a public verify URL with the onchain tx hash and storage root." },
  ];
  return (
    <section id="faq" className="px-6 md:px-12 py-24 pb-40 max-w-[1100px] mx-auto">
      <h2 className="font-display font-black text-ink text-5xl md:text-7xl mb-10">FAQ</h2>
      <Accordion type="single" collapsible className="space-y-3">
        {qs.map((q, i) => (
          <AccordionItem key={i} value={`q-${i}`} className="rounded-2xl bg-white border-2 border-ink px-6 shadow-[4px_4px_0_var(--ink)]">
            <AccordionTrigger className="font-display font-bold text-xl text-ink hover:no-underline">{q.q}</AccordionTrigger>
            <AccordionContent className="text-ink/70 text-base">{q.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
