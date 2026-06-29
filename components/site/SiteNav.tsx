import Link from "next/link";

type Item = { href: string; label: string; sub: string };

const PLATFORM: Item[] = [
  { href: "/platform/intelligence", label: "Intelligence", sub: "Morning briefing, alerts, triage" },
  { href: "/platform/ai", label: "AI that drafts", sub: "The doctor always approves" },
  { href: "/platform/connectors", label: "Connectors", sub: "Live wearable, lab & CGM data" },
  { href: "/platform/ehr", label: "Modular EHR", sub: "The clinical core" },
];
const SOLUTIONS: Item[] = [
  { href: "/for-clinicians", label: "For clinicians", sub: "The doctor's day, pre-read" },
  { href: "/for-patients", label: "For patients", sub: "Personal Health Intelligence" },
  { href: "/modules", label: "By specialty", sub: "Longevity, peptide, HRT, KAP…" },
];
const COMPANY: Item[] = [
  { href: "/company", label: "Health Intelligency", sub: "The company + our mission" },
  { href: "/contact", label: "Contact", sub: "Talk to us / book a demo" },
];

function Menu({ label, items }: { label: string; items: Item[] }) {
  return (
    <div className="mkt-navitem">
      <button type="button" aria-haspopup="true">
        {label}
        <span className="mkt-caret" aria-hidden />
      </button>
      <div className="mkt-menu" role="menu">
        {items.map((i) => (
          <Link key={i.href} href={i.href} role="menuitem">
            <span>{i.label}</span>
            <small>{i.sub}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SiteNav() {
  return (
    <header className="mkt-nav">
      <div className="mkt-wrap mkt-nav-row">
        <Link href="/" className="mkt-brand" aria-label="Central Health Intelligence — home">
          <span className="mark" aria-hidden>C</span>
          <b>Central Health Intelligence</b>
        </Link>
        <nav className="mkt-nav-links" aria-label="Primary">
          <Menu label="Platform" items={PLATFORM} />
          <Menu label="Solutions" items={SOLUTIONS} />
          <div className="mkt-navitem"><Link href="/trust">Security</Link></div>
          <div className="mkt-navitem"><Link href="/pricing">Pricing</Link></div>
          <Menu label="Company" items={COMPANY} />
        </nav>
        <span className="mkt-nav-spacer" />
        <Link href="/login" className="mkt-login-link">
          Log in
        </Link>
        <a href="/api/demo" className="mkt-btn ghost">Try demo</a>
        <Link href="/contact" className="mkt-btn">Book a demo</Link>
      </div>
    </header>
  );
}
