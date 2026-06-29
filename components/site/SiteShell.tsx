import "./site.css";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";

/** Marketing chrome (sticky nav + footer) shared by the public home (app/page.tsx)
 *  and every (site) route-group page. Scoped under .mkt so the app design system
 *  is untouched. */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mkt">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
