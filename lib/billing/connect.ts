// Stripe Connect (Standard) — each CLINIC connects their OWN existing Stripe so
// patient payments land in the clinic's account, never the platform's. Activates
// when STRIPE_CONNECT_CLIENT_ID (the platform's Connect app id, ca_…) is set.

const CLIENT_ID = process.env.STRIPE_CONNECT_CLIENT_ID || "";

export function connectEnabled(): boolean {
  return Boolean(CLIENT_ID);
}

/** Platform's application fee on patient charges, in basis points (default 0%). */
export function applicationFeeBps(): number {
  const n = Number(process.env.STRIPE_APPLICATION_FEE_BPS || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function connectAuthorizeUrl(state: string, redirectUri: string): string {
  return `https://connect.stripe.com/oauth/authorize?${new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: "read_write",
    redirect_uri: redirectUri,
    state,
  })}`;
}

/** Exchange the OAuth code for the connected account id (stripe_user_id). */
export async function exchangeConnectCode(code: string): Promise<{ stripe_user_id: string }> {
  const res = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_secret: process.env.STRIPE_SECRET_KEY || "",
      grant_type: "authorization_code",
      code,
    }),
  });
  const j = (await res.json()) as { stripe_user_id?: string; error_description?: string };
  if (!res.ok || !j.stripe_user_id) throw new Error(j.error_description || "connect oauth failed");
  return { stripe_user_id: j.stripe_user_id };
}

/** Revoke the platform's access to a connected account. */
export async function deauthorizeConnect(accountId: string): Promise<void> {
  await fetch("https://connect.stripe.com/oauth/deauthorize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY || ""}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ client_id: CLIENT_ID, stripe_user_id: accountId }),
  });
}
