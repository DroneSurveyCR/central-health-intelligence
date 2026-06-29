import "./site.css";
import type { Metadata } from "next";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";

export const metadata: Metadata = {
  title: {
    default: "Central Health Intelligence — live health intelligence for clinics",
    template: "%s · Central Health Intelligence",
  },
  description:
    "Central Health Intelligence keeps patient data live — wearables, labs and CGM in one picture, with AI that drafts and the doctor approves. For longevity, functional-medicine and integrative clinics. By Health Intelligency.",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mkt">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
