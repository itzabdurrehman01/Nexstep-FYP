import { useEffect, useRef } from 'react';
import { useNotifications } from '../../context/NotificationContext.jsx';

const PATH_TO_TAB = {
  '/mentorship': 'mentorship', '/portal/mentor': 'mentorPortal', '/mock-interview': 'mockInterview',
  '/calendar-notif': 'calendarNotif', '/dashboard': 'dashboard', '/pathway': 'pathway', '/pricing': 'pricing',
};
const TYPE_MAP = { ALERT: 'deadline', SCHOLARSHIP_DEADLINE: 'deadline', MENTORSHIP: 'info', MOCK_INTERVIEW: 'ai', PAYMENT: 'success' };
const SEEN_KEY = 'ns_seen_server_notifications';
const FRESH_MS = 15 * 60 * 1000; // only pop up notifications from the last 15 minutes

function readSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); }
}
function saveSeen(set) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-300))); } catch { /* ignore */ }
}

/**
 * Runs while a student or mentor is signed in. Every minute it:
 *  - asks the server to fire any calendar alerts that are due (the server also
 *    does this on its own once a minute, and emails them when allowed);
 *  - copies new server notifications into the bell, and pops up the recent ones
 *    (in-app toast if "Pop-up alerts" is on, browser notification if
 *    "Browser notifications" is on and the browser allowed it).
 */
export function LiveAlertsWatcher({ enabled, preferences }) {
  const { addNotification, toast } = useNotifications();
  const seenRef = useRef(readSeen());
  const prefsRef = useRef(preferences || {});
  prefsRef.current = preferences || {};

  useEffect(() => {
    if (!enabled) return undefined;
    let stopped = false;

    const browserNotify = (title, body) => {
      try {
        if (prefsRef.current.pushNotif === true && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico', tag: `ns-${title}` });
        }
      } catch { /* not supported */ }
    };

    const tick = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const due = await fetch('/api/alerts/due', { method: 'POST', credentials: 'include' });
        if (due.status === 401) return;
      } catch { /* offline */ }
      try {
        const res = await fetch('/api/notifications', { credentials: 'include' });
        if (!res.ok) return;
        const { data } = await res.json();
        const seen = seenRef.current;
        const fresh = (data || []).filter((n) => !seen.has(n.id)).reverse();
        for (const n of fresh) {
          seen.add(n.id);
          addNotification({
            id: `srv-${n.id}`,
            title: n.title,
            message: n.body,
            type: TYPE_MAP[n.type] || 'info',
            link: PATH_TO_TAB[n.link] || null,
            read: n.is_read,
            time: new Date(n.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
          });
          const recent = !n.is_read && Date.now() - new Date(n.created_at).getTime() < FRESH_MS;
          if (recent && !stopped) {
            if (prefsRef.current.inAppAlerts !== false) toast.info(n.title, n.body, 10000);
            browserNotify(n.title, n.body);
          }
        }
        if (fresh.length) saveSeen(seen);
      } catch { /* offline */ }
    };

    const first = setTimeout(() => { if (!stopped) tick(); }, 8_000);
    const id = setInterval(() => { if (!stopped) tick(); }, 60 * 1000);
    return () => { stopped = true; clearTimeout(first); clearInterval(id); };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default LiveAlertsWatcher;
