# Verdict — Landing + Dashboard (visual only)

Build a static landing page styled after overflow.sui.io plus a courtroom-themed dashboard. No 0G, no wallet, no AI wiring yet — just UI.

## Visual language (inspired by Sui Overflow)

- **Layout**: top bar with brand pill on the left + a dark date/tag pill on the far right; oversized condensed sans headline left, big playful illustration right; bottom anchored nav bar of section pills with one dark "Launch App" pill on the right.
- **Type**: heavy condensed sans for the hero (use `@fontsource/archivo` 800/900 as a free stand-in for that compressed look), clean grotesk for body (`@fontsource/inter`).
- **Palette**: off-white background `#f4f4ef`, deep navy ink `#0b1220`, bright accent chips — orange `#ff7a3d`, electric blue `#3b82f6`, mint `#34d399`, violet `#a78bfa`, lemon `#facc15`, pink `#f472b6`. Subtle blueprint grid behind the hero illustration.
- **Motif**: same "exploded 3D blocks" energy, but as a courtroom — a cartoon gavel, scales of justice, two debater speech bubbles, and a chunky cartoon judge head. No keyboard keys.

## Landing page `/`

Top bar
- Left: white rounded pill "Verdict" wordmark.
- Right: dark navy pill `<verdict> AI Debate Arena </verdict>` styled like the screenshot's `<date>` tag.

Hero (split, ~60/40)
- Left column: huge stacked headline "Verdict. Debate. Proven." with a one-line subhead ("Two AI agents argue. A judge rules. Every verdict is verifiable.") and two small meta rows ("Powered by  0G", "Mode: Debate · Research") in the same "Headline Partner / Track Sponsor" rhythm.
- Right column: hand-drawn cartoon scene — a chunky cartoon **Judge** with white wig and gavel center, two debater agent heads (Agent A orange, Agent B blue) shouting speech bubbles around him, scales of justice, "VERDICT" letters as 3D colored blocks scattered like the screenshot, faint grid paper background. Generated as a single illustration via image gen (premium quality, transparent bg over the off-white).

Bottom nav strip (sticky-feeling, matches screenshot)
- Pills: `Overview` (active) · `How it Works` · `Modes` · `Verifiability` · `FAQ` — each scrolls to a section.
- Far right: dark `Launch App →` pill → routes to `/dashboard`. Tiny diagonal-arrow square button at the very edge (decorative, like the screenshot).

Sections below the fold (short, on-brand)
- **How it Works** — 3 chunky cards: 1) Submit a topic, 2) Agents debate live, 3) Lock verdict to 0G.
- **Modes** — 2 cards: Debate (gavel icon) · Research (scales icon).
- **Verifiability** — one wide card with hash → storage → chain illustration.
- **FAQ** — 4 collapsibles.
- Minimal footer.

## Dashboard `/dashboard` — Courtroom

Full-bleed courtroom scene as the visual frame, with functional UI overlaid.

Top bar
- Left: "Verdict" wordmark + breadcrumb "New Debate".
- Right edge: prominent `Connect Wallet` button (dark pill with wallet icon). Purely visual — opens a toast "Wallet connect coming soon" on click.

Main stage (illustration + chat)
- Background illustration: cartoon courtroom — wood panels, pillars, a tall judge bench center with the **cartoon Judge** seated behind it holding a gavel, two **debater podiums** flanking him with Agent A (orange) on the left and Agent B (blue) on the right, both cartoon characters mid-gesture. Game-like, friendly, not photoreal. Generated as one wide hero illustration.
- Over the illustration: three floating speech-bubble cards
  - Judge bubble (top center, empty placeholder: "Awaiting verdict…")
  - Agent A bubble (left, placeholder: "Ready to argue the case for…")
  - Agent B bubble (right, placeholder: "Ready to argue the case against…")

Prompt composer (bottom, AI Elements `PromptInput`)
- Centered, max-w-3xl, sitting in front of the courtroom floor.
- Textarea placeholder: "Enter a topic or research question…"
- Inline mode toggle chips: `Debate` / `Research`.
- Submit button = gavel icon. Disabled-look, no backend; clicking shows a toast "Debate engine coming soon".

Side rail (right, collapsible)
- "Recent debates" placeholder list with 3 fake rows (greyed). Just for composition.

## Assets to generate (image gen, premium for legibility)

1. `judge-hero.png` — cartoon judge head + scales + gavel + "VERDICT" 3D block letters, transparent PNG over off-white, sized ~1280×1024. For landing hero right side.
2. `courtroom-scene.png` — wide cartoon courtroom with seated judge center + two debater agents at podiums (orange + blue), game-illustration style, ~1920×1024.
3. `judge-avatar.png` — small circular judge head for chat bubbles, ~512×512 transparent.
4. `agent-a.png`, `agent-b.png` — small character heads for the two debaters, transparent.

## Routes & files

- `src/routes/index.tsx` — landing (replace placeholder).
- `src/routes/dashboard.tsx` — courtroom dashboard.
- `src/components/landing/TopBar.tsx`, `Hero.tsx`, `BottomNav.tsx`, `HowItWorks.tsx`, `Modes.tsx`, `Verifiability.tsx`, `FAQ.tsx`.
- `src/components/dashboard/CourtroomStage.tsx`, `SpeechBubble.tsx`, `DebatePrompt.tsx`, `ConnectWalletButton.tsx`.
- `src/components/ai-elements/*` — install via `bun x ai-elements@latest add prompt-input message conversation shimmer` for the composer.
- `src/styles.css` — add semantic tokens for the palette above (`--ink`, `--paper`, `--accent-orange/blue/mint/violet/lemon/pink`, `--grid-line`) and a `--gradient-judge` flourish. No raw hex in components.
- Fonts: `bun add @fontsource/archivo @fontsource/inter`, import in `src/routes/__root.tsx`.

## SEO / head

- `/` head: title "Verdict — Verifiable AI Debate Arena", matching meta description, og:title/description, og:image = judge hero render.
- `/dashboard` head: title "Verdict — Arena", noindex-style description (it's an app surface, not a share target).

## Out of scope (explicitly)

No 0G SDK, no MetaMask, no AI gateway calls, no Supabase, no streaming, no persistence. Wallet button and submit button are visual + toast only. We wire real functionality in the next plan.

