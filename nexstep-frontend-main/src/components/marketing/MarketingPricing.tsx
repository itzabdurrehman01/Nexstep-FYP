import { useState } from 'react';
import { Check } from 'lucide-react';

export function MarketingPricing({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [annual, setAnnual] = useState(true);
  const plans = [
    { name: 'Explorer', price: 'Free', period: '', description: 'A thoughtful place to begin.', features: ['RIASEC assessment', 'University explorer', 'Scholarship search'] },
    { name: 'Momentum', price: annual ? 'PKR 499' : 'PKR 59', period: annual ? '/ year' : '/ month', description: 'For students ready to build traction.', features: ['Unlimited AI counselor', 'Resume builder', 'Career roadmap', 'Mock interview practice'], featured: true },
    { name: 'Institution', price: 'Custom', period: '', description: 'For schools guiding whole cohorts.', features: ['Institution analytics', 'Student progress', 'Mentor workspaces'] },
  ];
  return (
    <section className="lp-section lp-section-alt" id="pricing">
      <div className="lp-container">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Pricing</span>
          <h2>Start free, upgrade when you need more</h2>
          <p>Good guidance should be within reach at every stage.</p>
        </div>
        <div className="lp-toggle" role="tablist" aria-label="Billing period">
          <button type="button" role="tab" aria-selected={!annual} onClick={() => setAnnual(false)} className={!annual ? 'is-active' : ''}>Monthly</button>
          <button type="button" role="tab" aria-selected={annual} onClick={() => setAnnual(true)} className={annual ? 'is-active' : ''}>Yearly <small>Save 18%</small></button>
        </div>
        <div className="lp-price-grid">
          {plans.map((plan) => (
            <article key={plan.name} className={`lp-price ${plan.featured ? 'is-featured' : ''}`}>
              <div className="lp-price-top">
                <h3>{plan.name}</h3>
                {plan.featured && <span className="lp-badge">Most popular</span>}
              </div>
              <p>{plan.description}</p>
              <div className="lp-price-amount"><strong>{plan.price}</strong>{plan.period && <span>{plan.period}</span>}</div>
              <ul>{plan.features.map((feature) => <li key={feature}><Check className="h-4 w-4" strokeWidth={2} />{feature}</li>)}</ul>
              <button type="button" className={plan.featured ? 'ns-btn-solid' : 'ns-btn-outline'} onClick={() => onNavigate(plan.featured ? 'pricing' : 'auth')}>
                {plan.featured ? 'Choose Momentum' : plan.name === 'Institution' ? 'Contact us' : 'Get started'}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
