import Link from "next/link";

export const metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return <main className="account-info-page"><div className="eyebrow">STUDY AI</div><h1>Política de privacidad</h1><p>Información sobre los datos que maneja esta versión de la aplicación.</p>
    <section className="panel account-info-card"><h2>Datos de cuenta</h2><p>La autenticación es gestionada por Supabase. El perfil puede incluir nombre, correo y foto. La aplicación guarda preferencias y un plan asociado a la cuenta. Las consultas del perfil se realizan con las políticas RLS de Supabase.</p>
      <h2>Materiales y conversaciones</h2><p>Las conversaciones de IA de usuarios autenticados pueden guardarse en la base de datos de STUDY AI. Las preferencias de estudio se guardan en la cuenta cuando Supabase está disponible; algunos datos también pueden permanecer en el almacenamiento local del navegador. Las respuestas de IA se envían al proveedor configurado por la aplicación (Ollama); sus prácticas de tratamiento dependen de la configuración y del proveedor usado.</p>
      <h2>Control y eliminación</h2><p>Desde Perfil y cuenta puedes descargar los datos asociados que esta aplicación puede consultar y solicitar la eliminación permanente de tu cuenta. Al eliminarla también se borran los datos vinculados en Supabase conforme a las relaciones configuradas. La exportación no incluye archivos que no estén asociados a esas tablas.</p>
      <h2>Medición y pagos</h2><p>Esta versión no registra métricas de consumo de IA, almacenamiento ni historial de pagos. No hay cobros automáticos conectados.</p>
      <h2>Contacto</h2><p>Para consultas de privacidad, escribe a <a href="mailto:ownersession2010@gmail.com">ownersession2010@gmail.com</a>.</p>
    </section><Link href="/profile">Volver a Perfil y cuenta</Link>
  </main>;
}
