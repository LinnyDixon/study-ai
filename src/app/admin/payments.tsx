type Payment = {
  id: string; user_id: string; provider: "paypal" | "mercadopago"; plan: string; billing_period: string;
  status: string; original_currency: "USD" | "UYU"; original_amount_minor: number;
  provider_fee_minor: number | null; provider_fee_currency: string | null; net_amount_minor: number | null; net_currency: string | null;
  provider_status: string | null; paid_at: string | null; created_at: string;
};
type Payout = {
  id: string; provider: string; currency: "USD" | "UYU"; gross_amount_minor: number;
  fee_amount_minor: number | null; net_amount_minor: number; status: string;
  destination_label: string | null; settled_at: string | null; created_at: string;
};
type Subscription = {
  id: string; user_id: string; provider: string; plan: string; billing_period: string;
  status: string; currency: string; amount_minor: number; current_period_ends_at: string | null; created_at: string;
};

const money = (minor: number, currency: string) => new Intl.NumberFormat("es-UY", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);
const date = (value: string | null) => value ? new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) : "—";
const label = (value: string) => ({ paypal: "PayPal", mercadopago: "Mercado Pago", plus: "Study Plus", pro: "Study Pro", monthly: "Mensual", annual: "Anual", approved: "Aprobado", pending: "Pendiente", rejected: "Rechazado", created: "Creado", paid: "Depositado", active: "Activa", trialing: "En prueba", past_due: "Pago atrasado", cancelled: "Cancelada", expired: "Vencida", failed: "Fallida", reversed: "Revertida" }[value] || value);

export function AdminPayments({ payments, payouts, subscriptions, emails }: { payments: Payment[]; payouts: Payout[]; subscriptions: Subscription[]; emails: Record<string, string> }) {
  const approved = payments.filter((payment) => payment.status === "approved");
  const active = subscriptions.filter((subscription) => subscription.status === "active" || subscription.status === "trialing").length;
  const uniqueBuyers = new Set(approved.map((payment) => payment.user_id)).size;
  const sumOriginal = (currency: "USD" | "UYU") => approved.filter((payment) => payment.original_currency === currency).reduce((total, payment) => total + payment.original_amount_minor, 0);
  const paidOut = (currency: "USD" | "UYU") => payouts.filter((payout) => payout.currency === currency && payout.status === "paid").reduce((total, payout) => total + payout.net_amount_minor, 0);
  const fees = (currency: "USD" | "UYU") => approved.filter((payment) => payment.provider_fee_currency === currency).reduce((total, payment) => total + (payment.provider_fee_minor || 0), 0);
  return <section className="admin-catalog">
    <p className="admin-intro">Los pagos aprobados son cobros confirmados por el proveedor. Solo el registro de liquidación del proveedor acredita el dinero transferido; este panel no supone que haya llegado a BROU.</p>
    <div className="admin-summary">
      <div><strong>{active}</strong><span>suscripciones activas o en prueba</span></div>
      <div><strong>{uniqueBuyers}</strong><span>usuarios con pagos aprobados</span></div>
      <div><strong>{money(sumOriginal("USD"), "USD")}</strong><span>cobrado en USD (bruto)</span></div>
      <div><strong>{money(sumOriginal("UYU"), "UYU")}</strong><span>cobrado en UYU (bruto)</span></div>
      <div><strong>{money(paidOut("UYU"), "UYU")}</strong><span>liquidado en UYU según reportes</span></div>
      <div><strong>{money(fees("USD"), "USD")} / {money(fees("UYU"), "UYU")}</strong><span>comisiones informadas por pago</span></div>
    </div>
    <h2>Historial de pagos</h2>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Proveedor</th><th>Plan</th><th>Importe cobrado</th><th>Estado / comisión / neto</th></tr></thead><tbody>
      {payments.map((payment) => <tr key={payment.id}><td data-label="Fecha">{date(payment.paid_at || payment.created_at)}</td><td data-label="Usuario">{emails[payment.user_id] || <code>{payment.user_id.slice(0, 8)}…</code>}</td><td data-label="Proveedor">{label(payment.provider)}</td><td data-label="Plan">{label(payment.plan)} · {label(payment.billing_period)}</td><td data-label="Cobrado">{money(payment.original_amount_minor, payment.original_currency)}</td><td data-label="Estado">{label(payment.status)}{payment.provider_fee_minor !== null && <small>Comisión: {money(payment.provider_fee_minor, payment.provider_fee_currency || payment.original_currency)}</small>}{payment.net_amount_minor !== null && <small>Neto informado: {money(payment.net_amount_minor, payment.net_currency || payment.original_currency)}</small>}</td></tr>)}
      {payments.length === 0 && <tr><td colSpan={6} className="admin-empty">Todavía no hay pagos registrados por los proveedores.</td></tr>}
    </tbody></table></div>
    <h2>Liquidaciones registradas</h2>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Fecha</th><th>Proveedor</th><th>Bruto</th><th>Comisión</th><th>Neto</th><th>Estado / destino informado</th></tr></thead><tbody>
      {payouts.map((payout) => <tr key={payout.id}><td data-label="Fecha">{date(payout.settled_at || payout.created_at)}</td><td data-label="Proveedor">{label(payout.provider)}</td><td data-label="Bruto">{money(payout.gross_amount_minor, payout.currency)}</td><td data-label="Comisión">{payout.fee_amount_minor === null ? "No informado" : money(payout.fee_amount_minor, payout.currency)}</td><td data-label="Neto">{money(payout.net_amount_minor, payout.currency)}</td><td data-label="Estado">{label(payout.status)}<small>{payout.destination_label || "Destino no documentado"}</small></td></tr>)}
      {payouts.length === 0 && <tr><td colSpan={6} className="admin-empty">No hay liquidaciones importadas. Los cobros no se cuentan como depósitos.</td></tr>}
    </tbody></table></div>
    <p className="admin-footnote">Las comisiones de cobros en monedas distintas se muestran por separado. Los importes netos y liquidaciones aparecen únicamente cuando el proveedor los devuelve o se importa su reporte.</p>
  </section>;
}
