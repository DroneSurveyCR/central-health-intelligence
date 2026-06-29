import type { Metadata } from "next";
import SiteShell from "@/components/site/SiteShell";

export const metadata: Metadata = {
  title: {
    default: "Central Health Intelligence — a clear 90-day plan for every client",
    template: "%s · Central Health Intelligence",
  },
  description:
    "Central Health Intelligence gives every client a clear 90-day plan — built with AI, approved by the doctor, and tracked on both sides. For longevity, functional-medicine and integrative practices. By Health Intelligency.",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
