export type AtomCounts = Record<string, number>;
import periodicData from "../app/app/periodic-data.json" with { type: "json" };

const atomicMassEntries: [string, number][] = periodicData.map(element => [element.Symbol, Number.parseFloat(element.AtomicWeight)]);
const atomicMasses: Record<string, number> = Object.fromEntries(atomicMassEntries.filter((entry) => Number.isFinite(entry[1]) && entry[1] > 0));

export function parseChemicalFormula(input: string): AtomCounts {
  const formula = input.replace(/\s+/g, "");
  if (!formula || /[^A-Za-z0-9()[\]]/.test(formula)) throw new Error(`Fórmula no válida: ${input}`);
  let position = 0;
  function group(closing?: string): AtomCounts {
    const result: AtomCounts = {};
    while (position < formula.length && formula[position] !== closing) {
      const char = formula[position];
      if (char === "(" || char === "[") {
        const end = char === "(" ? ")" : "]";
        position++;
        const nested = group(end);
        if (formula[position] !== end) throw new Error(`Paréntesis sin cerrar: ${input}`);
        position++;
        const multiplier = readNumber();
        for (const [element, count] of Object.entries(nested)) result[element] = (result[element] || 0) + count * multiplier;
      } else {
        const match = formula.slice(position).match(/^([A-Z][a-z]?)(\d*)/);
        if (!match || !(match[1] in atomicMasses)) throw new Error(`Elemento desconocido cerca de “${formula.slice(position)}”`);
        position += match[0].length;
        result[match[1]] = (result[match[1]] || 0) + Number(match[2] || 1);
      }
    }
    return result;
  }
  function readNumber() { const found = formula.slice(position).match(/^\d+/); if (!found) return 1; position += found[0].length; return Number(found[0]); }
  const counts = group();
  if (position !== formula.length) throw new Error(`Fórmula no válida: ${input}`);
  return counts;
}

export function molarMass(formula: string) {
  return Object.entries(parseChemicalFormula(formula)).reduce((total, [element, count]) => total + atomicMasses[element] * count, 0);
}

type Fraction = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => b === BigInt(0) ? (a < BigInt(0) ? -a : a) : gcd(b, a % b);
const frac = (n: bigint, d = BigInt(1)): Fraction => { if (!d) throw new Error("División por cero"); const sign = d < BigInt(0) ? -BigInt(1) : BigInt(1); const divisor = gcd(n, d); return { n: n / divisor * sign, d: d / divisor * sign }; };
const add = (a: Fraction, b: Fraction) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a: Fraction, b: Fraction) => frac(a.n * b.n, a.d * b.d);
const div = (a: Fraction, b: Fraction) => frac(a.n * b.d, a.d * b.n);
const isZero = (a: Fraction) => a.n === BigInt(0);

export function balanceChemicalEquation(input: string) {
  const sides = input.split(/(?:->|→|=)/);
  if (sides.length !== 2) throw new Error("Escribe la ecuación con → (o ->), por ejemplo: H2 + O2 -> H2O.");
  const left = sides[0].split("+").map(part => part.trim()).filter(Boolean);
  const right = sides[1].split("+").map(part => part.trim()).filter(Boolean);
  if (!left.length || !right.length || left.length + right.length < 3 || left.length + right.length > 10) throw new Error("La ecuación debe tener reactivos y productos (hasta 10 sustancias).");
  const compounds = [...left, ...right].map(part => {
    const match = part.match(/^(\d+)?\s*([A-Z].*)$/);
    if (!match) throw new Error(`No pude interpretar “${part}”. Escribe fórmulas como H2O o Ca(OH)2.`);
    return { original: match[2].replace(/\s/g, ""), atoms: parseChemicalFormula(match[2]) };
  });
  const elements = [...new Set(compounds.flatMap(item => Object.keys(item.atoms)))];
  const rows = elements.map(element => compounds.map((compound, index) => frac(BigInt((index < left.length ? 1 : -1) * (compound.atoms[element] || 0)))));
  const matrix = rows.map(row => row.slice());
  const pivotColumns: number[] = [];
  let pivotRow = 0;
  for (let col = 0; col < compounds.length && pivotRow < matrix.length; col++) {
    const found = matrix.findIndex((row, index) => index >= pivotRow && !isZero(row[col]));
    if (found < 0) continue;
    [matrix[pivotRow], matrix[found]] = [matrix[found], matrix[pivotRow]];
    const pivot = matrix[pivotRow][col]; matrix[pivotRow] = matrix[pivotRow].map(value => div(value, pivot));
    for (let row = 0; row < matrix.length; row++) if (row !== pivotRow && !isZero(matrix[row][col])) {
      const factor = matrix[row][col]; matrix[row] = matrix[row].map((value, index) => add(value, mul(frac(-factor.n, factor.d), matrix[pivotRow][index])));
    }
    pivotColumns.push(col); pivotRow++;
  }
  const free = compounds.map((_, index) => index).filter(index => !pivotColumns.includes(index));
  if (free.length !== 1) throw new Error(free.length === 0 ? "No se encontró una solución para balancear esta ecuación." : "La ecuación tiene más de una forma de balancearse; separa las reacciones en pasos más simples.");
  const solution = compounds.map(() => frac(BigInt(0))); solution[free[0]] = frac(BigInt(1));
  pivotColumns.forEach((col, row) => { solution[col] = frac(-matrix[row][free[0]].n, matrix[row][free[0]].d); });
  if (solution.some(value => value.n <= BigInt(0))) throw new Error("La ecuación escrita no produce coeficientes positivos. Revisa las sustancias.");
  const lcm = solution.reduce((total, value) => total / gcd(total, value.d) * value.d, BigInt(1));
  let coefficients = solution.map(value => value.n * (lcm / value.d));
  const common = coefficients.reduce((total, value) => gcd(total, value));
  coefficients = coefficients.map(value => value / common);
  const formatted = (items: typeof compounds, values: bigint[]) => items.map((item, index) => `${values[index] === BigInt(1) ? "" : values[index]}${item.original}`).join(" + ");
  return { equation: `${formatted(compounds.slice(0, left.length), coefficients.slice(0, left.length))} → ${formatted(compounds.slice(left.length), coefficients.slice(left.length))}`, reactants: compounds.slice(0, left.length).map(item => item.original), products: compounds.slice(left.length).map(item => item.original), coefficients: coefficients.map(Number), steps: [`Se contaron los átomos de ${elements.join(", ")} en reactivos y productos.`, "Se igualó el número de átomos de cada elemento a ambos lados.", `Los coeficientes enteros mínimos son ${coefficients.join(", ")}.`] };
}

export const chemistryMolecules = [
  { name: "Agua", formula: "H₂O", raw: "H2O", geometry: "Angular (~104,5°)", properties: "Molécula polar; líquido a temperatura ambiente.", uses: "Disolvente, consumo y procesos biológicos.", atoms: [{ e: "O", x: 150, y: 90 }, { e: "H", x: 90, y: 145 }, { e: "H", x: 210, y: 145 }], bonds: [[0, 1], [0, 2]] },
  { name: "Dióxido de carbono", formula: "CO₂", raw: "CO2", geometry: "Lineal (180°)", properties: "Gas incoloro; molécula lineal.", uses: "Fotosíntesis, bebidas carbonatadas y extintores.", atoms: [{ e: "O", x: 65, y: 100 }, { e: "C", x: 150, y: 100 }, { e: "O", x: 235, y: 100 }], bonds: [[0, 1], [1, 2]] },
  { name: "Metano", formula: "CH₄", raw: "CH4", geometry: "Tetraédrica", properties: "Hidrocarburo gaseoso; componente principal del gas natural.", uses: "Combustible y materia prima industrial.", atoms: [{ e: "C", x: 150, y: 105 }, { e: "H", x: 150, y: 35 }, { e: "H", x: 80, y: 145 }, { e: "H", x: 220, y: 145 }, { e: "H", x: 150, y: 175 }], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] },
  { name: "Amoníaco", formula: "NH₃", raw: "NH3", geometry: "Piramidal trigonal", properties: "Gas de olor penetrante; molécula polar.", uses: "Fertilizantes y productos de limpieza industrial.", atoms: [{ e: "N", x: 150, y: 80 }, { e: "H", x: 80, y: 145 }, { e: "H", x: 220, y: 145 }, { e: "H", x: 150, y: 175 }], bonds: [[0, 1], [0, 2], [0, 3]] },
  { name: "Oxígeno", formula: "O₂", raw: "O2", geometry: "Lineal", properties: "Gas diatómico; esencial para la respiración aeróbica.", uses: "Medicina, metalurgia y procesos de combustión.", atoms: [{ e: "O", x: 105, y: 105 }, { e: "O", x: 195, y: 105 }], bonds: [[0, 1]] },
  { name: "Etanol", formula: "C₂H₆O", raw: "C2H6O", geometry: "No lineal; enlaces con giro libre", properties: "Líquido volátil y miscible con agua.", uses: "Disolvente, desinfectante y combustible.", atoms: [{ e: "C", x: 90, y: 105 }, { e: "C", x: 155, y: 105 }, { e: "O", x: 220, y: 105 }, { e: "H", x: 250, y: 145 }], bonds: [[0, 1], [1, 2], [2, 3]] },
  { name: "Cloruro de sodio", formula: "NaCl", raw: "NaCl", geometry: "Red cristalina iónica (no molécula aislada)", properties: "Sólido iónico formado por Na⁺ y Cl⁻.", uses: "Sal de mesa, conservación de alimentos y procesos químicos.", atoms: [{ e: "Na", x: 100, y: 105 }, { e: "Cl", x: 200, y: 105 }], bonds: [[0, 1]] },
];

export const chemistryFormulas = [
  { topic: "Moles", name: "Cantidad de sustancia", formula: "n = m / M", vars: "n: moles (mol); m: masa (g); M: masa molar (g/mol).", use: "Convertir una masa en cantidad de sustancia." },
  { topic: "Masa molar", name: "Masa de una muestra", formula: "m = n × M", vars: "m: masa (g); n: cantidad (mol); M: masa molar (g/mol).", use: "Calcular la masa correspondiente a cierta cantidad de moles." },
  { topic: "Concentración", name: "Molaridad", formula: "C = n / V", vars: "C: concentración (mol/L); n: moles de soluto; V: volumen de solución (L).", use: "Expresar la concentración de una solución." },
  { topic: "Diluciones", name: "Ecuación de dilución", formula: "C₁V₁ = C₂V₂", vars: "C₁, V₁: concentración y volumen iniciales; C₂, V₂: concentración y volumen finales.", use: "Calcular cómo cambia la concentración al agregar disolvente, sin perder soluto." },
  { topic: "Estequiometría", name: "Proporción molar", formula: "n₂ = n₁ × (ν₂ / ν₁)", vars: "n: moles; ν: coeficiente de la ecuación química balanceada.", use: "Relacionar cantidades de reactivos y productos en una reacción balanceada." },
  { topic: "Conversiones", name: "Masa ↔ moles", formula: "n = m / M ··· m = n × M", vars: "Usa M en g/mol y m en g.", use: "Convertir entre gramos y moles usando la fórmula química." },
];
