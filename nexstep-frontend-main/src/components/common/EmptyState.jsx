import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * Shown wherever a list or feature has no data yet (nothing in the database).
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message = 'Data for this section has not been added yet. Check back soon.',
  action = null,
  className = '',
}) {
  return (
    <div className={`ns-card flex flex-col items-center justify-center text-center px-6 py-12 ${className}`} role="status">
      <span className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-4">
        <Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default EmptyState;
