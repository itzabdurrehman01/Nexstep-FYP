import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { apiClient } from '../api/client';

/**
 * Fires due calendar alerts, shows an in-app popup, and the server emails
 * the student's Gmail when SMTP is configured.
 */
export function LiveAlertsWatcher({ enabled }: { enabled: boolean }) {
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return undefined;
    let stopped = false;

    const tick = async () => {
      try { await apiClient.post('/api/alerts/due'); } catch { /* offline */ }
      try {
        const { data } = await apiClient.get('/api/notifications');
        const rows = Array.isArray(data?.data) ? data.data : [];
        for (const n of rows) {
          if (!n?.id || seen.current.has(n.id) || n.is_read || n.isRead) continue;
          const age = Date.now() - new Date(n.created_at || n.createdAt || 0).getTime();
          if (age > 15 * 60 * 1000) { seen.current.add(n.id); continue; }
          seen.current.add(n.id);
          if (!stopped) Alert.alert(n.title || 'Reminder', n.body || n.message || 'You have a NexStep reminder.');
        }
      } catch { /* offline */ }
    };

    void tick();
    const id = setInterval(() => { if (!stopped) void tick(); }, 60 * 1000);
    return () => { stopped = true; clearInterval(id); };
  }, [enabled]);

  return null;
}
