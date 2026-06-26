// Reminder email content. STRICTLY no PHI — time + location + "log in to view" only.

export function reminderEmail(opts: {
  practiceName: string;
  whenText: string;
  locationText: string;
  appUrl: string;
}) {
  const subject = `Reminder: your appointment with ${opts.practiceName}`;
  const text = [
    `This is a reminder of your upcoming appointment with ${opts.practiceName}.`,
    ``,
    `When: ${opts.whenText}`,
    opts.locationText ? `Where: ${opts.locationText}` : ``,
    ``,
    `Log in to view the details: ${opts.appUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, text };
}

// Invoice-issued notification. STRICTLY no PHI — no amounts or line items, just a portal link.
export function invoiceEmail(opts: { practiceName: string; appUrl: string }) {
  const subject = `New invoice from ${opts.practiceName}`;
  const text = [
    `${opts.practiceName} has issued you a new invoice.`,
    ``,
    `Log in to view and pay it: ${opts.appUrl.replace(/\/$/, "")}/billing`,
  ].join("\n");
  return { subject, text };
}
