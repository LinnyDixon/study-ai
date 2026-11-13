export type PlanTier = "free" | "plus" | "pro" | "ld";
export type BillingPeriod = "none" | "monthly" | "annual";

export const publicPlans = [
  {
    id: "free",
    name: "Gratis",
    description: "Para empezar a estudiar y conocer la aplicación.",
    tokens: "40.000 tokens al día",
    images: "8 imágenes creadas y 8 enviadas al día",
    features: ["Funciones de estudio excepto Lector de textos, Libreta e IA Libre"],
    monthly: "US$ 0",
    annual: "US$ 0",
  },
  {
    id: "plus",
    name: "Study Plus",
    description: "Más espacio para estudiar con IA.",
    tokens: "64.000 tokens al día · 60 % más que Gratis",
    images: "14 imágenes creadas y 14 enviadas al día",
    features: ["Incluye Libreta e IA Libre", "Primer mes gratis; luego US$ 10,99 al mes", "US$ 109,90 al año · 12 meses al precio de 10"],
    monthly: "US$ 10,99 al mes",
    annual: "US$ 109,90 al año",
  },
  {
    id: "pro",
    name: "Study Pro",
    description: "Para quienes también necesitan trabajar con textos extensos.",
    tokens: "79.600 tokens al día · 99 % más que Gratis",
    images: "24 imágenes creadas y 24 enviadas al día",
    features: ["Incluye Libreta, IA Libre y Lector de textos", "Primer mes gratis; luego US$ 19,99 al mes", "US$ 199,90 al año · 12 meses al precio de 10"],
    monthly: "US$ 19,99 al mes",
    annual: "US$ 199,90 al año",
  },
] as const;

export const privatePlan = {
  id: "ld",
  name: "L.D.",
  description: "Plan privado, asignado únicamente por la administración.",
  features: ["Acceso ilimitado a las funciones, tokens e imágenes", "No aparece como opción de compra"],
} as const;

export function getPlanName(plan: PlanTier | "monthly" | "annual" | "dixon", paymentStatus: string, expiresAt: string | null, now = Date.now()) {
  if (plan === "free") return "Gratis";
  if (paymentStatus !== "paid" && paymentStatus !== "comped") return "Gratis";
  if (plan === "ld" || plan === "dixon") return !expiresAt || new Date(expiresAt).getTime() > now ? "L.D." : "Gratis";
  if (!expiresAt || new Date(expiresAt).getTime() <= now) return "Gratis";
  if (paymentStatus === "comped") return "L.D.";
  return plan === "plus" || plan === "monthly" || plan === "annual" ? "Study Plus" : "Study Pro";
}
