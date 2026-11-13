"use client";

import { useMemo, useState } from "react";
import { balanceChemicalEquation, chemistryFormulas, chemistryMolecules } from "@/lib/chemistry";
import { StudyTools } from "./study-tools";
import type { AppLanguage } from "@/lib/app-languages";
import "./chemistry-workspace.css";

type Section = "Reacciones" | "Cálculos" | "Moléculas" | "Tabla periódica";
const sections: { name: Section; icon: string; text: string }[] = [
  { name: "Reacciones", icon: "⇌", text: "Escribe ecuaciones, identifica sus partes y balancéalas paso a paso." },
  { name: "Cálculos", icon: "ƒ", text: "Resuelve moles, masa molar, concentración, diluciones y estequiometría." },
  { name: "Moléculas", icon: "⚛", text: "Busca moléculas, observa una estructura esquemática y consulta sus propiedades." },
  { name: "Tabla periódica", icon: "▦", text: "Explora los elementos con la tabla periódica interactiva existente." },
];
const reactionExamples = [
  { title: "Formación de agua", query: "agua", equation: "H2 + O2 -> H2O", type: "Síntesis", note: "El hidrógeno reacciona con oxígeno para producir agua." },
  { title: "Combustión completa del metano", query: "metano combustión", equation: "CH4 + O2 -> CO2 + H2O", type: "Combustión", note: "En una combustión completa de un hidrocarburo se forman dióxido de carbono y agua." },
  { title: "Neutralización", query: "neutralización ácido base", equation: "HCl + NaOH -> NaCl + H2O", type: "Ácido-base", note: "Un ácido y una base reaccionan para formar una sal y agua." },
  { title: "Descomposición del peróxido de hidrógeno", query: "peróxido", equation: "H2O2 -> H2O + O2", type: "Descomposición", note: "El peróxido de hidrógeno puede descomponerse en agua y oxígeno." },
];

export function ChemistryWorkspace({ onBack, allowed, language }: { onBack: () => void; allowed: boolean; language: AppLanguage }) {
  const [section, setSection] = useState<Section | null>(null);
  const [query, setQuery] = useState("");
  const filteredMolecules = useMemo(() => chemistryMolecules.filter(m => `${m.name} ${m.raw} ${m.formula}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())), [query]);
  const [selectedMolecule, setSelectedMolecule] = useState(chemistryMolecules[0]);
  const [equation, setEquation] = useState("H2 + O2 -> H2O");
  const [reactionQuery, setReactionQuery] = useState("");
  const [balanced, setBalanced] = useState<ReturnType<typeof balanceChemicalEquation> | null>(null);
  const [reactionError, setReactionError] = useState("");
  const [reactionBusy, setReactionBusy] = useState(false);
  const [formulaSearch, setFormulaSearch] = useState("");
  const [calcType, setCalcType] = useState("Moles desde masa");
  const [values, setValues] = useState({ formula: "H2O", mass: "18", moles: "1", volume: "1", concentration: "1", initialConcentration: "", initialVolume: "", finalConcentration: "", coefficientFrom: "2", coefficientTo: "1", conversionValue: "1000", conversion: "mL a L" });
  const [calculation, setCalculation] = useState<{ result: string; steps: string[] } | null>(null);
  const [calcError, setCalcError] = useState("");
  const [calcBusy, setCalcBusy] = useState(false);

  async function solveChemistry(payload: Record<string, unknown>) {
    const response = await fetch("/api/chemistry/solve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
    const body = await response.json() as { result?: unknown; steps?: unknown; error?: string };
    if (!response.ok) throw new Error(body.error || "No se pudo completar la operación.");
    return body;
  }

  async function balanceReaction() {
    setReactionBusy(true); setReactionError(""); setBalanced(null);
    try {
      const response = await solveChemistry({ action: "balance", equation });
      setBalanced(response.result as ReturnType<typeof balanceChemicalEquation>);
    } catch (error) { setReactionError(error instanceof Error ? error.message : "No se pudo balancear la reacción."); }
    finally { setReactionBusy(false); }
  }

  async function calculate() {
    setCalcError(""); setCalculation(null); setCalcBusy(true);
    try {
      const amount = (key: keyof typeof values) => { const raw = values[key]; const number = Number(raw); if (raw.trim() === "" || !Number.isFinite(number)) throw new Error("Completa los valores necesarios con números válidos."); return number; };
      let payload: Record<string, unknown>;
      if (calcType === "Masa molar") payload = { action: "calculate", kind: "molarMass", formula: values.formula };
      else if (calcType === "Moles desde masa") payload = { action: "calculate", kind: "molesFromMass", formula: values.formula, mass: amount("mass") };
      else if (calcType === "Masa desde moles") payload = { action: "calculate", kind: "massFromMoles", formula: values.formula, moles: amount("moles") };
      else if (calcType === "Molaridad") payload = { action: "calculate", kind: "molarity", moles: amount("moles"), volume: amount("volume") };
      else if (calcType === "Dilución") payload = { action: "calculate", kind: "dilution", initialConcentration: amount("initialConcentration"), initialVolume: amount("initialVolume"), ...(values.finalConcentration.trim() ? { finalConcentration: amount("finalConcentration") } : {}) };
      else if (calcType === "Conversiones") payload = { action: "calculate", kind: "convert", amount: amount("conversionValue"), conversion: values.conversion };
      else payload = { action: "calculate", kind: "stoichiometry", moles: amount("moles"), coefficientFrom: amount("coefficientFrom"), coefficientTo: amount("coefficientTo") };
      const response = await solveChemistry(payload);
      if (typeof response.result !== "string" || !Array.isArray(response.steps) || response.steps.some(step => typeof step !== "string")) throw new Error("El servidor devolvió un cálculo incompleto.");
      setCalculation({ result: response.result, steps: response.steps as string[] });
    } catch (error) { setCalcError(error instanceof Error ? error.message : "No se pudo realizar el cálculo."); }
    finally { setCalcBusy(false); }
  }

  function renderCalculatorInputs() {
    const field = (label: string, key: keyof typeof values, placeholder: string, unit = "") => <label className="chem-field" key={key}>{label}<span><input type="number" min="0" step="any" value={values[key]} placeholder={placeholder} onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))}/>{unit && <small>{unit}</small>}</span></label>;
    return <div className="chem-input-grid">
      {(calcType === "Moles desde masa" || calcType === "Masa desde moles" || calcType === "Masa molar") && <label className="chem-field">Fórmula química<input value={values.formula} onChange={e => setValues(current => ({ ...current, formula: e.target.value }))} placeholder="H2O"/></label>}
      {calcType === "Moles desde masa" && field("Masa", "mass", "18", "g")}
      {calcType === "Masa desde moles" && field("Cantidad", "moles", "1", "mol")}
      {calcType === "Molaridad" && <>{field("Cantidad de soluto", "moles", "0,5", "mol")}{field("Volumen de solución", "volume", "1", "L")}</>}
      {calcType === "Dilución" && <>{field("Concentración inicial C₁", "initialConcentration", "2", "mol/L")}{field("Volumen inicial V₁", "initialVolume", "0,1", "L")}<label className="chem-field">Concentración final C₂ (opcional)<span><input type="number" min="0" step="any" value={values.finalConcentration} onChange={e => setValues(current => ({ ...current, finalConcentration: e.target.value }))}/><small>mol/L</small></span></label></>}
      {calcType === "Estequiometría" && <>{field("Moles de la sustancia conocida", "moles", "1", "mol")}{field("Coeficiente de la sustancia conocida", "coefficientFrom", "2")}{field("Coeficiente de la sustancia buscada", "coefficientTo", "1")}</>}
      {calcType === "Conversiones" && <>{field("Cantidad", "conversionValue", "1000")}<label className="chem-field">Conversión<select value={values.conversion} onChange={e => setValues(current => ({ ...current, conversion: e.target.value }))}>{["g a kg", "kg a g", "mg a g", "g a mg", "mL a L", "L a mL", "mol a mmol", "mmol a mol"].map(item => <option key={item}>{item}</option>)}</select></label></>}
    </div>;
  }

  if (!allowed) return <section className="tool-view"><div className="math-lock panel"><span className="math-lock-icon">⚗</span><h2>Disponible con Study Plus y Study Pro</h2><p>Elige un plan para desbloquear las herramientas de Química.</p><a className="primary-button math-link" href="/plans">Ver planes</a></div></section>;

  return <section className="chemistry-workspace">
    <div className="chemistry-heading"><button className="chem-back" onClick={section ? () => setSection(null) : onBack}>← {section ? "Química" : "Herramientas especializadas"}</button><div className="chem-eyebrow">STUDY AI · QUÍMICA</div><h1>{section || "Explora la química"}</h1>{!section && <p>Elige un área para estudiar, consultar datos y resolver ejercicios.</p>}</div>
    {!section && <div className="chemistry-section-grid">{sections.map(item => <button className="chemistry-section-card" key={item.name} onClick={() => setSection(item.name)}><span>{item.icon}</span><div><h2>{item.name}</h2><p>{item.text}</p></div><b>↗</b></button>)}</div>}
    {section === "Tabla periódica" && <div className="chem-existing-table"><StudyTools active="chemistry" language={language}/></div>}
    {section === "Reacciones" && <><div className="chemistry-panel"><div className="chem-panel-intro"><span className="chem-eyebrow">ECUACIONES QUÍMICAS</span><h2>Escribe y balancea una reacción</h2><p>Usa fórmulas con mayúsculas y subíndices en números, por ejemplo: Ca(OH)2.</p></div><label className="chem-field">Ecuación química<input value={equation} onChange={e => setEquation(e.target.value)} placeholder="H2 + O2 → H2O"/></label><button className="chem-primary" onClick={() => void balanceReaction()} disabled={reactionBusy || !equation.trim()}>{reactionBusy ? "Balanceando…" : "Identificar y balancear"}</button>{reactionError && <p className="chem-error" role="alert">{reactionError}</p>}{balanced && <div className="chem-result"><span className="chem-eyebrow">ECUACIÓN BALANCEADA</span><h3>{balanced.equation}</h3><div className="chem-reactants"><div><b>Reactivos</b><p>{balanced.reactants.join(" + ")}</p></div><div><b>Productos</b><p>{balanced.products.join(" + ")}</p></div></div><p><b>Tipo:</b> {classifyReaction(balanced.reactants, balanced.products)}</p><ol>{balanced.steps.map(step => <li key={step}>{step}</li>)}</ol><p className="chem-note">La clasificación es orientativa y se basa en los patrones de las sustancias escritas.</p></div>}</div><div className="chemistry-panel"><div className="chem-formulas-head"><div><span className="chem-eyebrow">CONSULTA DE REACCIONES</span><h2>Ejemplos explicados</h2></div><input type="search" value={reactionQuery} onChange={e => setReactionQuery(e.target.value)} placeholder="Buscar reacción o sustancia" aria-label="Buscar reacciones"/></div><div className="chem-formula-list">{reactionExamples.filter(item => `${item.title} ${item.query} ${item.equation}`.toLowerCase().includes(reactionQuery.toLowerCase())).map(item => <article className="chem-formula-card" key={item.title}><span>{item.type}</span><h3>{item.title}</h3><strong>{item.equation.replaceAll("->", "→")}</strong><p>{item.note}</p><button className="chem-example-button" onClick={() => { setEquation(item.equation); setBalanced(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Cargar en el balanceador</button></article>)}</div></div></>}
    {section === "Cálculos" && <div className="chemistry-panel"><div className="chem-panel-intro"><span className="chem-eyebrow">HERRAMIENTAS Y FÓRMULAS</span><h2>Calcula con el procedimiento</h2><p>Los resultados se calculan con masas atómicas estándar de referencia; la precisión depende de la sustancia y de las unidades ingresadas.</p></div><div className="chem-calculator"><label className="chem-field">Tipo de cálculo<select value={calcType} onChange={e => { setCalcType(e.target.value); setCalculation(null); setCalcError(""); }}><option>Moles desde masa</option><option>Masa desde moles</option><option>Masa molar</option><option>Molaridad</option><option>Dilución</option><option>Estequiometría</option><option>Conversiones</option></select></label>{renderCalculatorInputs()}<button className="chem-primary" onClick={() => void calculate()} disabled={calcBusy}>{calcBusy ? "Calculando…" : "Calcular"}</button>{calcError && <p className="chem-error" role="alert">{calcError}</p>}{calculation && <div className="chem-result"><span className="chem-eyebrow">RESULTADO</span><h3>{calculation.result}</h3><ol>{calculation.steps.map(step => <li key={step}>{step}</li>)}</ol></div>}</div><div className="chem-formulas-head"><h2>Fórmulas de referencia</h2><input type="search" value={formulaSearch} onChange={e => setFormulaSearch(e.target.value)} placeholder="Buscar tema o fórmula" aria-label="Buscar fórmulas"/></div><div className="chem-formula-list">{chemistryFormulas.filter(item => `${item.topic} ${item.name} ${item.formula}`.toLowerCase().includes(formulaSearch.toLowerCase())).map(item => <article className="chem-formula-card" key={item.name}><span>{item.topic}</span><h3>{item.name}</h3><strong>{item.formula}</strong><p>{item.vars}</p><small>{item.use}</small><p className="chem-formula-example">Ejemplo: {item.topic === "Moles" || item.topic === "Conversiones" ? "18 g de H₂O / 18,015 g·mol⁻¹ ≈ 1,00 mol." : item.topic === "Masa molar" ? "1 mol de H₂O × 18,015 g/mol ≈ 18,015 g." : item.topic === "Concentración" ? "0,5 mol en 1 L → 0,5 mol/L." : item.topic === "Diluciones" ? "0,5 mol/L × 100 mL = 0,1 mol/L × 500 mL." : "2 mol de H₂ dan 2 mol de H₂O en 2H₂ + O₂ → 2H₂O."}</p></article>)}</div></div>}
    {section === "Moléculas" && <div className="chemistry-molecule-layout"><div className="chemistry-panel chem-molecule-picker"><div className="chem-panel-intro"><span className="chem-eyebrow">EXPLORADOR</span><h2>Busca una molécula</h2><p>Selecciona un resultado para ver sus enlaces, geometría y usos.</p></div><input className="chem-molecule-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre o fórmula…"/>{filteredMolecules.map(item => <button className={`chem-molecule-option ${selectedMolecule.name === item.name ? "selected" : ""}`} key={item.name} onClick={() => setSelectedMolecule(item)}><b>{item.name}</b><span>{item.formula}</span></button>)}{filteredMolecules.length === 0 && <p>No encontramos esa molécula en el catálogo actual.</p>}</div><article className="chemistry-panel chem-molecule-detail"><div className="chem-molecule-title"><div><span className="chem-eyebrow">ESTRUCTURA ESQUEMÁTICA 2D</span><h2>{selectedMolecule.name} <span>{selectedMolecule.formula}</span></h2></div><span className="chem-molecule-icon">⚛</span></div><MoleculeDiagram molecule={selectedMolecule}/><p className="chem-note">Esquema 2D de conectividad; no representa longitudes ni es un modelo 3D interactivo.</p><dl className="chem-molecule-facts"><div><dt>Geometría</dt><dd>{selectedMolecule.geometry}</dd></div><div><dt>Elementos</dt><dd>{[...new Set(selectedMolecule.atoms.map(atom => atom.e))].join(", ")}</dd></div><div><dt>Enlaces representados</dt><dd>{selectedMolecule.bonds.length}{selectedMolecule.raw === "CO2" ? " (dos enlaces dobles)" : ""}</dd></div><div><dt>Propiedades</dt><dd>{selectedMolecule.properties}</dd></div><div><dt>Usos</dt><dd>{selectedMolecule.uses}</dd></div></dl></article></div>}
  </section>;
}

function classifyReaction(reactants: string[], products: string[]) {
  if (reactants.length > 1 && products.length === 1) return "Combinación o síntesis (clasificación probable).";
  if (reactants.length === 1 && products.length > 1) return "Descomposición (clasificación probable).";
  const formula = reactants.join("+");
  if (products.some(product => product.includes("O")) && /O2/.test(formula)) return "Combustión o reacción de oxidación (revisar las sustancias para precisar).";
  if (reactants.length === 2 && products.length === 2) return "Intercambio o sustitución (se requiere revisar las fórmulas para precisar).";
  return "Tipo no determinado automáticamente; consulta el contexto de la reacción.";
}

function MoleculeDiagram({ molecule }: { molecule: typeof chemistryMolecules[number] }) {
  const colors: Record<string, string> = { H: "#f6f6f6", C: "#4a4a50", O: "#c6233c", N: "#3563bc", Na: "#7f50bd", Cl: "#39a56a" };
  return <div className="chem-molecule-svg-wrap"><svg viewBox="0 0 300 210" role="img" aria-label={`Esquema 2D de ${molecule.name} con fórmula ${molecule.formula}`}>
    {molecule.bonds.map(([a, b], index) => <line key={`bond-${index}`} x1={molecule.atoms[a].x} y1={molecule.atoms[a].y} x2={molecule.atoms[b].x} y2={molecule.atoms[b].y} stroke="#81777b" strokeWidth="5" strokeLinecap="round"/>)}
    {molecule.atoms.map((atom, index) => <g key={`${atom.e}-${index}`}><circle cx={atom.x} cy={atom.y} r={atom.e.length > 1 ? 25 : 22} fill={colors[atom.e] || "#aa2035"} stroke="#fff" strokeWidth="3"/><text x={atom.x} y={atom.y + 6} textAnchor="middle" fontSize="16" fontWeight="700" fill={atom.e === "H" ? "#393237" : "white"}>{atom.e}</text></g>)}
  </svg></div>;
}
