import Link from "next/link";

export const metadata = { title: "Términos de uso" };

export default function TermsPage() {
  return <main className="account-info-page"><div className="eyebrow">STUDY AI</div><h1>Términos de uso</h1><p>Condiciones informativas para usar esta versión de la aplicación.</p>
    <section className="panel account-info-card"><h2>Uso del servicio</h2><p>STUDY AI ofrece herramientas de apoyo al estudio. El contenido generado por IA puede contener errores; verifica la información importante con tus materiales y fuentes confiables.</p>
      <h2>Cuenta y seguridad</h2><p>Eres responsable de mantener segura tu cuenta y de usarla de forma lícita. No compartas credenciales ni subas información que no tengas derecho a utilizar.</p>
      <h2>Planes y disponibilidad</h2><p>Los planes mostrados son informativos. En esta versión no se procesan pagos automáticos y los límites descritos aún no se aplican mediante contadores. El servicio puede cambiar mientras continúa su desarrollo.</p>
      <h2>Eliminación de cuenta</h2><p>Puedes solicitar la eliminación desde Perfil y cuenta. La eliminación es permanente para los datos de cuenta gestionados por esta aplicación.</p>
      <h2>Contacto</h2><p>Consultas: <a href="mailto:ownersession2010@gmail.com">ownersession2010@gmail.com</a>.</p>
    </section><Link href="/profile">Volver a Perfil y cuenta</Link>
  </main>;
}
