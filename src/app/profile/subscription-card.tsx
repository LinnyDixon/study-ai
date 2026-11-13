import Link from "next/link";
import { useAppLocale } from "@/components/app-locale";
import { translateUi } from "@/lib/ui-translation";

function formatDate(value: string | null, language: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function SubscriptionCard({ planName, paymentStatus, endsAt }: {
  planName: string | null; paymentStatus: string | null; endsAt: string | null;
}) {
  const { language } = useAppLocale();
  const t = (text: string) => translateUi(language, text);
  const statusLabel = t(paymentStatus === "paid" ? "Pago registrado" : paymentStatus === "comped" ? "Bonificado" : paymentStatus === "unpaid" ? "Impago" : paymentStatus === "free" ? "Plan gratuito" : "Estado no disponible");
  const statusTone = paymentStatus === "paid" || paymentStatus === "comped" || paymentStatus === "free" ? "is-current" : paymentStatus === "unpaid" ? "is-action-needed" : "is-unknown";
  const endDate = formatDate(endsAt, language);
  return <section className="panel profile-card profile-subscription-card">
    <div className="profile-card-heading"><div><div className="eyebrow">{t("TU SUSCRIPCIÓN")}</div><h2>{t("Plan y uso")}</h2></div><span className="profile-card-icon">✧</span></div>
    <div className="profile-current-plan"><div><span>{t("Plan actual")}</span><strong>{planName || t("No disponible")}</strong></div><span className={`profile-plan-status ${statusTone}`}><i/>{statusLabel}</span>{endDate && <small className="profile-plan-renewal">{t("Acceso vigente hasta")} <b>{endDate}</b></small>}</div>
    <div className="profile-plan-details" aria-label={language === "en" ? "Account usage" : "Uso de la cuenta"}>
      <div><span>{t("Tokens consumidos")}</span><strong>{t("No disponible")}</strong></div>
      <div><span>{t("Tokens restantes")}</span><strong>{t("No disponible")}</strong></div>
      <div><span>{t("Imágenes creadas")}</span><strong>{t("No disponible")}</strong></div>
      <div><span>{t("Imágenes enviadas")}</span><strong>{t("No disponible")}</strong></div>
      <div><span>{t("Consumo de IA")}</span><strong>{t("No disponible")}</strong></div>
      <div><span>{t("Almacenamiento utilizado")}</span><strong>{t("No disponible")}</strong></div>
    </div>
    <div className="profile-payment-note"><span className="profile-payment-icon" aria-hidden="true">$</span><p><b>{t("Pagos e historial")}</b><small>{t("No hay historial de pagos disponible. La app todavía no procesa cobros automáticos.")}</small></p></div>
    <div className="profile-plan-actions"><Link className="profile-small-button profile-admin-plan-button" href="/plans"><span>{t("Ver planes y opciones de pago")}</span><b>→</b></Link></div>
  </section>;
}
