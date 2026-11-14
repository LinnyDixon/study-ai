"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAppLocale } from "@/components/app-locale";
import type { AppLanguage } from "@/lib/app-languages";
import { translateUi } from "@/lib/ui-translation";
import "../../study-tools.css";

type ExamQuestion = { type: "choice" | "short" | "true_false" | "development"; prompt: string; testedConcept: string; options: string[]; correctAnswer: string; acceptedAnswers?: string[]; explanation: string };
type AIWrittenGrade = { verdict: "correct" | "partial" | "incorrect"; feedback: string };
type ExamSession = { id: string; questions: ExamQuestion[]; durationMinutes: number; startedAt: number; answers: Record<number, string>; currentIndex: number; language?: AppLanguage; finished?: boolean; completionAlerted?: boolean; writtenGrades?: Record<number, boolean>; aiGrades?: Record<number, AIWrittenGrade> };
const STORAGE_KEY = "study-ai-current-exam-v1";

function normalizeExamAnswer(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function matchesWrittenAnswer(question: ExamQuestion, answer: string) {
  const normalizedAnswer = normalizeExamAnswer(answer);
  return normalizedAnswer.length > 0 && [question.correctAnswer, ...(question.acceptedAnswers || [])].some(valid => normalizeExamAnswer(valid) === normalizedAnswer);
}

export default function ExamSessionPage() {
  const { language: globalLanguage } = useAppLocale();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [writtenGrades, setWrittenGrades] = useState<Record<number, boolean>>({});
  const [aiGrades, setAiGrades] = useState<Record<number, AIWrittenGrade>>({});
  const [gradingStatus, setGradingStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [gradingAttempt, setGradingAttempt] = useState(0);
  const gradingStarted = useRef(false);
  const completionAlerted = useRef(false);
  const [loading, setLoading] = useState(true);
  const language = session?.language || globalLanguage;
  const t = (text: string) => translateUi(language, text);

  useEffect(() => {
    const attemptId = new URLSearchParams(window.location.search).get("attempt");
    const timer = window.setTimeout(() => {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        const value = stored ? JSON.parse(stored) as ExamSession : null;
        if (attemptId && value?.id === attemptId && Array.isArray(value.questions) && value.questions.length > 0 && typeof value.durationMinutes === "number" && typeof value.startedAt === "number") {
          setSession(value);
          setAnswers(value.answers || {});
          setWrittenGrades(value.writtenGrades || {});
          setAiGrades(value.aiGrades || {});
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
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, answers, currentIndex, finished, writtenGrades, aiGrades })); }
    catch { /* Keep the current attempt usable even if browser storage is unavailable. */ }
  }, [session, answers, currentIndex, finished, writtenGrades, aiGrades]);

  useEffect(() => {
    if (!finished || !session || completionAlerted.current || session.completionAlerted) return;
    completionAlerted.current = true;
    setSession(current => current ? { ...current, completionAlerted: true } : current);
    void (async () => {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const { data } = await supabase.from("user_preferences").select("preferences").eq("user_id", auth.user.id).maybeSingle();
        const preferences = data?.preferences && typeof data.preferences === "object" ? data.preferences as Record<string, unknown> : {};
        if (preferences.notifications === true && "Notification" in window && Notification.permission === "granted") {
          if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
            await registration.showNotification("Parcial terminado", {
              body: `Terminaste un parcial de ${session.questions.length} preguntas.`,
              icon: "/study-ai-icon-192.png",
              badge: "/study-ai-icon-192.png",
              data: { url: "/app" },
            });
          } else {
            new Notification("Parcial terminado", { body: `Terminaste un parcial de ${session.questions.length} preguntas.` });
          }
        }
        if (preferences.sounds === true && "AudioContext" in window) {
          const context = new AudioContext();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = 660;
          gain.gain.setValueAtTime(0.08, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
          oscillator.connect(gain); gain.connect(context.destination);
          oscillator.start(); oscillator.stop(context.currentTime + 0.35);
          window.setTimeout(() => { void context.close(); }, 400);
        }
      } catch { /* Completion remains available if browser alerts are unavailable. */ }
    })();
  }, [finished, session]);

  useEffect(() => {
    if (!finished || !session) return;
    const questionsToGrade = session.questions.flatMap((item, index) => {
      const isWritten = item.type === "short" || item.type === "development";
      const answer = answers[index]?.trim() || "";
      if (!isWritten || !answer || matchesWrittenAnswer(item, answer) || aiGrades[index] || writtenGrades[index] !== undefined) return [];
      return [{ index, prompt: item.prompt, answer, correctAnswer: item.correctAnswer, acceptedAnswers: item.acceptedAnswers || [], explanation: item.explanation }];
    });
    if (!questionsToGrade.length) { queueMicrotask(() => setGradingStatus("done")); return; }
    if (gradingStarted.current) return;
    gradingStarted.current = true;
    setGradingStatus("loading");
    void (async () => {
      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            task: "exam_grade",
            language,
            examQuestionCount: questionsToGrade.length,
            messages: [{ role: "user", content: JSON.stringify({ writtenAnswers: questionsToGrade }) }],
          }),
        });
        const result = await response.json() as { answer?: string; error?: string };
        if (!response.ok || !result.answer) throw new Error(result.error || "No se pudo evaluar el examen.");
        const parsed: unknown = JSON.parse(result.answer);
        if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { results?: unknown }).results)) throw new Error("La IA devolvió una corrección incompleta.");
        const expectedIndexes = new Set(questionsToGrade.map(item => item.index));
        const newGrades: Record<number, AIWrittenGrade> = {};
        for (const item of (parsed as { results: unknown[] }).results) {
          if (!item || typeof item !== "object") throw new Error("La IA devolvió una corrección incompleta.");
          const grade = item as Record<string, unknown>;
          if (typeof grade.index !== "number" || !expectedIndexes.has(grade.index) || newGrades[grade.index] || (grade.verdict !== "correct" && grade.verdict !== "partial" && grade.verdict !== "incorrect") || typeof grade.feedback !== "string") {
            throw new Error("La IA devolvió una corrección inválida.");
          }
          newGrades[grade.index] = { verdict: grade.verdict, feedback: grade.feedback };
        }
        if (Object.keys(newGrades).length !== questionsToGrade.length) throw new Error("La IA no corrigió todas las respuestas.");
        setAiGrades(current => ({ ...current, ...newGrades }));
        setGradingStatus("done");
      } catch {
        setGradingStatus("error");
      }
    })();
  }, [finished, session, answers, aiGrades, writtenGrades, gradingAttempt, language]);

  const question = session?.questions[currentIndex];
  const answeredCount = useMemo(() => Object.values(answers).filter(Boolean).length, [answers]);
  const clock = secondsRemaining === null ? "--:--" : `${Math.floor(secondsRemaining / 60).toString().padStart(2, "0")}:${(secondsRemaining % 60).toString().padStart(2, "0")}`;

  if (loading) return <main className="exam-session-page"><p className="study-muted">{t("Abriendo tu parcial…")}</p></main>;
  if (!session) return <main className="exam-session-page"><section className="exam-session-empty"><span className="study-heading-icon">▦</span><h1>{t("No hay un parcial abierto")}</h1><p>{t("Vuelve a Exámenes y genera uno con tus apuntes.")}</p><Link className="primary-button exam-link-button" href="/app">{t("Ir a Exámenes")}</Link></section></main>;

  if (finished) {
    const pendingWrittenCount = session.questions.reduce((count, item, index) => count + ((item.type === "short" || item.type === "development") && Boolean(answers[index]?.trim()) && !matchesWrittenAnswer(item, answers[index] || "") && !aiGrades[index] && writtenGrades[index] === undefined ? 1 : 0), 0);
    const correctCount = session.questions.reduce((count, item, index) => {
      if (item.type === "short" || item.type === "development") {
        if (matchesWrittenAnswer(item, answers[index] || "") || writtenGrades[index] === true || aiGrades[index]?.verdict === "correct") return count + 1;
        if (aiGrades[index]?.verdict === "partial") return count + 0.5;
        return count;
      }
      return count + ((answers[index] || "").trim().toLocaleLowerCase() === item.correctAnswer.trim().toLocaleLowerCase() ? 1 : 0);
    }, 0);
    return <main className="exam-session-page">
    <div className="exam-session-top"><Link href="/app" className="exam-back-link">← {t("Salir del parcial")}</Link><span className="exam-brand">study<span>.ai</span></span></div>
    <section className="exam-review"><div className="eyebrow">{t("PARCIAL FINALIZADO")}</div><h1>{t("Revisa tus respuestas")}</h1>
      <div className="exam-score-card"><span>{t(pendingWrittenCount || gradingStatus === "loading" ? "Puntaje provisional" : "Puntaje final")}</span><strong>{Number.isInteger(correctCount) ? correctCount : correctCount.toFixed(1)} / {session.questions.length}</strong><p>{gradingStatus === "loading" ? (language === "en" ? `AI is grading ${pendingWrittenCount} written answer${pendingWrittenCount === 1 ? "" : "s"}.` : language === "fr" ? `L’IA évalue ${pendingWrittenCount} réponse${pendingWrittenCount === 1 ? " écrite" : "s écrites"}.` : language === "de" ? `Die KI bewertet ${pendingWrittenCount} schriftliche Antwort${pendingWrittenCount === 1 ? "" : "en"}.` : language === "zh-CN" ? `AI 正在评阅 ${pendingWrittenCount} 份书面答案。` : language === "ja" ? `AI が記述回答 ${pendingWrittenCount} 件を採点しています。` : language === "pt-BR" ? `A IA está avaliando ${pendingWrittenCount} resposta(s) escrita(s).` : `La IA está evaluando ${pendingWrittenCount} respuesta(s) escrita(s).`) : gradingStatus === "error" ? (language === "es" ? "No se pudo completar la corrección automática. Puedes reintentar o revisar las respuestas escritas manualmente." : "Automatic grading could not be completed. You can retry or review written answers manually.") : pendingWrittenCount ? (language === "en" ? `You answered ${answeredCount} of ${session.questions.length}. Some written answers are still pending.` : language === "fr" ? `Vous avez répondu à ${answeredCount} questions sur ${session.questions.length}. Des réponses écrites sont en attente.` : language === "de" ? `${answeredCount} von ${session.questions.length} beantwortet. Schriftliche Antworten stehen noch aus.` : language === "zh-CN" ? `已回答 ${answeredCount}/${session.questions.length} 题。部分书面答案尚待评阅。` : language === "ja" ? `${answeredCount}/${session.questions.length} 問に回答しました。記述回答の採点待ちです。` : language === "pt-BR" ? `Você respondeu ${answeredCount} de ${session.questions.length}. Ainda há respostas escritas pendentes.` : `Respondiste ${answeredCount} de ${session.questions.length}. Aún hay respuestas escritas pendientes.`) : (language === "en" ? `You answered ${answeredCount} of ${session.questions.length} questions.` : language === "fr" ? `Vous avez répondu à ${answeredCount} questions sur ${session.questions.length}.` : language === "de" ? `${answeredCount} von ${session.questions.length} Fragen beantwortet.` : language === "zh-CN" ? `已回答 ${answeredCount}/${session.questions.length} 题。` : language === "ja" ? `${session.questions.length} 問中 ${answeredCount} 問に回答しました。` : language === "pt-BR" ? `Você respondeu ${answeredCount} de ${session.questions.length} perguntas.` : `Respondiste ${answeredCount} de ${session.questions.length} preguntas.`)}</p>{gradingStatus === "error" && <button type="button" className="secondary-button" onClick={() => { gradingStarted.current = false; setGradingStatus("loading"); setGradingAttempt(value => value + 1); }}>{language === "en" ? "Retry AI grading" : language === "fr" ? "Réessayer la correction IA" : language === "de" ? "KI-Bewertung erneut versuchen" : language === "zh-CN" ? "重试 AI 评分" : language === "ja" ? "AI 採点を再試行" : language === "pt-BR" ? "Tentar corrigir com IA novamente" : "Reintentar corrección con IA"}</button>}</div>
      <p className="exam-review-intro">{t("La clave y las explicaciones aparecen aquí, después de terminar.")}</p>
      {session.questions.map((item, index) => {
        const answer = answers[index] || t("Sin responder");
        const written = item.type === "short" || item.type === "development";
        const hasWrittenAnswer = Boolean(answers[index]?.trim());
        const exactWrittenMatch = written && matchesWrittenAnswer(item, answers[index] || "");
        const aiGrade = aiGrades[index];
        const correct = written ? (!hasWrittenAnswer ? false : exactWrittenMatch || writtenGrades[index] === true || aiGrade?.verdict === "correct" ? true : aiGrade ? false : writtenGrades[index]) : answer.trim().toLocaleLowerCase() === item.correctAnswer.trim().toLocaleLowerCase();
        const resultLabel = written && !hasWrittenAnswer ? t("Sin responder") : exactWrittenMatch || writtenGrades[index] === true || aiGrade?.verdict === "correct" || (!written && correct) ? t("Correcta") : aiGrade?.verdict === "partial" ? t("Parcial") : aiGrade?.verdict === "incorrect" || correct === false ? t("Para repasar") : t("La IA está revisando");
        const showManualReview = written && !exactWrittenMatch && !aiGrade && gradingStatus === "error";
        return <article className="exam-review-card" key={`${index}-${item.prompt}`}><div className="exam-review-head"><span>{language === "en" ? `Question ${index + 1}` : language === "fr" ? `Question ${index + 1}` : language === "de" ? `Frage ${index + 1}` : language === "zh-CN" ? `第 ${index + 1} 题` : language === "ja" ? `問題 ${index + 1}` : language === "pt-BR" ? `Pergunta ${index + 1}` : `Pregunta ${index + 1}`}</span><span className={correct === true ? "exam-mark-correct" : aiGrade?.verdict === "partial" ? "exam-mark-pending" : correct === false ? "exam-mark-wrong" : "exam-mark-pending"}>{resultLabel}</span></div><h2>{item.prompt}</h2><p><b>{t("Tu respuesta:")}</b> {answer}</p>{written && exactWrittenMatch && <p className="exam-ai-feedback">{t("La respuesta coincide con una respuesta aceptada.")}</p>}{written && aiGrade && <p className="exam-ai-feedback">{aiGrade.feedback}</p>}{written && showManualReview && <div className="exam-written-grade"><span>{t("Autoevalúa mientras se restablece la IA:")}</span><button type="button" className={writtenGrades[index] === true ? "selected" : ""} disabled={!answers[index]?.trim()} aria-pressed={writtenGrades[index] === true} onClick={() => setWrittenGrades(current => ({ ...current, [index]: true }))}>{t("La respondí bien")}</button><button type="button" className={writtenGrades[index] === false ? "selected" : ""} aria-pressed={writtenGrades[index] === false} onClick={() => setWrittenGrades(current => ({ ...current, [index]: false }))}>{t("Necesito repasarla")}</button></div>}<p><b>{t("Respuesta esperada:")}</b> {item.correctAnswer}</p><p className="exam-explanation">{item.explanation}</p></article>;
      })}
      <Link className="primary-button exam-link-button" href="/app">{t("Volver al espacio de estudio")}</Link>
    </section>
  </main>;
  }

  if (!question) return null;
  const progress = Math.round(((currentIndex + 1) / session.questions.length) * 100);
  return <main className="exam-session-page">
    <div className="exam-session-top"><Link href="/app" className="exam-back-link">← {t("Salir del parcial")}</Link><span className="exam-brand">study<span>.ai</span></span><div className={`exam-timer ${secondsRemaining !== null && secondsRemaining < 60 ? "is-urgent" : ""}`} role="timer" aria-live="polite"><small>{t("TIEMPO RESTANTE")}</small><strong>{clock}</strong></div></div>
    <section className="exam-take">
      <div className="exam-progress-row"><span>{language === "en" ? `Question ${currentIndex + 1} of ${session.questions.length}` : language === "fr" ? `Question ${currentIndex + 1} sur ${session.questions.length}` : language === "de" ? `Frage ${currentIndex + 1} von ${session.questions.length}` : language === "zh-CN" ? `第 ${currentIndex + 1} / ${session.questions.length} 题` : language === "ja" ? `${session.questions.length} 問中 ${currentIndex + 1} 問目` : language === "pt-BR" ? `Pergunta ${currentIndex + 1} de ${session.questions.length}` : `Pregunta ${currentIndex + 1} de ${session.questions.length}`}</span><span>{answeredCount} {t("respondidas")}</span></div>
      <div className="exam-progress-track"><span style={{ width: `${progress}%` }}/></div>
      <article className="exam-question-card">
        <div className="eyebrow">{question.type === "choice" ? "OPCIÓN MÚLTIPLE" : question.type === "short" ? "RESPUESTA BREVE" : question.type === "true_false" ? "VERDADERO O FALSO" : "DESARROLLO"}</div>
        <h1>{question.prompt}</h1>
        {question.type === "choice" && <fieldset className="exam-options" aria-label={t("Elige una respuesta")}>{question.options.map((option, index) => <button key={`${index}-${option}`} className={`exam-option ${answers[currentIndex] === option ? "selected" : ""}`} type="button" aria-pressed={answers[currentIndex] === option} onClick={() => setAnswers(value => ({ ...value, [currentIndex]: option }))}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</fieldset>}
        {question.type === "true_false" && <div className="exam-options exam-binary-options">{["Verdadero", "Falso"].map(option => <button key={option} type="button" className={`exam-option ${answers[currentIndex] === option ? "selected" : ""}`} aria-pressed={answers[currentIndex] === option} onClick={() => setAnswers(value => ({ ...value, [currentIndex]: option }))}>{t(option)}</button>)}</div>}
        {(question.type === "short" || question.type === "development") && <label className="exam-answer-field"><span>{t(question.type === "short" ? "Tu respuesta" : "Desarrolla tu respuesta")}</span><textarea value={answers[currentIndex] || ""} onChange={event => setAnswers(value => ({ ...value, [currentIndex]: event.target.value }))} placeholder={t("Escribe tu respuesta aquí…")} rows={question.type === "short" ? 4 : 8}/></label>}
      </article>
      <div className="exam-question-actions"><button className="secondary-button" type="button" disabled={currentIndex === 0} onClick={() => setCurrentIndex(value => Math.max(0, value - 1))}>{t("Anterior")}</button>{currentIndex < session.questions.length - 1 ? <button className="primary-button" type="button" onClick={() => setCurrentIndex(value => Math.min(session.questions.length - 1, value + 1))}>{t("Siguiente pregunta →")}</button> : <button className="primary-button" type="button" onClick={() => setFinished(true)}>{t("Finalizar y ver respuestas")}</button>}</div>
      <p className="exam-session-note">{t("El tiempo corre aunque cambies de pregunta. Al agotarse, se mostrará automáticamente la revisión.")}</p>
    </section>
  </main>;
}
