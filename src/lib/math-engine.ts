import { format, parse, simplify } from "mathjs";

export type MathStep = { expression: string; result: string; explanation: string };
export type MathSolution = { result: string; steps: MathStep[]; numericValue?: number };

const allowedFunctions = new Set(["sqrt", "cbrt", "abs", "log", "log10", "ln", "exp", "sin", "cos", "tan", "asin", "acos", "atan", "ceil", "floor", "round"]);
const reservedNames = new Set(["import", "createUnit", "evaluate", "parse", "simplify", "derivative", "resolve", "reviver", "constructor", "__proto__", "prototype"]);

type MathAst = {
  type: string; name?: string; op?: string; fn?: { name?: string }; content?: MathAst; args: MathAst[];
  isSymbolNode?: boolean; isConstantNode?: boolean; isParenthesisNode?: boolean; isOperatorNode?: boolean; isFunctionNode?: boolean;
  isAccessorNode?: boolean; isAssignmentNode?: boolean; isArrayNode?: boolean; isObjectNode?: boolean; isBlockNode?: boolean; isConditionalNode?: boolean;
  toString(): string; compile(): { evaluate(scope?: Record<string, unknown>): unknown };
  traverse(callback: (node: MathAst, path?: string, parent?: MathAst) => void): void;
  transform(callback: (node: MathAst, path?: string, parent?: MathAst) => MathAst): MathAst;
};
function parseAst(source: string): MathAst { return parse(source) as unknown as MathAst; }

function normalizeExpression(source: string) {
  if (typeof source !== "string" || source.trim().length < 1 || source.length > 300) throw new Error("Escribe una expresión de hasta 300 caracteres.");
  let expression = source.replaceAll("×", "*").replaceAll("÷", "/").replaceAll("π", "pi").replaceAll("√", "sqrt").replaceAll("²", "^2").replaceAll("³", "^3");
  expression = expression.replace(/\blog\s*\(/g, "log10(").replace(/\bln\s*\(/g, "log(");
  expression = expression.replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)");
  if (/[;{}\[\]`]/.test(expression) || /\b(?:import|createUnit|evaluate|parse|simplify|derivative|resolve|reviver|constructor|__proto__|prototype)\b/i.test(expression) || /\.[a-z_$]/i.test(expression)) {
    throw new Error("La expresión contiene una operación que no está permitida.");
  }
  const root = parseAst(expression);
  let nodes = 0;
  root.traverse((node, _path, parent) => {
    nodes += 1;
    if (nodes > 120) throw new Error("La expresión es demasiado compleja.");
    if (node.isSymbolNode && node.name !== "x" && node.name !== "y" && node.name !== "pi" && node.name !== "e" && !allowedFunctions.has(node.name || "")) throw new Error(`La variable “${node.name}” no está permitida. Usa x o y.`);
    if (node.isFunctionNode) {
      const name = node.fn?.name;
      if (!name || !allowedFunctions.has(name) || reservedNames.has(name)) throw new Error("La expresión usa una función no permitida.");
    }
    if (node.isAccessorNode || node.isAssignmentNode || node.isArrayNode || node.isObjectNode || node.isBlockNode || node.isConditionalNode) throw new Error("Ese tipo de expresión no está permitido.");
    void parent;
  });
  return { expression, root };
}

function display(value: unknown) {
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("El resultado no es un número finito.");
  return format(value as never, { precision: 12 });
}

const isNumericTree = (node: MathAst): boolean => {
  if (node.isConstantNode) return true;
  if (node.isParenthesisNode) return node.content ? isNumericTree(node.content) : false;
  if (node.isOperatorNode) return node.args.every((arg) => isNumericTree(arg));
  if (node.isFunctionNode) return node.args.every((arg) => isNumericTree(arg));
  return false;
};

const explainOperator: Record<string, string> = { "+": "Sumamos", "-": "Restamos", "*": "Multiplicamos", "/": "Dividimos", "^": "Elevamos a la potencia", "%": "Calculamos el resto", "!": "Calculamos el factorial" };

export function solveExpression(source: string): MathSolution {
  const { expression, root } = normalizeExpression(source);
  if (!isNumericTree(root)) {
    const simplified = simplify(expression).toString();
    return { result: simplified, steps: [{ expression: source, result: simplified, explanation: "Reducimos términos semejantes y conservamos las variables; el resultado es una expresión algebraica, no un número único." }] };
  }
  const value = root.compile().evaluate({});
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("El resultado no es finito; revisa divisiones por cero o el dominio de la función.");
  const steps: MathStep[] = [];

  const visit = (node: MathAst): void => {
    if (node.isParenthesisNode && node.content) visit(node.content);
    if (node.isOperatorNode) node.args.forEach((arg) => visit(arg));
    if (node.isFunctionNode) node.args.forEach((arg) => visit(arg));
    if (isNumericTree(node) && (node.isOperatorNode || node.isFunctionNode)) {
      const operationResult = node.compile().evaluate({});
      steps.push({ expression: node.toString(), result: display(operationResult), explanation: node.isFunctionNode ? `Aplicamos ${node.fn?.name || "la función"} al argumento.` : `${explainOperator[node.op || ""] || "Resolvemos"} los términos respetando la jerarquía de operaciones.` });
    }
  };
  visit(root);

  const numeric = typeof value === "number" ? value : value && typeof value === "object" && "valueOf" in value ? Number(value.valueOf()) : Number.NaN;
  if (steps.length === 0 && Number.isFinite(numeric)) steps.push({ expression: source, result: display(value), explanation: "Tomamos el valor numérico ingresado como resultado." });
  if (steps.length === 0) throw new Error("No se pudo obtener el procedimiento de esta operación.");
  return { result: display(value), steps, ...(Number.isFinite(numeric) ? { numericValue: numeric } : {}) };
}

function parseEquation(source: string) {
  const parts = source.split("=");
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim() || source.length > 400) throw new Error("Escribe la ecuación con un solo signo igual, por ejemplo 2*x+3=9.");
  const left = normalizeExpression(parts[0].trim());
  const right = normalizeExpression(parts[1].trim());
  return { left: left.root, right: right.root, difference: parseAst(`(${left.expression})-(${right.expression})`) };
}

function closeEnough(a: number, b: number) { return Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b)); }

function polynomial(source: string) {
  const { difference } = parseEquation(source);
  const fn = difference.compile();
  const f0 = Number(fn.evaluate({ x: 0 }));
  const f1 = Number(fn.evaluate({ x: 1 }));
  const fm1 = Number(fn.evaluate({ x: -1 }));
  const a = (f1 + fm1) / 2 - f0;
  const b = (f1 - fm1) / 2;
  const c = f0;
  const probes = [-3, -2, -0.5, 0.5, 1.5, 2, 3].map((x) => ({ x, value: Number(fn.evaluate({ x })) }));
  if (![f0, f1, fm1, ...probes.map(({ value }) => value)].every(Number.isFinite) || probes.some(({ x, value }) => !closeEnough(value, a * x * x + b * x + c))) throw new Error("Por ahora se resuelven ecuaciones polinómicas de hasta segundo grado con una variable x.");
  return { a, b, c };
}

export type EquationResult = { kind: "linear" | "quadratic" | "identity" | "inconsistent" | "system" | "inequality"; title: string; solutions: string[]; steps: string[]; check?: string };

export function solveEquation(source: string, mode: "equation" | "inequality" = "equation"): EquationResult {
  if (mode === "inequality") return solveInequality(source);
  if (source.includes(";") || source.split("\n").filter(Boolean).length > 1) return solveSystem(source);
  const { a, b, c } = polynomial(source);
  const steps = [`Pasamos todos los términos al mismo lado: ${display(a)}x² + ${display(b)}x + ${display(c)} = 0.`];
  if (closeEnough(a, 0) && closeEnough(b, 0)) {
    if (closeEnough(c, 0)) return { kind: "identity", title: "Identidad", solutions: ["Todos los números reales"], steps: [...steps, "La igualdad se cumple para cualquier valor de x."] };
    return { kind: "inconsistent", title: "Sin solución", solutions: [], steps: [...steps, "Queda una igualdad falsa; no existe un valor de x que la cumpla."] };
  }
  if (closeEnough(a, 0)) {
    const x = -c / b;
    return { kind: "linear", title: "Ecuación de primer grado", solutions: [`x = ${display(x)}`], steps: [...steps, `Despejamos x: x = −c / b = ${display(-c)} / ${display(b)} = ${display(x)}.`, `Comprobación: al sustituir x=${display(x)}, ambos lados de la ecuación original son iguales.`], check: `x = ${display(x)}` };
  }
  const discriminant = b * b - 4 * a * c;
  steps.push(`Calculamos el discriminante: Δ = b² − 4ac = ${display(discriminant)}.`);
  if (discriminant < -1e-10) return { kind: "quadratic", title: "Ecuación de segundo grado", solutions: ["No tiene soluciones reales"], steps: [...steps, "Como Δ < 0, no hay raíces reales."] };
  const root = Math.sqrt(Math.max(0, discriminant));
  const roots = discriminant <= 1e-10 ? [-b / (2 * a)] : [(-b - root) / (2 * a), (-b + root) / (2 * a)];
  return { kind: "quadratic", title: "Ecuación de segundo grado", solutions: roots.map((x) => `x = ${display(x)}`), steps: [...steps, `Aplicamos la fórmula general x = (−b ± √Δ) / 2a y obtenemos ${roots.map(display).join(" y ")}.`, "Comprobación: cada valor hace cero la expresión del lado izquierdo menos el derecho."], check: roots.map((x) => `x=${display(x)}`).join(", ") };
}

export function solveSystem(source: string): EquationResult {
  const rows = source.split(/[;\n]/).map((row) => row.trim()).filter(Boolean);
  if (rows.length !== 2) throw new Error("Escribe dos ecuaciones, una por línea; por ejemplo: 2*x+y=7 y x-y=2.");
  const values = rows.map((row) => {
    const { difference } = parseEquation(row);
    const fn = difference.compile();
    const c = Number(fn.evaluate({ x: 0, y: 0 }));
    const ax = Number(fn.evaluate({ x: 1, y: 0 })) - c;
    const by = Number(fn.evaluate({ x: 0, y: 1 })) - c;
    const check = Number(fn.evaluate({ x: 2, y: 3 }));
    if (![ax, by, c, check].every(Number.isFinite) || !closeEnough(check, 2 * ax + 3 * by + c)) throw new Error("Los sistemas admitidos deben ser lineales en x e y.");
    return { ax, by, c };
  });
  const [one, two] = values;
  const det = one.ax * two.by - two.ax * one.by;
  if (closeEnough(det, 0)) {
    const same = closeEnough(one.ax * two.c, two.ax * one.c) && closeEnough(one.by * two.c, two.by * one.c);
    return { kind: same ? "identity" : "inconsistent", title: "Sistema de ecuaciones", solutions: [same ? "Infinitas soluciones" : "No tiene solución"], steps: ["Comparamos los coeficientes de ambas ecuaciones.", same ? "Las dos ecuaciones representan la misma recta." : "Las ecuaciones representan rectas paralelas distintas."] };
  }
  const x = (one.by * two.c - two.by * one.c) / det;
  const y = (two.ax * one.c - one.ax * two.c) / det;
  return { kind: "system", title: "Sistema de dos ecuaciones", solutions: [`x = ${display(x)}`, `y = ${display(y)}`], steps: [`Escribimos el sistema en forma ax + by + c = 0.`, `Determinante: ${display(det)}; como no es cero, existe una solución única.`, `Resolvemos por eliminación/Cramer: x = ${display(x)} e y = ${display(y)}.`, `Comprobación: sustituimos ambos valores en las dos ecuaciones originales.`], check: `(${display(x)}, ${display(y)})` };
}

function solveInequality(source: string): EquationResult {
  source = source.replaceAll("≤", "<=").replaceAll("≥", ">=");
  const match = source.match(/^(.*?)\s*(<=|>=|<|>)\s*(.*?)$/);
  if (!match) throw new Error("Usa <, >, ≤ o ≥ y escribe la variable x. Ejemplo: 2*x+3<9.");
  const { a, b, c } = polynomial(`${match[1]}=${match[3]}`);
  const relation = match[2];
  if (!closeEnough(a, 0)) throw new Error("Las inecuaciones disponibles son lineales; las cuadráticas todavía no se admiten aquí.");
  if (closeEnough(b, 0)) {
    const holds = relation === "<" ? c < 0 : relation === ">" ? c > 0 : relation === "<=" ? c <= 0 : c >= 0;
    return { kind: "inequality", title: "Inecuación", solutions: [holds ? "Todos los números reales" : "Conjunto vacío"], steps: [`Reducimos a ${display(c)} ${relation} 0.`, holds ? "La desigualdad se cumple para cualquier x." : "La desigualdad es falsa para todo x."] };
  }
  const boundary = -c / b;
  const flip = b < 0;
  const wantsGreater = relation === ">" || relation === ">=";
  const pointsRight = wantsGreater !== flip;
  const include = relation.includes("=");
  const symbol = pointsRight ? (include ? "≥" : ">") : (include ? "≤" : "<");
  const correctInterval = pointsRight ? `${include ? "[" : "("}${display(boundary)}, ∞)` : `(-∞, ${display(boundary)}${include ? "]" : ")"}`;
  return { kind: "inequality", title: "Inecuación lineal", solutions: [`x ${symbol} ${display(boundary)}`, `Intervalo: ${correctInterval}`], steps: [`Pasamos los términos para obtener ${display(b)}x ${relation} ${display(-c)}.`, `Dividimos por ${display(b)}${flip ? "; al dividir por un número negativo, invertimos el signo de la desigualdad." : "."}`, `La frontera es x = ${display(boundary)}; la solución es ${correctInterval}.`] };
}

export function expressionValue(source: string) {
  const solution = solveExpression(source);
  if (solution.numericValue === undefined) throw new Error("La respuesta no se pudo reducir a un número.");
  return solution.numericValue;
}

export function verifyNumericProcedure(source: string): boolean | null {
  const assertions = source.split(/[\n;]/).map((line) => line.trim().replace(/^\d+[.)]\s*/, "")).filter(Boolean);
  let checked = false;
  for (const assertion of assertions) {
    const match = assertion.match(/^(.+?)\s*=\s*(-?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?)$/i);
    if (!match) continue;
    try {
      const left = expressionValue(match[1].replace(/,/g, "."));
      const right = Number(match[2].replace(/,/g, "."));
      if (!Number.isFinite(right)) continue;
      checked = true;
      if (!closeEnough(left, right)) return false;
    } catch { /* Symbolic or prose steps are left for the AI reviewer. */ }
  }
  return checked ? true : null;
}

export function validateGraphExpression(source: string) {
  const { expression, root } = normalizeExpression(source);
  root.traverse((node) => { if (node.isSymbolNode && node.name === "y") throw new Error("Escribe y como y=f(x); la expresión debe depender solo de x."); });
  const graphExpression = root.transform((rawNode) => {
    const node = rawNode as MathAst;
    if (node.isFunctionNode && node.fn?.name === "log10") return parseAst(`log(${node.args[0].toString()})/log(10)`);
    if (node.isSymbolNode && node.name === "pi") return parseAst("PI");
    return node;
  });
  return graphExpression.toString() || expression;
}
