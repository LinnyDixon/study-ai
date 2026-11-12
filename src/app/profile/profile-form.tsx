import { signOut, updateProfile } from "./actions";
import Link from "next/link";

export function ProfileForm({ displayName, email, isAdmin, saved, error }: {
  displayName: string; email: string; isAdmin?: boolean; saved: boolean; error?: string;
}) {
  return <div className="profile-settings-grid">
    <section className="panel profile-settings-card">
      <div className="profile-identity"><div className="avatar profile-avatar">{(displayName || email || "E").slice(0, 1).toUpperCase()}</div><div><strong>{displayName || "Estudiante"}</strong><small>{email}</small></div></div>
      <form action={updateProfile} className="profile-form">
        <label htmlFor="display_name">Nombre para mostrar</label>
        <input id="display_name" name="display_name" defaultValue={displayName} maxLength={80} required placeholder="Tu nombre"/>
        <small>Este nombre aparece en tu espacio de estudio.</small>
        {saved && <p className="profile-status success" role="status">Cambios guardados.</p>}
        {error === "name" && <p className="profile-status" role="alert">El nombre debe tener entre 1 y 80 caracteres.</p>}
        {error === "save" && <p className="profile-status" role="alert">No se pudo guardar. Comprueba que ejecutaste la migración de la base de datos.</p>}
        <button className="primary-button profile-save">Guardar cambios</button>
      </form>
    </section>
    <section className="panel profile-security-card"><div className="eyebrow">CUENTA</div><h2>Acceso y privacidad</h2><p>Tu perfil se guarda en tu proyecto Supabase. Las políticas RLS limitan la lectura y edición a tu propio usuario.</p>{isAdmin && <Link className="admin-profile-link" href="/admin">Administrar cuentas y planes →</Link>}<form action={signOut}><button className="signout-button">Cerrar sesión</button></form></section>
  </div>;
}
