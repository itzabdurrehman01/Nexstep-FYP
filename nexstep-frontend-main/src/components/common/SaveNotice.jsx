import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

/** Viewport-fixed save popup, portaled to document.body so it stays visible without scrolling. */
export function SaveNotice({ open, tone = 'success', title, message, actionLabel = 'OK', onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  const ok = tone === 'success';

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483000] flex items-start justify-center pt-20 sm:pt-24 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="save-notice-title"
    >
      <button type="button" className="absolute inset-0 bg-slate-900/30 cursor-default" aria-label="Dismiss" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center ${ok ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
            {ok ? <CheckCircle2 className="w-6 h-6" aria-hidden="true" /> : <AlertCircle className="w-6 h-6" aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="save-notice-title" className="text-base font-black text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <button type="button" onClick={onClose} className={`w-full h-11 rounded-2xl text-sm font-black cursor-pointer ${ok ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'}`}>
          {actionLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default SaveNotice;
