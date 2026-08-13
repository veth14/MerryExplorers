import Image from "next/image";

export function ReportsFooterBanner() {
  return (
    <div
      id="reports-footer-banner"
      className="relative rounded-[2rem] overflow-hidden bg-gradient-to-r from-brand-navy via-brand-blue to-brand-navy px-8 py-6 shadow-lg border-2 border-brand-blue"
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h3 className="font-headline text-[20px] font-black text-white flex items-center gap-2">
            It&apos;s Learning!
            <span className="material-symbols-outlined text-brand-yellow" style={{ fontSize: "24px" }}>
              rocket_launch
            </span>
          </h3>
          <p className="text-[13px] font-semibold text-white/70 mt-1">
            Empowering every explorer to reach their full potential.
          </p>
        </div>

        {/* Decorative logo mark */}
        <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 shadow-inner">
          <div className="relative h-9 w-9 overflow-hidden rounded-lg">
            <Image src="/LOGO.jpg" alt="Merry Explorers" fill sizes="36px" className="object-contain opacity-80" />
          </div>
        </div>
      </div>

      {/* Decorative blurred shapes */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-brand-orange/20 blur-2xl pointer-events-none" />
      <div className="absolute -left-4 -top-4 w-20 h-20 rounded-full bg-white/5 blur-xl pointer-events-none" />
    </div>
  );
}
