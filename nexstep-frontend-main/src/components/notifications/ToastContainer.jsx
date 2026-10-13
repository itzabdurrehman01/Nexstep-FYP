import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export function ToastContainer() {
  const { user } = useAuth();
  const { toasts, removeToast } = useNotifications();

  // Notifications will show to user once they are logged in
  if (!user || !toasts || toasts.length === 0) return null;

  const getToastConfig = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
          borderColor: 'border-emerald-500/40 dark:border-emerald-500/30',
          accentBg: 'bg-emerald-500',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
          borderColor: 'border-red-500/40 dark:border-red-500/30',
          accentBg: 'bg-red-500',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
          borderColor: 'border-amber-500/40 dark:border-amber-500/30',
          accentBg: 'bg-amber-500',
        };
      default:
        return {
          icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
          borderColor: 'border-blue-500/40 dark:border-blue-500/30',
          accentBg: 'bg-blue-500',
        };
    }
  };

  return (
    <div
      aria-live="assertive"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const config = getToastConfig(toast.type);

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border ${config.borderColor} shadow-2xl p-4 flex items-start gap-3 transition-all animate-in slide-in-from-right-8 duration-200`}
          >
            {/* Top/Side accent strip */}
            <div className={`absolute top-0 left-0 bottom-0 w-1 ${config.accentBg}`} />

            <div className="pt-0.5">{config.icon}</div>

            <div className="flex-1 min-w-0 pr-2">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {toast.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
