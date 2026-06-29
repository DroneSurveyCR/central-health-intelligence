import Link from "next/link";

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/product", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/trust", label: "Security" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/company", label: "Health Intelligency" },
      { href: "/contact", label: "Book a demo" },
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
              A clear 90-day plan for every client — built with AI, approved by the doctor,
              tracked on both sides. By Health Intelligency.
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
