export function QuickNotes() {
  return (
    <article className="rounded-card border-2 border-secondary bg-white p-5 shadow-[0_16px_38px_-28px_rgba(0,71,171,0.55)]">
      <h2 className="font-headline text-2xl font-bold text-secondary">Quick Notes</h2>
      <div className="mt-5 space-y-4">
        <div className="rounded-card border border-outline-variant bg-surface px-4 py-4">
          <p className="text-sm font-bold text-secondary">Daily attendance</p>
          <p className="mt-1 text-sm font-medium text-on-surface-variant">All sessions are above 90% attendance today.</p>
        </div>
        <div className="rounded-card border border-outline-variant bg-surface px-4 py-4">
          <p className="text-sm font-bold text-secondary">Weather reminder</p>
          <p className="mt-1 text-sm font-medium text-on-surface-variant">Outdoor play is planned after lunch if the forecast stays clear.</p>
        </div>
      </div>
    </article>
  );
}
