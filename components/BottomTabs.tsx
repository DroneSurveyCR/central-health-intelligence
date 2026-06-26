"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/LanguageContext";

const S = { width: 23, height: 23, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const TABS: { href: string; key: string; icon: React.ReactNode }[] = [
  { href: "/today", key: "today", icon: (<svg {...S}><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path d="M3.5 9h17M8 3v3M16 3v3" /></svg>) },
  { href: "/plan", key: "plan", icon: (<svg {...S}><path d="M9 6.5h10M9 12h10M9 17.5h10" /><path d="M4 6l1 1 2-2M4 11.5l1 1 2-2M4 17l1 1 2-2" /></svg>) },
  { href: "/body", key: "body", icon: (<svg {...S}><circle cx="12" cy="7" r="3.2" /><path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /></svg>) },
  { href: "/results", key: "results", icon: (<svg {...S}><path d="M3 12.5h4l2.5 6 4-12 2.5 6h4" /></svg>) },
  { href: "/book", key: "book", icon: (<svg {...S}><circle cx="12" cy="12" r="8.5" /><path d="M12 8.5v7M8.5 12h7" /></svg>) },
];

export default function BottomTabs() {
  const t = useT();
  const path = usePathname();
  return (
    <nav className="bottom-tabs" aria-label="Primary">
      {TABS.map((tab) => {
        const active = path === tab.href || path.startsWith(tab.href + "/");
        return (
          <Link key={tab.href} href={tab.href} className={active ? "bt active" : "bt"} aria-current={active ? "page" : undefined}>
            {tab.icon}
            <span>{t(tab.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
