import { requirePatient } from "@/lib/auth/roles";
import { getServices, getLocations, getPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";
import BookingWizard from "./BookingWizard";

export default async function BookPage() {
  const me = await requirePatient();
  const [services, locations, practice] = await Promise.all([
    getServices(),
    getLocations(),
    getPractice(),
  ]);

  // First visit = the patient has no prior appointments (RLS scopes to self).
  const supabase = await createClient();
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", me.id);
  const isFirstVisit = (count ?? 0) === 0;

  const currency =
    ((practice ?? {}) as { currency?: string }).currency ?? "USD";

  return (
    <div>
      <h1 className="serif" style={{ fontSize: 26, margin: "0 0 4px" }}>
        Book an appointment
      </h1>
      <p className="muted" style={{ marginBottom: 18 }}>
        Choose what you need and a time that suits you.
      </p>
      <BookingWizard
        services={services}
        locations={locations}
        currency={currency}
        isFirstVisit={isFirstVisit}
      />
    </div>
  );
}
