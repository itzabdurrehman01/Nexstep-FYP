interface FooterColumnProps { title: string; links: Array<[string, string]>; onNavigate?: (tab: string) => void; }

export function FooterColumn({ title, links, onNavigate }: FooterColumnProps) {
  const handleClick = (destination: string) => {
    if (destination === 'cookies') {
      window.dispatchEvent(new CustomEvent('nexstep:open_cookie_preferences'));
      return;
    }
    if (destination && onNavigate) onNavigate(destination);
  };
  return (
    <div className="ns-footer-column">
      <b>{title}</b>
      {links.map(([label, destination]) => (
        <button key={label} type="button" onClick={() => handleClick(destination)}>{label}</button>
      ))}
    </div>
  );
}

export default FooterColumn;
