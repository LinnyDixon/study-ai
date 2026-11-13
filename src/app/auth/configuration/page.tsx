import Link from "next/link";

export default function AuthConfigurationPage() {
  return <main className="auth-page"><section className="auth-card auth-config-card">
    <Link className="auth-brand" href="/"><span className="brand-mark">s</span><span>study<span className="brand-ai">.ai</span></span></Link>
    <div className="auth-eyebrow">CONFIGURACIÓN PENDIENTE</div><h1>Conecta tu proyecto Supabase</h1>
    <p className="auth-subtitle">La autenticación está preparada, pero esta instalación todavía no tiene las credenciales públicas de un proyecto Supabase.</p>
    <ol><li>Crea un proyecto en Supabase y copia su URL y publishable key.</li><li>Completa <code>.env.local</code> en la carpeta del proyecto con esos dos valores.</li><li>Ejecuta, en orden, las migraciones <code>202611110001_profiles_preferences.sql</code>, <code>202611120001_admin_and_manual_plans.sql</code>, <code>202611120002_plan_catalog.sql</code>, <code>202611120003_private_ld_and_annual_bonus.sql</code> y <code>202611130001_profile_account_settings.sql</code> en el SQL Editor.</li><li>Reinicia el servidor, crea tu cuenta desde STUDY AI y confirma el correo si te lo solicita.</li><li>Vuelve al SQL Editor y ejecuta la consulta de abajo reemplazando <code>YOUR_EMAIL_HERE</code> por el correo de tu cuenta. Esto te da acceso a la página privada de administración.</li></ol>
    <pre className="auth-sql-snippet">{`insert into public.study_admins (user_id)\nselect id from auth.users where lower(email) = lower('YOUR_EMAIL_HERE')\non conflict (user_id) do nothing;`}</pre>
    <p className="auth-config-note">Desde administración podrás asignar Gratis, Study Plus, Study Pro o L.D. Los VIP bonificados de Study Plus o Study Pro se muestran como L.D. Los pagos son manuales por ahora; los límites diarios de tokens e imágenes todavía no se aplican automáticamente. Google es opcional; para activarlo hacen falta credenciales OAuth de Google Cloud.</p>
    <p className="auth-config-note">No pegues claves en el chat. La publishable key está diseñada para usarse en el navegador con RLS; nunca agregues una secret/service_role key a variables <code>NEXT_PUBLIC_*</code>.</p>
    <Link className="auth-submit auth-config-link" href="/auth/sign-in">Volver al inicio de sesión</Link>
  </section></main>;
}
