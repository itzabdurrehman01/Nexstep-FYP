const recent = new Map();

export function trackUsage(kind, entityId, entityLabel) {
  const label = String(entityLabel || '').trim();
  if (!kind || !label) return;
  const key = `${kind}:${entityId || label}`;
  const now = Date.now();
  if (recent.get(key) && now - recent.get(key) < 60_000) return;
  recent.set(key, now);
  fetch('/api/usage/track', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, entityId: entityId || null, entityLabel: label }),
  }).catch(() => {});
}

export function trackCareerSearch(query) {
  const q = String(query || '').trim();
  if (q.length < 2) return;
  const key = `career_query:${q.toLowerCase()}`;
  const now = Date.now();
  if (recent.get(key) && now - recent.get(key) < 60_000) return;
  recent.set(key, now);
  fetch('/api/usage/track', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'career_search', query: q }),
  }).catch(() => {});
}
