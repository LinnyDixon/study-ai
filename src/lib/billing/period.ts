import type { BillingPeriod } from "@/lib/plans";

/** Computes the access expiration date from the selected start date. */
export function calculatePeriodEnd(startsAt: Date, period: Extract<BillingPeriod, "monthly" | "annual">): Date {
  const result = new Date(startsAt);
  const day = result.getUTCDate();
  const monthsToAdd = period === "monthly" ? 1 : 12;
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + monthsToAdd);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  result.setUTCHours(23, 59, 59, 999);
  return result;
}
