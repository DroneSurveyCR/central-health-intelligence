import Link from "next/link";

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { href: "/platform/intelligence", label: "Intelligence" },
      { href: "/platform/ai", label: "AI drafts" },
      { href: "/platform/connectors", label: "Connectors" },
      { href: "/platform/ehr", label: "Modular EHR" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/for-clinicians", label: "For clinicians" },
      { href: "/for-patients", label: "For patients" },
      { href: "/modules", label: "Modules" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/company", label: "Health Intelligency" },
      { href: "/trust", label: "Security" },
      { href: "/pricing", label: "Pricing" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/notice", label: "HIPAA notice" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-wrap">
        <div className="mkt-foot-grid">
          <div>
            <div className="mkt-brand mkt-foot-brand">
              <span className="mark" aria-hidden>C</span>
              <b>Central Health Intelligence</b>
            </div>
            <p className="mkt-muted mkt-foot-about">
              Live health intelligence for longevity, functional-medicine and integrative clinics.
              By Health Intelligency.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <h4>{c.title}</h4>
              <ul>
                {c.links.map((l) => (
                  <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mkt-foot-bottom">
          <span>© {new Date().getFullYear()} Health Intelligency. All rights reserved.</span>
          <span>Central Health Intelligence — Cloud · HIPAA Cloud · Private Cloud</span>
        </div>
      </div>
    </footer>
  );
}
