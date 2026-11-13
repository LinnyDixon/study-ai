"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppLocale } from "@/components/app-locale";
import type { AppLanguage } from "@/lib/app-languages";

type Props = { mode: "sign-in" | "sign-up"; nextPath?: string; isSupabaseConfigured: boolean };

const authCopy: Record<AppLanguage, Record<string, string>> = {
  es: { eyebrow: "TU ESPACIO PARA APRENDER", signup: "Crea tu cuenta", greeting: "Qué bueno verte", signupSubtitle: "Guarda tu progreso y accede a tus materiales en tus dispositivos.", loginSubtitle: "Inicia sesión para entrar a tu espacio de estudio.", google: "Continuar con Google", divider: "o con tu correo", name: "Nombre para mostrar", yourName: "Tu nombre", email: "Correo electrónico", password: "Contraseña", passwordHint: "Al menos 8 caracteres", forgot: "¿Olvidaste tu contraseña?", wait: "Un momento…", create: "Crear cuenta", login: "Iniciar sesión", unconfigured: "El acceso con cuentas todavía no está conectado.", setup: "Ver cómo prepararlo", already: "¿Ya tienes cuenta?", first: "¿Primera vez aquí?", personal: "Tu cuenta y tus datos son personales.", signupSent: "Te enviamos un correo para confirmar tu cuenta. Revisa también la carpeta de spam.", googleDisabled: "Google todavía no está habilitado en Supabase. Por ahora, inicia sesión con tu correo y contraseña." },
  en: { eyebrow: "YOUR SPACE TO LEARN", signup: "Create your account", greeting: "Welcome back", signupSubtitle: "Save your progress and access your materials across devices.", loginSubtitle: "Sign in to enter your study space.", google: "Continue with Google", divider: "or with email", name: "Display name", yourName: "Your name", email: "Email address", password: "Password", passwordHint: "At least 8 characters", forgot: "Forgot your password?", wait: "Please wait…", create: "Create account", login: "Sign in", unconfigured: "Account access is not connected yet.", setup: "See how to set it up", already: "Already have an account?", first: "First time here?", personal: "Your account and data are personal.", signupSent: "We sent you an email to confirm your account. Check your spam folder too.", googleDisabled: "Google is not enabled in Supabase yet. For now, sign in with your email and password." },
  "pt-BR": { eyebrow: "SEU ESPAÇO PARA APRENDER", signup: "Crie sua conta", greeting: "Que bom ver você", signupSubtitle: "Salve seu progresso e acesse seus materiais em todos os dispositivos.", loginSubtitle: "Entre para acessar seu espaço de estudos.", google: "Continuar com Google", divider: "ou com seu e-mail", name: "Nome de exibição", yourName: "Seu nome", email: "E-mail", password: "Senha", passwordHint: "Pelo menos 8 caracteres", forgot: "Esqueceu a senha?", wait: "Aguarde…", create: "Criar conta", login: "Entrar", unconfigured: "O acesso por conta ainda não está conectado.", setup: "Veja como configurar", already: "Já tem uma conta?", first: "Primeira vez aqui?", personal: "Sua conta e seus dados são pessoais.", signupSent: "Enviamos um e-mail para confirmar sua conta. Verifique também o spam.", googleDisabled: "O Google ainda não está habilitado no Supabase. Por enquanto, entre com seu e-mail e senha." },
  fr: { eyebrow: "VOTRE ESPACE POUR APPRENDRE", signup: "Créer votre compte", greeting: "Ravi de vous revoir", signupSubtitle: "Enregistrez votre progression et accédez à vos documents sur vos appareils.", loginSubtitle: "Connectez-vous à votre espace d’étude.", google: "Continuer avec Google", divider: "ou avec votre e-mail", name: "Nom affiché", yourName: "Votre nom", email: "Adresse e-mail", password: "Mot de passe", passwordHint: "Au moins 8 caractères", forgot: "Mot de passe oublié ?", wait: "Patientez…", create: "Créer un compte", login: "Se connecter", unconfigured: "La connexion aux comptes n’est pas encore configurée.", setup: "Voir comment la configurer", already: "Vous avez déjà un compte ?", first: "Première visite ?", personal: "Votre compte et vos données sont personnels.", signupSent: "Nous vous avons envoyé un e-mail de confirmation. Vérifiez aussi les courriers indésirables.", googleDisabled: "Google n’est pas encore activé dans Supabase. Connectez-vous avec votre e-mail et votre mot de passe." },
  de: { eyebrow: "DEIN LERNBEREICH", signup: "Konto erstellen", greeting: "Schön, dich zu sehen", signupSubtitle: "Speichere deinen Fortschritt und greife auf allen Geräten auf deine Materialien zu.", loginSubtitle: "Melde dich an, um deinen Lernbereich zu öffnen.", google: "Weiter mit Google", divider: "oder mit E-Mail", name: "Anzeigename", yourName: "Dein Name", email: "E-Mail-Adresse", password: "Passwort", passwordHint: "Mindestens 8 Zeichen", forgot: "Passwort vergessen?", wait: "Einen Moment…", create: "Konto erstellen", login: "Anmelden", unconfigured: "Der Kontozugang ist noch nicht verbunden.", setup: "Einrichtung anzeigen", already: "Du hast schon ein Konto?", first: "Zum ersten Mal hier?", personal: "Dein Konto und deine Daten sind persönlich.", signupSent: "Wir haben dir eine Bestätigungs-E-Mail gesendet. Prüfe auch den Spamordner.", googleDisabled: "Google ist in Supabase noch nicht aktiviert. Melde dich vorerst mit E-Mail und Passwort an." },
  "zh-CN": { eyebrow: "你的学习空间", signup: "创建账户", greeting: "欢迎回来", signupSubtitle: "保存学习进度，并在不同设备上访问资料。", loginSubtitle: "登录以进入学习空间。", google: "使用 Google 继续", divider: "或使用电子邮件", name: "显示名称", yourName: "你的姓名", email: "电子邮件", password: "密码", passwordHint: "至少 8 个字符", forgot: "忘记密码？", wait: "请稍候…", create: "创建账户", login: "登录", unconfigured: "账户登录尚未连接。", setup: "查看设置方法", already: "已有账户？", first: "第一次使用？", personal: "账户和数据仅属于你个人。", signupSent: "我们已发送账户确认邮件。请同时检查垃圾邮件文件夹。", googleDisabled: "Supabase 尚未启用 Google 登录。请暂时使用电子邮件和密码登录。" },
  ja: { eyebrow: "あなたの学習スペース", signup: "アカウントを作成", greeting: "おかえりなさい", signupSubtitle: "学習の進捗を保存し、複数の端末から教材にアクセスできます。", loginSubtitle: "ログインして学習スペースに入ります。", google: "Google で続行", divider: "またはメールアドレスで", name: "表示名", yourName: "名前", email: "メールアドレス", password: "パスワード", passwordHint: "8文字以上", forgot: "パスワードをお忘れですか？", wait: "お待ちください…", create: "アカウントを作成", login: "ログイン", unconfigured: "アカウントログインはまだ接続されていません。", setup: "設定方法を見る", already: "アカウントをお持ちですか？", first: "初めてですか？", personal: "アカウントとデータは個人のものです。", signupSent: "確認メールを送信しました。迷惑メールフォルダーもご確認ください。", googleDisabled: "Supabase で Google がまだ有効になっていません。メールアドレスとパスワードでログインしてください。" },
};

export function AuthForm({ mode, nextPath = "/app", isSupabaseConfigured }: Props) {
  const { language } = useAppLocale();
  const c = authCopy[language];
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const isSignUp = mode === "sign-up";

  async function submit(formData: FormData) {
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");
      if (isSignUp) {
        const name = String(formData.get("name") || "").trim();
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
        });
        if (error) throw error;
        if (!data.session) setMessage(c.signupSent);
        else window.location.assign(nextPath);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign(nextPath);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar el acceso. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
      });
      if (error) throw error;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      setMessage(errorMessage.toLowerCase().includes("provider is not enabled")
        ? c.googleDisabled
        : errorMessage || "No se pudo iniciar sesión con Google.");
      setBusy(false);
    }
  }

  return <div className="auth-card">
    <Link className="auth-brand" href="/" aria-label="STUDY AI, inicio"><span className="brand-mark">s</span><span>study<span className="brand-ai">.ai</span></span></Link>
    <div className="auth-eyebrow">{c.eyebrow}</div>
    <h1>{isSignUp ? c.signup : c.greeting}</h1>
    <p className="auth-subtitle">{isSignUp ? c.signupSubtitle : c.loginSubtitle}</p>
    <button type="button" className="google-button" onClick={signInWithGoogle} disabled={busy || !isSupabaseConfigured}><span className="google-g">G</span> {c.google}</button>
    <div className="auth-divider"><span>{c.divider}</span></div>
    <form action={submit} className="auth-fields">
      {isSignUp && <label>{c.name}<input name="name" autoComplete="name" maxLength={80} required placeholder={c.yourName}/></label>}
      <label>{c.email}<input name="email" type="email" autoComplete="email" required placeholder="name@example.com"/></label>
      <label>{c.password}<input name="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} required placeholder={c.passwordHint}/></label>
      {!isSignUp && <Link className="forgot-link" href="/auth/forgot-password">{c.forgot}</Link>}
      <button className="auth-submit" disabled={busy || !isSupabaseConfigured}>{busy ? c.wait : isSignUp ? c.create : c.login}</button>
    </form>
    {!isSupabaseConfigured && <p className="auth-message" role="status">{c.unconfigured} <Link href="/auth/configuration">{c.setup}</Link>.</p>}
    {message && <p className="auth-message" role="status">{message}</p>}
    <p className="auth-switch">{isSignUp ? c.already : c.first} <Link href={isSignUp ? `/auth/sign-in?next=${encodeURIComponent(nextPath)}` : `/auth/sign-up?next=${encodeURIComponent(nextPath)}`}>{isSignUp ? c.login : c.signup}</Link></p>
    <p className="auth-privacy">{c.personal}</p>
  </div>;
}
