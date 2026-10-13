import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic, Square, RotateCcw, Send, Loader2, AlertCircle, CheckCircle2, Volume2, VolumeX, ChevronRight,
  ChevronLeft, History, Play, UserRound, Trash2, ClipboardList, Info, ArrowLeft,
} from 'lucide-react';
import { getQuestionsForCategory, INTERVIEW_CATEGORIES } from '../../services/interviewService.js';
import {
  SpeechRecognitionCtor, recognitionSupported, recordingSupported, synthesisSupported,
  speak, stopSpeaking, recognitionErrorMessage,
} from '../../voice/speech.js';
import { miApi, fmtDate, fmtSecs, MI_STATUS, scoreTone, AuthAudio } from '../mockInterview/shared.jsx';

const MAX_SECONDS = 180;
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
const pickMime = () => {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) || '';
};

const inputCls = 'w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white';
const btnPrimary = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
const btnGhost = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer';
const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';

function Notice({ tone = 'info', children }) {
  const cls = tone === 'error'
    ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
    : tone === 'warn' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
      : 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300';
  const Icon = tone === 'error' ? AlertCircle : Info;
  return <p role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${cls}`}><Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />{children}</p>;
}

// ── Recorder: microphone audio (MediaRecorder) + live transcript (SpeechRecognition) ──
function useAnswerRecorder(initial) {
  const [status, setStatus] = useState(initial?.blob ? 'done' : 'idle'); // idle | starting | recording | done
  const [seconds, setSeconds] = useState(initial?.durationSeconds || 0);
  const [blob, setBlob] = useState(initial?.blob || null);
  const [blobUrl, setBlobUrl] = useState(initial?.blobUrl || null);
  const [transcript, setTranscript] = useState(initial?.transcript || '');
  const [interim, setInterim] = useState('');
  const [notice, setNotice] = useState('');

  const recRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const activeRef = useRef(false);
  const secondsRef = useRef(0);
  const baseRef = useRef('');

  const cleanup = useCallback(() => {
    activeRef.current = false;
    clearInterval(timerRef.current);
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
    cleanup();
    setInterim('');
  }, [cleanup]);

  useEffect(() => () => { // leaving the question
    if (recRef.current && recRef.current.state !== 'inactive') { recRef.current.onstop = null; recRef.current.stop(); }
    cleanup();
  }, [cleanup]);

  const start = useCallback(async (speechLang) => {
    setNotice('');
    stopSpeaking();
    if (!recordingSupported) { setNotice('Recording is not supported in this browser. Type your answer below, or use Chrome or Edge.'); return; }
    setStatus('starting');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      setStatus(blob ? 'done' : 'idle');
      setNotice(err?.name === 'NotAllowedError'
        ? 'Microphone permission was blocked. Allow the microphone in your browser’s address bar and try again.'
        : err?.name === 'NotFoundError' ? 'No microphone was found on this device.' : 'Could not start the microphone.');
      return;
    }
    streamRef.current = stream;
    const mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const b = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
      setBlob(b);
      setBlobUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); });
      setSeconds(secondsRef.current);
      setStatus('done');
    };
    recRef.current = rec;
    rec.start(1000);

    // timer
    secondsRef.current = 0;
    setSeconds(0);
    activeRef.current = true;
    timerRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      if (secondsRef.current >= MAX_SECONDS) stop();
    }, 1000);

    // live transcript (re-recording replaces the old transcript)
    baseRef.current = '';
    setTranscript('');
    if (recognitionSupported) {
      const startRecognition = () => {
        const r = new SpeechRecognitionCtor();
        r.lang = speechLang;
        r.continuous = true;
        r.interimResults = true;
        r.onresult = (e) => {
          let finalText = '';
          let interimText = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalText += t; else interimText += t;
          }
          if (finalText) {
            baseRef.current = `${baseRef.current} ${finalText}`.replace(/\s+/g, ' ').trim();
            setTranscript(baseRef.current);
          }
          setInterim(interimText);
        };
        r.onerror = (e) => {
          if (e.error === 'aborted' || e.error === 'no-speech') return;
          setNotice(`${recognitionErrorMessage(e.error, speechLang)} Your audio is still being recorded.`);
          if (e.error === 'not-allowed' || e.error === 'language-not-supported') activeRef.current = false;
        };
        // Chrome ends recognition after a pause; keep it going while recording.
        r.onend = () => { if (activeRef.current) { try { startRecognition(); } catch { /* ignore */ } } };
        recognitionRef.current = r;
        try { r.start(); } catch { /* ignore */ }
      };
      startRecognition();
    } else {
      setNotice('Live transcript is not available in this browser, but your voice is recorded. Type the main points of your answer below.');
    }
    setStatus('recording');
  }, [blob, stop]);

  const reset = useCallback(() => {
    stop();
    setBlob(null);
    setBlobUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
    setSeconds(0);
    setTranscript('');
    setStatus('idle');
  }, [stop]);

  return { status, seconds, blob, blobUrl, transcript, setTranscript, interim, notice, start, stop, reset };
}

// ── One question ──────────────────────────────────────────────────────────────
function QuestionStep({ index, total, question, hint, saved, autoRead, speechLang, onSave, onBack }) {
  const r = useAnswerRecorder(saved);
  const [speaking, setSpeaking] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');

  const readAloud = useCallback(async () => {
    if (!synthesisSupported) { setVoiceNotice('This browser cannot read text aloud.'); return; }
    setSpeaking(true);
    const res = await speak(question, { lang: 'en-US' });
    setSpeaking(false);
    if (!res.ok && res.reason !== 'interrupted' && res.reason !== 'canceled') setVoiceNotice('Could not read the question aloud on this device.');
  }, [question]);

  useEffect(() => {
    if (autoRead) { const t = setTimeout(readAloud, 250); return () => { clearTimeout(t); stopSpeaking(); }; }
    return () => stopSpeaking();
  }, [autoRead, readAloud]);

  const recording = r.status === 'recording';
  const canContinue = !recording && r.status !== 'starting' && (r.blob || r.transcript.trim().length >= 3);
  const save = (dir) => {
    stopSpeaking();
    onSave({ question, transcript: r.transcript.trim(), blob: r.blob, blobUrl: r.blobUrl, durationSeconds: r.seconds }, dir);
  };

  return (
    <section className={`${card} p-5 sm:p-6 space-y-5`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-500">Question {index + 1} of {total}</span>
        <div className="h-1.5 flex-1 max-w-48 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <p className="flex-1 text-lg font-semibold text-slate-900 dark:text-white leading-snug" data-no-translate>{question}</p>
        <button type="button" onClick={speaking ? () => { stopSpeaking(); setSpeaking(false); } : readAloud}
          aria-label={speaking ? 'Stop reading' : 'Read the question aloud'} title={speaking ? 'Stop reading' : 'Read aloud'}
          className="shrink-0 w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
          {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {hint && <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2"><span className="font-medium">Tip: </span><span data-no-translate>{hint}</span></p>}
      {voiceNotice && <Notice tone="warn">{voiceNotice}</Notice>}
      {r.notice && <Notice tone="warn">{r.notice}</Notice>}

      {/* Recorder */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        {recording ? (
          <button type="button" onClick={r.stop} className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold cursor-pointer">
            <Square className="w-4 h-4 fill-current" /> Stop recording
          </button>
        ) : (
          <button type="button" onClick={() => r.start(speechLang)} disabled={r.status === 'starting' || !recordingSupported}
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer">
            {r.status === 'starting' ? <Loader2 className="w-4 h-4 animate-spin" /> : r.blob ? <RotateCcw className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {r.blob ? 'Record again' : 'Start recording'}
          </button>
        )}
        <div className="flex-1 min-w-0">
          {recording ? (
            <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
              Recording {fmtSecs(r.seconds)} / {fmtSecs(MAX_SECONDS)}
            </p>
          ) : r.blobUrl ? (
            <div className="space-y-1">
              <audio controls src={r.blobUrl} className="w-full h-10" />
              <p className="text-xs text-slate-500">Recorded {fmtSecs(r.seconds)}. Listen back, or record again.</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Speak your answer as you would in a real interview (up to 3 minutes).</p>
          )}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Transcript {recognitionSupported ? '(filled in as you speak — you can correct it)' : '(type your answer)'}</span>
        <textarea value={recording && r.interim ? `${r.transcript} ${r.interim}`.trim() : r.transcript}
          onChange={(e) => r.setTranscript(e.target.value)} readOnly={recording} rows={5} maxLength={8000}
          placeholder={recording ? 'Listening…' : 'Your words appear here while you record. You can also type your answer.'}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white resize-y" />
      </label>

      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" onClick={() => (index === 0 ? onBack() : save(-1))} disabled={recording} className={btnGhost}>
          <ChevronLeft className="w-4 h-4" />{index === 0 ? 'Change setup' : 'Previous'}
        </button>
        <button type="button" onClick={() => save(1)} disabled={!canContinue} className={btnPrimary}>
          {index + 1 === total ? 'Review answers' : 'Next question'}<ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}

// ── History / feedback ────────────────────────────────────────────────────────
function InterviewDetail({ id, onBack, onDeleted }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    miApi(`/${id}`).then((d) => setData(d.data)).catch((e) => setError(e.message));
  }, [id]);
  const remove = async () => {
    setBusy(true);
    try { await miApi(`/${id}`, { method: 'DELETE' }); onDeleted(); } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"><ArrowLeft className="w-4 h-4" /> All interviews</button>
      {error && <Notice tone="error">{error}</Notice>}
      {!data ? !error && <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div> : (
        <>
          <div className={`${card} p-5 flex flex-wrap items-center justify-between gap-4`}>
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-white">{data.category}</p>
              <p className="text-xs text-slate-500 mt-0.5">Sent {fmtDate(data.submittedAt)}{data.mentor ? <> to <span data-no-translate>{data.mentor.name}</span></> : null}</p>
            </div>
            {data.status === 'reviewed' ? (
              <div className="text-end">
                <p className={`text-3xl font-bold ${scoreTone(data.overallScore)}`}>{data.overallScore}%</p>
                <p className="text-xs text-slate-500">Mentor score</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${MI_STATUS.submitted.cls}`}>{MI_STATUS.submitted.label}</span>
                <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Withdraw
                </button>
              </div>
            )}
          </div>
          {data.mentorFeedback && (
            <div className={`${card} p-5`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mentor’s overall feedback</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">{data.mentorFeedback}</p>
            </div>
          )}
          <ol className="space-y-3">
            {data.answers.map((a) => (
              <li key={a.position} className={`${card} p-5 space-y-3`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white" data-no-translate>{a.position}. {a.question}</p>
                  {a.score != null && <span className={`shrink-0 text-sm font-bold ${scoreTone(a.score * 10)}`}>{a.score}/10</span>}
                </div>
                {a.hasAudio && <AuthAudio src={`/api/mock-interviews/${data.id}/answers/${a.position}/audio`} />}
                {a.transcript && <p className="text-sm text-slate-600 dark:text-slate-300 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2 whitespace-pre-line" data-no-translate>{a.transcript}</p>}
                {a.feedback && <p className="text-sm text-slate-700 dark:text-slate-200"><span className="font-medium">Mentor: </span>{a.feedback}</p>}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function HistoryList({ onOpen }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { miApi('').then((d) => setItems(d.data)).catch((e) => { setError(e.message); setItems([]); }); }, []);
  if (!items) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  return (
    <div className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-12 text-center">
          <ClipboardList className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">No interviews sent yet</p>
          <p className="mt-1 text-xs text-slate-500">Record a practice interview and send it to your mentor for a score.</p>
        </div>
      ) : (
        <ul className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
          {items.map((it) => {
            const st = MI_STATUS[it.status] || MI_STATUS.submitted;
            return (
              <li key={it.id}>
                <button type="button" onClick={() => onOpen(it.id)} className="w-full text-start p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{it.category}</p>
                    <p className="text-xs text-slate-500 truncate">{it.answers} answers · {fmtDate(it.submittedAt)} · <span data-no-translate>{it.mentorName}</span></p>
                  </div>
                  {it.status === 'reviewed'
                    ? <span className={`text-sm font-bold ${scoreTone(it.overallScore)}`}>{it.overallScore}%</span>
                    : <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${st.cls}`}>{st.label}</span>}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export function MockInterviewTab({ lang }) {
  const [view, setView] = useState('practice'); // practice | history
  const [openId, setOpenId] = useState(null);

  const [category, setCategory] = useState(INTERVIEW_CATEGORIES[0]);
  const [count, setCount] = useState(3);
  const [answerLang, setAnswerLang] = useState(lang === 'ur' ? 'ur-PK' : 'en-US');
  const [autoRead, setAutoRead] = useState(true);
  const [mentors, setMentors] = useState(null);
  const [mentorId, setMentorId] = useState('');

  const [phase, setPhase] = useState('setup'); // setup | interview | review | sent
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [sending, setSending] = useState('');
  const [error, setError] = useState('');
  const [sentInfo, setSentInfo] = useState(null);

  useEffect(() => {
    fetch('/api/mentorship/my-mentors', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => { setMentors(d.data || []); if (d.data?.length) setMentorId(d.data[0].id); })
      .catch(() => setMentors([]));
  }, []);

  // free recorded audio when leaving the page
  const answersRef = useRef(answers);
  answersRef.current = answers;
  useEffect(() => () => { answersRef.current.forEach((a) => a?.blobUrl && URL.revokeObjectURL(a.blobUrl)); stopSpeaking(); }, []);

  const begin = () => {
    const qs = getQuestionsForCategory(category, count)
      .map((q) => (typeof q === 'string' ? { text: q } : { text: q.q || q.question || q.text, hint: q.hint }))
      .filter((q) => q.text);
    setQuestions(qs);
    setAnswers(new Array(qs.length).fill(null));
    setIdx(0);
    setError('');
    setPhase('interview');
  };

  const saveAnswer = (ans, dir) => {
    setAnswers((prev) => { const next = [...prev]; next[idx] = ans; return next; });
    const n = idx + dir;
    if (n >= questions.length) setPhase('review');
    else setIdx(Math.max(0, n));
  };

  const restart = () => {
    answers.forEach((a) => a?.blobUrl && URL.revokeObjectURL(a.blobUrl));
    setAnswers([]); setQuestions([]); setPhase('setup'); setSentInfo(null);
  };

  const send = async () => {
    if (!mentorId) return;
    setError('');
    setSending('Saving your answers…');
    try {
      const created = await miApi('', {
        method: 'POST',
        body: { mentorId, category, answers: answers.map((a) => ({ question: a.question, transcript: a.transcript, durationSeconds: a.durationSeconds })) },
      });
      const id = created.data.id;
      let failed = 0;
      const withAudio = answers.map((a, i) => ({ a, pos: i + 1 })).filter((x) => x.a.blob);
      for (let k = 0; k < withAudio.length; k++) {
        const { a, pos } = withAudio[k];
        setSending(`Uploading recording ${k + 1} of ${withAudio.length}…`);
        let ok = false;
        for (let attempt = 0; attempt < 2 && !ok; attempt++) {
          try {
            const res = await fetch(`/api/mock-interviews/${id}/answers/${pos}/audio`, {
              method: 'PUT', credentials: 'include', headers: { 'Content-Type': a.blob.type || 'audio/webm' }, body: a.blob,
            });
            ok = res.ok;
          } catch { ok = false; }
        }
        if (!ok) failed += 1;
      }
      setSending('Notifying your mentor…');
      await miApi(`/${id}/submit`, { method: 'POST' });
      setSentInfo({ failed, mentor: mentors.find((m) => m.id === mentorId)?.name || 'your mentor' });
      setPhase('sent');
    } catch (e) {
      setError(e.message);
    } finally {
      setSending('');
    }
  };

  const noMentor = mentors && mentors.length === 0;

  return (
    <div className="space-y-6 w-full">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Mock interview</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Answer out loud, then send your recording to your mentor for a score and feedback.</p>
        </div>
        <div role="tablist" className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/70">
          {[{ id: 'practice', label: 'Practice', icon: Mic }, { id: 'history', label: 'My results', icon: History }].map((t) => (
            <button key={t.id} role="tab" type="button" aria-selected={view === t.id} onClick={() => { setView(t.id); setOpenId(null); }}
              className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm cursor-pointer ${view === t.id ? 'bg-white dark:bg-slate-900 shadow-sm font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              <t.icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />{t.label}
            </button>
          ))}
        </div>
      </header>

      {view === 'history' ? (
        openId ? <InterviewDetail id={openId} onBack={() => setOpenId(null)} onDeleted={() => setOpenId(null)} /> : <HistoryList onOpen={setOpenId} />
      ) : phase === 'setup' ? (
        <section className={`${card} p-5 sm:p-6 space-y-5`}>
          {!recordingSupported && <Notice tone="warn">This browser cannot record audio. You can still type your answers — for voice recording use Chrome or Edge.</Notice>}
          {noMentor && <Notice tone="warn">No mentor is assigned to you yet, so you can practise but not send your interview for review. An admin assigns mentors.</Notice>}
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-1.5"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Interview type</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {INTERVIEW_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select></label>
            <label className="space-y-1.5"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Number of questions</span>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={inputCls}>
                {[3, 5, 7].map((n) => <option key={n} value={n}>{n} questions</option>)}
              </select></label>
            <label className="space-y-1.5"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">I will answer in</span>
              <select value={answerLang} onChange={(e) => setAnswerLang(e.target.value)} className={inputCls}>
                <option value="en-US">English</option>
                <option value="ur-PK">Urdu</option>
              </select></label>
            <label className="space-y-1.5"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Send to mentor</span>
              <select value={mentorId} onChange={(e) => setMentorId(e.target.value)} disabled={!mentors?.length} className={inputCls}>
                {!mentors ? <option>Loading…</option> : mentors.length === 0 ? <option value="">No mentor assigned</option>
                  : mentors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select></label>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer w-fit">
            <input type="checkbox" checked={autoRead} onChange={(e) => setAutoRead(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
            Read each question aloud
          </label>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />Find a quiet place and allow microphone access when asked.</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />Each answer can be up to 3 minutes. You can listen back and record again.</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />Your mentor listens to the recordings and scores every answer out of 10.</li>
          </ul>
          <button type="button" onClick={begin} className={btnPrimary}><Play className="w-4 h-4" /> Start interview</button>
        </section>
      ) : phase === 'interview' ? (
        <QuestionStep key={idx} index={idx} total={questions.length} question={questions[idx].text} hint={questions[idx].hint} saved={answers[idx]}
          autoRead={autoRead} speechLang={answerLang} onSave={saveAnswer} onBack={() => setPhase('setup')} />
      ) : phase === 'review' ? (
        <section className="space-y-4">
          <div className={`${card} p-5 flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-white">Review your answers</p>
              <p className="text-xs text-slate-500 mt-0.5">{category} · {answers.filter((a) => a?.blob).length} of {answers.length} recorded</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setIdx(answers.length - 1); setPhase('interview'); }} disabled={!!sending} className={btnGhost}><ChevronLeft className="w-4 h-4" /> Back</button>
              <button type="button" onClick={send} disabled={!!sending || !mentorId} className={btnPrimary}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{sending || 'Send to mentor'}
              </button>
            </div>
          </div>
          {noMentor && <Notice tone="warn">No mentor is assigned to you yet, so this interview cannot be sent. Ask an admin to assign a mentor.</Notice>}
          {error && <Notice tone="error">{error}</Notice>}
          <ol className="space-y-3">
            {answers.map((a, i) => (
              <li key={i} className={`${card} p-5 space-y-3`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white" data-no-translate>{i + 1}. {a.question}</p>
                  <button type="button" onClick={() => { setIdx(i); setPhase('interview'); }} disabled={!!sending} className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">Redo</button>
                </div>
                {a.blobUrl ? <audio controls src={a.blobUrl} className="w-full h-10" /> : <p className="text-xs text-slate-500">Typed answer (no recording)</p>}
                {a.transcript && <p className="text-sm text-slate-600 dark:text-slate-300 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2 whitespace-pre-line" data-no-translate>{a.transcript}</p>}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className={`${card} p-8 text-center space-y-3`}>
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
          <p className="text-lg font-semibold text-slate-900 dark:text-white">Sent for review</p>
          <p className="text-sm text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 justify-center"><UserRound className="w-4 h-4" /><span data-no-translate>{sentInfo?.mentor}</span> has been notified. You’ll get a notification when your score is ready.</p>
          {sentInfo?.failed > 0 && <Notice tone="warn">{sentInfo.failed} recording(s) could not be uploaded; your mentor will see the transcript for those answers.</Notice>}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button type="button" onClick={restart} className={btnGhost}><RotateCcw className="w-4 h-4" /> New interview</button>
            <button type="button" onClick={() => { restart(); setView('history'); }} className={btnPrimary}><History className="w-4 h-4" /> My results</button>
          </div>
        </section>
      )}
    </div>
  );
}

export default MockInterviewTab;
