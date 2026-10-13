import { ArrowRight, CheckCircle2, GraduationCap, Target, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface MarketingHeroProps { onNavigate: (tab: string) => void; }

const steps = [
  { title: 'Take the interest assessment', field: 'Understand what suits you' },
  { title: 'Review your career matches', field: 'See why each one fits' },
  { title: 'Plan universities & funding', field: 'Merit, scholarships and next steps' },
];

export function MarketingHero({ onNavigate }: MarketingHeroProps) {
  return (
    <section className="lp-hero">
      <div className="lp-container lp-hero-grid">
        <motion.div className="lp-hero-copy" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
          <span className="lp-eyebrow">Career &amp; education guidance for Pakistan</span>
          <h1 className="lp-display">Plan your studies and career with confidence.</h1>
          <p className="lp-lede">
            NexStep turns your interests, marks and goals into a clear plan — matching you with careers,
            universities, scholarships and the skills to get there.
          </p>
          <div className="lp-actions">
            <button type="button" className="ns-btn-solid ns-btn-lg" onClick={() => onNavigate('quiz')}>
              Start free assessment <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
            <button type="button" className="ns-btn-outline ns-btn-lg" onClick={() => onNavigate('universities')}>
              Explore universities
            </button>
          </div>
          <ul className="lp-checks">
            <li><CheckCircle2 className="h-4 w-4" strokeWidth={2} /> Free for students</li>
            <li><CheckCircle2 className="h-4 w-4" strokeWidth={2} /> HEC-recognised institutions</li>
            <li><CheckCircle2 className="h-4 w-4" strokeWidth={2} /> English &amp; Urdu</li>
          </ul>
        </motion.div>

        <motion.div className="lp-preview" aria-hidden="true" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}>
          <div className="lp-preview-card">
            <div className="lp-preview-head">
              <div>
                <small>How NexStep works</small>
                <b>From your interests to a clear plan</b>
              </div>
            </div>
            <ul className="lp-match-list">
              {steps.map((m, i) => (
                <li key={m.title}>
                  <div className="lp-match-row">
                    <span><b>{m.title}</b><small>{m.field}</small></span>
                    <strong>{String(i + 1).padStart(2, '0')}</strong>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-preview-row">
            <div className="lp-mini-card">
              <span className="lp-mini-icon"><Target className="h-4 w-4" strokeWidth={1.75} /></span>
              <div><small>Roadmap</small><b>Track your milestones</b></div>
            </div>
            <div className="lp-mini-card">
              <span className="lp-mini-icon is-blue"><GraduationCap className="h-4 w-4" strokeWidth={1.75} /></span>
              <div><small>Merit calculator</small><b>Estimate your aggregate</b></div>
            </div>
          </div>
          <div className="lp-mini-card lp-mini-wide">
            <span className="lp-mini-icon is-amber"><TrendingUp className="h-4 w-4" strokeWidth={1.75} /></span>
            <div><small>Skill gap analysis</small><b>Know what to learn next</b></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
