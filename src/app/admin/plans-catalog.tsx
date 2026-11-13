import { privatePlan, publicPlans } from "@/lib/plans";

export function PlansCatalog() {
  return <section className="admin-catalog">
    <div className="eyebrow">PRECIOS DE LANZAMIENTO · USD · LÍMITES DIARIOS</div>
    <h2>Planes para estudiar</h2>
    <p className="admin-intro">Precios de lanzamiento en dólares estadounidenses. Los límites diarios de tokens e imágenes se reinician cada día. Los precios son una propuesta y el cobro automático aún no está conectado.</p>
    <div className="admin-plan-cards">{publicPlans.map((plan) => <article className="admin-plan-card" key={plan.id}>
      <h3>{plan.name}</h3><p>{plan.description}</p>
      <strong>{plan.monthly}</strong>{plan.id !== "free" && <small>{plan.annual}</small>}
      <ul><li>{plan.tokens}</li><li>{plan.images}</li>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
    </article>)}</div>
    <article className="admin-plan-card admin-private-plan"><div className="eyebrow">PRIVADO · NO SE VENDE</div><h3>{privatePlan.name}</h3><p>{privatePlan.description}</p><ul>{privatePlan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></article>
    <p className="admin-footnote">Los límites diarios de tokens e imágenes describen los planes, pero todavía no se aplican mediante contadores. La creación y el envío de imágenes no están implementados.</p>
  </section>;
}
