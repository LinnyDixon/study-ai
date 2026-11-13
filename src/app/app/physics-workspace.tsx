"use client";

import { useEffect, useMemo, useState } from "react";
import { createPhysicsPracticeExercises, formatPhysicsNumber, getFormula, physicsFormulas, physicsTopics, simulatePhysics, solvePhysicsFormula, toSI } from "@/lib/physics";
import "./physics-workspace.css";

type Section = "Fórmulas" | "Problemas" | "Diagramas" | "Simulaciones" | "Practicar ejercicios";
type PhysicsInput = { value: number; unit: string };
type AIProblem = { formulaId: string; target: string; known: Record<string, PhysicsInput>; method?: string; needsClarification?: boolean; clarification?: string };
const sectionItems: { id: Section; icon: string; description: string }[] = [
  { id: "Fórmulas", icon: "ƒ", description: "Ecuaciones, variables y ejemplos." },
  { id: "Problemas", icon: "⌕", description: "Analiza un enunciado o una fotografía." },
  { id: "Diagramas", icon: "◇", description: "Explora modelos físicos interactivos." },
  { id: "Simulaciones", icon: "◉", description: "Cambia variables y observa el modelo." },
  { id: "Practicar ejercicios", icon: "✓", description: "Resuelve ejercicios con corrección." },
];

async function askPhysics(task: "physics_problem" | "physics_practice", prompt: string, images?: string[], practiceCount?: number) {
  const response = await fetch("/api/ai/chat", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ task, language: "es", messages: [{ role: "user", content: prompt }], ...(images?.length ? { images } : {}), ...(practiceCount ? { physicsPracticeCount: practiceCount } : {}) }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "No se pudo consultar Ollama.");
  return String(body.answer || "");
}
function parseJson<T>(answer: string): T {
  return JSON.parse(answer.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) as T;
}

function PhysicsSolver({ practice = false }: { practice?: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [solution, setSolution] = useState<{ question: string; formula: string; result: string; unit: string; method: string; known: string[]; clarification?: string }>();
  const [pending, setPending] = useState<{ question: string; formulaId: string; target: string; known: Record<string, number>; method: string }>();
  const [topic, setTopic] = useState(physicsTopics[0]);
  const [level, setLevel] = useState("Secundaria");
  const [difficulty, setDifficulty] = useState("Intermedio");
  const [count, setCount] = useState(3);
  const [items, setItems] = useState<{ prompt: string; formulaId: string; target: string; known: Record<string, PhysicsInput> }[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [grade, setGrade] = useState<string[]>([]);

  async function solve() {
    setError(""); setSolution(undefined); setPending(undefined); setBusy(true);
    try {
      const catalog = physicsFormulas.map(f => `ID ${f.id}: ${f.expression}; símbolos: ${f.variables.map(v => `${v.symbol}=${v.name} [${v.unit}]`).join(", ")}`).join("\n");
      const answer = await askPhysics("physics_problem", `Identifica la incógnita usando su símbolo exacto como target, no el nombre en palabras. Usa como claves de known solo los símbolos exactos del catálogo e incluye todos los datos dados (reposo significa v0=0). No calcules el resultado ni inventes datos. Si falta algo esencial, needsClarification=true y pregunta qué dato falta. Devuelve solo el JSON requerido por el esquema. Catálogo:\n${catalog}\nProblema: ${prompt}`, image ? [image] : undefined);
      const data = parseJson<AIProblem>(answer);
      if (data.needsClarification) { setSolution({ question: prompt, formula: "", result: "", unit: "", method: "", known: [], clarification: data.clarification || "¿Puedes aclarar los datos y qué se solicita?" }); return; }
      const formula = getFormula(data.formulaId);
      if (!formula || !data.known || typeof data.target !== "string") throw new Error("No se identificó una fórmula compatible. Prueba con el enunciado completo.");
      const values: Record<string, number> = {}; const lines: string[] = [];
      for (const [symbol, entry] of Object.entries(data.known)) {
        const variable = formula.variables.find(v => v.symbol === symbol);
        if (!variable || !Number.isFinite(entry?.value)) throw new Error("Los datos identificados no se pudieron validar.");
        const converted = toSI(entry.value, entry.unit, variable.unit);
        if (converted === null) throw new Error(`No puedo convertir ${entry.unit} a ${variable.unit} (${symbol}).`);
        values[symbol] = converted; lines.push(`${symbol} = ${formatPhysicsNumber(converted)} ${variable.unit}`);
      }
      const target = formula.variables.find(v => v.symbol === data.target);
      if (!target) throw new Error("Ollama no identificó la incógnita con un símbolo válido.");
      const result = solvePhysicsFormula(formula.id, data.target, values);
      if (result === null) { setPending({ question: prompt, formulaId: formula.id, target: target.symbol, known: values, method: data.method || "" }); return; }
      const substitution = formula.variables.filter(variable => variable.symbol !== data.target).map(variable => `${variable.symbol}=${formatPhysicsNumber(values[variable.symbol])} ${variable.unit}`).join("; ");
      setSolution({ question: prompt, formula: `${formula.name}: ${formula.expression}`, result: formatPhysicsNumber(result), unit: target.unit, method: `1) Datos en SI: ${substitution}. 2) Despejar ${target.symbol} en ${formula.expression}. 3) Sustituir los datos y evaluar numéricamente. ${data.method || ""}`.trim(), known: lines });
    } catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error."); }
    finally { setBusy(false); }
  }

  async function generate() {
    setError(""); setNotice(""); setItems([]); setGrade([]); setBusy(true);
    try {
      const catalog = physicsFormulas.filter(f => f.topic === topic).map(f => `ID ${f.id}: ${f.expression}; símbolos: ${f.variables.map(v => `${v.symbol} [${v.unit}]`).join(", ")}`).join("\n");
      const answer = await askPhysics("physics_practice", `Genera exactamente ${count} ejercicios de ${topic}, nivel ${level}, dificultad ${difficulty}. target debe ser el símbolo exacto pedido, no el nombre de variable. known usa claves de símbolo exactas y datos completos. Verifica que cada ejercicio se resuelva con resultado finito y coherente. No incluyas respuestas. Catálogo permitido:\n${catalog}`, undefined, count);
      const raw = parseJson<{ items: { prompt: string; formulaId: string; target: string; known: Record<string, PhysicsInput> }[] }>(answer);
      if (!Array.isArray(raw.items) || raw.items.length !== count) throw new Error("La IA no generó la cantidad solicitada. Intenta otra vez.");
      for (const item of raw.items) {
        const f = getFormula(item.formulaId);
        if (!f || f.topic !== topic || !f.variables.some(v => v.symbol === item.target)) throw new Error("Un ejercicio no coincide con el tema; vuelve a generar.");
        const values: Record<string, number> = {};
        for (const [symbol, entry] of Object.entries(item.known || {})) {
          const variable = f.variables.find(v => v.symbol === symbol); if (!variable || !Number.isFinite(entry.value)) throw new Error("Datos de ejercicio inválidos.");
          const n = toSI(entry.value, entry.unit, variable.unit); if (n === null) throw new Error("Unidad incompatible en ejercicio."); values[symbol] = n;
        }
        if (solvePhysicsFormula(f.id, item.target, values) === null) throw new Error("Un ejercicio no tiene datos suficientes.");
      }
      setItems(raw.items);
    } catch (e) {
      setItems(createPhysicsPracticeExercises(topic, difficulty, count));
      setNotice(`Ollama no generó datos válidos (${e instanceof Error ? e.message : "error de respuesta"}). Se creó una práctica de respaldo con cálculos comprobados.`);
    }
    finally { setBusy(false); }
  }

  function checkAnswers() {
    setGrade(items.map((item, i) => {
      const f = getFormula(item.formulaId)!; const target = f.variables.find(v => v.symbol === item.target)!; const values: Record<string, number> = {};
      for (const [symbol, entry] of Object.entries(item.known)) values[symbol] = toSI(entry.value, entry.unit, f.variables.find(v => v.symbol === symbol)!.unit)!;
      const expected = solvePhysicsFormula(item.formulaId, item.target, values)!; const response = answers[i] || "";
      const numberText = response.match(/[-+]?\d+(?:[.,]\d+)?(?:e[-+]?\d+)?/i)?.[0]; const actual = numberText ? Number(numberText.replace(",", ".")) : NaN;
      const numberOk = Number.isFinite(actual) && Math.abs(actual - expected) <= Math.max(1e-6, Math.abs(expected) * .01);
      const unitOk = response.toLowerCase().includes(target.unit.toLowerCase());
      const formulaOk = response.toLowerCase().includes(item.formulaId.toLowerCase()) || response.includes(f.expression);
      const substitutionOk = Object.entries(item.known).every(([symbol, entry]) => response.toLowerCase().includes(symbol.toLowerCase()) || response.includes(String(entry.value)));
      const operationsOk = /[+*/−–-]|\b(divid|multiplic|sum|rest|ra[ií]z|cos|sin)\w*/i.test(response) && (response.match(/=/g)?.length || 0) >= 2;
      const score = Number(formulaOk) + Number(substitutionOk) + Number(operationsOk) + Number(unitOk) + Number(numberOk);
      return `${i + 1}. ${score === 5 ? "Correcto" : score >= 3 ? "Parcial" : "Incorrecto"} (${score}/5). Fórmula: ${formulaOk ? "correcta" : `se esperaba ${f.expression}`}. Sustitución: ${substitutionOk ? "se reconocen los datos" : "anota cada dato en la fórmula"}. Operaciones/procedimiento: ${operationsOk ? "se muestran pasos" : "desarrolla las operaciones con igualdades"}. Unidades: ${unitOk ? "correctas" : `usa ${target.unit}`}. Resultado: ${numberOk ? "correcto" : `esperado ${formatPhysicsNumber(expected)} ${target.unit}`} .`;
    }));
  }

  function calculateConfirmedData() {
    if (!pending) return;
    const formula = getFormula(pending.formulaId)!; const result = solvePhysicsFormula(pending.formulaId, pending.target, pending.known);
    const target = formula.variables.find(variable => variable.symbol === pending.target)!;
    if (result === null) { setError("Completa todos los datos con números válidos y revisa que no haya divisiones por cero."); return; }
    const known = formula.variables.filter(variable => variable.symbol !== pending.target).map(variable => `${variable.symbol} = ${formatPhysicsNumber(pending.known[variable.symbol])} ${variable.unit}`);
    const substitution = known.join("; ");
    setSolution({ question: pending.question, formula: `${formula.name}: ${formula.expression}`, result: formatPhysicsNumber(result), unit: target.unit, known, method: `Datos confirmados: ${substitution}. Despeje y cálculo determinista con ${formula.expression}.` });
    setPending(undefined); setError("");
  }

  return <div className="physics-panel">
    {practice ? <>
      <p>La IA propone ejercicios y la aplicación verifica las respuestas con las fórmulas catalogadas.</p>
      <div className="physics-controls">
        <label>Tema<select value={topic} onChange={e => setTopic(e.target.value as typeof topic)}>{physicsTopics.map(t => <option key={t}>{t}</option>)}</select></label>
        <label>Nivel<select value={level} onChange={e => setLevel(e.target.value)}><option>Primaria</option><option>Secundaria</option><option>Bachillerato</option><option>Universidad</option></select></label>
        <label>Dificultad<select value={difficulty} onChange={e => setDifficulty(e.target.value)}><option>Básico</option><option>Intermedio</option><option>Avanzado</option></select></label>
        <label>Cantidad<input type="number" min="1" max="10" value={count} onChange={e => setCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}/></label>
        <button className="physics-primary" disabled={busy} onClick={generate}>{busy ? "Generando…" : "Generar ejercicios"}</button>
      </div>
      {items.map((item, i) => <article className="physics-card" key={`${i}-${item.formulaId}`}><h3>Ejercicio {i + 1}</h3><p>{item.prompt}</p><textarea aria-label={`Respuesta ejercicio ${i + 1}`} placeholder="Fórmula, sustitución, operaciones y respuesta con unidad" value={answers[i] || ""} onChange={e => setAnswers({ ...answers, [i]: e.target.value })}/></article>)}
      {notice&&<p className="physics-note" role="status">{notice}</p>}
      {items.length > 0 && <button className="physics-primary" onClick={checkAnswers}>Corregir respuestas</button>}
      {grade.length > 0 && <div className="physics-result"><h3>Corrección</h3>{grade.map(g => <p key={g}>{g}</p>)}<p>Recomendación: vuelve a practicar los ejercicios con menos de 3/3 y muestra los pasos intermedios.</p></div>}
    </> : <>
      <p>Describe el problema completo. Puedes adjuntar una foto clara; la IA identifica datos y la aplicación realiza el cálculo.</p>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ej.: Un objeto parte del reposo y acelera a 2 m/s² durante 5 s. ¿Cuál es su velocidad final?"/>
      <label className="physics-upload">Adjuntar fotografía<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => { const file=e.target.files?.[0]; if(!file)return; if(file.size>4_000_000){setError("La foto no puede superar 4 MB.");return;} setImage(await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.onerror=()=>reject(new Error("No se pudo leer la imagen."));reader.readAsDataURL(file);})); }}/></label>{image&&<span>Foto adjunta.</span>}
      <button className="physics-primary" disabled={busy||(!prompt.trim()&&!image)} onClick={solve}>{busy ? "Analizando…" : "Resolver paso a paso"}</button>
    </>}
    {error&&<p className="physics-error" role="alert">{error}</p>}
    {pending&&<div className="physics-result"><h3>Revisa los datos antes de calcular</h3><p>Ollama no identificó todos los valores con suficiente seguridad. Los campos que faltan quedan vacíos; completa o corrige los datos del enunciado para no asumir valores.</p>{getFormula(pending.formulaId)?.variables.filter(variable=>variable.symbol!==pending.target).map(variable=><label className="physics-data-field" key={variable.symbol}>{variable.name} ({variable.symbol}) · {variable.unit}<input type="number" step="any" value={pending.known[variable.symbol] ?? ""} onChange={e=>{const raw=e.target.value;const known={...pending.known};if(raw==="")delete known[variable.symbol];else known[variable.symbol]=Number(raw);setPending({...pending,known});}}/></label>)}<button className="physics-primary" onClick={calculateConfirmedData}>Calcular con estos datos</button></div>}
    {solution&&<div className="physics-result"><h3>{solution.clarification?"Necesito una aclaración":"Resolución"}</h3><p>{solution.clarification||solution.question}</p>{solution.known.length>0&&<><h4>Datos identificados</h4><ul>{solution.known.map(k=><li key={k}>{k}</li>)}</ul><h4>Fórmula</h4><p>{solution.formula}</p><h4>Procedimiento</h4><p>{solution.method}</p><strong>Resultado: {solution.result} {solution.unit}</strong></>}</div>}
  </div>;
}

function DiagramView() {
  const [kind, setKind] = useState("Fuerzas"); const [strength, setStrength] = useState(50); const [detail, setDetail] = useState("");
  const labels: Record<string, string[]> = { Fuerzas: ["Fuerza aplicada", "Peso", "Normal", "Fricción"], Vectores: ["Vector A", "Componentes x/y", "Resultante"], Movimiento: ["Posición", "Velocidad", "Aceleración"], Trayectoria: ["Velocidad inicial", "Gravedad", "Trayectoria"], "Plano inclinado": ["Plano", "Peso", "Normal", "Fricción"], Circuito: ["Batería", "Resistencia", "Corriente"], Óptica: ["Rayo incidente", "Normal", "Rayo reflejado"], Ondas: ["Amplitud", "Longitud de onda", "Cresta"] };
  const wave = Array.from({ length: 31 }, (_, i) => `${i * 10},${100 - Math.sin(i / 3) * strength * .7}`).join(" ");
  return <div className="physics-panel"><div className="physics-controls"><label>Diagrama<select value={kind} onChange={e => {setKind(e.target.value);setDetail("")}}>{Object.keys(labels).map(x => <option key={x}>{x}</option>)}</select></label><label>Intensidad<input type="range" min="15" max="90" value={strength} onChange={e => setStrength(Number(e.target.value))}/></label></div>
    <div className="physics-svg-wrap"><svg viewBox="0 0 320 210" role="img" aria-label={`Diagrama interactivo de ${kind}`}>
      {kind === "Ondas" ? <><polyline points={wave} fill="none" stroke="#b42336" strokeWidth="4"/><line x1="0" y1="100" x2="320" y2="100" stroke="#aaa"/><text x="12" y="22">Amplitud: {strength}</text></> : kind === "Circuito" ? <><path d="M60 60 H240 V150 H60 Z" fill="none" stroke="#444" strokeWidth="5"/><path d="M60 90 H100 M100 75 V105 M110 68 V112 M110 90 H150" stroke="#b42336" strokeWidth="4"/><rect x="150" y="72" width="48" height="36" rx="5" fill="#f4dce0" stroke="#b42336" strokeWidth="3"/><text x="166" y="96">R</text><text x="48" y="48">Batería</text></> : kind === "Óptica" ? <><line x1="160" y1="25" x2="160" y2="190" stroke="#777" strokeDasharray="6"/><path d={`M45 170 L160 100 L${160+strength} 30`} fill="none" stroke="#b42336" strokeWidth="4"/><circle cx="160" cy="100" r="7" fill="#54202a"/></> : kind === "Plano inclinado" ? <><path d="M45 170 L270 70 L270 170 Z" fill="#f7e8eb" stroke="#762634" strokeWidth="3"/><rect x="160" y="105" width="42" height="35" fill="#b42336" transform="rotate(-24 160 105)"/><line x1="180" y1="115" x2="180" y2="55" stroke="#222" strokeWidth="3"/><text x="185" y="58">Peso</text></> : kind === "Vectores" ? <><line x1="40" y1="170" x2="285" y2="170" stroke="#888"/><line x1="40" y1="170" x2="40" y2="25" stroke="#888"/><line x1="40" y1="170" x2={40+strength*2.2} y2={170-strength*1.35} stroke="#b42336" strokeWidth="5"/><polygon points={`${40+strength*2.2},${170-strength*1.35} ${25+strength*2.2},${172-strength*1.35} ${40+strength*2.2},${185-strength*1.35}`} fill="#b42336"/><line x1={40+strength*2.2} y1="170" x2={40+strength*2.2} y2={170-strength*1.35} stroke="#8874bd" strokeDasharray="5"/><text x="55" y="30">Resultante = componentes x e y</text></> : kind === "Movimiento" ? <><line x1="35" y1="165" x2="290" y2="165" stroke="#888" strokeWidth="3"/><line x1="50" y1="145" x2="255" y2="145" stroke="#b42336" strokeWidth="4"/><polygon points="260,145 247,138 247,152" fill="#b42336"/><circle cx={50+strength*2.2} cy="145" r="13" fill="#b42336"/><text x="35" y="195">Posición → velocidad constante →</text></> : kind === "Trayectoria" ? <><path d="M35 165 Q160 15 285 165" fill="none" stroke="#b42336" strokeWidth="4"/><circle cx={35+strength*2.7} cy={165-Math.sin(strength/100*Math.PI)*135} r="11" fill="#7b5abb"/><line x1="35" y1="165" x2="95" y2="100" stroke="#777" strokeDasharray="5"/><text x="45" y="30">Movimiento parabólico ideal</text></> : <><line x1="40" y1="170" x2="280" y2="170" stroke="#888" strokeWidth="3"/><rect x="135" y="115" width="48" height="48" rx="9" fill="#f5dce0" stroke="#b42336" strokeWidth="3"/><line x1="160" y1="115" x2="160" y2={115-strength} stroke="#b42336" strokeWidth="4"/><polygon points={`160,${110-strength} 154,${122-strength} 166,${122-strength}`} fill="#b42336"/><text x="172" y={110-strength}>Fuerza</text><line x1="135" y1="164" x2="90" y2="164" stroke="#333" strokeWidth="3"/><text x="32" y="157">Fricción</text></>}
    </svg></div><p>Selecciona un elemento para consultar qué representa.</p><div className="physics-chip-row">{labels[kind].map(item => <button key={item} onClick={() => setDetail(`${item}: componente del modelo ${kind.toLowerCase()}. Las flechas representan dirección y sentido; la escala se ajusta con el control.`)}>{item}</button>)}</div>{detail&&<p className="physics-result">{detail}</p>}</div>;
}

function SimulationView() {
  const [kind, setKind] = useState("Caída libre"); const [running, setRunning] = useState(false); const [time, setTime] = useState(0); const [a, setA] = useState(5); const [b, setB] = useState(10);
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setTime(t => t + .05), 50); return () => window.clearInterval(timer); }, [running]);
  const t = Math.min(time, 5);
  const modelKey = kind === "Caída libre" ? "free-fall" : kind === "Movimiento rectilíneo" ? "uniform-motion" : kind === "Movimiento parabólico" ? "projectile" : kind === "Fuerzas y fricción" ? "friction" : kind === "Péndulo" ? "pendulum" : kind === "Circuito eléctrico" ? "circuit" : kind === "Reflexión y refracción" ? "refraction" : "wave";
  const model = simulatePhysics(modelKey, t, a, b);
  const displacement = model?.position ?? 0, speed = model?.velocity ?? 0, equation = model?.equation ?? "Ángulo fuera del rango de refracción para el modelo.";
  const x = kind === "Movimiento parabólico" ? 40 + Math.min(240,a*Math.cos(b*Math.PI/180)*t*2) : kind === "Movimiento rectilíneo" ? 40 + Math.min(240,displacement*5) : 120;
  return <div className="physics-panel"><div className="physics-controls"><label>Simulación<select value={kind} onChange={e=>{setKind(e.target.value);setTime(0);setRunning(false)}}>{["Caída libre","Movimiento rectilíneo","Movimiento parabólico","Fuerzas y fricción","Péndulo","Circuito eléctrico","Reflexión y refracción","Ondas"].map(x=><option key={x}>{x}</option>)}</select></label><label>Parámetro A<input type="range" min="1" max="30" value={a} onChange={e=>setA(Number(e.target.value))}/><output>{a}</output></label><label>Parámetro B<input type="range" min="1" max="80" value={b} onChange={e=>setB(Number(e.target.value))}/><output>{b}</output></label></div>
    <div className="physics-simulation"><svg viewBox="0 0 320 190" role="img" aria-label={`Simulación física de ${kind}`}><line x1="25" y1="165" x2="295" y2="165" stroke="#bbb" strokeWidth="3"/>{kind === "Péndulo" ? <><line x1="160" y1="25" x2={160+Math.sin(displacement*Math.PI/180)*90} y2={25+Math.cos(displacement*Math.PI/180)*90} stroke="#777" strokeWidth="4"/><circle cx={160+Math.sin(displacement*Math.PI/180)*90} cy={25+Math.cos(displacement*Math.PI/180)*90} r="15" fill="#b42336"/></> : kind === "Ondas" ? <path d={Array.from({length:31},(_,i)=>`${i?"L":"M"} ${i*10} ${95-Math.sin(i/30*2*Math.PI-time*2)*a*2}`).join(" ")} fill="none" stroke="#b42336" strokeWidth="4"/> : kind === "Circuito eléctrico" ? <><path d="M50 40 H270 V145 H50 Z" fill="none" stroke="#777" strokeWidth="4"/><rect x="140" y="58" width="45" height="34" fill="#f5dce0" stroke="#b42336" strokeWidth="3"/><text x="153" y="80">R</text><circle cx={55+(time*40%210)} cy="40" r="8" fill="#b42336"/></> : kind === "Reflexión y refracción" ? <><line x1="160" y1="20" x2="160" y2="175" stroke="#888" strokeDasharray="5"/><path d="M40 145 L160 90 L260 40 M160 90 L255 150" fill="none" stroke="#b42336" strokeWidth="4"/></> : <circle cx={x} cy={kind === "Caída libre"?35+Math.min(125,displacement*2):kind === "Movimiento parabólico"?150-Math.min(120,displacement*3):140} r="15" fill="#b42336"/>}</svg></div>
    <div className="physics-metrics"><span>Tiempo <b>{formatPhysicsNumber(t)} s</b></span><span>{kind === "Péndulo" ? "Ángulo" : kind === "Circuito eléctrico" ? "Corriente" : kind === "Reflexión y refracción" ? "Ángulo refractado" : kind === "Ondas" ? "Desplazamiento" : "Posición"}<b>{formatPhysicsNumber(displacement)} {model?.positionUnit || ""}</b></span><span>{kind === "Péndulo" ? "Frecuencia angular" : kind === "Circuito eléctrico" ? "Corriente" : kind === "Reflexión y refracción" ? "Ángulo incidente" : kind === "Ondas" ? "Frecuencia" : "Velocidad"}<b>{formatPhysicsNumber(speed)} {model?.velocityUnit || ""}</b></span></div><p><b>Modelo:</b> {equation}</p><div className="physics-actions"><button className="physics-primary" onClick={()=>setRunning(!running)}>{running?"Pausar":"Iniciar"}</button><button onClick={()=>{setRunning(false);setTime(0)}}>Reiniciar</button></div><p className="physics-note">Modelo didáctico idealizado; ignora efectos que no aparecen explícitamente en la ecuación.</p></div>;
}

export function PhysicsWorkspace({ allowed, onBack }: { allowed: boolean; onBack: () => void }) {
  const [section, setSection] = useState<Section>("Fórmulas"); const [search, setSearch] = useState(""); const [topic, setTopic] = useState("Todos");
  const shown = useMemo(() => physicsFormulas.filter(f => (topic === "Todos" || f.topic === topic) && `${f.name} ${f.expression} ${f.topic} ${f.when}`.toLowerCase().includes(search.toLowerCase())), [topic, search]);
  if (!allowed) return <section className="tool-view physics-page"><button className="specialized-back" onClick={onBack}>← Volver a Herramientas especializadas</button><div className="math-lock panel"><span className="math-lock-icon">⌁</span><h2>Disponible con Study Plus y Study Pro</h2><p>Accede a fórmulas, problemas, diagramas, simulaciones y práctica personalizada.</p><a className="primary-button math-link" href="/plans">Ver planes</a></div></section>;
  return <section className="tool-view physics-page"><button className="specialized-back" onClick={onBack}>← Volver a Herramientas especializadas</button><header className="physics-header"><div><div className="eyebrow">STUDY AI · ESTUDIO ESPECIALIZADO</div><h1>Física</h1><p>Explora modelos, resuelve problemas y practica con cálculos verificables.</p></div><span className="physics-mark">⌁</span></header><nav className="physics-nav" aria-label="Secciones de Física">{sectionItems.map(x=><button key={x.id} className={section===x.id?"active":""} onClick={()=>setSection(x.id)}><span>{x.icon}</span>{x.id}</button>)}</nav>
    {section === "Fórmulas" ? <div className="physics-panel"><div className="physics-controls"><label>Buscar fórmula<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nombre, tema o expresión"/></label><label>Tema<select value={topic} onChange={e=>setTopic(e.target.value)}><option>Todos</option>{physicsTopics.map(t=><option key={t}>{t}</option>)}</select></label></div><div className="physics-formula-grid">{shown.map(f=><article className="physics-card" key={f.id}><span className="physics-kicker">{f.topic}</span><h2>{f.name}</h2><div className="physics-equation">{f.expression}</div><p><b>Variables y unidades</b></p><ul>{f.variables.map(v=><li key={v.symbol}><b>{v.symbol}:</b> {v.name} ({v.unit})</li>)}</ul><p><b>Cuándo se usa:</b> {f.when}</p><p><b>Ejemplo:</b> {f.example}</p></article>)}</div>{shown.length===0&&<p>No hay fórmulas que coincidan.</p>}</div> : section === "Problemas" ? <PhysicsSolver/> : section === "Practicar ejercicios" ? <PhysicsSolver practice/> : section === "Diagramas" ? <DiagramView/> : <SimulationView/>}
  </section>;
}

