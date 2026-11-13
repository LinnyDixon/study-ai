import Link from "next/link";
import { getSupportComposeUrl } from "@/lib/support";

export const metadata = { title: "Centro de ayuda" };

export default function HelpPage() {
  return <main className="account-info-page"><div className="eyebrow">STUDY AI · SOPORTE</div><h1>Centro de ayuda</h1><p>Respuestas para administrar tu cuenta y usar tu espacio de estudio.</p>
    <section className="panel account-info-card"><h2>Preguntas frecuentes</h2>
      <details><summary>¿Cómo cambio mi nombre o foto?</summary><p>Abre Perfil y cuenta. Puedes guardar un nombre y subir o quitar una foto desde Información personal.</p></details>
      <details><summary>¿Puedo recuperar mi contraseña?</summary><p>Usa “¿Olvidaste tu contraseña?” en el inicio de sesión. Si ya ingresaste, puedes cambiarla desde Seguridad.</p></details>
      <details><summary>¿Cómo funciona el plan?</summary><p>El plan actual se muestra en Perfil y cuenta. Los pagos automáticos, las métricas de consumo y los límites anunciados todavía no están conectados.</p></details>
      <details><summary>¿Dónde se guardan mis materiales?</summary><p>Las conversaciones y preferencias asociadas a tu cuenta se guardan en Supabase con acceso limitado a tu usuario. Algunos materiales de estudio se guardan localmente en este dispositivo.</p></details>
      <details><summary>¿Puedo ver mis sesiones en otros dispositivos?</summary><p>La aplicación no puede mostrar una lista de dispositivos conectados. Puedes cerrar las sesiones de tu cuenta desde Perfil y cuenta.</p></details>
    </section>
    <section className="panel account-info-card"><h2>Contactar con soporte</h2><p>Escríbenos y describe qué estabas haciendo y qué mensaje apareció.</p><a className="primary-button" href={getSupportComposeUrl()} target="_blank" rel="noreferrer">Enviar correo a soporte</a></section>
    <nav className="account-info-footer"><Link href="/profile">Volver a Perfil y cuenta</Link><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link></nav>
  </main>;
}
