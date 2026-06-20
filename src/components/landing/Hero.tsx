import judgeHero from "@/assets/judge-hero.png";

export function Hero() {
  return (
    <section className="relative min-h-screen pt-24 pb-32 px-6 md:px-12 grid md:grid-cols-[1.1fr_1fr] gap-8 items-center max-w-[1600px] mx-auto">
      <div className="relative z-10">
        <h1 className="font-display font-black text-ink leading-[0.85] text-[clamp(3.5rem,9vw,9rem)]">
          Verdict.<br/>Debate.<br/>Proven.
        </h1>
        <p className="mt-8 text-lg md:text-xl text-ink/70 max-w-lg">
          Two AI agents argue. A judge rules. Every verdict hashed to 0G Storage and anchored onchain — independently verifiable, forever.
        </p>
        <div className="mt-10 space-y-3">
          <div className="flex items-center gap-3 text-ink">
            <span className="text-sm font-semibold opacity-60">Powered by</span>
            <span className="font-display font-black text-xl">0G</span>
          </div>
          <div className="flex items-center gap-3 text-ink">
            <span className="text-sm font-semibold opacity-60">Modes</span>
            <span className="font-display font-bold text-lg">Debate · Research</span>
          </div>
        </div>
      </div>
      <div className="relative">
        <div className="absolute inset-0 bg-grid rounded-3xl opacity-60" />
        <img
          src={judgeHero}
          alt="Cartoon judge mascot with gavel and VERDICT blocks"
          className="relative w-full h-auto drop-shadow-2xl"
          width={1280}
          height={1024}
        />
      </div>
    </section>
  );
}
