export type MembershipPlan = {
  key: string;
  name: string;
  priceMonthly: number;
  blurb: string;
  features: string[];
  highlighted?: boolean;
};

/**
 * Recurring-care membership tiers for Dr. Randi's functional-medicine practice.
 * These complement one-off bookings — patients on a membership get scans,
 * therapy credits, and priority access bundled at a monthly rate.
 *
 * No payment processing here: the page collects interest and the team follows up.
 */
export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    key: "essentials",
    name: "Essentials",
    priceMonthly: 79,
    blurb: "Stay on track between visits with regular scans and your living plan.",
    features: [
      "2 body composition scans per year",
      "Personalized 90-day plan, kept current",
      "Full mobile app access & progress tracking",
      "Secure messaging with the care team",
    ],
  },
  {
    key: "transformation",
    name: "Transformation",
    priceMonthly: 199,
    highlighted: true,
    blurb: "Our most popular path — monthly scans, therapy credits, and priority care.",
    features: [
      "Monthly body composition scan",
      "EBOO therapy credits each quarter",
      "Priority booking for consults & follow-ups",
      "15% supplement & dispensary discount",
      "Quarterly plan review with Dr. Randi",
    ],
  },
  {
    key: "concierge",
    name: "Concierge",
    priceMonthly: 499,
    blurb: "White-glove, high-touch care with direct access and every therapy included.",
    features: [
      "Weekly check-ins & coaching support",
      "All in-clinic therapies included",
      "Direct line to Dr. Randi",
      "25% supplement & dispensary discount",
      "Same-week appointment guarantee",
    ],
  },
];
