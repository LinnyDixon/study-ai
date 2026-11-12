"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/env";
import "./study-tools.css";

type StudyTask = { id: string; title: string; dueDate: string; done: boolean };
type StudyEvent = { id: string; title: string; date: string };
type StudyNote = { id: string; title: string; content: string; updatedAt: string };
type WorkspaceData = { agenda: StudyTask[]; calendar: StudyEvent[]; notes: StudyNote[] };
type Preferences = Record<string, unknown>;

const LOCAL_KEY = "study-ai-workspace-v1";
const WORKSPACE_KEY = "study_ai_workspace_v1";
const EMPTY_WORKSPACE: WorkspaceData = { agenda: [], calendar: [], notes: [] };
const NEW_NOTE = "__new_note__";

const toolContent: Record<string, { icon: string; title: string; intro: string }> = {
  notes: { icon: "▧", title: "Agenda", intro: "Organiza tus tareas y fechas de estudio." },
  calendar: { icon: "▣", title: "Calendario", intro: "Planifica tus sesiones y fechas importantes." },
  notebook: { icon: "▤", title: "Libreta", intro: "Guarda tus apuntes e ideas en un solo lugar." },
  exams: { icon: "▦", title: "Exámenes", intro: "Practica con preguntas creadas desde tus materiales." },
  summaries: { icon: "◈", title: "Resúmenes", intro: "Extrae las ideas principales de tus apuntes." },
  search: { icon: "⌕", title: "Investigar", intro: "Explora un tema y encuentra búsquedas útiles para contrastar información." },
};
type AIToolKey = "exams" | "summaries" | "search";
type AIToolState = Record<AIToolKey, string>;
const EMPTY_AI_STATE: AIToolState = { exams: "", summaries: "", search: "" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readWorkspace(value: unknown): WorkspaceData {
  if (!isRecord(value)) return EMPTY_WORKSPACE;
  const agenda = Array.isArray(value.agenda) ? value.agenda.filter((item): item is StudyTask =>
    isRecord(item) && typeof item.id === "string" && typeof item.title === "string" && typeof item.dueDate === "string" && typeof item.done === "boolean",
  ).slice(0, 300) : [];
  const calendar = Array.isArray(value.calendar) ? value.calendar.filter((item): item is StudyEvent =>
    isRecord(item) && typeof item.id === "string" && typeof item.title === "string" && typeof item.date === "string",
  ).slice(0, 500) : [];
  const notes = Array.isArray(value.notes) ? value.notes.filter((item): item is StudyNote =>
    isRecord(item) && typeof item.id === "string" && typeof item.title === "string" && typeof item.content === "string" && typeof item.updatedAt === "string",
  ).slice(0, 200) : [];
  return { agenda, calendar, notes };
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function pad(value: number) { return String(value).padStart(2, "0"); }

function splitExamAnswerKey(answer: string) {
  const marker = /(?:^|\n)#{0,3}\s*(?:CLAVE DE RESPUESTAS|RESPUESTAS|SOLUCIONARIO)\s*:?\s*\n/i;
  const match = marker.exec(answer);
  if (!match || match.index < 0) return { questions: answer, key: "" };
  return { questions: answer.slice(0, match.index).trim(), key: answer.slice(match.index + match[0].length).trim() };
}

function readLocalWorkspace(): WorkspaceData {
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? readWorkspace(JSON.parse(saved)) : EMPTY_WORKSPACE;
  } catch {
    return EMPTY_WORKSPACE;
  }
}

function useWorkspace() {
  const [data, setData] = useState<WorkspaceData>(EMPTY_WORKSPACE);
  const [ready, setReady] = useState(false);
  const [storage, setStorage] = useState<"loading" | "device" | "account">("loading");
  const [storageMessage, setStorageMessage] = useState("");
  const cloud = useRef<{ userId: string; preferences: Preferences } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (getSupabaseConfig()) {
          const supabase = createClient();
          const { data: authData, error: authError } = await supabase.auth.getUser();
          if (!authError && authData.user) {
            const { data: row, error } = await supabase.from("user_preferences").select("preferences").eq("user_id", authData.user.id).maybeSingle();
            if (error) throw new Error("No se pudo cargar tu espacio de estudio desde Supabase.");
            const preferences = isRecord(row?.preferences) ? row.preferences : {};
            cloud.current = { userId: authData.user.id, preferences };
            if (cancelled) return;
            setData(readWorkspace(preferences[WORKSPACE_KEY]));
            setStorage("account");
            setReady(true);
            return;
          }
        }
        if (!cancelled) {
          setData(readLocalWorkspace());
          setStorage("device");
          setReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setData(readLocalWorkspace());
          setStorage("device");
          setStorageMessage(error instanceof Error ? `${error.message} Se usará este dispositivo por ahora.` : "Se usará este dispositivo por ahora.");
          setReady(true);
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        if (storage === "account" && cloud.current) {
          const preferences = { ...cloud.current.preferences, [WORKSPACE_KEY]: data };
          const { error } = await createClient().from("user_preferences").upsert({ user_id: cloud.current.userId, preferences }, { onConflict: "user_id" });
          if (error) throw error;
          cloud.current.preferences = preferences;
        } else {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
        }
        if (!cancelled) setStorageMessage("");
      } catch {
        if (storage === "account") {
          try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch { /* Keep the current editor state even if storage is full. */ }
        }
        if (!cancelled) setStorageMessage("No se pudo sincronizar el último cambio. Tus notas y tareas siguen visibles aquí.");
      }
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [data, ready, storage]);

  const update = useCallback((change: (current: WorkspaceData) => WorkspaceData) => setData(current => change(current)), []);
  return { data, update, ready, storage, storageMessage };
}

async function askOllama(prompt: string, task?: "exam" | "summary") {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }], ...(task ? { task } : {}) }),
  });
  const result = await response.json() as { answer?: string; error?: string };
  if (!response.ok || !result.answer) throw new Error(result.error || "No se recibió una respuesta de Ollama.");
  return result.answer;
}

function StudyHeader({ active }: { active: string }) {
  const item = toolContent[active];
  return <>
    <div className="eyebrow"><span className="sparkle">✳</span> TU ESPACIO DE ESTUDIO</div>
    <div className="study-heading"><span className="study-heading-icon">{item.icon}</span><div><h1>{item.title}</h1><p>{item.intro}</p></div></div>
  </>;
}

export function StudyTools({ active }: { active: string }) {
  const workspace = useWorkspace();
  const [aiInputs, setAiInputs] = useState<AIToolState>(EMPTY_AI_STATE);
  const [aiOutputs, setAiOutputs] = useState<AIToolState>(EMPTY_AI_STATE);
  const [aiErrors, setAiErrors] = useState<AIToolState>(EMPTY_AI_STATE);
  const [aiBusyByTool, setAiBusyByTool] = useState<Record<AIToolKey, boolean>>({ exams: false, summaries: false, search: false });
  const activeAITool = (active === "exams" || active === "summaries" || active === "search") ? active : null;
  const aiInput = activeAITool ? aiInputs[activeAITool] : "";
  const aiOutput = activeAITool ? aiOutputs[activeAITool] : "";
  const aiError = activeAITool ? aiErrors[activeAITool] : "";
  const aiBusy = activeAITool ? aiBusyByTool[activeAITool] : false;
  function updateAIState(setter: (change: (current: AIToolState) => AIToolState) => void, tool: AIToolKey, value: string) {
    setter(current => ({ ...current, [tool]: value }));
  }
  const updateWorkspace = workspace.update;
  const saveNote = useCallback((title: string, content: string) => {
    const note: StudyNote = { id: crypto.randomUUID(), title: title.slice(0, 100) || "Apunte", content, updatedAt: new Date().toISOString() };
    updateWorkspace(current => ({ ...current, notes: [note, ...current.notes] }));
  }, [updateWorkspace]);

  async function generate() {
    if (!activeAITool) return;
    const tool = activeAITool;
    const source = aiInput.trim();
    if (!source || aiBusyByTool[tool]) return;
    setAiBusyByTool(current => ({ ...current, [tool]: true }));
    updateAIState(setAiErrors, tool, ""); updateAIState(setAiOutputs, tool, "");
    const request = tool === "summaries"
      ? `Prepara apuntes de estudio completos y detallados usando únicamente el material delimitado. La extensión debe ser proporcional al texto: no lo reduzcas a un párrafo ni a una conclusión breve. Organiza el resultado con estas secciones: TEMA CENTRAL; PUNTOS IMPORTANTES (entre 10 y 18 puntos según la cantidad de contenido, explicados con contexto); CONCEPTOS Y DEFINICIONES; DATOS, RELACIONES, CAUSAS/CONSECUENCIAS O ETAPAS que aparezcan en el texto; y REPASO FINAL con 5 preguntas clave. Conserva nombres, fechas, ejemplos y matices relevantes. No inventes datos. No añadas saludos, felicitaciones, comentarios sobre el informe, ofertas de ayuda ni frases como “espero que sea útil”. No lo conviertas en examen ni en una descripción genérica.\n\n<<< INICIO DEL MATERIAL DE ESTUDIO >>>\n${source}\n<<< FIN DEL MATERIAL DE ESTUDIO >>>`
      : tool === "exams"
        ? `Crea un examen de verdad a partir del material delimitado abajo. Evalúa comprensión de detalles, conceptos y relaciones entre ideas. Incluye exactamente 10 preguntas numeradas: 4 de opción múltiple con cuatro opciones (A-D), 3 de respuesta breve, 2 de verdadero/falso que pidan justificar y 1 pregunta de desarrollo. Todas deben poder responderse con el material. No escribas introducción, resumen ni descripción del tema. Primero muestra solo las preguntas y opciones. Al final agrega una clave de respuestas separada, con respuesta correcta y explicación breve para cada pregunta. Si el texto no alcanza para alguna pregunta, usa otro dato que sí aparezca.\n\n<<< INICIO DEL MATERIAL DE ESTUDIO >>>\n${source}\n<<< FIN DEL MATERIAL DE ESTUDIO >>>`
        : `Ayúdame a investigar este tema en español: ${source}\n\nSepara hechos generales, preguntas que todavía habría que verificar y términos de búsqueda recomendados. No afirmes que consultaste internet y no inventes citas ni enlaces. Indica si la respuesta puede requerir actualización.`;
    try { updateAIState(setAiOutputs, tool, await askOllama(request, tool === "exams" ? "exam" : tool === "summaries" ? "summary" : undefined)); }
    catch (error) { updateAIState(setAiErrors, tool, error instanceof Error ? error.message : "No se pudo completar la consulta."); }
    finally { setAiBusyByTool(current => ({ ...current, [tool]: false })); }
  }

  if (!toolContent[active]) return null;
  return <section className="tool-view study-tool-view">
    <StudyHeader active={active}/>
    {active === "notes" && <AgendaTool data={workspace.data} update={workspace.update} ready={workspace.ready}/>}
    {active === "calendar" && <CalendarTool data={workspace.data} update={workspace.update} ready={workspace.ready}/>}
    {active === "notebook" && <NotebookTool data={workspace.data} update={workspace.update} ready={workspace.ready}/>}
    {(active === "exams" || active === "summaries" || active === "search") && <section className={`panel study-ai-panel study-ai-panel-${active}`}>
      {active === "exams" && <div className="study-tool-guide exam-guide"><strong>Modo examen</strong><p>Analizo tus apuntes y preparo preguntas para que las respondas. La clave queda cerrada hasta que termines.</p><span>10 preguntas · opción múltiple · respuesta breve · desarrollo</span></div>}
      {active === "summaries" && <div className="study-tool-guide summary-guide"><strong>Modo resumen</strong><p>Convierto el material en una explicación ordenada con tema central, ideas principales y conceptos clave.</p></div>}
      {active === "search" && <div className="study-tool-guide research-guide"><strong>Modo investigación</strong><p>Escribe una pregunta o tema. La IA te ayuda a organizar qué investigar y abre búsquedas externas para contrastarlo.</p></div>}
      <label className="study-label" htmlFor="study-ai-input">{active === "search" ? "Tema o pregunta para investigar" : active === "exams" ? "Apuntes que entran en el examen" : "Texto para resumir"}</label>
      <textarea id="study-ai-input" className="study-textarea" value={aiInput} onChange={event => activeAITool && updateAIState(setAiInputs, activeAITool, event.target.value)} placeholder={active === "search" ? "Ej.: ¿Qué evidencia reciente hay sobre…?" : active === "exams" ? "Pega el texto o los apuntes que quieres que evalúe…" : "Pega el texto que quieres convertir en apuntes de estudio…"} maxLength={30000}/>
      <div className="study-ai-actions"><small>{aiInput.length.toLocaleString("es-UY")} caracteres · IA Ollama</small><button className="primary-button" type="button" onClick={() => void generate()} disabled={!workspace.ready || !aiInput.trim() || aiBusy}>{aiBusy ? "Preparando…" : active === "exams" ? "Generar examen" : active === "summaries" ? "Resumir texto" : "Preparar investigación"}</button></div>
      {active === "search" && aiInput.trim() && <div className="research-links"><span>Contrasta la respuesta con fuentes actuales:</span><a href={`https://www.google.com/search?q=${encodeURIComponent(aiInput.trim())}`} target="_blank" rel="noreferrer">Buscar en Google ↗</a><a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(aiInput.trim())}`} target="_blank" rel="noreferrer">Google Académico ↗</a></div>}
      {aiError && <p className="study-error" role="alert">{aiError}</p>}
      {!workspace.ready && <p className="study-muted">Cargando tu espacio…</p>}
      {aiOutput && <div className="study-output-wrap"><div className="study-output-title"><h2>{active === "exams" ? "Examen" : active === "summaries" ? "Resumen" : "Guía de investigación"}</h2><button className="secondary-button" type="button" onClick={() => saveNote(toolContent[active].title, aiOutput)}>Guardar en la libreta</button></div>{active === "exams" ? <ExamOutput answer={aiOutput}/> : <div className="study-output">{aiOutput}</div>}</div>}
      {active === "search" && <p className="study-notice">Ollama responde con el modelo configurado, sin consultar la web en vivo. Usa las búsquedas de arriba para verificar actualidad y fuentes.</p>}
      {workspace.storageMessage && <p className="study-notice" role="status">{workspace.storageMessage}</p>}
    </section>}
    {workspace.storageMessage && ["notes", "calendar", "notebook"].includes(active) && <p className="study-notice" role="status">{workspace.storageMessage}</p>}
    <p className="study-storage-status"><span className="status-dot"/>{workspace.storage === "loading" ? "Cargando…" : workspace.storage === "account" ? "Sincronizado con tu cuenta" : "Guardado en este dispositivo"}</p>
  </section>;
}

function ExamOutput({ answer }: { answer: string }) {
  const exam = splitExamAnswerKey(answer);
  return <>
    <div className="study-output exam-output">{exam.questions}</div>
    {exam.key && <details className="exam-answer-key"><summary>Terminé el examen · Ver clave de respuestas</summary><div className="study-output">{exam.key}</div></details>}
    {!exam.key && <p className="study-notice">La IA no separó la clave de respuestas en esta respuesta. Puedes volver a generar el examen.</p>}
  </>;
}

function AgendaTool({ data, update, ready }: { data: WorkspaceData; update: (change: (current: WorkspaceData) => WorkspaceData) => void; ready: boolean }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    const task: StudyTask = { id: crypto.randomUUID(), title: clean.slice(0, 180), dueDate, done: false };
    update(current => ({ ...current, agenda: [task, ...current.agenda] }));
    setTitle(""); setDueDate("");
  }
  const tasks = [...data.agenda].sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  return <section className="study-columns">
    <form className="panel study-form-panel" onSubmit={addTask}>
      <h2>Nueva tarea</h2><label className="study-label" htmlFor="agenda-title">¿Qué necesitas hacer?</label><input id="agenda-title" className="study-input" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej.: Repasar el capítulo 3" maxLength={180}/>
      <label className="study-label" htmlFor="agenda-date">Fecha límite (opcional)</label><input id="agenda-date" className="study-input" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)}/>
      <button className="primary-button" type="submit" disabled={!ready || !title.trim()}>Agregar a la agenda</button>
    </form>
    <div className="panel study-list-panel"><div className="study-panel-title"><div><span className="eyebrow">TU PLAN</span><h2>Agenda de estudio</h2></div><span className="study-count">{data.agenda.filter(task => !task.done).length} pendientes</span></div>
      {!ready ? <p className="study-muted">Cargando tus tareas…</p> : tasks.length === 0 ? <EmptyState icon="✎" title="Tu agenda está libre" text="Agrega una tarea con una fecha para organizar tu estudio."/> : <ul className="study-item-list">{tasks.map(task => <li key={task.id} className={`study-task ${task.done ? "is-done" : ""}`}><label><input type="checkbox" checked={task.done} onChange={() => update(current => ({ ...current, agenda: current.agenda.map(row => row.id === task.id ? { ...row, done: !row.done } : row) }))}/><span>{task.title}{task.dueDate && <small>Para {formatDate(task.dueDate)}</small>}</span></label><button type="button" className="item-remove" aria-label={`Eliminar ${task.title}`} onClick={() => update(current => ({ ...current, agenda: current.agenda.filter(row => row.id !== task.id) }))}>×</button></li>)}</ul>}
    </div>
  </section>;
}

function CalendarTool({ data, update, ready }: { data: WorkspaceData; update: (change: (current: WorkspaceData) => WorkspaceData) => void; ready: boolean }) {
  const [month, setMonth] = useState({ year: 2000, month: 0 });
  const [selectedDate, setSelectedDate] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const today = new Date();
      setMonth({ year: today.getFullYear(), month: today.getMonth() });
      setSelectedDate(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const firstDay = new Date(Date.UTC(month.year, month.month, 1)).getUTCDay();
  const leading = (firstDay + 6) % 7;
  const days = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate();
  const monthName = new Intl.DateTimeFormat("es-UY", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(month.year, month.month, 15)));
  const cells = Array.from({ length: Math.ceil((leading + days) / 7) * 7 }, (_, index) => {
    const day = index - leading + 1;
    if (day < 1 || day > days) return null;
    return `${month.year}-${pad(month.month + 1)}-${pad(day)}`;
  });
  const selectedEvents = data.calendar.filter(item => item.date === selectedDate).sort((a, b) => a.title.localeCompare(b.title));
  function shiftMonth(offset: number) {
    const date = new Date(Date.UTC(month.year, month.month + offset, 1));
    setMonth({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
  }
  function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventTitle.trim() || !selectedDate) return;
    const item: StudyEvent = { id: crypto.randomUUID(), title: eventTitle.trim().slice(0, 180), date: selectedDate };
    update(current => ({ ...current, calendar: [...current.calendar, item] }));
    setEventTitle("");
  }
  return <section className="study-columns calendar-columns">
    <div className="panel calendar-panel"><div className="calendar-toolbar"><button className="calendar-arrow" type="button" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">‹</button><h2>{monthName}</h2><button className="calendar-arrow" type="button" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">›</button></div>
      <div className="calendar-grid calendar-weekdays">{["L", "M", "X", "J", "V", "S", "D"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="calendar-grid">{cells.map((date, index) => date ? <button type="button" key={date} className={`calendar-day ${selectedDate === date ? "selected" : ""} ${data.calendar.some(item => item.date === date) ? "has-events" : ""}`} onClick={() => setSelectedDate(date)} aria-label={`${formatDate(date)}${data.calendar.some(item => item.date === date) ? ", con evento" : ""}`}>{Number(date.slice(-2))}<i/></button> : <span className="calendar-empty" key={`blank-${index}`}/>)}</div>
      <p className="calendar-help">Elige un día para ver o agregar una fecha de estudio.</p>
    </div>
    <div className="panel calendar-event-panel"><div className="eyebrow">{selectedDate ? formatDate(selectedDate) : "ELIGE UN DÍA"}</div><h2>Fechas importantes</h2>
      <form className="calendar-add-form" onSubmit={addEvent}><label className="study-label" htmlFor="event-title">Nombre del evento</label><input id="event-title" className="study-input" value={eventTitle} onChange={event => setEventTitle(event.target.value)} placeholder="Examen, entrega o sesión" maxLength={180}/><button type="submit" className="primary-button" disabled={!ready || !selectedDate || !eventTitle.trim()}>Agregar fecha</button></form>
      {!ready ? <p className="study-muted">Cargando tus fechas…</p> : selectedEvents.length === 0 ? <EmptyState icon="▣" title="Sin eventos este día" text="Añade un examen, entrega o sesión de estudio."/> : <ul className="study-item-list">{selectedEvents.map(item => <li className="study-event" key={item.id}><span className="event-dot"/><span>{item.title}</span><button type="button" className="item-remove" aria-label={`Eliminar ${item.title}`} onClick={() => update(current => ({ ...current, calendar: current.calendar.filter(event => event.id !== item.id) }))}>×</button></li>)}</ul>}
    </div>
  </section>;
}

function NotebookTool({ data, update, ready }: { data: WorkspaceData; update: (change: (current: WorkspaceData) => WorkspaceData) => void; ready: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const selected = data.notes.find(note => note.id === selectedId) || null;
  useEffect(() => {
    if (!selectedId && data.notes[0]) {
      const timer = window.setTimeout(() => setSelectedId(data.notes[0].id), 0);
      return () => window.clearTimeout(timer);
    }
  }, [data.notes, selectedId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTitle(selected?.title || ""); setContent(selected?.content || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selected?.content, selected?.title, selectedId]);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() && !content.trim()) return;
    const updatedAt = new Date().toISOString();
    if (selectedId && selectedId !== NEW_NOTE) {
      update(current => ({ ...current, notes: current.notes.map(note => note.id === selectedId ? { ...note, title: title.trim().slice(0, 100) || "Apunte", content, updatedAt } : note) }));
    } else {
      const note: StudyNote = { id: crypto.randomUUID(), title: title.trim().slice(0, 100) || "Apunte", content, updatedAt };
      update(current => ({ ...current, notes: [note, ...current.notes] })); setSelectedId(note.id);
    }
  }
  function newNote() { setSelectedId(NEW_NOTE); setTitle(""); setContent(""); }
  return <section className="notebook-layout">
    <aside className="panel notebook-list"><div className="study-panel-title"><div><span className="eyebrow">TUS APUNTES</span><h2>Libreta</h2></div><button type="button" className="new-conversation" title="Nueva nota" onClick={newNote}>＋</button></div>
      {!ready ? <p className="study-muted">Cargando tus apuntes…</p> : data.notes.length === 0 ? <p className="empty-history">Todavía no guardaste notas.</p> : <div className="notebook-items">{data.notes.map(note => <button className={`notebook-item ${selectedId === note.id ? "selected" : ""}`} key={note.id} onClick={() => setSelectedId(note.id)}><strong>{note.title}</strong><small>{note.content.replace(/\s+/g, " ").slice(0, 62) || "Nota vacía"}</small></button>)}</div>}
    </aside>
    <form className="panel notebook-editor" onSubmit={save}><div className="notebook-editor-head"><span className="eyebrow">{selected ? `Editada ${formatDate(selected.updatedAt.slice(0, 10))}` : "NUEVO APUNTE"}</span>{selected && <button type="button" className="text-button-danger" onClick={() => { update(current => ({ ...current, notes: current.notes.filter(note => note.id !== selected.id) })); newNote(); }}>Eliminar</button>}</div>
      <input className="notebook-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="Título de la nota" maxLength={100} aria-label="Título de la nota"/><textarea className="study-textarea notebook-content" value={content} onChange={event => setContent(event.target.value)} placeholder="Escribe o pega aquí tus apuntes…" maxLength={30000} aria-label="Contenido de la nota"/><div className="study-ai-actions"><small>{content.length.toLocaleString("es-UY")} caracteres</small><button className="primary-button" type="submit" disabled={!ready || (!title.trim() && !content.trim())}>Guardar nota</button></div>
    </form>
  </section>;
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="study-empty"><span>{icon}</span><strong>{title}</strong><p>{text}</p></div>;
}
