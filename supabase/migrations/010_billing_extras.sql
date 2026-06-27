-- 010_billing_extras.sql — SaaS billing extras.
-- One-time HIPAA setup fee: records when the practice paid its setup fee (a one-off
-- Stripe Checkout in payment mode, separate from the recurring plan subscription).
-- NULL = unpaid. Set by the Stripe webhook on checkout.session.completed when the
-- session metadata.kind === "setup_fee".
alter table public.practices add column if not exists setup_fee_paid_at timestamptz;
