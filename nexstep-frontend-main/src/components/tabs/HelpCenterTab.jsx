import React, { useState } from 'react';
import { 
  HelpCircle, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Bug, 
  Search,
  ChevronDown
} from 'lucide-react';
import { FaqAccordion } from '../faq/FaqAccordion.jsx';

export function HelpCenterTab({ lang = 'en', onNavigate }) {
  const [activeSubTab, setActiveSubTab] = useState('faq'); // 'faq', 'bug'
  const [bugDesc, setBugDesc] = useState('');
  const [bugSubmitted, setBugSubmitted] = useState(false);

  const handleBugSubmit = (e) => {
    e.preventDefault();
    setBugSubmitted(true);
    setBugDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="ns-hero text-white rounded-3xl p-6 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Help Center & Support Desk</h1>
            <p className="text-xs text-slate-400">NexStep AI platform assistance and technical support</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('faq')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'faq' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-300'
            }`}
          >
            FAQ
          </button>
          <button
            onClick={() => setActiveSubTab('bug')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'bug' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-300'
            }`}
          >
            Report Bug
          </button>
        </div>
      </div>

      {activeSubTab === 'faq' ? (
        <FaqAccordion lang={lang} onNavigate={onNavigate} />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs max-w-xl">
          <h2 className="text-base font-bold text-slate-900">Report a Bug or Suggest Feature</h2>
          {bugSubmitted && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Report received! Our engineering team will review it promptly.</span>
            </div>
          )}

          <form onSubmit={handleBugSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Issue Description</label>
              <textarea
                rows="4"
                value={bugDesc}
                onChange={(e) => setBugDesc(e.target.value)}
                placeholder="Describe what went wrong or suggest an improvement..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-emerald-500"
                required
              ></textarea>
            </div>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer hover:bg-emerald-700">
              Submit Feedback
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default HelpCenterTab;

