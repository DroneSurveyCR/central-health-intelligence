import { requireStaff } from "@/lib/auth/roles";
import { getPractice, getLocations, getStaff, getServices } from "@/lib/practice";
import MediaUploader from "./MediaUploader";
import {
  updatePractice,
  addLocation,
  deleteLocation,
  addStaff,
  deleteStaff,
  addService,
  updateService,
  deleteService,
} from "./actions";

const CURRENCIES = ["USD", "CRC", "EUR", "GBP"] as const;

export default async function SettingsPage() {
  await requireStaff(["doctor", "admin"]);
  const [practice, locations, staff, services] = await Promise.all([
    getPractice(),
    getLocations(),
    getServices(),
    getStaff(),
  ]).then(([p, l, sv, st]) => [p, l, st, sv] as const);

  const contact = (practice?.contact_json ?? {}) as Record<string, string>;
  const social = (practice?.social_json ?? {}) as Record<string, string>;
  // tax/currency live on the singleton but aren't in the Practice type yet.
  const pricing = (practice ?? {}) as unknown as {
    tax_rate?: number;
    tax_label?: string;
    currency?: string;
  };

  const sectionStyle = { marginTop: 28 } as const;

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        Practice settings
      </h1>
      <p className="muted">Customize your practice — patients see this branding everywhere.</p>

      {/* Practice info */}
      <section style={sectionStyle}>
        <h2 className="serif" style={{ fontSize: 19 }}>About your practice</h2>
        <form action={updatePractice} className="form">
          <label>Practice name<input name="name" defaultValue={practice?.name ?? ""} /></label>
          <label>Legal name<input name="legal_name" defaultValue={practice?.legal_name ?? ""} /></label>
          <label>Tagline<input name="tagline" defaultValue={practice?.tagline ?? ""} /></label>
          <label>About / what you do<textarea name="about" rows={4} defaultValue={practice?.about ?? ""} /></label>
          <div className="wz-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>Contact email<input name="contact_email" defaultValue={contact.email ?? ""} /></label>
            <label>Phone<input name="contact_phone" defaultValue={contact.phone ?? ""} /></label>
            <label>City<input name="contact_city" defaultValue={contact.city ?? ""} /></label>
            <label>Country<input name="contact_country" defaultValue={contact.country ?? ""} /></label>
            <label>Website<input name="website" defaultValue={social.website ?? ""} /></label>
            <label>Instagram<input name="instagram" defaultValue={social.instagram ?? ""} /></label>
          </div>
          <label>Email &quot;from&quot; (reminders)<input name="email_from" defaultValue={practice?.email_from ?? ""} /></label>
          <button className="btn" type="submit">Save practice info</button>
        </form>
      </section>

      {/* Branding media */}
      <section style={sectionStyle}>
        <h2 className="serif" style={{ fontSize: 19 }}>Logo, images &amp; video</h2>
        {practice?.logo_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={practice.logo_url} alt="logo" style={{ height: 48, marginBottom: 10 }} />
        )}
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          <MediaUploader kind="logo" label="Upload logo" />
          <MediaUploader kind="hero" label="Add a hero image" />
          <MediaUploader kind="video" label="Add a video" />
        </div>
        <p className="hint">
          {(practice?.hero_images?.length ?? 0)} image(s) · {(practice?.videos?.length ?? 0)} video(s) on file.
        </p>
      </section>

      {/* Locations */}
      <section style={sectionStyle}>
        <h2 className="serif" style={{ fontSize: 19 }}>Locations</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
          {locations.map((l) => (
            <li key={l.id} style={rowStyle}>
              <span><b>{l.name}</b> <span className="muted">{l.address}</span></span>
              <form action={deleteLocation}>
                <input type="hidden" name="id" value={l.id} />
                <button className="btn ghost" style={smallBtn}>Remove</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addLocation} className="form" style={{ flexDirection: "row", gap: 8 }}>
          <input name="name" placeholder="Location name" required />
          <input name="address" placeholder="Address" />
          <button className="btn" type="submit">Add</button>
        </form>
      </section>

      {/* Staff */}
      <section style={sectionStyle}>
        <h2 className="serif" style={{ fontSize: 19 }}>Staff &amp; workers</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
          {staff.map((p) => (
            <li key={p.id} style={rowStyle}>
              <span><b>{p.name}</b> <span className="muted">{p.title} · {p.role}</span></span>
              <form action={deleteStaff}>
                <input type="hidden" name="id" value={p.id} />
                <button className="btn ghost" style={smallBtn}>Remove</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addStaff} className="form">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input name="name" placeholder="Full name" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="title" placeholder="Title (e.g. Acupuncturist)" />
            <select name="role" defaultValue="assistant">
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
              <option value="assistant">Assistant</option>
            </select>
          </div>
          <input name="specialties" placeholder="What they do" />
          <button className="btn" type="submit">Add staff member</button>
          <p className="hint">Adds the profile. To let them log in, create their auth user + link it (see README).</p>
        </form>
      </section>

      {/* Pricing & tax (practice-level, edits the singleton) */}
      <section style={sectionStyle}>
        <h2 className="serif" style={{ fontSize: 19 }}>Pricing &amp; tax</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Applied to invoices and shown to patients at booking.
        </p>
        <form action={updatePractice} className="form">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label>Tax rate (%)
              <input name="tax_rate" type="number" step="0.01" min="0" defaultValue={pricing.tax_rate ?? 0} />
            </label>
            <label>Tax label
              <input name="tax_label" defaultValue={pricing.tax_label ?? "Tax"} />
            </label>
            <label>Currency
              <select name="currency" defaultValue={pricing.currency ?? "USD"}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <button className="btn" type="submit">Save pricing</button>
        </form>
      </section>

      {/* Services + per-service pricing */}
      <section style={sectionStyle}>
        <h2 className="serif" style={{ fontSize: 19 }}>Services &amp; prices</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Set a standard price, an optional first-visit price, and whether tax applies.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
          {services.map((raw) => {
            const sv = raw as {
              id: string;
              name: string;
              category: string | null;
              price: number | null;
              first_visit_price: number | null;
              taxable: boolean | null;
            };
            return (
              <li key={sv.id} style={{ ...rowStyle, flexWrap: "wrap", gap: 10 }}>
                <div style={{ minWidth: 150, flex: 1 }}>
                  <b>{sv.name}</b>{" "}
                  <span className="muted">{sv.category}</span>
                </div>
                <form
                  action={updateService}
                  style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                >
                  <input type="hidden" name="id" value={sv.id} />
                  <label style={inlineField}>Price
                    <input name="price" type="number" step="0.01" min="0" defaultValue={sv.price ?? ""} style={priceInput} />
                  </label>
                  <label style={inlineField}>First visit
                    <input name="first_visit_price" type="number" step="0.01" min="0" defaultValue={sv.first_visit_price ?? ""} placeholder="—" style={priceInput} />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
                    <input name="taxable" type="checkbox" defaultChecked={sv.taxable ?? true} /> Taxable
                  </label>
                  <button className="btn" style={smallBtn} type="submit">Save</button>
                </form>
                <form action={deleteService}>
                  <input type="hidden" name="id" value={sv.id} />
                  <button type="submit" className="btn ghost" style={smallBtn}>Remove</button>
                </form>
              </li>
            );
          })}
        </ul>
        <form action={addService} className="form">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }}>
            <input name="name" placeholder="Service name" required />
            <input name="category" placeholder="Category" />
            <input name="price" type="number" step="0.01" placeholder="Price" />
            <input name="first_visit_price" type="number" step="0.01" placeholder="First visit" />
          </div>
          <input name="description" placeholder="Description" />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <input name="taxable" type="checkbox" defaultChecked /> Tax applies to this service
          </label>
          <button className="btn" type="submit">Add service</button>
        </form>
      </section>
    </div>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 10,
  marginBottom: 8,
} as const;

const smallBtn = { padding: "7px 11px", fontSize: 12.5 } as const;

const inlineField = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  fontSize: 11.5,
  color: "var(--muted)",
} as const;

const priceInput = { width: 84, padding: "6px 8px", fontSize: 13 } as const;
