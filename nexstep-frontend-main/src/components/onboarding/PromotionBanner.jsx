import React from 'react';
import { PartyPopper, X, ArrowRight } from 'lucide-react';
import { levelLabel } from '../../config/educationLevels.js';

/** Shown once after a student is automatically moved up to the next class. */
export function PromotionBanner({ education, lang = 'en', onDismiss, onNavigate }) {
  if (!education?.promotedFrom || !education?.level) return null;
  return (
    <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-500/10 p-4">
      <span className="w-9 h-9 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
        <PartyPopper className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          {lang === 'ur'
            ? `مبارک ہو! آپ ${levelLabel(education.promotedFrom, lang)} سے ${levelLabel(education.level, lang)} میں منتقل ہو گئے ہیں۔`
            : `Congratulations — you've moved up from ${levelLabel(education.promotedFrom)} to ${levelLabel(education.level)}.`}
        </p>
        <p className="text-sm text-emerald-900/80 dark:text-emerald-200/80 mt-0.5">
          {education.needsStream
            ? 'Choose your group for this level so we can show the right options.'
            : 'Your menu and recommendations now match your new class.'}
        </p>
        <button type="button" onClick={() => { onNavigate?.('pathway'); onDismiss?.(); }}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer">
          {education.needsStream ? 'Choose my group' : 'See my pathway'} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="p-1.5 rounded-lg text-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default PromotionBanner;
