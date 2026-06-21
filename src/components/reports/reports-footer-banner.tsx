import Image from "next/image";

function RocketIcon() {
  return (
    <span className="text-lg" role="img" aria-label="rocket">🚀</span>
  );
}

export function ReportsFooterBanner() {
  return (
    <div
      id="reports-footer-banner"
      className="relative rounded-[1.25rem] overflow-hidden bg-gradient-to-r from-[#005cc8] via-[#0050b3] to-[#003d8a] px-8 py-6 shadow-[0_8px_30px_rgba(0,92,200,0.25)]"
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
        backgroundSize: '24px 24px',
      }} />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h3 className="font-headline text-[20px] font-black text-white flex items-center gap-2">
            It&apos;s Learning! <RocketIcon />
          </h3>
          <p className="text-[13px] font-semibold text-white/70 mt-1">
            Empowering every explorer to reach their full potential.
          </p>
        </div>

        {/* Decorative logo mark */}
        <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-inner">
          <div className="relative h-9 w-9 overflow-hidden rounded-lg">
            <Image src="/LOGO.jpg" alt="Merry Explorers" fill className="object-contain opacity-80" />
          </div>
        </div>
      </div>

      {/* Decorative blurred shapes */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[#ffb800]/15 blur-2xl pointer-events-none" />
      <div className="absolute -left-4 -top-4 w-20 h-20 rounded-full bg-white/5 blur-xl pointer-events-none" />
    </div>
  );
}
