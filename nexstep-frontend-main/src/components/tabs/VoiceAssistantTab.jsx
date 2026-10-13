import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, AlertTriangle, Volume2, RefreshCw } from 'lucide-react';
import { AiVoiceAssistant } from '../voice/AiVoiceAssistant.jsx';

export function VoiceAssistantTab({ profile, lang = 'en' }) {
  const [componentError, setComponentError] = useState(null);
  const [mountRetry, setMountRetry] = useState(0);

  useEffect(() => {
    setComponentError(null);
  }, [mountRetry]);

  return (
    <div className="ns-page-wrapper w-full space-y-5 min-w-0">
      <div className="relative overflow-hidden ns-card p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl ns-accent-glow-right" aria-hidden="true" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl" aria-hidden="true" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 min-w-0">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-sky-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
              <Mic className="w-7 h-7" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-bold">
                <Volume2 className="w-3.5 h-3.5" />
                NexStep Voice AI • Browser Speech Recognition
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                Voice Career Counselor
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Speak naturally in English or Urdu — get live spoken guidance for degree choices, merit cutoffs, scholarships, and job pathways in Pakistan.
              </p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {componentError ? (
          <motion.div
            key="va-error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            role="alert"
          >
            <div className="ns-alert ns-alert-warning">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-bold">NexStep Voice Assistant temporarily unavailable</p>
                <p className="text-slate-700 dark:text-slate-300 text-xs mt-0.5">
                  Your browser may not support the Web Speech API, or microphone permissions were denied. You can still use the full AI Counselor from the Career AI text chat.
                </p>
              </div>
              <button
                onClick={() => setMountRetry(r => r + 1)}
                className="ns-btn ns-btn-secondary ns-btn-sm shrink-0 inline-flex items-center gap-1.5"
                aria-label="Retry initializing voice assistant"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`va-ready-${mountRetry}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className="ns-card p-5 sm:p-6"
            aria-live="polite"
            onErrorCapture={(e) => setComponentError(e?.message || 'Voice module failed to initialize')}
          >
            <ErrorBoundary onError={setComponentError}>
              <AiVoiceAssistant profile={profile ?? {}} lang={lang} />
            </ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error?.message || 'Voice assistant render failed');
    }
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default VoiceAssistantTab;
