export const motivationQuotes = [
  "No tienes que saberlo todo hoy. Solo tienes que dar un pequeño paso.",
  "Incluso los días difíciles cuentan como progreso.",
  "No compares tu comienzo con el camino de alguien más.",
  "Está bien descansar. También es parte de aprender.",
  "Tu esfuerzo de hoy es una inversión en tu futuro.",
  "No permitas que un mal día te haga olvidar lo lejos que has llegado.",
  "Avanzar despacio también es avanzar.",
  "No necesitas tener todo resuelto para seguir adelante.",
  "Lo que hoy parece difícil puede ser mañana algo que haces con confianza.",
  "Date el mismo ánimo que le darías a alguien que quieres.",
  "Cada intento te enseña algo, incluso cuando no sale como esperabas.",
  "Tu ritmo también es un buen ritmo.",
  "Un comienzo pequeño puede abrir caminos enormes.",
  "Puedes sentir dudas y aun así dar el siguiente paso.",
  "No eres tus errores: también eres todo lo que aprendiste de ellos.",
  "Hoy no tiene que ser perfecto para que valga la pena.",
  "Confía en todo lo que has superado hasta aquí.",
  "Pedir ayuda también es una forma de ser valiente.",
  "Hay fuerza en volver a intentarlo con paciencia.",
  "Tu futuro se construye con pequeños pasos como el de hoy.",
];

export function nextMotivationQuoteIndex(previous: number, random = Math.random): number {
  const last = Number.isInteger(previous) && previous >= 0 && previous < motivationQuotes.length ? previous : -1;
  const choices = motivationQuotes.map((_, index) => index).filter(index => index !== last);
  return choices[Math.floor(random() * choices.length)];
}
