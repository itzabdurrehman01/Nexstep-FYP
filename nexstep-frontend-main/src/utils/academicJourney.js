const MAIN = [
  { id: 'class8', label: 'Class 8' },
  { id: 'class9', label: 'Matric I' },
  { id: 'class10', label: 'Matric II' },
  { id: 'class11', label: 'FSc I' },
  { id: 'class12', label: 'FSc II' },
  { id: 'university', label: 'University' },
];

const DAE = [
  { id: 'class8', label: 'Class 8' },
  { id: 'class9', label: 'Matric I' },
  { id: 'class10', label: 'Matric II' },
  { id: 'dae', label: 'DAE' },
  { id: 'university', label: 'University' },
];

function nextAnnual(month, day) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let when = new Date(now.getFullYear(), month - 1, day);
  if (when < start) when = new Date(now.getFullYear() + 1, month - 1, day);
  return {
    date: when.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }),
    days: Math.round((when - start) / 86400000),
  };
}

/** Class 8 → university (or DAE), with the student’s current stage marked. */
export function academicJourney(level) {
  const stages = level === 'dae' ? DAE : MAIN;
  const idx = Math.max(0, stages.findIndex((s) => s.id === level));
  const known = stages.some((s) => s.id === level);
  return stages.map((s, i) => ({
    ...s,
    state: !known ? 'upcoming' : i < idx ? 'done' : i === idx ? 'current' : 'upcoming',
  }));
}

/** Entry-test registration and university application reminders for this class. */
export function deadlineReminders(profile) {
  const level = profile?.education?.level || '';
  const stream = String(profile?.preferredStream || profile?.education?.stream || '').toLowerCase();
  const medical = /medical|bio/.test(stream);
  const engineering = /engineer|ics|computer|dae/.test(stream);
  const items = [];
  const add = (title, month, day, kind) => items.push({ title, kind, ...nextAnnual(month, day) });

  if (level === 'university') {
    add('GAT / postgraduate test registration', 5, 1, 'entry-test');
    add('University transfer and MS application window', 1, 15, 'application');
  } else if (level === 'dae') {
    add('DAE board registration', 3, 1, 'entry-test');
    add('University lateral-entry applications', 8, 15, 'application');
  } else if (medical && !engineering) {
    add('MDCAT registration opens', 7, 15, 'entry-test');
    add('University application window', 10, 15, 'application');
  } else if (engineering && !medical) {
    add('ECAT / NUST NET registration opens', 6, 1, 'entry-test');
    add('University application window', 10, 15, 'application');
  } else if (stream) {
    add('NTS NAT registration opens', 5, 1, 'entry-test');
    add('University application window', 10, 15, 'application');
  } else {
    add('MDCAT registration opens', 7, 15, 'entry-test');
    add('ECAT / NUST NET registration opens', 6, 1, 'entry-test');
    add('University application window', 10, 15, 'application');
  }
  return items.sort((a, b) => a.days - b.days);
}

export function journeyMilestones(profile, recommendations = []) {
  const level = profile?.education?.level;
  const saved = profile?.guidance?.recommendations || [];
  const steps = [
    { done: !!level, label: 'Current class saved', tab: 'pathway' },
    { done: !!profile?.topRiasecCluster, label: 'Interest quiz result saved', tab: 'quiz' },
    { done: !!(profile?.marks?.matricPct || profile?.marks?.fscPct), label: 'Marks saved', tab: 'onboarding' },
    { done: !!(profile?.preferredStream || profile?.education?.stream), label: 'Stream or group chosen', tab: 'pathway' },
    { done: !!profile?.targetCareer || saved.length > 0 || recommendations.length > 0, label: 'Career recommendations saved', tab: 'careerAi' },
  ];
  if (level === 'class11' || level === 'class12' || level === 'university') {
    steps.push({ done: Number(profile?.marks?.entryTestScore) > 0, label: 'Entry-test score recorded', tab: 'entryTestPrep' });
  }
  return steps;
}

/** Writes quiz result, career recommendations, and deadline reminders onto the student profile. */
export async function saveGuidance(profile, recommendations) {
  const list = (recommendations || []).map((t) => String(t || '').trim()).filter(Boolean).slice(0, 3);
  const cluster = profile?.topRiasecCluster || '';
  const deadlines = deadlineReminders(profile).map((d) => ({ title: d.title, date: d.date, kind: d.kind }));
  const payload = { recommendations: list, cluster, deadlines };
  const stored = profile?.guidance || {};
  const same = JSON.stringify(stored.recommendations || []) === JSON.stringify(list)
    && (stored.cluster || '') === cluster
    && JSON.stringify(stored.deadlines || []) === JSON.stringify(deadlines);
  if (same) return true;
  const key = JSON.stringify(payload);
  try {
    if (sessionStorage.getItem('ns_guidance_saved') === key) return true;
  } catch { /* ignore */ }
  try {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guidance: payload }),
    });
    if (res.ok) {
      try { sessionStorage.setItem('ns_guidance_saved', key); } catch { /* ignore */ }
    }
    return res.ok;
  } catch {
    return false;
  }
}
