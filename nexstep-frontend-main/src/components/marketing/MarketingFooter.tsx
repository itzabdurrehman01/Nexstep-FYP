import { ArrowRight, Github, Instagram, Linkedin } from 'lucide-react';
import logoImg from '../../assets/images/nexstep_logo_1786045525796.png';
import { FooterColumn } from './FooterColumn';

interface MarketingFooterProps { onNavigate: (tab: string) => void; lang?: string; compact?: boolean; }

const columns = [
  { title: 'Product', links: [['Features', 'careerAi'], ['Pricing', 'pricing'], ['Career AI', 'careerAi'], ['Roadmap', 'careerRoadmap']] },
  { title: 'Resources', links: [['Universities', 'universities'], ['Scholarships', 'scholarships'], ['Courses', 'courses'], ['Help centre', 'helpCenter']] },
  { title: 'Company', links: [['About us', 'about'], ['Help centre', 'helpCenter']] },
  { title: 'Legal', links: [['Privacy', 'privacy'], ['Terms', 'terms'], ['Cookies', 'cookies']] },
];
const urduColumns = [
  { title: 'پروڈکٹ', links: [['خصوصیات', 'careerAi'], ['قیمتیں', 'pricing'], ['کیریئر اے آئی', 'careerAi'], ['روڈ میپ', 'careerRoadmap']] },
  { title: 'وسائل', links: [['یونیورسٹیاں', 'universities'], ['اسکالرشپس', 'scholarships'], ['کورسز', 'courses'], ['مدد مرکز', 'helpCenter']] },
  { title: 'ادارہ', links: [['ہمارے بارے میں', 'about'], ['مدد مرکز', 'helpCenter']] },
  { title: 'قانونی', links: [['پرائیویسی', 'privacy'], ['شرائط', 'terms'], ['کوکیز', 'cookies']] },
];

export function MarketingFooter({ onNavigate, lang = 'en', compact = false }: MarketingFooterProps) {
  const isUrdu = lang === 'ur';
  const copy = isUrdu
    ? { title: 'آج ہی اپنا اگلا قدم واضح کریں', description: 'مفت اسیسمنٹ سے آغاز کریں اور اپنے لیے موزوں راستے دیکھیں۔', cta: 'مفت آغاز کریں', brand: 'پاکستان کے طلبہ کے لیے کیریئر اور تعلیمی رہنمائی۔', rights: '© 2026 نیکسٹ اسٹیپ · جملہ حقوق محفوظ ہیں', help: 'مدد', privacy: 'پرائیویسی', terms: 'شرائط' }
    : { title: 'Find your next step today', description: 'Start with the free assessment and see the paths that fit you.', cta: 'Get started free', brand: 'Career and education guidance for students in Pakistan.', rights: '© 2026 NexStep · All rights reserved', help: 'Help', privacy: 'Privacy', terms: 'Terms' };

  if (compact) {
    return (
      <footer role="contentinfo" className="ns-footer-compact">
        <span>{copy.rights}</span>
        <nav aria-label="Footer">
          <button type="button" onClick={() => onNavigate('helpCenter')}>{copy.help}</button>
          <button type="button" onClick={() => onNavigate('about')}>{isUrdu ? 'ہمارے بارے میں' : 'About'}</button>
          <button type="button" onClick={() => onNavigate('privacy')}>{copy.privacy}</button>
          <button type="button" onClick={() => onNavigate('terms')}>{copy.terms}</button>
        </nav>
      </footer>
    );
  }

  return (
    <footer role="contentinfo" className="ns-footer">
      <div className="lp-container">
        <section className="ns-footer-cta">
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.description}</p>
          </div>
          <button type="button" className="ns-btn-solid ns-btn-lg" onClick={() => onNavigate('quiz')}>{copy.cta} <ArrowRight className="h-4 w-4" strokeWidth={2} /></button>
        </section>
        <section className="ns-footer-main">
          <div className="ns-footer-brand">
            <div className="ns-brand"><span className="ns-brand-mark"><img src={logoImg} alt="" /></span><span className="ns-brand-text"><b>NexStep</b></span></div>
            <p>{copy.brand}</p>
            <div className="ns-footer-social">
              {[Github, Linkedin, Instagram].map((Icon, index) => <a key={index} aria-label="NexStep social link" href="#top" className="ns-icon-btn"><Icon className="h-4 w-4" strokeWidth={1.75} /></a>)}
            </div>
          </div>
          <div className="ns-footer-columns">
            {(isUrdu ? urduColumns : columns).map((column) => <FooterColumn key={column.title} title={column.title} links={column.links as Array<[string, string]>} onNavigate={onNavigate} />)}
          </div>
        </section>
        <div className="ns-footer-bottom"><span>{copy.rights}</span></div>
      </div>
    </footer>
  );
}

export default MarketingFooter;
