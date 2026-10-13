/**
 * src/context/ToastContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global toast notification system.
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast.success('Profile saved!');
 *   toast.error('Something went wrong.');
 *   toast.info('3 new notifications.');
 *   toast.warning('Session expiring soon.');
 *
 * Add <Toaster /> once inside your app root (already done in main.jsx).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

let _nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_nextId;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]); // keep last 5
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg, dur) => show(msg, 'success', dur),
    error:   (msg, dur) => show(msg, 'error',   dur ?? 6000),
    info:    (msg, dur) => show(msg, 'info',     dur),
    warning: (msg, dur) => show(msg, 'warning',  dur),
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// ── Toast renderer ────────────────────────────────────────────────────────────
const STYLES = {
  success: {
    bg:   'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-700',
    text: 'text-emerald-900 dark:text-emerald-100',
    Icon: CheckCircle2,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    bg:   'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-700',
    text: 'text-red-900 dark:text-red-100',
    Icon: AlertCircle,
    iconClass: 'text-red-600 dark:text-red-400',
  },
  info: {
    bg:   'bg-blue-50 dark:bg-blue-950/90 border-blue-200 dark:border-blue-700',
    text: 'text-blue-900 dark:text-blue-100',
    Icon: Info,
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    bg:   'bg-amber-50 dark:bg-amber-950/90 border-amber-200 dark:border-amber-700',
    text: 'text-amber-900 dark:text-amber-100',
    Icon: AlertTriangle,
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
};

function Toaster({ toasts, onDismiss }) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map(t => {
          const s = STYLES[t.type] || STYLES.info;
          const Icon = s.Icon;
          return (
            <motion.div
              key={t.id}
              role="alert"
              layout
              initial={{ opacity: 0, x: 48, scale: 0.96 }}
              animate={{ opacity: 1, x: 0,  scale: 1    }}
              exit={{    opacity: 0, x: 48, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl max-w-sm text-xs font-semibold ${s.bg} ${s.text}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${s.iconClass}`} aria-hidden="true" />
              <span className="flex-1 leading-relaxed">{t.message}</span>
              <button
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss notification"
                className="ml-1 opacity-60 hover:opacity-100 cursor-pointer transition-opacity shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
