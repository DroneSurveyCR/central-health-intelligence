import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

const S = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const ICONS: Record<string, React.ReactNode> = {
  focus: (<svg {...S}><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" /></svg>),
  patients: (<svg {...S}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" /><path d="M16 4a3 3 0 010 6M21 20c0-2.5-1.5-4-4-4.5" /></svg>),
  calendar: (<svg {...S}><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path d="M3.5 9h17M8 3v3M16 3v3" /></svg>),
  messages: (<svg {...S}><path d="M4 5h16v11H9l-5 4z" /></svg>),
  settings: (<svg {...S}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M4.2 7.2l1.8 1M18 15.8l1.8 1M21 12h-2.5M5.5 12H3M19.8 7.2l-1.8 1M6 15.8l-1.8 1" /></svg>),
  products: (<svg {...S}><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8a3 3 0 016 0" /></svg>),
  articles: (<svg {...S}><path d="M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2V4z" /><path d="M9 8h6M9 12h6" /></svg>),
  analytics: (<svg {...S}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>),
  import: (<svg {...S}><path d="M12 3v11M8 10l4 4 4-4M4 20h16" /></svg>),
  security: (<svg {...S}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /></svg>),
};

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireStaff();
  const isAdmin = me.role === "doctor" || me.role === "admin";
  const supabase = await createClient();
  const { count: unread } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender", "patient")
    .is("read_at", null);

  const initials = me.name?.split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase() || "DR";

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <Link href="/focus" className="brand">HealthSync</Link>
        <Link href="/focus">{ICONS.focus}<span>Focus</span></Link>
        <Link href="/patients">{ICONS.patients}<span>Patients</span></Link>
        <Link href="/calendar">{ICONS.calendar}<span>Calendar</span></Link>
        <Link href="/inbox">
          {ICONS.messages}
          <span>Messages</span>
          {unread ? <span className="badge unread" style={{ marginLeft: "auto" }}>{unread}</span> : null}
        </Link>
        {isAdmin && <Link href="/settings">{ICONS.settings}<span>Settings</span></Link>}
        {isAdmin && <Link href="/products">{ICONS.products}<span>Products</span></Link>}
        {isAdmin && <Link href="/articles">{ICONS.articles}<span>Articles</span></Link>}
        {isAdmin && <Link href="/analytics">{ICONS.analytics}<span>Analytics</span></Link>}
        {isAdmin && <Link href="/import">{ICONS.import}<span>Import</span></Link>}
        <Link href="/security">{ICONS.security}<span>Security</span></Link>
        <div className="who">
          <span className="who-avatar">{initials}</span>
          <span>{me.name} · {me.role}</span>
        </div>
      </aside>
      <div className="side-main">
        <main id="main" className="app-main">{children}</main>
      </div>
    </div>
  );
}
