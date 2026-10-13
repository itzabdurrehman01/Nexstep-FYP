import React, { useEffect, useState } from 'react';
import { Loader2, Play } from 'lucide-react';

/** Calls /api/mock-interviews (the global fetch adds the Clerk token). */
export async function miApi(path = '', { method = 'GET', body } = {}) {
  const res = await fetch(`/api/mock-interviews${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
export const fmtSecs = (s) => {
  const n = Math.max(0, Math.round(Number(s) || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

export const MI_STATUS = {
  submitted: { label: 'Waiting for review', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  reviewed: { label: 'Reviewed', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
};

export function scoreTone(pct) {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 60) return 'text-blue-600 dark:text-blue-400';
  if (pct >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Plays a recording stored on the server. <audio src> cannot send the
 * Authorization header, so the file is fetched first and played from a blob URL.
 */
export function AuthAudio({ src }) {
  const [url, setUrl] = useState(null);
  const [state, setState] = useState('idle'); // idle | loading | ready | error

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const load = async () => {
    setState('loading');
    try {
      const res = await fetch(src, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      setUrl(URL.createObjectURL(blob));
      setState('ready');
    } catch { setState('error'); }
  };

  if (state === 'ready') return <audio controls autoPlay src={url} className="w-full h-10" />;
  return (
    <button type="button" onClick={load} disabled={state === 'loading'}
      className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 cursor-pointer">
      {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
      {state === 'error' ? 'Could not load recording — try again' : 'Play recording'}
    </button>
  );
}
