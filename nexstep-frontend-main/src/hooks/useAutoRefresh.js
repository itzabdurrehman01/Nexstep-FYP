import { useEffect } from 'react';

export function useAutoRefresh(refresh, { enabled = true, intervalMs = 15000 } = {}) {
  useEffect(() => {
    if (!enabled) return undefined;

    let running = false;
    const run = async () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try { await refresh(); } finally { running = false; }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') run();
    };
    const timer = window.setInterval(run, intervalMs);
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, intervalMs, refresh]);
}
