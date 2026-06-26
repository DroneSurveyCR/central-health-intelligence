import Stripe from "stripe";

// Server-only Stripe client. Returns null when not configured so the app degrades gracefully.
const key = process.env.STRIPE_SECRET_KEY;
export const stripe = key ? new Stripe(key) : null;

export function getStripe(): Stripe {
  if (!stripe) throw new Error("STRIPE_SECRET_KEY is not configured");
  return stripe;
}

export const stripeEnabled = Boolean(key);
