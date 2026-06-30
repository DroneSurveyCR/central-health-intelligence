import Link from "next/link";

const NAV = [
  { href: "/product", label: "Product" },
  { href: "/solutions", label: "Who it's for" },
  { href: "/pricing", label: "Pricing" },
  { href: "/trust", label: "Compliance" },
  { href: "/company", label: "Company" },
];

export default function SiteNav() {
  return (
    <header className="mkt-nav">
      <div className="mkt-wrap mkt-nav-row">
        <Link href="/" className="mkt-brand" aria-label="Central Health Intelligence — home">
          <span className="mark" aria-hidden>C</span>
          <b>Central Health Intelligence</b>
        </Link>
        <nav className="mkt-nav-links" aria-label="Primary">
          {NAV.map((n) => (
            <div className="mkt-navitem" key={n.href}>
              <Link href={n.href}>{n.label}</Link>
            </div>
          ))}
        </nav>
        <span className="mkt-nav-spacer" />
        <Link href="/login" className="mkt-login-link">Log in</Link>
        <Link href="/contact" className="mkt-btn">Book a demo</Link>
      </div>
    </header>
  );
}
