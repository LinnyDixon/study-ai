"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../../study-tools.css";

type ExamQuestion = { type: "choice" | "short" | "true_false" | "development"; prompt: string; options: string[]; correctAnswer: string; explanation: string };
type ExamSession = { questions: ExamQuestion[]; durationMinutes: number; startedAt: number; answers: Record<number, string>; currentIndex: number; finished?: boolean };
const STORAGE_KEY = "study-ai-current-exam-v1";

export default function ExamSessionPage() {
  const [session, setSession] = useState<ExamSession | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        const value = stored ? JSON.parse(stored) as ExamSession : null;
        if (value && Array.isArray(value.questions) && value.questions.length > 0 && typeof value.durationMinutes === "number" && typeof value.startedAt === "number") {
          setSession(value);
          setAnswers(value.answers || {});
          setCurrentIndex(Math.min(value.currentIndex || 0, value.questions.length - 1));
          setFinished(value.finished === true);
          const deadline = value.startedAt + value.durationMinutes * 60_000;
          setSecondsRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
        }
      } catch { /* Invalid local exam data is handled by the empty state. */ }
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!session || finished) return;
    const deadline = session.startedAt + session.durationMinutes * 60_000;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) setFinished(true);
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [session, finished]);

  useEffect(() => {
    if (!session) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, answers, currentIndex, finished })); }
    catch { /* Keep the current attempt usable even if browser storage is unavailable. */ }
  }, [session, answers, currentIndex, finished]);

  const question = session?.questions[currentIndex];
  const answeredCount = useMemo(() => Object.values(answers).filter(Boolean).length, [answers]);
  const clock = secondsRemaining === null ? "--:--" : `${Math.floor(secondsRemaining / 60).toString().padStart(2, "0")}:${(secondsRemaining % 60).toString().padStart(2, "0")}`;

  if (loading) return <main className="exam-session-page"><p className="study-muted">Abriendo tu parcial…</p></main>;
  if (!session) return <main className="exam-session-page"><section className="exam-session-empty"><span className="study-heading-icon">▦</span><h1>No hay un parcial abierto</h1><p>Vuelve a Exámenes y genera uno con tus apuntes.</p><Link className="primary-button exam-link-button" href="/app">Ir a Exámenes</Link></section></main>;

  if (finished) return <main className="exam-session-page">
    <div className="exam-session-top"><Link href="/app" className="exam-back-link">← Salir del parcial</Link><span className="exam-brand">study<span>.ai</span></span></div>
    <section className="exam-review"><div className="eyebrow">PARCIAL FINALIZADO</div><h1>Revisa tus respuestas</h1><p className="exam-review-intro">Respondiste {answeredCount} de {session.questions.length} preguntas. La clave aparece aquí, después de terminar.</p>
      {session.questions.map((item, index) => {
        const answer = answers[index] || "Sin responder";
        const objective = item.type === "choice" || item.type === "true_false";
        const correct = objective && answer.trim().toLocaleLowerCase() === item.correctAnswer.trim().toLocaleLowerCase();
        return <article className="exam-review-card" key={`${index}-${item.prompt}`}><div className="exam-review-head"><span>Pregunta {index + 1}</span>{objective && <span className={correct ? "exam-mark-correct" : "exam-mark-wrong"}>{correct ? "Correcta" : "Revisar"}</span>}</div><h2>{item.prompt}</h2><p><b>Tu respuesta:</b> {answer}</p><p><b>Respuesta esperada:</b> {item.correctAnswer}</p><p className="exam-explanation">{item.explanation}</p></article>;
      })}
      <Link className="primary-button exam-link-button" href="/app">Volver al espacio de estudio</Link>
    </section>
  </main>;

  if (!question) return null;
  const progress = Math.round(((currentIndex + 1) / session.questions.length) * 100);
  return <main className="exam-session-page">
    <div className="exam-session-top"><Link href="/app" className="exam-back-link">← Salir del parcial</Link><span className="exam-brand">study<span>.ai</span></span><div className={`exam-timer ${secondsRemaining !== null && secondsRemaining < 60 ? "is-urgent" : ""}`} role="timer" aria-live="polite"><small>TIEMPO RESTANTE</small><strong>{clock}</strong></div></div>
    <section className="exam-take">
      <div className="exam-progress-row"><span>Pregunta {currentIndex + 1} de {session.questions.length}</span><span>{answeredCount} respondidas</span></div>
      <div className="exam-progress-track"><span style={{ width: `${progress}%` }}/></div>
      <article className="exam-question-card">
        <div className="eyebrow">{question.type === "choice" ? "OPCIÓN MÚLTIPLE" : question.type === "short" ? "RESPUESTA BREVE" : question.type === "true_false" ? "VERDADERO O FALSO" : "DESARROLLO"}</div>
        <h1>{question.prompt}</h1>
        {question.type === "choice" && <fieldset className="exam-options" aria-label="Elige una respuesta">{question.options.map((option, index) => <button key={`${index}-${option}`} className={`exam-option ${answers[currentIndex] === option ? "selected" : ""}`} type="button" aria-pressed={answers[currentIndex] === option} onClick={() => setAnswers(value => ({ ...value, [currentIndex]: option }))}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</fieldset>}
        {question.type === "true_false" && <div className="exam-options exam-binary-options">{["Verdadero", "Falso"].map(option => <button key={option} type="button" className={`exam-option ${answers[currentIndex] === option ? "selected" : ""}`} aria-pressed={answers[currentIndex] === option} onClick={() => setAnswers(value => ({ ...value, [currentIndex]: option }))}>{option}</button>)}</div>}
        {(question.type === "short" || question.type === "development") && <label className="exam-answer-field"><span>{question.type === "short" ? "Tu respuesta" : "Desarrolla tu respuesta"}</span><textarea value={answers[currentIndex] || ""} onChange={event => setAnswers(value => ({ ...value, [currentIndex]: event.target.value }))} placeholder="Escribe tu respuesta aquí…" rows={question.type === "short" ? 4 : 8}/></label>}
      </article>
      <div className="exam-question-actions"><button className="secondary-button" type="button" disabled={currentIndex === 0} onClick={() => setCurrentIndex(value => Math.max(0, value - 1))}>Anterior</button>{currentIndex < session.questions.length - 1 ? <button className="primary-button" type="button" onClick={() => setCurrentIndex(value => Math.min(session.questions.length - 1, value + 1))}>Siguiente pregunta →</button> : <button className="primary-button" type="button" onClick={() => setFinished(true)}>Finalizar y ver respuestas</button>}</div>
      <p className="exam-session-note">El tiempo corre aunque cambies de pregunta. Al agotarse, se mostrará automáticamente la revisión.</p>
    </section>
  </main>;
}
