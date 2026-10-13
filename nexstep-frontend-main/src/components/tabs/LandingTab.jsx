import React, { useEffect } from 'react';
import { MarketingBento } from '../marketing/MarketingBento';
import { MarketingHero } from '../marketing/MarketingHero';
import { MarketingPricing } from '../marketing/MarketingPricing';


export function LandingTab({ onNavigate }) {
  useEffect(() => {
    document.body.classList.add('marketing-mode');
    return () => document.body.classList.remove('marketing-mode');
  }, []);

  return (
    <div id="top" className="lp-page">
      <MarketingHero onNavigate={onNavigate} />
      <MarketingBento />
      <MarketingPricing onNavigate={onNavigate} />
    </div>
  );
}

export default LandingTab;
