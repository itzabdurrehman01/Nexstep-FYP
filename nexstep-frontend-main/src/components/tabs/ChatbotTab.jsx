import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, Sparkles, User, RefreshCw, AlertCircle, Mic, WifiOff, AlertTriangle, MessageCircleQuestion } from 'lucide-react';
import { translations } from '../../data/translations.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/I18nContext.jsx';
import { AiVoiceAssistant } from '../voice/AiVoiceAssistant.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Generic offline fallback — used ONLY when the server is unreachable.
// All other cases (Gemini failure, rate limit, empty response) show the
// actual server error message. No canned / pre-fed keyword-matched answers.
// ─────────────────────────────────────────────────────────────────────────────
function getOfflineFallback(_query, lang) {
  return lang === 'ur'
    ? 'AI فی الحال دستیاب نہیں ہے۔ براہ کرم انٹرنیٹ کنکشن چیک کریں یا چند لمحوں میں دوبارہ کوشش کریں۔'
    : 'The AI is currently unreachable. Please check your internet connection or try again in a few moments.';
}

// ─────────────────────────────────────────────────────────────────────────────
export function ChatbotTab({ profile = {}, lang }) {
  const t = translations[lang] ?? translations.en;
  const { apiFetch, user } = useAuth();
  const { setLang } = useLanguage();
  const chatbotCopy = typeof t.aiChatbot === 'object'
    ? t.aiChatbot
    : {
        title: typeof t.aiChatbot === 'string' ? t.aiChatbot : 'AI Career Counselor',
        subtitle: lang === 'ur'
          ? 'اپنے کیریئر کے بارے میں فوری رہنمائی حاصل کریں'
          : 'Get immediate guidance for your academic and career journey.',
        typing: lang === 'ur' ? 'جواب تیار کیا جا رہا ہے' : 'Preparing your answer',
        inputPlaceholder: lang === 'ur'
          ? 'اپنا سوال لکھیں...'
          : 'Ask about careers, universities, jobs, or scholarships...',
      };

  const displayName = (
    profile?.name?.trim() ||
    user?.name?.trim() ||
    (user?.firstName && `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`.trim()) ||
    'Student'
  );
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const makeWelcome = useCallback(() => ({
    id: 1,
    sender: 'ai',
    text: lang === 'ur'
      ? `السلام علیکم ${displayName}! میں آپ کا NexStep AI کیریئر کونسلر ہوں۔ MDCAT کٹ آف، یونیورسٹی فیس، TEVTA کورسز، اسکالرشپس یا کسی بھی کیریئر کے بارے میں پوچھیں۔`
      : `Assalam-o-Alaikum ${displayName}! I'm your NexStep AI Counselor powered by Gemini. Ask me anything — MDCAT cutoffs, university admissions, scholarship eligibility, career paths, TEVTA trades, or job market advice for Pakistan.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }), [displayName, lang]);

  const [messages, setMessages] = useState(() => [makeWelcome()]);

  // When the user updates their profile name or switches language,
  // regenerate the welcome message (id === 1) so it never shows a stale name.
  useEffect(() => {
    setMessages(prev => {
      if (!prev.length) return [makeWelcome()];
      return prev.map(m => m.id === 1 ? makeWelcome() : m);
    });
  }, [makeWelcome]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  // Is Gemini actually connected? (GET /api/ai/status — no secrets in the reply)
  useEffect(() => {
    let alive = true;
    fetch('/api/ai/status', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j?.data) setIsOffline(['offline', 'no-key'].includes(j.data.state)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // msgsBoxRef scrolls ONLY the message container — NOT the whole page
  const msgsBoxRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll inside the message box only
  const scrollToBottom = useCallback(() => {
    if (msgsBoxRef.current) {
      msgsBoxRef.current.scrollTop = msgsBoxRef.current.scrollHeight;
    }
  }, []);

  // Scroll on new messages/loading, but only inside the box
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Load conversation history from DB
  useEffect(() => {
    if (!user || !apiFetch) return;
    apiFetch('/api/conversations?limit=1')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const convs = data?.data || data?.conversations || [];
        if (!convs.length) return;
        setConversationId(convs[0].id);
        return apiFetch(`/api/conversations/${convs[0].id}/messages`)
          .then(r => r.ok ? r.json() : null)
          .then(msgData => {
            const dbMsgs = msgData?.data || msgData?.messages || [];
            if (!dbMsgs.length) return;
            setMessages(prev => [
              prev[0],
              ...dbMsgs.map((m, i) => ({
                id: i + 10,
                sender: m.role === 'user' ? 'user' : 'ai',
                text: m.content,
                timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              })),
            ]);
          });
      })
      .catch(() => {});
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestedPrompts = lang === 'ur' ? [
    'MDCAT کا میرٹ فارمولا کیا ہے؟',
    'میٹرک کے بعد کون سا گروپ بہتر ہے؟',
    'احساس اسکالرشپ کے لیے کون اہل ہے؟',
    'بہترین IT کیریئر کون سا ہے؟',
    'TEVTA کے مفت کورسز بتائیں',
  ] : [
    'What is the MDCAT merit formula?',
    'Should I choose ICS or Pre-Engineering?',
    'How do I apply for the Ehsaas Scholarship?',
    'Top universities for Software Engineering in Pakistan?',
    'What free IT courses are available in Pakistan?',
  ];

  const buildHistory = useCallback(() =>
    messages.filter(m => m.id !== 1).slice(-8)
      .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
  [messages]);

  const addMsg = useCallback((msg) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  }, []);

  const handleSend = useCallback(async (textToSend) => {
    const query = (textToSend ?? input).trim();
    if (!query || loading) return;

    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addMsg({ sender: 'user', text: query, timestamp: ts });
    if (!textToSend) {
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
    }
    setLoading(true);
    setIsOffline(false);
    setIsRateLimited(false);

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: query, conversationId, language: lang, profile, history: buildHistory() }),
      });

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let data = null;
      try { data = await res.json(); } catch { data = null; }

      if (res.ok && data?.reply) {
        if (data.conversationId) setConversationId(data.conversationId);
        // 'nexstep-counselor-engine' = saved offline answers (Gemini was not reachable)
        const fromOffline = data.source === 'nexstep-counselor-engine';
        setIsOffline(fromOffline);
        addMsg({ sender: 'ai', text: data.reply.trim(), timestamp: now, isOffline: fromOffline });
        return;
      }

      // Non-OK response — prefer server-provided error message over generic fallback
      const serverError = data?.error?.trim();
      const code = data?.code;
      const offlineCodes = new Set(['AI_UNAVAILABLE', 'AI_TEMPORARILY_UNAVAILABLE']);
      const rateLimited = code === 'RATE_LIMITED' || res.status === 429;
      if (rateLimited) setIsRateLimited(true);
      if (offlineCodes.has(code) || res.status >= 500) {
        setIsOffline(true);
      }
      addMsg({
        sender: 'ai',
        timestamp: now,
        isOffline: offlineCodes.has(code) || res.status >= 500,
        isRateLimited: rateLimited,
        text: serverError
          ? serverError
          : (res.status === 400
            ? (lang === 'ur' ? 'براہ کرم اپنا سوال درج کریں۔' : 'Please enter a question.')
            : getOfflineFallback(query, lang)),
      });

    } catch {
      // True network error (fetch threw) — server unreachable
      setIsOffline(true);
      addMsg({
        sender: 'ai', isOffline: true,
        text: getOfflineFallback(query, lang),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, lang, profile, conversationId, buildHistory, addMsg, apiFetch]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const clearChat = useCallback(() => {
    setMessages([makeWelcome()]);
    setConversationId(null);
    setIsOffline(false);
    setIsRateLimited(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onlyWelcome = messages.length === 1;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // Fixed height container — does NOT grow the page; chat stays in viewport
    <div className="ns-page-wrapper w-full flex flex-col gap-5 min-w-0" style={{ height: 'calc(100vh - 9.5rem)', minHeight: '520px' }}>
      {showVoiceAssistant ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="flex flex-col gap-3 h-full min-h-0"
        >
          <div className="ns-card px-4 py-3 shrink-0 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 inline-flex items-center gap-2 min-w-0">
              <Mic className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">NexStep AI Voice Assistant Active</span>
            </span>
            <button
              onClick={() => setShowVoiceAssistant(false)}
              className="ns-btn ns-btn-secondary ns-btn-sm shrink-0"
              aria-label="Switch back to text chat"
            >
              Switch to Text Chat
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <AiVoiceAssistant profile={profile} lang={lang} onClose={() => setShowVoiceAssistant(false)} />
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col h-full gap-3 min-h-0"
        >
          {/* Header — premium hero bar */}
          <div className="relative overflow-hidden ns-card px-5 py-4 shrink-0">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
            <div className="relative z-10 flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
                  <Bot className="w-5.5 h-5.5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-none truncate">
                      {chatbotCopy.title}
                    </h1>
                    <span className="ns-badge ns-badge-ai shrink-0">
                      <Sparkles className="w-3 h-3" />
                      Gemini Powered
                    </span>
                    {(isOffline || isRateLimited) && (
                      <span className={`ns-badge shrink-0 ${isRateLimited ? 'ns-badge-warning' : 'ns-badge-danger'}`}>
                        {isRateLimited ? (
                          <>Rate limited</>
                        ) : (
                          <><WifiOff className="w-3 h-3" /> Offline</>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{chatbotCopy.subtitle}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {lang === 'ur'
                      ? 'جواب منتخب زبان میں آتا ہے، اور یہ گفتگو یاد رکھی جاتی ہے۔'
                      : 'Replies follow Urdu or English, and this chat remembers the conversation.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  onClick={() => setShowVoiceAssistant(true)}
                  className="ns-btn ns-btn-primary ns-btn-sm inline-flex items-center gap-1.5"
                  aria-label="Open voice assistant mode"
                >
                  <Mic className="w-4 h-4" />
                  <span className="hidden sm:inline">Voice</span>
                </button>
                <button
                  onClick={() => setLang(lang === 'ur' ? 'en' : 'ur')}
                  title="Switch language between Urdu and English"
                  aria-label="Switch language"
                  className="ns-btn ns-btn-secondary ns-btn-sm"
                >
                  {lang === 'ur' ? 'EN' : 'اردو'}
                </button>
                <button
                  onClick={clearChat}
                  title="Clear conversation and start a new chat"
                  aria-label="Clear chat history and start new conversation"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Suggested prompts toolbar */}
          <div
            className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 pb-1 -mx-1 px-1"
            role="toolbar"
            aria-label="Suggested conversation starter prompts"
          >
            {suggestedPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                disabled={loading}
                className="ns-badge ns-badge-subtle shrink-0 hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                aria-label={`Ask: ${p}`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Global offline / 503 banner — EXACT TEXT required */}
          <AnimatePresence>
            {isOffline && (
              <motion.div
                key="chatbot-global-offline"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="shrink-0"
                role="alert"
              >
                <div className="ns-alert ns-alert-warning">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-bold">NexStep AI Counselor temporarily unavailable</p>
                    <p className="text-slate-700 dark:text-slate-300 text-xs mt-0.5">
                      Gemini services are experiencing high demand or a temporary outage. Your questions are saved — please retry shortly.
                    </p>
                  </div>
                  <button
                    onClick={clearChat}
                    className="ns-btn ns-btn-secondary ns-btn-sm shrink-0"
                    aria-label="Retry and start a fresh conversation"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages — scroll is INSIDE this box only, page never scrolls */}
          <div
            ref={msgsBoxRef}
            role="log"
            aria-live="polite"
            aria-label="AI counselor conversation messages"
            className="flex-1 min-h-0 overflow-y-auto ns-card px-4 py-4 sm:px-6 space-y-4 shadow-inner"
          >
            <AnimatePresence initial={false}>
              {onlyWelcome && !loading && (
                /* ── CTA STATE: Only welcome message → big dashed CTA card with Sparkles ── */
                <motion.div
                  key="chat-cta"
                  initial={{ opacity: 0, y: 12, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.985 }}
                  transition={{ duration: 0.36, ease: 'easeOut' }}
                  className="mt-2 mb-2"
                >
                  <div
                    className="rounded-3xl border-2 border-dashed border-emerald-400/60 dark:border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 p-6 sm:p-10 text-center space-y-5"
                    aria-label="Conversation starter — ask the NexStep AI Counselor anything"
                  >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500 text-white shadow-xl">
                      <Sparkles className="w-10 h-10" strokeWidth={2} />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        Start Your NexStep AI Conversation
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                        Ask anything about MDCAT / ECAT merit, university shortlisting, scholarship eligibility, TEVTA trades, FSc stream choice, or job market outlook in Pakistan.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 max-w-2xl mx-auto">
                      {suggestedPrompts.slice(0, 4).map((p, i) => (
                        <button
                          key={`cta-${i}`}
                          onClick={() => handleSend(p)}
                          disabled={loading}
                          className="ns-badge ns-badge-ai cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50"
                        >
                          <MessageCircleQuestion className="w-3 h-3" />
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {messages.map((msg, mIdx) => {
              const isAi = msg.sender === 'ai';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.28, ease: 'easeOut', delay: onlyWelcome && mIdx === 0 ? 0.04 : 0 }}
                  className={`flex items-start gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        msg.isOffline || msg.isRateLimited
                          ? ' bg-amber-400 text-white'
                          : msg.isError
                            ? ' bg-red-500 text-white'
                            : ' bg-emerald-500 text-slate-950'
                      }`}
                      aria-hidden="true"
                    >
                      {msg.isOffline
                        ? <WifiOff className="w-4 h-4" />
                        : msg.isError
                          ? <AlertCircle className="w-4 h-4" />
                          : <Bot className="w-4 h-4" strokeWidth={2.25} />}
                    </div>
                  )}
                  <div
                    className={`max-w-[88%] sm:max-w-[78%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm min-w-0 ${
                      isAi
                        ? msg.isOffline || msg.isRateLimited
                          ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-slate-900 dark:text-slate-100 rounded-tl-md'
                          : msg.isError
                            ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200 rounded-tl-md'
                            : 'ns-card !p-4 !shadow-none rounded-tl-md'
                        : ' bg-emerald-500 text-white rounded-tr-md font-medium'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                    <div className={`text-[11px] text-right mt-2 font-semibold ${
                      isAi ? 'text-slate-400 dark:text-slate-500' : 'text-emerald-50/80'
                    }`}>
                      {msg.timestamp}
                      {msg.isOffline && <span className="ml-1 text-amber-600 dark:text-amber-400 font-bold"> · offline</span>}
                      {msg.isRateLimited && <span className="ml-1 text-amber-600 dark:text-amber-400 font-bold"> · rate-limited</span>}
                    </div>
                  </div>
                  {!isAi && (
                    <div
                      className="w-8 h-8 rounded-xl ns-hero text-white dark:bg-slate-300 dark:text-slate-900 flex items-center justify-center shrink-0 shadow-sm"
                      aria-hidden="true"
                    >
                      <User className="w-4 h-4" strokeWidth={2.25} />
                    </div>
                  )}
                </motion.div>
              );
            })}

            <AnimatePresence>
              {loading && (
                /* ── LOADING STATE: 3 ns-skeleton chat bubbles ── */
                <motion.div
                  key="chat-loading"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="flex items-start gap-2.5 py-1"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  aria-label={chatbotCopy.typing}
                >
                  <div
                    className="w-8 h-8 rounded-xl bg-emerald-500/80 text-slate-950 flex items-center justify-center shrink-0 shadow-sm"
                    aria-hidden="true"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-2 pt-1.5">
                    <div className="ns-skeleton h-3.5 rounded-xl w-56" />
                    <div className="ns-skeleton h-3.5 rounded-xl w-72" />
                    <div className="ns-skeleton h-3.5 rounded-xl w-40" />
                  </div>
                  <span className="sr-only">{chatbotCopy.typing}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="shrink-0 ns-card p-2 flex items-end gap-2"
            aria-label="Send a message to NexStep AI Counselor"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder={chatbotCopy.inputPlaceholder}
              aria-label="Type your question for the AI counselor. Press Enter to send, Shift+Enter for newline."
              className="flex-1 px-3 py-2 border-0 focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white bg-transparent resize-none outline-none leading-relaxed focus-visible:outline-none"
              style={{ minHeight: '36px', maxHeight: '96px' }}
            />
            <button
              type="button"
              onClick={() => setShowVoiceAssistant(true)}
              title="Switch to voice assistant mode"
              aria-label="Switch to voice assistant"
              className="w-10 h-10 mb-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center justify-center transition-colors shrink-0 border border-slate-200 dark:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label={loading ? 'AI is answering, please wait' : 'Send message to AI counselor'}
              className="w-10 h-10 mb-0.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 flex items-center justify-center transition-all shrink-0 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <Send className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
