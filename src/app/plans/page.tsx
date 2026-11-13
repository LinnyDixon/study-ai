import Link from "next/link";
import { publicPlans } from "@/lib/plans";
import { getSupportComposeUrl } from "@/lib/support";

export const metadata = { title: "Planes" };

export default function PlansPage() {
  return <main className="account-info-page plans-info-page"><div className="eyebrow">STUDY AI · PLANES</div><h1>Planes para estudiar</h1><p>Información de los planes disponibles en la aplicación.</p>
    <div className="account-plans-grid">{publicPlans.map(plan => <article className="panel account-info-card" key={plan.id}><div className="eyebrow">{plan.id === "free" ? "EMPIEZA GRATIS" : "PLAN"}</div><h2>{plan.name}</h2><p>{plan.description}</p><strong className="account-plan-price">{plan.monthly}</strong>{plan.id !== "free" && <small>{plan.annual}</small>}<ul><li>{plan.tokens}</li><li>{plan.images}</li>{plan.features.map(feature => <li key={feature}>{feature}</li>)}</ul>{plan.id !== "free" && <p className="profile-card-description">La compra y el cambio automático de plan todavía no están disponibles. Contacta con soporte para consultar la asignación manual.</p>}</article>)}</div>
    <p className="account-plan-disclaimer">Los límites descritos son informativos y aún no se aplican mediante contadores. El envío y la generación de imágenes no están implementados. Los precios no se cobran automáticamente.</p>
    <div className="account-info-footer"><Link href="/profile">Volver a Perfil y cuenta</Link><a href={getSupportComposeUrl("Consulta sobre planes · STUDY AI")} target="_blank" rel="noreferrer">Consultar con soporte</a></div>
  </main>;
}
