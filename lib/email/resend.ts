import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

/**
 * Send a reminder email. NO PHI in subject/body (enforced by templates.ts).
 * Returns { id, skipped }; skipped=true when no RESEND_API_KEY is configured (dev).
 */
export async function sendReminderEmail(
  to: string,
  subject: string,
  text: string,
): Promise<{ id: string | null; skipped: boolean }> {
  const resend = getResend();
  if (!resend) return { id: null, skipped: true };
  const from = process.env.RESEND_FROM || "Central Health Intelligence <onboarding@resend.dev>";
  const { data, error } = await resend.emails.send({ from, to, subject, text });
  if (error) throw new Error(error.message);
  return { id: data?.id ?? null, skipped: false };
}
