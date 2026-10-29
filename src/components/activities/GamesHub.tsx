import Link from "next/link";
import { AppShell } from "@/components/app-shell";

type GamesHubProps = {
  mode: "admin" | "teacher";
};

type FutureGame = {
  title: string;
  description: string;
  kind: "shapes" | "sounds" | "numbers" | "family";
};

const FUTURE_GAMES: FutureGame[] = [
  {
    title: "Colors & Shapes",
    description: "Match colors, shapes, and patterns.",
    kind: "shapes",
  },
  {
    title: "Animal Sounds",
    description: "Listen closely and find each animal.",
    kind: "sounds",
  },
  {
    title: "Number Trail",
    description: "Explore numbers through simple challenges.",
    kind: "numbers",
  },
  {
    title: "Family Members Match",
    description: "Identify parents, siblings, and family members.",
    kind: "family",
  },
];

function FutureGameIcon({ kind }: { kind: FutureGame["kind"] }) {
  if (kind === "numbers") {
    return <span className="font-[family-name:var(--font-fredoka)] text-lg font-bold tracking-tight">123</span>;
  }

  if (kind === "shapes") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        <circle cx="13" cy="15" r="7" fill="#ffbd22" />
        <rect x="26" y="8" width="14" height="14" rx="3" fill="#1683d8" />
        <path d="m15 40 9-16 9 16z" fill="#55ad68" />
      </svg>
    );
  }

  if (kind === "sounds") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18 5.5a9 9 0 0 1 0 13" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="h-8 w-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="13" r="6" fill="#ffcf72" />
      <circle cx="32" cy="15" r="5" fill="#8fc5f2" />
      <path d="M5 39v-4c0-7 5-12 11-12s11 5 11 12v4z" fill="#ffcf72" />
      <path d="M27 29c1-3 3-5 6-5 5 0 9 4 9 10v5H27" fill="#8fc5f2" />
    </svg>
  );
}

export function GamesHub({ mode }: GamesHubProps) {
  const activityPath = mode === "teacher" ? "/teacher/activities" : "/admin/activities";

  return (
    <AppShell title="Games" description="Choose a learning game to play with your students.">
      <div className="w-full space-y-7 pb-4 sm:space-y-9">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-[#57719b]">
              <span className="h-[3px] w-7 rounded-full bg-[#ffb800]" aria-hidden="true" />
              Learning library
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#002f76] sm:text-4xl">Choose a game</h1>
            <p className="mt-2 text-sm text-[#57719b] sm:text-base">Play, learn, and explore together.</p>
          </div>

          <div className="flex items-center gap-3 self-start rounded-2xl border border-[#dbe4f1] bg-white px-4 py-3 shadow-[0_4px_14px_rgba(0,47,118,.06)] sm:self-auto">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f6ec] text-[#248451]" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </span>
            <span>
              <span className="block text-lg font-black leading-none text-[#002f76]">1 ready</span>
              <span className="mt-1 block text-xs font-semibold text-[#6b7f9e]">4 coming soon</span>
            </span>
          </div>
        </header>

        <Link
          href={`${activityPath}/body-parts`}
          className="group grid w-full overflow-hidden rounded-[26px] border border-[#c8d9ed] bg-[#002f76] shadow-[0_16px_42px_rgba(0,47,118,.16)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(0,47,118,.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffcf45] lg:min-h-[410px] lg:grid-cols-[minmax(0,1.03fr)_minmax(380px,.97fr)]"
        >
          <div className="relative flex flex-col justify-center overflow-hidden p-6 text-white sm:p-9 lg:p-11">
            <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-white/10" />

            <span className="relative inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200/30 bg-emerald-300/15 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[.1em] text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-[#54d695] shadow-[0_0_0_4px_rgba(84,214,149,.15)]" aria-hidden="true" />
              Available to play
            </span>

            <h2 className="relative mt-5 max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-[2.65rem]">
              Body Parts <span className="text-[#ffd04a]">Adventure</span>
            </h2>
            <p className="relative mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
              Help little learners discover body parts through picture choices and an interactive body map.
            </p>

            <div className="relative mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">Picture Match</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">Body Map</span>
              <span className="rounded-full border border-[#ffd04a]/35 bg-[#ffd04a]/10 px-3 py-1.5 text-xs font-bold text-[#ffe398]">Ages 2–5</span>
            </div>

            <span className="relative mt-7 inline-flex min-h-12 w-fit items-center gap-2 rounded-xl bg-[#ffbf1f] px-5 py-3 text-sm font-black text-[#173764] shadow-[0_6px_16px_rgba(0,0,0,.16)] transition group-hover:bg-[#ffd04a]">
              Start playing <span aria-hidden="true" className="text-lg leading-none transition-transform group-hover:translate-x-1">→</span>
            </span>
          </div>

          <div className="relative flex min-h-72 items-center justify-center overflow-hidden bg-[#f7f4e9] p-5 sm:p-7 lg:min-h-full lg:p-9">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#dff3fa]" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#e5f2df]" />
            <div className="relative grid w-full max-w-[560px] grid-cols-2 gap-3 sm:gap-4">
              {[
                { src: "/body-parts/ARMS.png", label: "Arms", bg: "bg-[#fff1d8]" },
                { src: "/body-parts/EYES.png", label: "Eyes", bg: "bg-[#e3f4fc]" },
                { src: "/body-parts/FEET.png", label: "Feet", bg: "bg-[#e7f3e4]" },
                { src: "/body-parts/HANDS.png", label: "Hands", bg: "bg-[#eee9fb]" },
              ].map((picture) => (
                <div key={picture.label} className={`flex aspect-[1.25] items-center justify-center overflow-hidden rounded-2xl border border-white bg-white p-3 shadow-[0_8px_20px_rgba(31,58,91,.10)] ${picture.bg}`}>
                  <img src={picture.src} alt="" aria-hidden="true" className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" />
                </div>
              ))}
            </div>
            <span className="absolute bottom-4 right-4 rounded-full border border-[#d6e1ee] bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#315479] shadow-sm">Learn through play</span>
          </div>
        </Link>

        <section aria-labelledby="future-games-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#dbe4f1] pb-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[.15em] text-[#8a6c20]">Coming to the library</div>
              <h2 id="future-games-heading" className="mt-1 text-xl font-black text-[#002f76] sm:text-2xl">More ways to learn</h2>
            </div>
            <span className="text-xs font-semibold text-[#6b7f9e]">New games will unlock here</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {FUTURE_GAMES.map((game) => (
              <article key={game.kind} className="group relative flex min-h-36 items-start gap-4 overflow-hidden rounded-2xl border border-[#dbe4f1] bg-white p-4 shadow-[0_3px_12px_rgba(0,47,118,.04)] transition hover:border-[#b6c9e0] hover:shadow-[0_8px_22px_rgba(0,47,118,.08)]">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${game.kind === "shapes" ? "bg-[#fff3d3] text-[#9a7010]" : game.kind === "sounds" ? "bg-[#e4f3fc] text-[#176aa1]" : game.kind === "numbers" ? "bg-[#e7f3e4] text-[#34734c]" : "bg-[#eee9fb] text-[#5e5298]"}`}>
                  <FutureGameIcon kind={game.kind} />
                </span>
                <span className="min-w-0">
                  <span className="block font-extrabold leading-snug text-[#173764]">{game.title}</span>
                  <span className="mt-1.5 block text-xs leading-5 text-[#6b7f9e]">{game.description}</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.1em] text-[#92731d]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ffbf1f]" aria-hidden="true" /> In development
                  </span>
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
