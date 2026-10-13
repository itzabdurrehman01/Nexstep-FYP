export function PageLoader() {
  return (
    <div
      className="flex min-h-[42vh] items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-slate-950/80 px-5 py-3 text-sm font-semibold text-slate-100 shadow-[0_0_32px_rgba(16,185,129,0.18)] backdrop-blur-xl dark:bg-slate-950/80 light:bg-white/90 light:text-slate-800">
        <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.95)]" />
        Loading your workspace
      </div>
    </div>
  );
}
