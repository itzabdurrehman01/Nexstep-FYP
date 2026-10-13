import { motion } from 'motion/react';
import { Bot, BriefcaseBusiness, Compass, FileText, GraduationCap, LineChart } from 'lucide-react';

const features = [
  { title: 'Career assessment', copy: 'A RIASEC-based assessment that maps your interests to careers that actually fit you.', icon: Compass },
  { title: 'Explainable recommendations', copy: 'Every match shows why — interest fit, marks, skills and market demand.', icon: Bot },
  { title: 'Universities & merit', copy: 'Compare HEC-recognised universities and estimate your merit for each.', icon: GraduationCap },
  { title: 'Scholarships & jobs', copy: 'Find funding, internships and roles that match your profile and city.', icon: BriefcaseBusiness },
  { title: 'Skill gap & roadmap', copy: 'See which skills to build next, with courses and milestones to track.', icon: LineChart },
  { title: 'Resume & interviews', copy: 'Build a clean resume and practise interviews with structured feedback.', icon: FileText },
];

const steps = [
  { n: '01', title: 'Tell us about you', copy: 'Take the assessment and add your marks, stream and goals.' },
  { n: '02', title: 'Review your matches', copy: 'Compare careers, degrees and universities side by side.' },
  { n: '03', title: 'Follow your plan', copy: 'Work through a roadmap of milestones, skills and deadlines.' },
];

export function MarketingBento() {
  return (
    <>
      <section className="lp-section" id="features">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-eyebrow">Everything in one place</span>
            <h2>One workspace for every education and career decision</h2>
            <p>No scattered spreadsheets and tabs — NexStep connects assessment, research and planning.</p>
          </div>
          <div className="lp-feature-grid">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.article key={f.title} className="lp-feature" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.35, delay: (i % 3) * 0.05 }}>
                  <span className="lp-feature-icon"><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.copy}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-eyebrow">How it works</span>
            <h2>From uncertain to a clear plan in three steps</h2>
          </div>
          <ol className="lp-steps">
            {steps.map((s) => (
              <li key={s.n}>
                <span className="lp-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
