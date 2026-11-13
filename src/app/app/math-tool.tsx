"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { solveEquation, solveExpression } from "@/lib/math-engine";
import "./math-tool.css";

async function requestMath<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/math/solve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
  const body = await response.json() as { error?: string } & Record<string, unknown>;
  if (!response.ok) throw new Error(body.error || "No se pudo completar la operación matemática.");
  return body as T;
}

type MathSection = "calculator" | "calculations" | "equations" | "graphs" | "geometry" | "practice";
type Exercise = { question: string; concept: string; answerExpression: string; solutionSteps: string[] };
type PracticeResult = {
  score: number; correctCount: number; incorrectCount: number; recommendations: string[]; extraExercises: Exercise[];
  feedback: { index: number; correct: boolean; answer: string; expectedAnswer: number; procedureStatus: string; errorType: string; findings: string[]; correctProcedure: string }[];
};

const options: { id: MathSection; icon: string; title: string; description: string }[] = [
  { id: "calculator", icon: "⌗", title: "Calculadora paso a paso", description: "Resuelve expresiones y revisa el procedimiento." },
  { id: "calculations", icon: "％", title: "Cálculos", description: "Proporciones, fracciones, unidades y más." },
  { id: "equations", icon: "x=", title: "Ecuaciones", description: "Resuelve y comprueba ecuaciones e inecuaciones." },
  { id: "graphs", icon: "⌁", title: "Gráficas", description: "Representa, compara y explora funciones." },
  { id: "geometry", icon: "△", title: "Geometría", description: "Calcula medidas y observa figuras a escala." },
  { id: "practice", icon: "✎", title: "Practicar ejercicios", description: "Crea una actividad y recibe revisión detallada." },
];

function finite(value: string, label: string) {
  const number = Number(value.replace(",", "."));
  if (value.trim() === "" || !Number.isFinite(number)) throw new Error(`Escribe un número válido para ${label}.`);
  return number;
}
function pretty(value: number) { return new Intl.NumberFormat("es-UY", { maximumFractionDigits: 8 }).format(value); }
function ResultCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="math-result panel"><h3>{title}</h3>{children}</section>; }

export function MathTool({ onBack, enabled }: { onBack: () => void; enabled: boolean }) {
  const [section, setSection] = useState<MathSection | null>(null);
  const [error, setError] = useState("");
  const goHome = () => { setSection(null); setError(""); };
  return <section className="tool-view math-tool">
    {section && <button className="specialized-back" type="button" onClick={goHome}>← Volver a Matemática</button>}
    {!enabled ? <>
      {!section && <button className="specialized-back" type="button" onClick={onBack}>← Volver a Herramientas especializadas</button>}
      <div className="eyebrow">HERRAMIENTAS ESPECIALIZADAS</div><h1>Matemática</h1>
      <div className="math-lock panel"><span className="math-lock-icon">✦</span><h2>Disponible con Study Plus y Study Pro</h2><p>Elige un plan para desbloquear las herramientas de Matemática.</p><a className="primary-button math-link" href="/plans">Ver planes</a></div>
    </> : <>
      {!section ? <>
        <button className="specialized-back" type="button" onClick={onBack}>← Volver a Herramientas especializadas</button>
        <div className="eyebrow">HERRAMIENTAS ESPECIALIZADAS</div><h1>Matemática</h1><p className="tool-intro">Elige una herramienta para resolver, explorar o practicar matemáticas.</p>
        <div className="math-options-grid">{options.map((item) => <button type="button" className="math-option panel" key={item.id} onClick={() => { setSection(item.id); setError(""); }}><span className="math-option-icon">{item.icon}</span><span className="math-option-copy"><strong>{item.title}</strong><small>{item.description}</small></span><span className="math-option-arrow">→</span></button>)}</div>
      </> : <>
        <div className="eyebrow">MATEMÁTICA <span className="math-eyebrow-sep">/</span> {options.find((item) => item.id === section)?.title.toLocaleUpperCase("es")}</div>
        <h1>{options.find((item) => item.id === section)?.title}</h1>
        {error && <div role="alert" className="math-error">{error}</div>}
        {section === "calculator" && <Calculator onError={setError}/>}
        {section === "calculations" && <Calculations onError={setError}/>}
        {section === "equations" && <Equations onError={setError}/>}
        {section === "graphs" && <Graphing onError={setError}/>}
        {section === "geometry" && <Geometry onError={setError}/>}
        {section === "practice" && <Practice onError={setError}/>}
      </>}
    </>}
  </section>;
}

function Calculator({ onError }: { onError: (message: string) => void }) {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<ReturnType<typeof solveExpression> | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); onError("");
    try { const response=await requestMath<{result: ReturnType<typeof solveExpression>}>({action:"expression",source:expression}); setResult(response.result); } catch (error) { setResult(null); onError(error instanceof Error ? error.message : "No se pudo resolver la expresión."); }
  }
  return <div className="math-workspace">
    <form className="math-form panel" onSubmit={submit}><label htmlFor="math-expression">Escribe una expresión</label><input id="math-expression" value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="Ej.: (3/4 + 1/2) × 8 o 2*x + 3*x" autoComplete="off"/><p className="math-hint">Usa * para multiplicar, / para dividir, ^ para potencias y sqrt() para raíces. log() es base 10; ln() es logaritmo natural. Puedes usar x en expresiones algebraicas.</p><button className="primary-button" type="submit" disabled={!expression.trim()}>Resolver paso a paso</button></form>
    {result && <ResultCard title="Procedimiento"><ol className="math-steps">{result.steps.map((step, index) => <li key={`${index}-${step.expression}`}><span>{step.explanation}</span><code>{step.expression} = {step.result}</code></li>)}</ol><div className="math-final-result"><small>RESULTADO</small><strong>{result.result}</strong></div></ResultCard>}
  </div>;
}

type CalcKind = "rule3" | "percent" | "proportion" | "fraction" | "power" | "root" | "scientific" | "units";
const calculationNames: Record<CalcKind, string> = { rule3: "Regla de tres", percent: "Porcentajes", proportion: "Proporciones", fraction: "Fracciones", power: "Potencias", root: "Raíces", scientific: "Notación científica", units: "Conversión de unidades" };
const units: Record<string, { label: string; factor: number; family: string }> = {
  mm: { label: "Milímetros", factor: 0.001, family: "longitud" }, cm: { label: "Centímetros", factor: 0.01, family: "longitud" }, m: { label: "Metros", factor: 1, family: "longitud" }, km: { label: "Kilómetros", factor: 1000, family: "longitud" }, in: { label: "Pulgadas", factor: 0.0254, family: "longitud" }, ft: { label: "Pies", factor: 0.3048, family: "longitud" },
  mg: { label: "Miligramos", factor: 0.001, family: "masa" }, g: { label: "Gramos", factor: 1, family: "masa" }, kg: { label: "Kilogramos", factor: 1000, family: "masa" }, lb: { label: "Libras", factor: 453.59237, family: "masa" },
  ms: { label: "Milisegundos", factor: 0.001, family: "tiempo" }, s: { label: "Segundos", factor: 1, family: "tiempo" }, min: { label: "Minutos", factor: 60, family: "tiempo" }, h: { label: "Horas", factor: 3600, family: "tiempo" }, day: { label: "Días", factor: 86400, family: "tiempo" },
};

function Calculations({ onError }: { onError: (message: string) => void }) {
  const [kind, setKind] = useState<CalcKind>("rule3");
  const [v, setV] = useState<Record<string, string>>({ a: "", b: "", c: "", d: "", from: "m", to: "cm" });
  const [result, setResult] = useState<{ formula: string; steps: string[]; answer: string } | null>(null);
  const fields: Record<CalcKind, { name: string; label: string; placeholder?: string }[]> = {
    rule3: [{ name: "a", label: "A" }, { name: "b", label: "B" }, { name: "c", label: "C" }], percent: [{ name: "a", label: "Porcentaje (%)" }, { name: "b", label: "Cantidad total" }],
    proportion: [{ name: "a", label: "Primer numerador" }, { name: "b", label: "Primer denominador" }, { name: "c", label: "Segundo numerador" }], fraction: [{ name: "a", label: "Numerador 1" }, { name: "b", label: "Denominador 1" }, { name: "c", label: "Numerador 2" }, { name: "d", label: "Denominador 2" }],
    power: [{ name: "a", label: "Base" }, { name: "b", label: "Exponente" }], root: [{ name: "a", label: "Radicando" }, { name: "b", label: "Índice de la raíz" }], scientific: [{ name: "a", label: "Número" }], units: [{ name: "a", label: "Valor" }],
  };
  async function calculate(event: FormEvent) {
    event.preventDefault(); onError("");
    try {
      const values: Record<string, unknown> = {};
      for (const key of fields[kind].map(field => field.name)) values[key] = finite(v[key] || "", key);
      if (kind === "fraction") values.operation = v.operation || "+";
      if (kind === "units") { values.from = v.from; values.to = v.to; }
      const response = await requestMath<{ result: { formula: string; steps: string[]; answer: string } }>({ action: "calculation", kind, values });
      setResult(response.result);
    } catch (error) { setResult(null); onError(error instanceof Error ? error.message : "No se pudo realizar el cálculo."); }
  }
  return <div className="math-workspace"><div className="math-selector-row">{Object.entries(calculationNames).map(([id, label]) => <button type="button" key={id} className={kind === id ? "active" : ""} onClick={() => { setKind(id as CalcKind); setResult(null); onError(""); }}>{label}</button>)}</div><form className="math-form panel" onSubmit={calculate}><div className="math-fields-grid">{fields[kind].map((field) => <label key={field.name}>{field.label}<input inputMode="decimal" value={v[field.name] || ""} onChange={(event) => setV({ ...v, [field.name]: event.target.value })}/></label>)}{kind === "fraction" && <label>Operación<select value={v.operation || "+"} onChange={(event) => setV({ ...v, operation: event.target.value })}><option value="+">Suma</option><option value="-">Resta</option><option value="*">Multiplicación</option><option value="/">División</option></select></label>}{kind === "units" && <><label>Desde<select value={v.from} onChange={(event) => setV({ ...v, from: event.target.value })}>{Object.entries(units).map(([key, unit]) => <option key={key} value={key}>{unit.label}</option>)}</select></label><label>Hacia<select value={v.to} onChange={(event) => setV({ ...v, to: event.target.value })}>{Object.entries(units).map(([key, unit]) => <option key={key} value={key}>{unit.label}</option>)}</select></label></>}</div><button className="primary-button" type="submit">Calcular y mostrar desarrollo</button></form>{result && <ResultCard title="Fórmula y desarrollo"><div className="math-formula">{result.formula}</div><ol className="math-steps">{result.steps.map((step, i) => <li key={i}>{step}</li>)}</ol><div className="math-final-result"><small>RESULTADO</small><strong>{result.answer}</strong></div></ResultCard>}</div>;
}

function Equations({ onError }: { onError: (message: string) => void }) {
  const [mode, setMode] = useState<"equation" | "inequality">("equation");
  const [source, setSource] = useState("");
  const [result, setResult] = useState<ReturnType<typeof solveEquation> | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); onError(""); try { const response=await requestMath<{result: ReturnType<typeof solveEquation>}>({action:"equation",source,mode}); setResult(response.result); } catch (error) { setResult(null); onError(error instanceof Error ? error.message : "No se pudo resolver."); } }
  return <div className="math-workspace"><div className="math-selector-row"><button type="button" className={mode === "equation" ? "active" : ""} onClick={() => setMode("equation")}>Ecuaciones y sistemas</button><button type="button" className={mode === "inequality" ? "active" : ""} onClick={() => setMode("inequality")}>Inecuaciones</button></div><form className="math-form panel" onSubmit={submit}><label htmlFor="equation-input">{mode === "inequality" ? "Inecuación" : "Ecuación o sistema"}</label><textarea id="equation-input" value={source} onChange={(event) => setSource(event.target.value)} placeholder={mode === "inequality" ? "2*x + 3 < 9" : "2*x^2 - 5*x + 2 = 0\nO dos ecuaciones, una por línea"} rows={3}/><p className="math-hint">Admite ecuaciones lineales, cuadráticas y sistemas lineales en x e y. Escribe multiplicaciones con *; para sistemas, una ecuación por línea.</p><button className="primary-button" type="submit" disabled={!source.trim()}>Resolver y comprobar</button></form>{result && <ResultCard title={result.title}><ol className="math-steps">{result.steps.map((step, i) => <li key={i}>{step}</li>)}</ol><div className="math-final-result"><small>SOLUCIÓN</small><strong>{result.solutions.length ? result.solutions.join(" · ") : "Sin soluciones reales"}</strong></div></ResultCard>}</div>;
}

function Graphing({ onError }: { onError: (message: string) => void }) {
  const graphRef = useRef<HTMLDivElement>(null);
  const [fn, setFn] = useState("a*x^2+b"); const [compare, setCompare] = useState(""); const [parameterA, setParameterA] = useState(1); const [parameterB, setParameterB] = useState(0); const [plotVersion, setPlotVersion] = useState(0); const [plotWidth, setPlotWidth] = useState(0);
  const [domain, setDomain] = useState(10); const [pointX, setPointX] = useState(""); const [point, setPoint] = useState<{ x: number; y: number } | null>(null); const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    let disposed = false; let resize: ResizeObserver | null = null;
    async function draw() {
      if (!graphRef.current) return;
      graphRef.current.innerHTML = "";
      try {
        const substitute = (expression: string) => expression.replace(/\ba\b/g, `(${parameterA})`).replace(/\bb\b/g, `(${parameterB})`);
        const sourceExpressions = [fn, compare].filter(Boolean).map(substitute);
        const validated = await requestMath<{ expressions: string[] }>({ action: "graph", expressions: sourceExpressions });
        if (disposed || !graphRef.current) return;
        const graphModule = await import("function-plot"); if (disposed || !graphRef.current) return;
        const graph = graphModule.default;
        const width = Math.max(280, Math.floor(plotWidth || graphRef.current.clientWidth));
        const expressions = validated.expressions;
        const data: import("function-plot").FunctionPlotDatum[] = expressions.map((expression, index) => ({ fn: expression, sampler: "builtIn", color: index === 0 ? "#922d40" : "#8b77c8" }));
        if (point) data.push({ fnType: "points", graphType: "scatter", points: [[point.x, point.y]], color: "#c0253b" });
        const instance = graph({ target: graphRef.current, width, height: Math.max(310, Math.min(440, Math.round(width * 0.58))), grid: true, tip: { xLine: true, yLine: true }, xAxis: { domain: [-domain, domain], label: "x" }, yAxis: { domain: [-domain, domain], label: "y" }, data });
        instance.on("tip:update", (coordinates: { x: number; y: number }) => { if (!disposed) setHover({ x: coordinates.x, y: coordinates.y }); });
        const stage = graphRef.current.parentElement;
        if (stage) { resize = new ResizeObserver((entries) => { const next = Math.floor(entries[0]?.contentRect.width || 0); if (!disposed && next > 0) setPlotWidth((current) => Math.abs(current - next) > 1 ? next : current); }); resize.observe(stage); }
      } catch (error) { if (!disposed) onError(error instanceof Error ? error.message : "No se pudo graficar la función."); }
    }
    if (!fn.trim()) { onError("Escribe al menos una función para dibujar."); return; }
    void draw();
    return () => { disposed = true; resize?.disconnect(); };
  // The resize observer changes the measured width; the data redraws when it changes.
  }, [fn, compare, parameterA, parameterB, domain, plotVersion, point, plotWidth, onError]);
  function plot(event: FormEvent) { event.preventDefault(); onError(""); setHover(null); setPoint(null); setPlotVersion((key) => key + 1); }
  const substitute = (expression: string) => expression.replace(/\ba\b/g, `(${parameterA})`).replace(/\bb\b/g, `(${parameterB})`);
  async function markPoint() { onError(""); try { const x = finite(pointX, "la coordenada x"), response=await requestMath<{value:number}>({action:"value",source:substitute(fn).replace(/\bx\b/g, `(${x})`)}); setPoint({ x, y:response.value }); } catch (error) { onError(error instanceof Error ? error.message : "No se pudo identificar ese punto."); } }
  return <div className="math-workspace"><form className="math-form panel" onSubmit={plot}><div className="math-fields-grid"><label>Función f(x)<input value={fn} onChange={(event) => setFn(event.target.value)} placeholder="a*x^2+b"/></label><label>Comparar con g(x) (opcional)<input value={compare} onChange={(event) => setCompare(event.target.value)} placeholder="2*x + 1"/></label></div><div className="math-parameters"><label>Parámetro a: {pretty(parameterA)}<input type="range" min="-5" max="5" step="0.1" value={parameterA} onChange={(event) => setParameterA(Number(event.target.value))}/></label><label>Parámetro b: {pretty(parameterB)}<input type="range" min="-10" max="10" step="0.5" value={parameterB} onChange={(event) => setParameterB(Number(event.target.value))}/></label></div><div className="graph-controls"><button type="submit" className="primary-button">Graficar</button><span>Zoom:</span><button type="button" className="math-small-button" onClick={() => setDomain((value) => Math.max(1, value / 1.5))}>＋ Acercar</button><button type="button" className="math-small-button" onClick={() => setDomain((value) => Math.min(1000, value * 1.5))}>− Alejar</button><label>Marcar x<input inputMode="decimal" value={pointX} onChange={(event) => setPointX(event.target.value)}/></label><button type="button" className="math-small-button" onClick={markPoint}>Identificar punto</button></div><p className="math-hint">Arrastra el gráfico para desplazarte y usa la rueda del ratón o los controles para cambiar el zoom. Pasa el cursor por la curva para ver coordenadas. Puedes usar a y b en las funciones.</p></form><div className="graph-stage panel"><div className="graph-canvas" ref={graphRef}/><span className="graph-status">f(x) = {fn} (a={pretty(parameterA)}, b={pretty(parameterB)}){compare.trim() ? ` · g(x) = ${compare}` : ""}</span></div>{(point || hover) && <ResultCard title={point ? "Punto identificado en f(x)" : "Coordenadas del cursor"}><div className="graph-coordinates">{point ? `(${pretty(point.x)}, ${pretty(point.y)})` : `(${pretty(hover!.x)}, ${pretty(hover!.y)})`}</div>{point && <small>f({pretty(point.x)}) = {pretty(point.y)}</small>}</ResultCard>}</div>;
}

type ShapeKind = "triangle" | "circle" | "rectangle" | "polygon" | "cuboid" | "sphere" | "cylinder" | "angles" | "pythagorean";
const shapeNames: Record<ShapeKind, string> = { triangle: "Triángulo", circle: "Circunferencia", rectangle: "Rectángulo", polygon: "Polígono regular", cuboid: "Prisma rectangular", sphere: "Esfera", cylinder: "Cilindro", angles: "Ángulos", pythagorean: "Teorema de Pitágoras" };
const shapeInputs: Record<ShapeKind, { key: string; label: string; defaultValue: number }[]> = {
  triangle: [{ key: "base", label: "Base", defaultValue: 6 }, { key: "height", label: "Altura", defaultValue: 4 }, { key: "sideA", label: "Lado A", defaultValue: 5 }, { key: "sideB", label: "Lado B", defaultValue: 5 }],
  circle: [{ key: "radius", label: "Radio", defaultValue: 3 }], rectangle: [{ key: "width", label: "Base", defaultValue: 5 }, { key: "height", label: "Altura", defaultValue: 3 }],
  polygon: [{ key: "side", label: "Lado", defaultValue: 3 }, { key: "sides", label: "Cantidad de lados (3–20)", defaultValue: 6 }],
  cuboid: [{ key: "length", label: "Largo", defaultValue: 4 }, { key: "width", label: "Ancho", defaultValue: 3 }, { key: "height", label: "Alto", defaultValue: 2 }],
  sphere: [{ key: "radius", label: "Radio", defaultValue: 3 }], cylinder: [{ key: "radius", label: "Radio", defaultValue: 2 }, { key: "height", label: "Altura", defaultValue: 5 }],
  angles: [{ key: "angleA", label: "Ángulo A (°)", defaultValue: 55 }, { key: "angleB", label: "Ángulo B (°)", defaultValue: 65 }],
  pythagorean: [{ key: "legA", label: "Cateto a", defaultValue: 3 }, { key: "legB", label: "Cateto b", defaultValue: 4 }],
};
/* eslint-disable react-hooks/error-boundaries -- Geometry only catches input/calculation errors; its SVG output is static. */
function Geometry({ onError }: { onError: (message: string) => void }) {
  const [kind, setKind] = useState<ShapeKind>("triangle"); const [values, setValues] = useState<Record<string, string>>({ base: "6", height: "4", sideA: "5", sideB: "5", radius: "3", width: "5", length: "4", side: "3", sides: "6", legA: "3", legB: "4", angleA: "55", angleB: "65" });
  const [serverResult, setServerResult] = useState<{ key: string; rows: { label: string; value: string; formula: string }[] } | null>(null);
  const requestKey = JSON.stringify([kind, values]);
  const serverRows = serverResult?.key === requestKey ? serverResult.rows : null;
  useEffect(() => {
    let active = true;
    const input = Object.fromEntries(shapeInputs[kind].map(field => [field.key, Number(values[field.key] ?? field.defaultValue)]));
    void requestMath<{ rows: { label: string; value: string; formula: string }[] }>({ action: "geometry", kind, values: input }).then(response => { if(active) setServerResult({ key: requestKey, rows: response.rows }); }).catch(error => { if(active) { setServerResult({ key: requestKey, rows: [] }); onError(error instanceof Error ? error.message : "No se pudo calcular la figura."); } });
    return () => { active = false; };
  }, [kind, values, onError, requestKey]);
  const calculated = useMemo(() => {
    try {
      const p = Object.fromEntries(shapeInputs[kind].map((item) => [item.key, finite(values[item.key] ?? String(item.defaultValue), item.label)])) as Record<string, number>;
      if (Object.values(p).some((n) => n < 0)) throw new Error("Las dimensiones no pueden ser negativas.");
      switch (kind) {
        case "triangle": { const sideA = p.sideA, sideB = p.sideB, base = p.base; if (![base, p.height, sideA, sideB].every((n) => n > 0) || sideA + sideB <= base || sideA + base <= sideB || sideB + base <= sideA) throw new Error("Las medidas deben formar un triángulo válido."); const semiperimeter = (base + sideA + sideB) / 2, heronArea = Math.sqrt(semiperimeter * (semiperimeter-base) * (semiperimeter-sideA) * (semiperimeter-sideB)), expectedHeight = 2 * heronArea / base; if (Math.abs(expectedHeight - p.height) > 0.01 * Math.max(1, expectedHeight)) throw new Error(`Para esos lados, la altura debe ser aproximadamente ${pretty(expectedHeight)}.`); return { rows: [{ label: "Área", value: pretty(heronArea), formula: "base × altura / 2" }, { label: "Perímetro", value: pretty(base + sideA + sideB), formula: "base + lado A + lado B" }], svg: <svg viewBox="0 0 220 150" aria-label="Diagrama de un triángulo"><path d="M30 125 L185 125 L105 24 Z"/><path d="M105 24 L105 125" className="shape-height"/><text x="96" y="146">{pretty(base)}</text><text x="112" y="85">{pretty(p.height)}</text></svg> }; }
        case "circle": return { rows: [{ label: "Área", value: pretty(Math.PI * p.radius ** 2), formula: "π × radio²" }, { label: "Longitud de la circunferencia", value: pretty(2 * Math.PI * p.radius), formula: "2 × π × radio" }], svg: <svg viewBox="0 0 220 150" aria-label="Diagrama de una circunferencia"><circle cx="105" cy="75" r="50"/><path d="M105 75 L155 75" className="shape-height"/><text x="122" y="69">r={pretty(p.radius)}</text></svg> };
        case "rectangle": return { rows: [{ label: "Área", value: pretty(p.width * p.height), formula: "base × altura" }, { label: "Perímetro", value: pretty(2 * (p.width + p.height)), formula: "2 × (base + altura)" }], svg: <svg viewBox="0 0 220 150" aria-label="Diagrama de un rectángulo"><rect x="45" y="30" width="130" height="90"/><text x="97" y="141">{pretty(p.width)}</text><text x="178" y="77">{pretty(p.height)}</text></svg> };
        case "polygon": { if (!Number.isInteger(p.sides) || p.sides < 3 || p.sides > 20) throw new Error("El polígono debe tener entre 3 y 20 lados enteros."); const perimeter = p.sides * p.side, area = p.sides * p.side ** 2 / (4 * Math.tan(Math.PI / p.sides)); const points = Array.from({ length: p.sides }, (_, i) => `${110 + 52 * Math.cos(2 * Math.PI * i / p.sides - Math.PI / 2)},${75 + 52 * Math.sin(2 * Math.PI * i / p.sides - Math.PI / 2)}`).join(" "); return { rows: [{ label: "Área", value: pretty(area), formula: "n × lado² / (4 × tan(π/n))" }, { label: "Perímetro", value: pretty(perimeter), formula: "n × lado" }], svg: <svg viewBox="0 0 220 150" aria-label={`Polígono regular de ${p.sides} lados`}><polygon points={points}/><text x="99" y="141">{p.sides} lados</text></svg> }; }
        case "cuboid": return { rows: [{ label: "Volumen", value: pretty(p.length * p.width * p.height), formula: "largo × ancho × alto" }, { label: "Área superficial", value: pretty(2 * (p.length*p.width+p.length*p.height+p.width*p.height)), formula: "2(largo×ancho + largo×alto + ancho×alto)" }], svg: <svg viewBox="0 0 220 150" aria-label="Diagrama de un prisma rectangular"><path d="M48 50 L130 50 L170 28 L88 28 Z M48 50 L48 112 L130 112 L130 50 M130 112 L170 90 L170 28"/><text x="80" y="130">{pretty(p.length)} × {pretty(p.width)} × {pretty(p.height)}</text></svg> };
        case "sphere": return { rows: [{ label: "Volumen", value: pretty(4 * Math.PI * p.radius ** 3 / 3), formula: "(4/3) × π × radio³" }, { label: "Área superficial", value: pretty(4 * Math.PI * p.radius ** 2), formula: "4 × π × radio²" }], svg: <svg viewBox="0 0 220 150" aria-label="Diagrama de una esfera"><circle cx="105" cy="75" r="52"/><ellipse cx="105" cy="75" rx="52" ry="20"/><text x="88" y="141">r={pretty(p.radius)}</text></svg> };
        case "cylinder": return { rows: [{ label: "Volumen", value: pretty(Math.PI*p.radius**2*p.height), formula: "π × radio² × altura" }, { label: "Área total", value: pretty(2*Math.PI*p.radius*(p.radius+p.height)), formula: "2πr(r + h)" }], svg: <svg viewBox="0 0 220 150" aria-label="Diagrama de un cilindro"><path d="M55 42 C55 20 165 20 165 42 V108 C165 130 55 130 55 108 Z M55 42 C55 64 165 64 165 42 M55 108 C55 130 165 130 165 108"/><text x="85" y="84">r={pretty(p.radius)}</text><text x="171" y="80">h={pretty(p.height)}</text></svg> };
        case "angles": { const third = 180 - p.angleA - p.angleB; const valid = p.angleA > 0 && p.angleB > 0 && third > 0; return { rows: [{ label: "Ángulo C", value: `${pretty(third)}°`, formula: "180° − A − B" }, { label: "Comprobación", value: valid ? "Los tres ángulos forman un triángulo" : "Los ángulos ingresados no forman un triángulo", formula: `${pretty(p.angleA)}° + ${pretty(p.angleB)}° + ${pretty(third)}° = 180°` }], svg: <svg viewBox="0 0 220 150" aria-label="Triángulo con sus ángulos"><path d="M35 125 L180 125 L110 25 Z"/><text x="43" y="119">{pretty(p.angleA)}°</text><text x="148" y="119">{pretty(p.angleB)}°</text><text x="101" y="53">{pretty(third)}°</text></svg> }; }
        case "pythagorean": { const hyp = Math.hypot(p.legA, p.legB); return { rows: [{ label: "Hipotenusa", value: pretty(hyp), formula: "c = √(a² + b²)" }, { label: "Comprobación", value: pretty(hyp ** 2), formula: `${pretty(p.legA)}² + ${pretty(p.legB)}² = c²` }], svg: <svg viewBox="0 0 220 150" aria-label="Triángulo rectángulo del teorema de Pitágoras"><path d="M50 120 L170 120 L50 40 Z"/><text x="95" y="139">a={pretty(p.legA)}</text><text x="22" y="80">b={pretty(p.legB)}</text><text x="108" y="70">c={pretty(hyp)}</text></svg> };
      }
      }
    } catch (error) { return { error: error instanceof Error ? error.message : "Revisa las dimensiones ingresadas." }; }
  }, [kind, values]);
  return (
    <div className="math-workspace">
      <div className="math-selector-row math-shape-selector">
        {Object.entries(shapeNames).map(([id, name]) => (
          <button type="button" className={kind === id ? "active" : ""} key={id} onClick={() => { setKind(id as ShapeKind); onError(""); }}>
            {name}
          </button>
        ))}
      </div>
      <div className="math-geometry-grid">
        <section className="math-form panel">
          <h2>{shapeNames[kind]}</h2>
          <div className="math-fields-grid">
            {shapeInputs[kind].map((field) => (
              <label key={field.key}>
                {field.label}
                <input type="number" min="0" step="any" value={values[field.key]} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} />
              </label>
            ))}
          </div>
          <p className="math-hint">Los resultados se actualizan al cambiar las medidas. Las figuras son esquemas visuales, no están dibujadas a escala exacta.</p>
        </section>
        <section className="math-figure panel">
          {calculated && "error" in calculated && <p role="alert" className="math-error-inline">{calculated.error}</p>}
          {calculated && !("error" in calculated) && serverRows && <div className="math-geometry-results">
            {calculated.svg}
            <div className="math-measure-results">
              {serverRows.map((row) => (
                <div key={row.label}><span>{row.label}</span><strong>{row.value}</strong><small>{row.formula}</small></div>
              ))}
            </div>
          </div>}
        </section>
      </div>
    </div>
  );
}
/* eslint-enable react-hooks/error-boundaries */

function Practice({ onError }: { onError: (message: string) => void }) {
  const [topic, setTopic] = useState(""); const [level, setLevel] = useState("Secundaria"); const [difficulty, setDifficulty] = useState("Media"); const [count, setCount] = useState(5); const [exercises, setExercises] = useState<Exercise[]>([]); const [responses, setResponses] = useState<{ answer: string; procedure: string }[]>([]); const [result, setResult] = useState<PracticeResult | null>(null); const [busy, setBusy] = useState(false);
  async function callApi(body: unknown) { const response = await fetch("/api/math/practice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json() as Record<string, unknown>; if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "No se pudo completar la actividad."); return data; }
  async function generate(event: FormEvent) { event.preventDefault(); onError(""); setBusy(true); setResult(null); setExercises([]); try { const data = await callApi({ action: "generate", topic, level, difficulty, count }); if (!Array.isArray(data.exercises) || data.exercises.length !== count) throw new Error("El servidor no devolvió la cantidad solicitada."); const list = data.exercises as Exercise[]; setExercises(list); setResponses(list.map(() => ({ answer: "", procedure: "" }))); } catch (error) { onError(error instanceof Error ? error.message : "No se pudieron generar los ejercicios."); } finally { setBusy(false); } }
  async function submitAnswers(event: FormEvent) { event.preventDefault(); onError(""); setBusy(true); try { const data = await callApi({ action: "grade", exercises, responses }); setResult(data as PracticeResult); } catch (error) { onError(error instanceof Error ? error.message : "No se pudieron revisar las respuestas."); } finally { setBusy(false); } }
  function startExtra() { if (!result?.extraExercises?.length) return; setExercises(result.extraExercises); setResponses(result.extraExercises.map(() => ({ answer: "", procedure: "" }))); setResult(null); onError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  return <div className="math-workspace"><form className="math-form panel" onSubmit={generate}><p className="math-hint">La actividad se prepara con Ollama. El motor matemático vuelve a calcular las respuestas antes de corregirlas.</p><div className="math-fields-grid practice-fields"><label>Tema que estás estudiando<input required minLength={2} maxLength={120} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ej.: ecuaciones de primer grado"/></label><label>Nivel educativo<select value={level} onChange={(event) => setLevel(event.target.value)}><option>Primaria</option><option>Secundaria</option><option>Bachillerato</option><option>Universidad</option></select></label><label>Dificultad<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Fácil</option><option>Media</option><option>Difícil</option></select></label><label>Cantidad de ejercicios<select value={count} onChange={(event) => setCount(Number(event.target.value))}>{[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select></label></div><button className="primary-button" type="submit" disabled={busy || topic.trim().length < 2}>{busy && !exercises.length ? "Generando con IA…" : "Generar actividad"}</button></form>
    {exercises.length > 0 && !result && <form className="math-practice-list" onSubmit={submitAnswers}>{exercises.map((exercise, index) => <article className="math-exercise panel" key={`${index}-${exercise.question}`}><div className="math-exercise-head"><span>Ejercicio {index + 1}</span><small>{exercise.concept}</small></div><h3>{exercise.question}</h3><label>Tu respuesta<input value={responses[index]?.answer || ""} onChange={(event) => setResponses(responses.map((item, i) => i === index ? { ...item, answer: event.target.value } : item))} placeholder="Escribe el resultado"/></label><label>Tu procedimiento<textarea rows={3} value={responses[index]?.procedure || ""} onChange={(event) => setResponses(responses.map((item, i) => i === index ? { ...item, procedure: event.target.value } : item))} placeholder="Explica los pasos que usaste…"/></label></article>)}<button className="primary-button" type="submit" disabled={busy}>{busy ? "Revisando respuestas y procedimientos…" : "Enviar respuestas para corregir"}</button></form>}
    {result && <section className="math-grade panel"><div className="math-grade-top"><div><small>EVALUACIÓN</small><h2>{result.score}%</h2></div><div><strong>{result.correctCount} correctas</strong><span>{result.incorrectCount} para revisar</span></div></div><div className="math-grade-list">{result.feedback.map((item, index) => <article key={item.index} className={`math-grade-item ${item.correct ? "is-correct" : "is-incorrect"}`}><h3>Ejercicio {index + 1} · {item.correct ? "Correcto" : "Revisar respuesta"}</h3><p>Tu respuesta: <strong>{item.answer}</strong> · Resultado calculado: <strong>{pretty(item.expectedAnswer)}</strong></p><p>Revisión del procedimiento: <strong>{item.errorType}</strong></p>{item.findings.map((finding, i) => <p className="math-feedback-finding" key={i}>{finding}</p>)}<details><summary>Ver procedimiento correcto</summary><p>{item.correctProcedure}</p></details></article>)}</div><div className="math-recommendations"><h3>Qué repasar</h3><ul>{result.recommendations.map((recommendation, index) => <li key={index}>{recommendation}</li>)}</ul><h3>Ejercicios adicionales</h3><ol>{result.extraExercises.map((exercise, index) => <li key={index}>{exercise.question} <small>({exercise.concept})</small></li>)}</ol><button className="primary-button" type="button" onClick={startExtra}>Practicar ejercicios de refuerzo</button></div></section>}
  </div>;
}
