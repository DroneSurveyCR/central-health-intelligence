export type DeviceType = "inbody" | "tanita" | "generic";

export function detectDevice(header: string): DeviceType {
  const h = header.toLowerCase();
  if (h.includes("inbody")) return "inbody";
  if (h.includes("tanita")) return "tanita";
  return "generic";
}
