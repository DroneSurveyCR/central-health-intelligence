import Link from "next/link";
import { requirePatient } from "@/lib/auth/roles";
import { getEnabledModules } from "@/lib/modules/requireModule";
import PatientNav from "@/components/PatientNav";
import BottomTabs from "@/components/BottomTabs";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePatient();
  const modules = await getEnabledModules();
  return (
    <div>
      <header className="app-top">
        <Link href="/home" className="brand">HealthSync</Link>
        <PatientNav
          wearables={modules.has("wearables")}
          engagement={modules.has("engagement")}
        />
      </header>
      <main id="main" className="app-main with-tabs">{children}</main>
      <BottomTabs />
    </div>
  );
}
