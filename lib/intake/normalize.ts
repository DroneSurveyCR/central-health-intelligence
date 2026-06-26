/** Normalize a free-text/select sex answer to the DB enum. */
export function normalizeSex(input: unknown): "male" | "female" | "other" {
  const s = String(input ?? "").trim().toLowerCase();
  if (s.startsWith("m")) return "male";
  if (s.startsWith("f")) return "female";
  return "other";
}
