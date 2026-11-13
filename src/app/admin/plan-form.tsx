"use client";

import { useMemo, useState } from "react";
import { privatePlan, publicPlans, type BillingPeriod, type PlanTier } from "@/lib/plans";
import { calculatePeriodEnd } from "@/lib/billing/period";

type PaymentStatus = "free" | "paid" | "comped" | "unpaid";

export function PlanForm({
  action,
  userId,
  email,
  plan: initialPlan,
  billingPeriod: initialBillingPeriod,
  paymentStatus: initialPaymentStatus,
  startsAt: initialStartsAt,
}: {
  action: (formData: FormData) => void | Promise<void>;
  userId: string;
  email: string;
  plan: PlanTier;
  billingPeriod: BillingPeriod;
  paymentStatus: PaymentStatus;
  startsAt: string;
}) {
  const [plan, setPlan] = useState<PlanTier>(initialPlan);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(initialBillingPeriod);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(initialPaymentStatus);
  const [startDate, setStartDate] = useState(initialStartsAt);
  const expiryDate = useMemo(() => calculateExpiry(plan, billingPeriod, startDate), [plan, billingPeriod, startDate]);

  function changePlan(nextPlan: PlanTier) {
    setPlan(nextPlan);
    if (nextPlan === "free") {
      setBillingPeriod("none");
      setPaymentStatus("free");
    } else if (nextPlan === "ld") {
      setBillingPeriod("none");
      setPaymentStatus("comped");
    } else {
      setBillingPeriod((current) => current === "none" ? "monthly" : current);
      setPaymentStatus((current) => current === "free" ? "paid" : current);
    }
  }

  return <form action={action} className="admin-plan-form">
    <input type="hidden" name="user_id" value={userId}/>
    <input type="hidden" name="billing_period" value={billingPeriod}/>
    <label className="sr-only" htmlFor={`period-${userId}`}>Vigencia de {email}</label>
    <select id={`period-${userId}`} value={billingPeriod} disabled={plan === "free" || plan === "ld"} onChange={(event) => setBillingPeriod(event.target.value as BillingPeriod)}><option value="none">Sin vencimiento</option><option value="monthly">Mensual</option><option value="annual">Anual · 2 meses gratis</option></select>
    <label className="sr-only" htmlFor={`plan-${userId}`}>Plan de {email}</label>
    <select id={`plan-${userId}`} name="plan" value={plan} onChange={(event) => changePlan(event.target.value as PlanTier)}>{publicPlans.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}<option value={privatePlan.id}>{privatePlan.name} · privado</option></select>
    <label className="sr-only" htmlFor={`payment-${userId}`}>Estado de pago de {email}</label>
    {plan === "free" || plan === "ld" ? <input type="hidden" name="payment_status" value={paymentStatus}/> : <select id={`payment-${userId}`} name="payment_status" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}><option value="paid">Pagó</option><option value="comped">Bonificado · se muestra como Dixon</option><option value="unpaid">Impago</option></select>}
    <label className="admin-date-field" htmlFor={`start-${userId}`}><span>Inicio</span><input id={`start-${userId}`} type="date" name="period_starts_at" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={plan === "free" || plan === "ld"}/></label>
    <button type="submit">Guardar</button>
    {plan === "ld" ? <small className="admin-expiry-preview" aria-live="polite">Acceso privado ilimitado · sin vencimiento</small> : plan !== "free" && <small className="admin-expiry-preview" aria-live="polite">{expiryDate ? `Vence: ${expiryDate}` : "Elige la fecha de inicio para calcular el vencimiento."}</small>}
  </form>;
}

function calculateExpiry(plan: PlanTier, period: BillingPeriod, startDate: string) {
  if ((plan !== "plus" && plan !== "pro") || period === "none" || !startDate) return "";
  const [year, month, day] = startDate.split("-").map(Number);
  const expiry = calculatePeriodEnd(new Date(Date.UTC(year, month - 1, day, 12)), period);
  return new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(expiry);
}
