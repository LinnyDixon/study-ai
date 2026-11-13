export type PhysicsTopic = "Cinemática" | "Dinámica" | "Leyes de Newton" | "Trabajo y energía" | "Potencia" | "Cantidad de movimiento" | "Gravitación" | "Electricidad" | "Óptica" | "Ondas" | "Termodinámica" | "Fluidos";
type SolverMap = Record<string, () => number | null>;
export type PhysicsVariable = { symbol: string; name: string; unit: string };
export type PhysicsFormula = {
  id: string; topic: PhysicsTopic; name: string; expression: string; variables: PhysicsVariable[]; when: string;
  example: string; solve: (target: string, known: Record<string, number>) => number | null;
};

const v = (symbol: string, name: string, unit: string): PhysicsVariable => ({ symbol, name, unit });
const root = (value: number) => value < 0 ? null : Math.sqrt(value);
const formulas: PhysicsFormula[] = [
  { id: "velocity", topic: "Cinemática", name: "Velocidad final", expression: "v = v₀ + a·t", variables: [v("v", "velocidad final", "m/s"), v("v0", "velocidad inicial", "m/s"), v("a", "aceleración", "m/s²"), v("t", "tiempo", "s")], when: "Movimiento rectilíneo con aceleración constante.", example: "Un objeto parte a 2 m/s y acelera 3 m/s² durante 4 s: v = 2 + 3·4 = 14 m/s.", solve: (target, k) => { const ops: SolverMap = { v: () => k.v0 + k.a * k.t, v0: () => k.v - k.a * k.t, a: () => (k.v - k.v0) / k.t, t: () => (k.v - k.v0) / k.a }; return ops[target]?.() ?? null; } },
  { id: "displacement", topic: "Cinemática", name: "Desplazamiento acelerado", expression: "Δx = v₀·t + ½·a·t²", variables: [v("dx", "desplazamiento", "m"), v("v0", "velocidad inicial", "m/s"), v("a", "aceleración", "m/s²"), v("t", "tiempo", "s")], when: "Desplazamiento en una dimensión con aceleración constante.", example: "Con v₀=2 m/s, a=3 m/s² y t=4 s: Δx=2·4+½·3·4²=32 m.", solve: (target, k) => { const ops: SolverMap = { dx: () => k.v0 * k.t + .5 * k.a * k.t ** 2, v0: () => (k.dx - .5 * k.a * k.t ** 2) / k.t, a: () => 2 * (k.dx - k.v0 * k.t) / k.t ** 2, t: () => { const d = k.v0 ** 2 + 2 * k.a * k.dx; const r = root(d); return r === null || k.a === 0 ? null : (-k.v0 + r) / k.a; } }; return ops[target]?.() ?? null; } },
  { id: "kinematic-final-speed", topic: "Cinemática", name: "Velocidad sin tiempo", expression: "v² = v₀² + 2·a·Δx", variables: [v("v", "velocidad final", "m/s"), v("v0", "velocidad inicial", "m/s"), v("a", "aceleración", "m/s²"), v("dx", "desplazamiento", "m")], when: "Movimiento con aceleración constante cuando no se conoce el tiempo.", example: "Desde reposo, a=2 m/s² en 9 m: v=√(2·2·9)=6 m/s.", solve: (target, k) => { const ops: SolverMap = { v: () => root(k.v0 ** 2 + 2 * k.a * k.dx), v0: () => root(k.v ** 2 - 2 * k.a * k.dx), a: () => (k.v ** 2 - k.v0 ** 2) / (2 * k.dx), dx: () => (k.v ** 2 - k.v0 ** 2) / (2 * k.a) }; return ops[target]?.() ?? null; } },
  { id: "acceleration", topic: "Cinemática", name: "Aceleración media", expression: "a = (v − v₀) / t", variables: [v("a", "aceleración media", "m/s²"), v("v", "velocidad final", "m/s"), v("v0", "velocidad inicial", "m/s"), v("t", "intervalo de tiempo", "s")], when: "Cambio de velocidad durante un intervalo de tiempo.", example: "De 4 a 16 m/s en 3 s: a=(16−4)/3=4 m/s².", solve: (target, k) => { const ops: SolverMap = { a: () => (k.v - k.v0) / k.t, v: () => k.v0 + k.a * k.t, v0: () => k.v - k.a * k.t, t: () => (k.v - k.v0) / k.a }; return ops[target]?.() ?? null; } },
  { id: "newton-second", topic: "Dinámica", name: "Segunda ley de Newton", expression: "Fₙₑₜₐ = m·a", variables: [v("F", "fuerza neta", "N"), v("m", "masa", "kg"), v("a", "aceleración", "m/s²")], when: "Relaciona la fuerza neta sobre un cuerpo con su aceleración.", example: "Una masa de 5 kg con a=2 m/s²: F=5·2=10 N.", solve: (target, k) => { const ops: SolverMap = { F: () => k.m * k.a, m: () => k.F / k.a, a: () => k.F / k.m }; return ops[target]?.() ?? null; } },
  { id: "weight", topic: "Leyes de Newton", name: "Peso", expression: "P = m·g", variables: [v("P", "peso", "N"), v("m", "masa", "kg"), v("g", "aceleración gravitatoria", "m/s²")], when: "Fuerza gravitatoria local sobre una masa cerca de un astro.", example: "Para 3 kg en la Tierra (g=9,81 m/s²): P=29,43 N.", solve: (target, k) => { const ops: SolverMap = { P: () => k.m * k.g, m: () => k.P / k.g, g: () => k.P / k.m }; return ops[target]?.() ?? null; } },
  { id: "work", topic: "Trabajo y energía", name: "Trabajo de una fuerza constante", expression: "W = F·d·cos(θ)", variables: [v("W", "trabajo", "J"), v("F", "fuerza", "N"), v("d", "desplazamiento", "m"), v("theta", "ángulo entre fuerza y desplazamiento", "°")], when: "Una fuerza constante actúa mientras el objeto se desplaza.", example: "F=10 N, d=3 m y θ=0°: W=30 J.", solve: (target, k) => { const ops: SolverMap = { W: () => k.F * k.d * Math.cos(k.theta * Math.PI / 180), F: () => k.W / (k.d * Math.cos(k.theta * Math.PI / 180)), d: () => k.W / (k.F * Math.cos(k.theta * Math.PI / 180)), theta: () => Math.acos(k.W / (k.F * k.d)) * 180 / Math.PI }; return ops[target]?.() ?? null; } },
  { id: "kinetic-energy", topic: "Trabajo y energía", name: "Energía cinética", expression: "Eₖ = ½·m·v²", variables: [v("Ek", "energía cinética", "J"), v("m", "masa", "kg"), v("v", "rapidez", "m/s")], when: "Energía asociada al movimiento de un cuerpo.", example: "m=2 kg y v=3 m/s: Eₖ=½·2·3²=9 J.", solve: (target, k) => { const ops: SolverMap = { Ek: () => .5 * k.m * k.v ** 2, m: () => 2 * k.Ek / k.v ** 2, v: () => root(2 * k.Ek / k.m) }; return ops[target]?.() ?? null; } },
  { id: "potential-energy", topic: "Trabajo y energía", name: "Energía potencial gravitatoria", expression: "Eₚ = m·g·h", variables: [v("Ep", "energía potencial", "J"), v("m", "masa", "kg"), v("g", "gravedad", "m/s²"), v("h", "altura", "m")], when: "Cambio de energía cerca de la superficie de un astro, con g aproximadamente constante.", example: "m=2 kg, g=9,81 m/s² y h=5 m: Eₚ=98,1 J.", solve: (target, k) => { const ops: SolverMap = { Ep: () => k.m * k.g * k.h, m: () => k.Ep / (k.g * k.h), g: () => k.Ep / (k.m * k.h), h: () => k.Ep / (k.m * k.g) }; return ops[target]?.() ?? null; } },
  { id: "power-work", topic: "Potencia", name: "Potencia media", expression: "P = W / t", variables: [v("P", "potencia", "W"), v("W", "trabajo", "J"), v("t", "tiempo", "s")], when: "Tasa media a la que se transfiere energía o se realiza trabajo.", example: "600 J en 20 s: P=30 W.", solve: (target, k) => { const ops: SolverMap = { P: () => k.W / k.t, W: () => k.P * k.t, t: () => k.W / k.P }; return ops[target]?.() ?? null; } },
  { id: "power-force", topic: "Potencia", name: "Potencia mecánica instantánea", expression: "P = F·v·cos(θ)", variables: [v("P", "potencia", "W"), v("F", "fuerza", "N"), v("v", "velocidad", "m/s"), v("theta", "ángulo entre fuerza y velocidad", "°")], when: "Fuerza aplicada durante un movimiento instantáneo.", example: "F=20 N, v=2 m/s y θ=0°: P=40 W.", solve: (target, k) => { const ops: SolverMap = { P: () => k.F * k.v * Math.cos(k.theta * Math.PI / 180), F: () => k.P / (k.v * Math.cos(k.theta * Math.PI / 180)), v: () => k.P / (k.F * Math.cos(k.theta * Math.PI / 180)) }; return ops[target]?.() ?? null; } },
  { id: "momentum", topic: "Cantidad de movimiento", name: "Cantidad de movimiento lineal", expression: "p = m·v", variables: [v("p", "cantidad de movimiento", "kg·m/s"), v("m", "masa", "kg"), v("v", "velocidad", "m/s")], when: "Describe el movimiento lineal de un cuerpo.", example: "m=4 kg y v=3 m/s: p=12 kg·m/s.", solve: (target, k) => { const ops: SolverMap = { p: () => k.m * k.v, m: () => k.p / k.v, v: () => k.p / k.m }; return ops[target]?.() ?? null; } },
  { id: "impulse", topic: "Cantidad de movimiento", name: "Impulso", expression: "J = F·Δt = Δp", variables: [v("J", "impulso", "N·s"), v("F", "fuerza media", "N"), v("dt", "intervalo de tiempo", "s")], when: "Fuerza media aplicada durante un intervalo; el impulso equivale al cambio de momento.", example: "12 N durante 0,5 s: J=6 N·s.", solve: (target, k) => { const ops: SolverMap = { J: () => k.F * k.dt, F: () => k.J / k.dt, dt: () => k.J / k.F }; return ops[target]?.() ?? null; } },
  { id: "gravitation", topic: "Gravitación", name: "Gravitación universal", expression: "F = G·m₁·m₂ / r²", variables: [v("F", "fuerza gravitatoria", "N"), v("m1", "masa 1", "kg"), v("m2", "masa 2", "kg"), v("r", "distancia entre centros", "m")], when: "Atracción entre dos masas puntuales o esféricas separadas por r.", example: "Con m₁=1 kg, m₂=1 kg y r=1 m: F≈6,6743×10⁻¹¹ N.", solve: (target, k) => { const ops: SolverMap = { F: () => 6.6743e-11 * k.m1 * k.m2 / k.r ** 2, m1: () => k.F * k.r ** 2 / (6.6743e-11 * k.m2), m2: () => k.F * k.r ** 2 / (6.6743e-11 * k.m1), r: () => root(6.6743e-11 * k.m1 * k.m2 / k.F) }; return ops[target]?.() ?? null; } },
  { id: "density", topic: "Fluidos", name: "Densidad", expression: "ρ = m / V", variables: [v("rho", "densidad", "kg/m³"), v("m", "masa", "kg"), v("V", "volumen", "m³")], when: "Masa por unidad de volumen de un material homogéneo.", example: "2 kg en 0,001 m³: ρ=2000 kg/m³.", solve: (target, k) => { const ops: SolverMap = { rho: () => k.m / k.V, m: () => k.rho * k.V, V: () => k.m / k.rho }; return ops[target]?.() ?? null; } },
  { id: "coulomb", topic: "Electricidad", name: "Ley de Coulomb", expression: "F = k·|q₁·q₂| / r²", variables: [v("F", "fuerza eléctrica", "N"), v("q1", "carga 1", "C"), v("q2", "carga 2", "C"), v("r", "distancia entre cargas", "m")], when: "Fuerza entre dos cargas puntuales en el vacío o aire, con k≈8,9876×10⁹ N·m²/C².", example: "Dos cargas de 1 μC a 1 m: F≈0,00899 N.", solve: (target, k) => { const ops: SolverMap = { F: () => 8.9875517923e9 * Math.abs(k.q1 * k.q2) / k.r ** 2, q1: () => k.F * k.r ** 2 / (8.9875517923e9 * Math.abs(k.q2)), q2: () => k.F * k.r ** 2 / (8.9875517923e9 * Math.abs(k.q1)), r: () => root(8.9875517923e9 * Math.abs(k.q1 * k.q2) / k.F) }; return ops[target]?.() ?? null; } },
  { id: "ohm", topic: "Electricidad", name: "Ley de Ohm", expression: "V = I·R", variables: [v("V", "diferencia de potencial", "V"), v("I", "corriente", "A"), v("R", "resistencia", "Ω")], when: "Componente óhmico a temperatura y condiciones constantes.", example: "I=2 A por R=5 Ω: V=10 V.", solve: (target, k) => { const ops: SolverMap = { V: () => k.I * k.R, I: () => k.V / k.R, R: () => k.V / k.I }; return ops[target]?.() ?? null; } },
  { id: "electric-power", topic: "Electricidad", name: "Potencia eléctrica", expression: "P = V·I", variables: [v("P", "potencia eléctrica", "W"), v("V", "tensión", "V"), v("I", "corriente", "A")], when: "Potencia eléctrica en corriente continua o valores instantáneos compatibles.", example: "12 V y 2 A: P=24 W.", solve: (target, k) => { const ops: SolverMap = { P: () => k.V * k.I, V: () => k.P / k.I, I: () => k.P / k.V }; return ops[target]?.() ?? null; } },
  { id: "wave-speed", topic: "Ondas", name: "Velocidad de onda", expression: "v = f·λ", variables: [v("v", "velocidad de propagación", "m/s"), v("f", "frecuencia", "Hz"), v("lambda", "longitud de onda", "m")], when: "Relaciona velocidad, frecuencia y longitud de onda en un medio.", example: "f=5 Hz y λ=2 m: v=10 m/s.", solve: (target, k) => { const ops: SolverMap = { v: () => k.f * k.lambda, f: () => k.v / k.lambda, lambda: () => k.v / k.f }; return ops[target]?.() ?? null; } },
  { id: "period-frequency", topic: "Ondas", name: "Período y frecuencia", expression: "f = 1 / T", variables: [v("f", "frecuencia", "Hz"), v("T", "período", "s")], when: "Oscilaciones o ciclos periódicos.", example: "T=0,25 s: f=4 Hz.", solve: (target, k) => { const ops: SolverMap = { f: () => 1 / k.T, T: () => 1 / k.f }; return ops[target]?.() ?? null; } },
  { id: "heat", topic: "Termodinámica", name: "Calor sensible", expression: "Q = m·c·ΔT", variables: [v("Q", "calor transferido", "J"), v("m", "masa", "kg"), v("c", "calor específico", "J/(kg·K)"), v("dT", "cambio de temperatura", "K")], when: "Cambio de temperatura sin cambio de fase, con calor específico aproximadamente constante.", example: "0,5 kg de agua, c=4186 J/(kg·K), ΔT=2 K: Q=4186 J.", solve: (target, k) => { const ops: SolverMap = { Q: () => k.m * k.c * k.dT, m: () => k.Q / (k.c * k.dT), c: () => k.Q / (k.m * k.dT), dT: () => k.Q / (k.m * k.c) }; return ops[target]?.() ?? null; } },
  { id: "ideal-gas", topic: "Termodinámica", name: "Gas ideal", expression: "p·V = n·R·T", variables: [v("p", "presión absoluta", "Pa"), v("V", "volumen", "m³"), v("n", "cantidad de sustancia", "mol"), v("R", "constante de gas ideal", "J/(mol·K)"), v("T", "temperatura absoluta", "K")], when: "Aproximación de gas ideal; temperatura en kelvin y presión absoluta.", example: "1 mol a 300 K y 1 atm: V≈0,0246 m³.", solve: (target, k) => { const ops: SolverMap = { p: () => k.n * k.R * k.T / k.V, V: () => k.n * k.R * k.T / k.p, n: () => k.p * k.V / (k.R * k.T), R: () => k.p * k.V / (k.n * k.T), T: () => k.p * k.V / (k.n * k.R) }; return ops[target]?.() ?? null; } },
  { id: "snell", topic: "Óptica", name: "Ley de Snell", expression: "n₁·sin(θ₁) = n₂·sin(θ₂)", variables: [v("n1", "índice del medio 1", "adimensional"), v("theta1", "ángulo de incidencia", "°"), v("n2", "índice del medio 2", "adimensional"), v("theta2", "ángulo de refracción", "°")], when: "Refracción de luz en una interfaz, con ángulos medidos desde la normal.", example: "Aire n₁=1, agua n₂=1,33 y θ₁=30°: θ₂≈22,1°.", solve: (target, k) => { const ops: SolverMap = { theta2: () => { const x = k.n1 * Math.sin(k.theta1 * Math.PI / 180) / k.n2; return Math.abs(x) <= 1 ? Math.asin(x) * 180 / Math.PI : null; }, theta1: () => { const x = k.n2 * Math.sin(k.theta2 * Math.PI / 180) / k.n1; return Math.abs(x) <= 1 ? Math.asin(x) * 180 / Math.PI : null; }, n1: () => k.n2 * Math.sin(k.theta2 * Math.PI / 180) / Math.sin(k.theta1 * Math.PI / 180), n2: () => k.n1 * Math.sin(k.theta1 * Math.PI / 180) / Math.sin(k.theta2 * Math.PI / 180) }; return ops[target]?.() ?? null; } },
  { id: "thin-lens", topic: "Óptica", name: "Ecuación de lente delgada", expression: "1/f = 1/dₒ + 1/dᵢ", variables: [v("f", "distancia focal", "m"), v("do", "distancia del objeto", "m"), v("di", "distancia de la imagen", "m")], when: "Lentes delgadas; usar convención de signos coherente para objetos e imágenes reales o virtuales.", example: "f=0,1 m y dₒ=0,3 m: dᵢ=0,15 m.", solve: (target, k) => { const ops: SolverMap = { f: () => 1 / (1 / k.do + 1 / k.di), do: () => 1 / (1 / k.f - 1 / k.di), di: () => 1 / (1 / k.f - 1 / k.do) }; return ops[target]?.() ?? null; } },
];

export const physicsFormulas = formulas;
export const physicsTopics = [...new Set(formulas.map((formula) => formula.topic))];

export function getFormula(id: string) { return formulas.find((formula) => formula.id === id) || null; }

export function inferPhysicsFormula(question: string): { formulaId: string; target: string } | null {
  const text = question.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const hasTime = /\b(segundos?|minutos?|horas?|tiempo|durante|en \d+(?:[.,]\d+)?\s*s\b)/.test(text);
  const hasAcceleration = /aceler|m\/s\s*(?:\^?2|²)/.test(text);
  if (hasAcceleration && hasTime && /velocidad final|rapidez final|que velocidad|cual es la velocidad|velocidad despues/.test(text)) return { formulaId: "velocity", target: "v" };
  if (/aceleracion (media|promedio)|hallar la aceleracion|calcula la aceleracion/.test(text) && /velocidad/.test(text)) return { formulaId: "acceleration", target: "a" };
  if (/desplazamiento|distancia recorrida/.test(text) && hasTime && hasAcceleration) return { formulaId: "displacement", target: "dx" };
  if (/fuerza neta|segunda ley de newton/.test(text) && /masa/.test(text) && /aceler/.test(text)) return { formulaId: "newton-second", target: "F" };
  if (/peso/.test(text) && /masa/.test(text)) return { formulaId: "weight", target: "P" };
  if (/energia cinetica/.test(text)) return { formulaId: "kinetic-energy", target: "Ek" };
  if (/energia potencial/.test(text) && /altura/.test(text)) return { formulaId: "potential-energy", target: "Ep" };
  if (/trabajo/.test(text) && /fuerza/.test(text) && /desplazamiento|distancia/.test(text)) return { formulaId: "work", target: "W" };
  if (/potencia/.test(text) && /trabajo/.test(text) && hasTime) return { formulaId: "power-work", target: "P" };
  if (/cantidad de movimiento|momento lineal/.test(text)) return { formulaId: "momentum", target: "p" };
  if (/impulso/.test(text)) return { formulaId: "impulse", target: "J" };
  if (/gravitacion universal|fuerza gravitatoria/.test(text)) return { formulaId: "gravitation", target: "F" };
  if (/densidad/.test(text) && /volumen/.test(text)) return { formulaId: "density", target: "rho" };
  if (/coulomb|fuerza electrica/.test(text)) return { formulaId: "coulomb", target: "F" };
  if (/ley de ohm|resistencia electrica|corriente electrica/.test(text) && /resistencia/.test(text)) return { formulaId: "ohm", target: "V" };
  if (/potencia electrica/.test(text)) return { formulaId: "electric-power", target: "P" };
  if (/longitud de onda|velocidad de onda/.test(text)) return { formulaId: "wave-speed", target: "v" };
  if (/periodo/.test(text) && /frecuencia/.test(text)) return { formulaId: "period-frequency", target: "f" };
  if (/calor sensible|calor transferido/.test(text)) return { formulaId: "heat", target: "Q" };
  if (/gas ideal/.test(text)) return { formulaId: "ideal-gas", target: "V" };
  if (/snell|refraccion/.test(text)) return { formulaId: "snell", target: "theta2" };
  if (/lente delgada|distancia focal/.test(text)) return { formulaId: "thin-lens", target: "di" };
  return null;
}

export function solvePhysicsFormula(id: string, target: string, known: Record<string, number>) {
  const formula = getFormula(id);
  if (!formula || !formula.variables.some((variable) => variable.symbol === target)) return null;
  const missing = formula.variables.filter((variable) => variable.symbol !== target && !Number.isFinite(known[variable.symbol]));
  if (missing.length) return null;
  const value = formula.solve(target, known);
  return value !== null && Number.isFinite(value) ? value : null;
}

export type InputUnit = "m" | "km" | "cm" | "mm" | "s" | "min" | "h" | "m/s" | "km/h" | "m/s²" | "kg" | "g" | "N" | "J" | "W" | "V" | "A" | "mA" | "Ω" | "kΩ" | "C" | "μC" | "Hz" | "kHz" | "Pa" | "kPa" | "m³" | "L" | "mol" | "K" | "°C" | "J/(kg·K)" | "°" | "adimensional";
const unitFactors: Partial<Record<InputUnit, number>> = { km: 1000, cm: .01, mm: .001, min: 60, h: 3600, "km/h": 1 / 3.6, g: .001, mA: .001, kΩ: 1000, μC: 1e-6, kHz: 1000, kPa: 1000, L: .001 };
export function toSI(value: number, unit: string, targetUnit: string) {
  if (!Number.isFinite(value)) return null;
  if (unit === targetUnit) return value;
  if (unit === "°C" && targetUnit === "K") return value + 273.15;
  const factor = unitFactors[unit as InputUnit];
  return factor !== undefined && unitsCompatible(unit, targetUnit) ? value * factor : null;
}

function unitsCompatible(unit: string, target: string) {
  const families: Record<string, string[]> = {
    m: ["m", "km", "cm", "mm"], s: ["s", "min", "h"], "m/s": ["m/s", "km/h"], kg: ["kg", "g"], A: ["A", "mA"], "Ω": ["Ω", "kΩ"], C: ["C", "μC"], Hz: ["Hz", "kHz"], Pa: ["Pa", "kPa"], "m³": ["m³", "L"], K: ["K", "°C"],
  };
  return families[target]?.includes(unit) ?? false;
}

export function formatPhysicsNumber(value: number) {
  if (!Number.isFinite(value)) return "No definido";
  return new Intl.NumberFormat("es-UY", { maximumSignificantDigits: 6 }).format(value);
}




export type PhysicsSimulation = "free-fall" | "uniform-motion" | "projectile" | "friction" | "pendulum" | "circuit" | "refraction" | "wave";
export function simulatePhysics(kind: PhysicsSimulation, time: number, a: number, b: number) {
  const t = Math.max(0, Math.min(5, time));
  if (![a, b, t].every(Number.isFinite) || (b === 0 && ["circuit", "wave", "pendulum"].includes(kind))) return null;
  const g = 9.81;
  switch (kind) {
    case "free-fall": return { position: .5 * g * t ** 2, velocity: g * t, positionUnit: "m", velocityUnit: "m/s", equation: "y = ½gt², sin resistencia del aire" };
    case "uniform-motion": return { position: a * t, velocity: a, positionUnit: "m", velocityUnit: "m/s", equation: "x = v·t, velocidad constante" };
    case "projectile": { const vx = a * Math.cos(b * Math.PI / 180), vy = a * Math.sin(b * Math.PI / 180); return { position: Math.max(0, vy * t - .5 * g * t ** 2), velocity: Math.hypot(vx, vy - g * t), positionUnit: "m", velocityUnit: "m/s", equation: "x=v₀cosθ·t; y=v₀sinθ·t−½gt²" }; }
    case "friction": { const acceleration = Math.max(0, (a - .2 * 5 * g) / 5); return { position: .5 * acceleration * t ** 2, velocity: acceleration * t, positionUnit: "m", velocityUnit: "m/s", equation: "a=max(0,(F−μmg)/m), μ=0,2 y m=5 kg" }; }
    case "pendulum": { const omega = Math.sqrt(g / (b / 10)); return { position: 20 * Math.cos(omega * t), velocity: omega, positionUnit: "°", velocityUnit: "rad/s", equation: "θ=θ₀cos(√(g/L)t), aproximación de ángulo pequeño" }; }
    case "circuit": { const current = a / b; return { position: current, velocity: current, positionUnit: "A", velocityUnit: "A", equation: "I=V/R, circuito ideal de corriente continua" }; }
    case "refraction": { const incident = b * Math.PI / 180; const ratio = Math.sin(incident) / 1.33; if (Math.abs(ratio) > 1) return null; return { position: Math.asin(ratio) * 180 / Math.PI, velocity: b, positionUnit: "°", velocityUnit: "°", equation: `Snell: 1·sin(${b}°)=1,33·sin(θ₂)` }; }
    case "wave": { const period = b; return { position: a * Math.sin(2 * Math.PI * t / period), velocity: 1 / period, positionUnit: "m", velocityUnit: "Hz", equation: "y=A·sin(2πt/T), modelo sinusoidal" }; }
  }
}

export type PhysicsPracticeItem = { prompt: string; formulaId: string; target: string; known: Record<string, { value: number; unit: string }> };
export function createPhysicsPracticeExercises(topic: PhysicsTopic, difficulty: string, count: number): PhysicsPracticeItem[] {
  const catalog: Partial<Record<PhysicsTopic, { formulaId: string; target: string; known: Record<string, { value: number; unit: string }> }[]>> = {
    "Cinemática": [
      { formulaId: "velocity", target: "v", known: { v0: { value: 0, unit: "m/s" }, a: { value: 2, unit: "m/s²" }, t: { value: 5, unit: "s" } } },
      { formulaId: "displacement", target: "dx", known: { v0: { value: 3, unit: "m/s" }, a: { value: 2, unit: "m/s²" }, t: { value: 4, unit: "s" } } },
      { formulaId: "acceleration", target: "a", known: { v: { value: 18, unit: "m/s" }, v0: { value: 6, unit: "m/s" }, t: { value: 3, unit: "s" } } },
    ],
    "Dinámica": [{ formulaId: "newton-second", target: "F", known: { m: { value: 5, unit: "kg" }, a: { value: 2, unit: "m/s²" } } }],
    "Leyes de Newton": [{ formulaId: "weight", target: "P", known: { m: { value: 3, unit: "kg" }, g: { value: 9.81, unit: "m/s²" } } }],
    "Trabajo y energía": [
      { formulaId: "kinetic-energy", target: "Ek", known: { m: { value: 2, unit: "kg" }, v: { value: 3, unit: "m/s" } } },
      { formulaId: "potential-energy", target: "Ep", known: { m: { value: 2, unit: "kg" }, g: { value: 9.81, unit: "m/s²" }, h: { value: 5, unit: "m" } } },
    ],
    "Potencia": [{ formulaId: "power-work", target: "P", known: { W: { value: 600, unit: "J" }, t: { value: 20, unit: "s" } } }],
    "Cantidad de movimiento": [
      { formulaId: "momentum", target: "p", known: { m: { value: 4, unit: "kg" }, v: { value: 3, unit: "m/s" } } },
      { formulaId: "impulse", target: "J", known: { F: { value: 12, unit: "N" }, dt: { value: .5, unit: "s" } } },
    ],
    "Gravitación": [{ formulaId: "gravitation", target: "F", known: { m1: { value: 1, unit: "kg" }, m2: { value: 2, unit: "kg" }, r: { value: 1, unit: "m" } } }],
    "Electricidad": [
      { formulaId: "ohm", target: "V", known: { I: { value: 2, unit: "A" }, R: { value: 5, unit: "Ω" } } },
      { formulaId: "electric-power", target: "P", known: { V: { value: 12, unit: "V" }, I: { value: 2, unit: "A" } } },
    ],
    "Óptica": [{ formulaId: "snell", target: "theta2", known: { n1: { value: 1, unit: "adimensional" }, theta1: { value: 30, unit: "°" }, n2: { value: 1.33, unit: "adimensional" } } }],
    "Ondas": [
      { formulaId: "wave-speed", target: "v", known: { f: { value: 5, unit: "Hz" }, lambda: { value: 2, unit: "m" } } },
      { formulaId: "period-frequency", target: "f", known: { T: { value: .25, unit: "s" } } },
    ],
    "Termodinámica": [{ formulaId: "heat", target: "Q", known: { m: { value: .5, unit: "kg" }, c: { value: 4186, unit: "J/(kg·K)" }, dT: { value: 2, unit: "K" } } }],
    "Fluidos": [{ formulaId: "density", target: "rho", known: { m: { value: 2, unit: "kg" }, V: { value: .001, unit: "m³" } } }],
  };
  const samples = catalog[topic] || [];
  const safeCount = Math.max(1, Math.min(10, Math.floor(count)));
  return Array.from({ length: safeCount }, (_, index) => {
    const sample = samples[index % samples.length]; const formula = getFormula(sample.formulaId)!;
    const scale = difficulty === "Avanzado" ? 1 + (index % 4) * .25 : difficulty === "Básico" ? 1 + (index % 3) * .1 : 1 + (index % 5) * .15;
    const known = Object.fromEntries(Object.entries(sample.known).map(([symbol, entry]) => [symbol, { ...entry, value: entry.value === 0 || entry.value === 9.81 || entry.value === 4186 || entry.value === 1.33 || entry.value === 1 ? entry.value : Number((entry.value * scale).toPrecision(4)) }]));
    const target = formula.variables.find(variable => variable.symbol === sample.target)!;
    const data = formula.variables.filter(variable => variable.symbol !== sample.target).map(variable => `${variable.name} (${variable.symbol}) = ${known[variable.symbol].value} ${variable.unit}`).join("; ");
    const prompt = `En el tema ${topic.toLowerCase()}, ${formula.when} Datos: ${data}. Calcula ${target.name} (${target.symbol}) usando ${formula.expression}.`;
    return { prompt, formulaId: sample.formulaId, target: sample.target, known };
  });
}


