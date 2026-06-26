// Default consent agreement templates shown to patients.
//
// `key` MUST be one of the values allowed by the agreements.type CHECK
// constraint in supabase/migration_004_scheduling_visits.sql:
//   ('recording','ai_use','privacy','consent')
// We persist `key` into agreements.type. `title` is rendered in the UI and is
// also stored into agreements.document_ref so staff can see what was signed.

export type AgreementType = "recording" | "ai_use" | "privacy" | "consent";

export type AgreementTemplate = {
  key: AgreementType;
  title: string;
  body: string;
};

export const AGREEMENT_TEMPLATES: AgreementTemplate[] = [
  {
    key: "consent",
    title: "Informed Consent",
    body:
      "I consent to receive functional and integrative health care from Casa Elev8 and Dr. Randi. I understand that recommendations, scans, and wellness plans are intended to support my health and are not a substitute for emergency or acute medical care. I have had the opportunity to ask questions, and I understand that I may decline any part of a recommended plan at any time.\n\nI confirm that the health information I provide is accurate to the best of my knowledge, and I will update the practice if my circumstances change. I understand that no specific outcome has been promised or guaranteed.",
  },
  {
    key: "privacy",
    title: "Privacy & Data Use",
    body:
      "I understand that Casa Elev8 collects and stores my personal and health information to provide care, schedule appointments, and maintain my records. My information is kept confidential and protected, and access is limited to my care team on a need-to-know basis.\n\nI consent to the secure use of my data within HealthSync for the purposes of treatment, coordination, and practice administration. My information will not be sold, and it will not be shared with third parties except as required to deliver my care or as required by law.",
  },
  {
    key: "recording",
    title: "Telehealth Consent",
    body:
      "I consent to receive care through telehealth, including video and audio consultations conducted over a secure connection. I understand that telehealth has the same goals as an in-person visit but that some assessments cannot be performed remotely, and that my practitioner may recommend an in-person visit when appropriate.\n\nI understand that sessions are not recorded without my explicit, separate permission, and that the same privacy protections apply to telehealth as to in-person care. I confirm that I am located in a private setting suitable for discussing my health.",
  },
];
