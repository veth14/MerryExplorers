import { notFound } from "next/navigation";

const sample = {
  parent: "Maria Clarisse Ann Tolentino",
  child: "Pia Chandria Tolentino",
  program: "Curious Explorer",
  adventure: 2,
  previousBalance: 1008,
  paymentReceived: 3387,
  currentAdventureTotal: 5145,
};

const appliedToPrevious = Math.min(sample.previousBalance, sample.paymentReceived);
const previousBalanceRemaining = sample.previousBalance - appliedToPrevious;
const appliedToCurrent = sample.paymentReceived - appliedToPrevious;
const currentBalanceRemaining = Math.max(0, sample.currentAdventureTotal - appliedToCurrent);
const money = (amount: number) => `₱${amount.toLocaleString("en-PH")}`;

export default function AdventureBalanceEmailPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-[#eaf4ff] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-5 rounded-2xl border border-blue-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-widest text-[#0050d5]">Draft preview · not sent</p>
          <h1 className="mt-1 text-xl font-extrabold text-[#002f76]">Adventure payment confirmation email</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Sample values are from the registration screenshots. This example applies the verified payment to the previous adventure balance first.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-slate-500">
            <span>Previous Adventure balance: {money(sample.previousBalance)}</span>
            <span>Payment received: {money(sample.paymentReceived)}</span>
            <span>Adventure {sample.adventure} total: {money(sample.currentAdventureTotal)}</span>
          </div>
        </div>

        <article className="overflow-hidden rounded-[24px] border-[3px] border-[#ffd84d] bg-white shadow-[0_12px_36px_rgba(0,51,160,0.15)]">
          <div className="bg-[#ffd84d] px-5 py-3 text-center text-[12px] font-extrabold tracking-wide text-[#0033a0]">
            🎉 WELCOME TO THE MERRY EXPLORERS FAMILY 🎉
          </div>

          <header className="bg-[#0033a0] px-6 py-8 text-center text-white sm:py-10">
            <div className="text-4xl" aria-hidden="true">🎒🎈🧭</div>
            <div className="mt-2 text-2xl font-black tracking-widest">MERRY EXPLORERS</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd84d]">Playgroup and Learning Center</div>
            <div className="mt-3 text-sm italic text-blue-200">Dream. Discover. Explore. 🤍</div>
          </header>

          <div className="px-6 py-8 sm:px-10">
            <div className="text-center text-4xl" aria-hidden="true">🎊</div>
            <h2 className="mt-2 text-center text-2xl font-extrabold text-slate-800">Payment verified!</h2>
            <p className="mt-1 text-center font-bold text-[#0033a0]">{sample.child} is confirmed for Adventure {sample.adventure}.</p>

            <p className="mt-6 text-[15px] leading-7 text-slate-600">
              Hi <strong className="text-slate-800">{sample.parent}</strong>! We&apos;re happy to confirm that your payment has been verified and {sample.child.split(" ")[0]} is registered for our {sample.program} program. 🎉
            </p>

            <section className="mt-6 rounded-2xl border border-blue-100 bg-[#f8fbff] p-5 sm:p-6">
              <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">📋 Registration details</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Explorer</dt><dd className="text-right font-bold text-[#0033a0]">{sample.child}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Program</dt><dd className="text-right font-bold text-[#0033a0]">{sample.program}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Adventure</dt><dd className="text-right font-bold text-emerald-700">Adventure {sample.adventure}</dd></div>
              </dl>
            </section>

            <section className="mt-5 rounded-2xl border-2 border-dashed border-[#ffd84d] bg-[#fffbea] p-5 sm:p-6">
              <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-amber-900">💰 Payment summary</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-amber-900">Payment received</dt><dd className="text-right font-extrabold text-emerald-700">{money(sample.paymentReceived)} ✓</dd></div>
                <div className="my-1 border-t border-amber-200" />
                <div className="flex justify-between gap-4"><dt className="text-amber-900">Adventure 1 previous balance</dt><dd className="text-right font-bold text-emerald-700">{previousBalanceRemaining === 0 ? `Paid in full · ${money(appliedToPrevious)}` : `${money(previousBalanceRemaining)} remaining`}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-amber-900">Adventure {sample.adventure} total</dt><dd className="text-right font-bold">{money(sample.currentAdventureTotal)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-amber-900">Payment applied to Adventure {sample.adventure}</dt><dd className="text-right font-bold">{money(appliedToCurrent)}</dd></div>
                <div className="mt-2 flex justify-between gap-4 border-t border-amber-300 pt-3 text-base font-extrabold">
                  <dt className="text-amber-950">Adventure {sample.adventure} remaining balance</dt>
                  <dd className={currentBalanceRemaining === 0 ? "text-emerald-700" : "text-amber-800"}>{currentBalanceRemaining === 0 ? "₱0 · Fully paid" : money(currentBalanceRemaining)}</dd>
                </div>
              </dl>
              {currentBalanceRemaining > 0 && (
                <p className="mt-4 text-xs leading-relaxed text-amber-800">
                  The remaining Adventure {sample.adventure} balance is due on the 6th session. A 4% weekly interest applies to overdue balances.
                </p>
              )}
            </section>

            <p className="mt-7 text-sm leading-6 text-slate-600">
              We can&apos;t wait to see {sample.child.split(" ")[0]} start this amazing adventure! If you have any questions, message us on Facebook. 💛
            </p>
          </div>

          <footer className="border-t-2 border-dashed border-[#ffd84d] bg-[#eaf4ff] px-6 py-5 text-center text-xs leading-6 text-slate-500 sm:px-10">
            <strong className="text-[#0033a0]">Merry Explorers Center</strong><br />
            2nd floor, Starla 88 Bldg., Camarin Road, Caloocan — near Camarin Doctors Hospital
          </footer>
        </article>
      </div>
    </main>
  );
}
