const supportEmail = "ownersession2010@gmail.com";

export function getSupportComposeUrl(subject = "Soporte STUDY AI") {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: supportEmail,
    su: subject,
    body: "Hola, necesito ayuda con STUDY AI.\n\nDescribe aquí tu consulta o el problema que encontraste:\n\n",
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
