import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, CheckCircle2, XCircle, Clock, BarChart3,
  Trophy, Play, RotateCcw, ChevronRight, AlertCircle,
  Loader2, Target, Lightbulb, TrendingUp, Stethoscope, Cog, PenLine, Landmark, Hospital, Crosshair, Dumbbell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const TEST_TYPES = [
  { id: 'MDCAT', label: 'MDCAT', icon: Stethoscope, desc: 'Medical & Dental Admission Test', subjects: ['Biology','Chemistry','Physics','English'], color: 'emerald' },
  { id: 'ECAT',  label: 'ECAT',  icon: Cog, desc: 'Engineering College Admission Test', subjects: ['Mathematics','Physics','Chemistry'], color: 'blue' },
  { id: 'NTS-NAT', label: 'NTS-NAT', icon: PenLine, desc: 'National Aptitude Test', subjects: ['Quantitative','Verbal','Analytical'], color: 'purple' },
  { id: 'NET',   label: 'NUST NET', icon: Landmark, desc: 'NUST Entry Test', subjects: ['Mathematics','Physics','Computer Science'], color: 'amber' },
  { id: 'NUMS',  label: 'NUMS',  icon: Hospital, desc: 'National University Medical Sciences', subjects: ['Biology','Chemistry','Physics'], color: 'rose' },
];

const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-950/30',   border: 'border-blue-200 dark:border-blue-800',   text: 'text-blue-700 dark:text-blue-300',   btn: 'bg-blue-600 hover:bg-blue-700' },
  purple:  { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', btn: 'bg-blue-600 hover:bg-blue-700' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-950/30',  border: 'border-amber-200 dark:border-amber-800',  text: 'text-amber-700 dark:text-amber-300',  btn: 'bg-amber-600 hover:bg-amber-700' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-950/30',   border: 'border-rose-200 dark:border-rose-800',   text: 'text-rose-700 dark:text-rose-300',   btn: 'bg-rose-600 hover:bg-rose-700' },
};

// ── Main Component ────────────────────────────────────────────────────────────
export function EntryTestPrepTab({ profile, lang = 'en' }) {
  const { apiFetch } = useAuth();
  const [view, setView]           = useState('home');   // home | setup | test | result
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questionCount, setQuestionCount] = useState(20);
  const [session, setSession]     = useState(null);   // { sessionId, questions, testType }
  const [currentQ, setCurrentQ]   = useState(0);
  const [answers, setAnswers]     = useState({});     // { questionId: 'A'|'B'|'C'|'D'|null }
  const [revealed, setRevealed]   = useState({});     // show explanation after answer
  const [timeLeft, setTimeLeft]   = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [result, setResult]       = useState(null);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Load history on mount
  useEffect(() => {
    apiFetch('/api/mock-test/history').then(r => r.ok ? r.json() : null).then(d => { if (d?.data) setHistory(d.data); }).catch(() => {});
  }, []);

  // Timer
  useEffect(() => {
    if (view !== 'test' || !session) return;
    const totalSecs = session.questions.length * 90;
    setTimeLeft(totalSecs);
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); handleFinish(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [view, session]);

  const startTest = async () => {
    if (!selectedTest) return;
    setLoading(true); setError('');
    try {
      const body = { testType: selectedTest.id, questionCount, ...(selectedSubject && { subject: selectedSubject }) };
      const res  = await apiFetch('/api/mock-test/start', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start test');
      setSession(data);
      setAnswers({});
      setRevealed({});
      setCurrentQ(0);
      setStartTime(Date.now());
      setView('test');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const selectAnswer = (qId, choice) => {
    if (answers[qId] !== undefined) return; // locked
    setAnswers(prev => ({ ...prev, [qId]: choice }));
    setRevealed(prev => ({ ...prev, [qId]: true }));
  };

  const handleFinish = async () => {
    if (!session) return;
    setLoading(true);
    const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000) : null;
    const answersArr = session.questions.map((q) => ({ questionId: q.id, chosen: answers[q.id] || null }));
    try {
      const res  = await apiFetch(`/api/mock-test/${session.sessionId}/finish`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ answers: answersArr, timeTakenSecs: timeTaken }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult({ ...data, timeTaken, totalQ: session.questions.length, testType: session.testType, answers, questions: session.questions });
      // Refresh history
      apiFetch('/api/mock-test/history').then(r=>r.json()).then(d=>{ if(d?.data) setHistory(d.data); }).catch(()=>{});
      setView('result');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const formatTime = (secs) => `${Math.floor(secs/60).toString().padStart(2,'0')}:${(secs%60).toString().padStart(2,'0')}`;

  // ── Home view ──────────────────────────────────────────────────────────────
  if (view === 'home') return (
    <div className="w-full space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Entry Test Preparation</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Practice for Pakistan's Entry Tests</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm">Timed mock tests for MDCAT, ECAT, NTS-NAT, NUST NET and NUMS. Track your progress across sessions.</p>
      </div>

      {/* Test type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEST_TYPES.map(test => {
          const c = COLOR_MAP[test.color];
          return (
            <motion.button key={test.id} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
              onClick={() => { setSelectedTest(test); setSelectedSubject(''); setView('setup'); }}
              className={`text-left p-5 rounded-2xl border-2 ${c.bg} ${c.border} transition-all`}>
              <div className="mb-3 w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">{React.createElement(test.icon, { className: "w-5 h-5", strokeWidth: 1.75, "aria-hidden": true })}</div>
              <h3 className={`font-bold text-lg ${c.text}`}>{test.label}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{test.desc}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {test.subjects.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{s}</span>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" /> Recent Sessions
          </h2>
          <div className="space-y-2">
            {history.slice(0, 5).map((s, i) => (
              <div key={s.id || i} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-semibold text-sm text-slate-800 dark:text-white">{s.test_type}</span>
                  {s.subject_filter && <span className="text-xs text-slate-500 ml-2">· {s.subject_filter}</span>}
                  <div className="text-xs text-slate-400 mt-0.5">{s.total_questions} questions · {new Date(s.started_at).toLocaleDateString('en-PK')}</div>
                </div>
                <div className={`text-xl font-black ${Number(s.score_pct) >= 70 ? 'text-emerald-600' : Number(s.score_pct) >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                  {Math.round(Number(s.score_pct))}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Setup view ─────────────────────────────────────────────────────────────
  if (view === 'setup' && selectedTest) {
    const c = COLOR_MAP[selectedTest.color];
    return (
      <div className="max-w-lg mx-auto space-y-6 pt-6">
        <button onClick={() => setView('home')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm">
          ← Back
        </button>
        <div className={`p-6 rounded-2xl border-2 ${c.bg} ${c.border} space-y-5`}>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">{React.createElement(selectedTest.icon, { className: "w-6 h-6", strokeWidth: 1.75, "aria-hidden": true })}</span>
            <div><h2 className={`text-xl font-bold ${c.text}`}>{selectedTest.label}</h2><p className="text-xs text-slate-500">{selectedTest.desc}</p></div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Subject (optional — leave blank for mixed)</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white">
              <option value="">All subjects (mixed)</option>
              {selectedTest.subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Number of questions: {questionCount}</label>
            <input type="range" min="5" max="40" step="5" value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))}
              className="w-full accent-emerald-600" />
            <div className="flex justify-between text-xs text-slate-400"><span>5 (quick)</span><span>20 (standard)</span><span>40 (full)</span></div>
          </div>

          <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Estimated time: ~{Math.round(questionCount * 1.5)} minutes</div>
            <div className="flex items-center gap-2"><Target className="w-3.5 h-3.5" /> Passing mark: 70% (merit benchmark)</div>
          </div>

          {error && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4"/>{error}</p>}

          <button onClick={startTest} disabled={loading}
            className={`w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 ${c.btn} disabled:opacity-60 transition-all`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4"/>}
            {loading ? 'Loading questions...' : 'Start Practice Test'}
          </button>
        </div>
      </div>
    );
  }

  // ── Test view ──────────────────────────────────────────────────────────────
  if (view === 'test' && session) {
    const q = session.questions[currentQ];
    const answered = answers[q.id] !== undefined;
    const chosenAns = answers[q.id];
    const isRevealed = revealed[q.id];
    const progress = Math.round(((currentQ + 1) / session.questions.length) * 100);
    const timerColor = timeLeft < 60 ? 'text-red-500' : timeLeft < 180 ? 'text-amber-500' : 'text-emerald-600';
    const diffBadge = { Easy: 'bg-emerald-100 text-emerald-700', Medium: 'bg-amber-100 text-amber-700', Hard: 'bg-red-100 text-red-700' }[q.difficulty] || '';

    return (
      <div className="max-w-2xl mx-auto space-y-4 pb-12">
        {/* Top bar */}
        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 sticky top-0 z-10">
          <div className="text-sm text-slate-500">{currentQ + 1} / {session.questions.length}</div>
          <div className="flex-1 mx-4">
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className={`font-mono font-bold text-sm flex items-center gap-1 ${timerColor}`}>
            <Clock className="w-4 h-4" />{formatTime(timeLeft)}
          </div>
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{q.subject}</span>
                  {q.chapter && <span className="text-xs text-slate-400">{q.chapter}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${diffBadge}`}>{q.difficulty}</span>
                </div>
                <p className="text-slate-800 dark:text-white font-medium leading-relaxed">{q.question}</p>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {['A','B','C','D'].map(opt => {
                const optText = q.options[opt];
                let style = 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-emerald-400 cursor-pointer';
                if (isRevealed) {
                  // After answering, show correct (from session data — we need to check)
                  if (chosenAns === opt && chosenAns === (q._correct || chosenAns)) {
                    style = 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 cursor-default';
                  } else if (chosenAns === opt) {
                    style = 'bg-red-50 dark:bg-red-900/30 border-red-400 cursor-default';
                  } else {
                    style = 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 cursor-default opacity-60';
                  }
                } else if (chosenAns === opt) {
                  style = 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 cursor-default';
                }
                return (
                  <button key={opt} onClick={() => selectAnswer(q.id, opt)} disabled={answered}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left text-sm transition-all ${style}`}>
                    <span className="font-bold text-slate-600 dark:text-slate-300 shrink-0 w-5">{opt}.</span>
                    <span className="text-slate-700 dark:text-slate-200">{optText}</span>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {isRevealed && q._explanation && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                  <span>{q._explanation}</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentQ > 0 && (
            <button onClick={() => setCurrentQ(i => i - 1)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              ← Previous
            </button>
          )}
          {currentQ < session.questions.length - 1 ? (
            <button onClick={() => setCurrentQ(i => i + 1)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trophy className="w-4 h-4"/>}
              {loading ? 'Submitting...' : 'Finish & See Results'}
            </button>
          )}
        </div>

        {/* Skip to end */}
        {Object.keys(answers).length > 0 && (
          <button onClick={handleFinish} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1">
            Submit all answered ({Object.keys(answers).length}/{session.questions.length}) and finish
          </button>
        )}
      </div>
    );
  }

  // ── Result view ─────────────────────────────────────────────────────────────
  if (view === 'result' && result) {
    const pct = result.scorePct;
    const grade = pct >= 80 ? { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', emoji: Trophy }
                : pct >= 70 ? { label: 'Good',      color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950/30',    emoji: Crosshair }
                : pct >= 50 ? { label: 'Average',   color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-950/30',  emoji: BookOpen }
                :             { label: 'Needs Work', color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-950/30',     emoji: Dumbbell };
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className={`p-8 rounded-2xl text-center space-y-4 ${grade.bg}`}>
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${grade.bg} ${grade.color}`}>{React.createElement(grade.emoji, { className: "w-8 h-8", strokeWidth: 1.75, "aria-hidden": true })}</div>
          <h2 className={`text-4xl font-black ${grade.color}`}>{pct}%</h2>
          <p className={`text-xl font-bold ${grade.color}`}>{grade.label}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{result.message}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Correct', value: result.correct, color:'text-emerald-600', icon: CheckCircle2 },
            { label:'Incorrect', value: result.incorrect, color:'text-red-500', icon: XCircle },
            { label:'Skipped', value: result.skipped, color:'text-amber-600', icon: AlertCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
        {result.timeTaken && (
          <p className="text-center text-sm text-slate-500">
            <Clock className="inline w-4 h-4 mr-1" />Time taken: {formatTime(result.timeTaken)}
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={() => { setView('home'); setSession(null); setResult(null); }}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Home
          </button>
          <button onClick={() => { setView('setup'); setSession(null); setResult(null); setAnswers({}); }}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2">
            <Play className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
