import React, { useCallback, useEffect, useState } from 'react';
import { Crown, Lock, ArrowRight } from 'lucide-react';

/** Current plan from the server: { tier: 'free' | 'premium', planName, expiresAt, limits, pending }. */
export function usePlan() {
  const [plan, setPlan] = useState(null);
  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/payments/me', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      setPlan(res.ok ? data.data : { tier: 'free', planName: 'Free' });
    } catch { setPlan({ tier: 'free', planName: 'Free' }); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { plan, isPremium: plan?.tier === 'premium', reload };
}

export function PlanBadge({ plan }) {
  if (!plan) return null;
  const premium = plan.tier === 'premium';
  return (
    <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium ${premium ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
      {premium && <Crown className="w-3.5 h-3.5" aria-hidden="true" />}{premium ? 'Premium' : 'Free plan'}
    </span>
  );
}

/** Box shown where a Premium feature would be. */
export function UpgradeCard({ title, text, onUpgrade, compact = false }) {
  return (
    <div className={`rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 ${compact ? 'p-4' : 'p-5 sm:p-6'} flex flex-col sm:flex-row sm:items-center gap-4`}>
      <span className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0"><Lock className="w-5 h-5" aria-hidden="true" /></span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        {text && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{text}</p>}
      </div>
      {onUpgrade && (
        <button type="button" onClick={onUpgrade} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium cursor-pointer shrink-0">
          <Crown className="w-4 h-4" /> See Premium <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
