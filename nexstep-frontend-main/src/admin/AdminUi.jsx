import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, children, className = '', actions }) {
  return (
    <section className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Notice({ kind = 'error', children }) {
  if (!children) return null;
  const ok = kind === 'success';
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <div role={ok ? 'status' : 'alert'} className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${
      ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
         : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function Field({ label, hint, children, id }) {
  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputClass = 'w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';

export function PasswordInput({ id, value, onChange, autoComplete = 'new-password', placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete} placeholder={placeholder} className={`${inputClass} pr-10`} required />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function Button({ variant = 'primary', loading, children, className = '', ...props }) {
  const styles = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    secondary: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800',
    danger: 'bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
  };
  return (
    <button {...props} disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${styles[variant]} ${className}`}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Two-step button: first click arms it, second click within 4s confirms. */
export function ConfirmButton({ onConfirm, children, confirmLabel = 'Click to confirm', variant = 'danger', ...props }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Button variant={variant} {...props} onClick={() => {
      if (armed) { clearTimeout(timer.current); setArmed(false); onConfirm(); return; }
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 4000);
    }}>
      {armed ? confirmLabel : children}
    </Button>
  );
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="py-10 flex items-center justify-center gap-2 text-sm text-slate-500" role="status">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {label}
    </div>
  );
}

export function Empty({ icon: Icon, title, message }) {
  return (
    <div className="py-10 text-center">
      {Icon && <Icon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />}
      <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {message && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{message}</p>}
    </div>
  );
}
