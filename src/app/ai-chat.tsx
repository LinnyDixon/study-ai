"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/env";

type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
type Conversation = { id: string; title: string; updatedAt: string; messages: Message[] };
const LOCAL_KEY = "study-ai-ai-conversations-v1";

function readableError(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la acción.";
}

export function AIChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [storage, setStorage] = useState<"local" | "cloud">("local");
  const [userId, setUserId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const active = conversations.find(item => item.id === activeId) || null;
  const visibleConversations = useMemo(() => conversations.filter(item => item.title.toLowerCase().includes(search.toLowerCase())), [conversations, search]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (getSupabaseConfig()) {
          const supabase = createClient();
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) throw new Error("Inicia sesión para usar el asistente con tu cuenta.");
          setStorage("cloud");
          setUserId(user.id);
          const { data, error: queryError } = await supabase.from("conversations").select("id,title,updated_at").eq("section", "ai").order("updated_at", { ascending: false }).limit(100);
          if (queryError) throw new Error("No se pudo leer el historial. Comprueba que ejecutaste la migración de Supabase.");
          const rows = data || [];
          if (!cancelled) {
            setConversations(rows.map(row => ({ id: row.id, title: row.title, updatedAt: row.updated_at, messages: [] })));
            if (rows[0]) setActiveId(rows[0].id);
          }
        } else {
          const raw = localStorage.getItem(LOCAL_KEY);
          const saved = raw ? JSON.parse(raw) as Conversation[] : [];
          if (!cancelled && Array.isArray(saved)) {
            setConversations(saved);
            setActiveId(saved[0]?.id || null);
          }
        }
      } catch (cause) {
        if (!cancelled) setError(readableError(cause));
      } finally { if (!cancelled) setReady(true); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || storage !== "local") return;
    let timer: number | undefined;
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(conversations)); }
    catch { timer = window.setTimeout(() => setError("El navegador no pudo guardar el historial local. Comprueba el espacio disponible."), 0); }
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [conversations, ready, storage]);

  useEffect(() => {
    if (!ready || !activeId || storage !== "cloud") return;
    let cancelled = false;
    async function loadMessages() {
      const supabase = createClient();
      const { data, error: queryError } = await supabase.from("messages").select("id,role,content,created_at").eq("conversation_id", activeId).order("created_at", { ascending: true }).limit(500);
      if (queryError) { if (!cancelled) setError("No se pudo cargar esta conversación."); return; }
      if (!cancelled && data) setConversations(current => current.map(item => item.id === activeId ? {
        ...item,
        messages: data.filter(row => row.role === "user" || row.role === "assistant").map(row => ({ id: row.id, role: row.role as Message["role"], content: row.content, createdAt: row.created_at })),
      } : item));
    }
    void loadMessages();
    return () => { cancelled = true; };
  }, [activeId, ready, storage]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [active?.messages.length, busy]);

  const createConversation = useCallback(async () => {
    const id = crypto.randomUUID();
    const conversation: Conversation = { id, title: "Nueva conversación", updatedAt: new Date().toISOString(), messages: [] };
    if (storage === "cloud") {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("conversations").insert({ id, user_id: userId, section: "ai", title: conversation.title });
      if (insertError) throw new Error("No se pudo crear la conversación en Supabase. Revisa las tablas y sus políticas RLS.");
    }
    setConversations(current => [conversation, ...current]);
    setActiveId(id);
    setError("");
    return conversation;
  }, [storage, userId]);

  async function selectConversation(item: Conversation) {
    setActiveId(item.id);
    setError("");
    if (storage === "cloud" && item.messages.length === 0) {
      const supabase = createClient();
      const { data, error: queryError } = await supabase.from("messages").select("id,role,content,created_at").eq("conversation_id", item.id).order("created_at", { ascending: true }).limit(500);
      if (queryError) { setError("No se pudo cargar esta conversación."); return; }
      setConversations(current => current.map(row => row.id === item.id ? { ...row, messages: (data || []).map(message => ({ id: message.id, role: message.role as Message["role"], content: message.content, createdAt: message.created_at })) } : row));
    }
  }

  async function deleteConversation(item: Conversation) {
    if (storage === "cloud") {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("conversations").delete().eq("id", item.id);
      if (deleteError) { setError("No se pudo eliminar la conversación."); return; }
    }
    const remaining = conversations.filter(row => row.id !== item.id);
    setConversations(remaining);
    if (activeId === item.id) setActiveId(remaining[0]?.id || null);
  }

  async function sendMessage(value = draft) {
    const content = value.trim();
    if (!content || busy || !ready) return;
    setBusy(true); setError(""); setDraft("");
    let conversation = active;
    try {
      if (!conversation) conversation = await createConversation();
      const userMessage: Message = { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() };
      const history = [...conversation.messages, userMessage];
      setConversations(current => current.map(item => item.id === conversation!.id ? { ...item, messages: history, updatedAt: userMessage.createdAt } : item));

      const response = await fetch("/api/ai/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-40).map(message => ({ role: message.role, content: message.content })) }),
      });
      const result = await response.json() as { answer?: string; error?: string };
      if (!response.ok || !result.answer) throw new Error(result.error || "No se recibió una respuesta de Ollama.");

      const assistantMessage: Message = { id: crypto.randomUUID(), role: "assistant", content: result.answer, createdAt: new Date().toISOString() };
      const title = conversation.messages.length === 0 ? content.replace(/\s+/g, " ").slice(0, 54) : conversation.title;
      const updated = { ...conversation, title, updatedAt: assistantMessage.createdAt, messages: [...history, assistantMessage] };
      setConversations(current => current.map(item => item.id === conversation!.id ? updated : item));

      if (storage === "cloud") {
        const supabase = createClient();
        const { error: saveError } = await supabase.from("messages").insert([
          { id: userMessage.id, conversation_id: conversation.id, role: "user", content: userMessage.content },
          { id: assistantMessage.id, conversation_id: conversation.id, role: "assistant", content: assistantMessage.content },
        ]);
        if (saveError) throw new Error("Respuesta lista, pero no se guardó el historial. Revisa la migración RLS de mensajes.");
        await supabase.from("conversations").update({ title, updated_at: assistantMessage.createdAt }).eq("id", conversation.id);
      }
    } catch (cause) {
      setError(readableError(cause));
      setDraft(content);
    } finally { setBusy(false); }
  }

  return <section className="ai-layout">
    <aside className="ai-history panel">
      <div className="ai-history-head"><div><div className="eyebrow">ASISTENTE PERSONAL</div><h2>Conversaciones</h2></div><button className="new-conversation" title="Nueva conversación" onClick={() => void createConversation().catch(cause => setError(readableError(cause)))}>＋</button></div>
      <input className="conversation-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar conversaciones" aria-label="Buscar conversaciones"/>
      <div className="conversation-list">{visibleConversations.length ? visibleConversations.map(item => <div key={item.id} className={`conversation-row ${activeId === item.id ? "selected" : ""}`}><button className="conversation-select" onClick={() => void selectConversation(item)}><span>✧</span><span>{item.title}</span></button><button className="conversation-delete" title="Eliminar conversación" onClick={() => void deleteConversation(item)}>×</button></div>) : <p className="empty-history">Tus conversaciones aparecerán aquí.</p>}</div>
      <div className="history-storage"><span className="status-dot"/>{storage === "local" ? "Guardado en este dispositivo" : "Sincronizado con tu cuenta"}</div>
    </aside>
    <div className="ai-workspace panel">
      <div className="ai-workspace-head"><div className="ai-head-mark">✧</div><div><strong>IA libre</strong><small>Con Ollama · conversación privada</small></div><span className="ollama-chip">Proveedor · <b>Ollama</b></span></div>
      <div className="ai-messages">
        {!active?.messages.length && !busy ? <div className="ai-welcome"><div className="ai-welcome-icon">✧</div><h2>¿Qué te gustaría entender?</h2><p>Pregunta, explora una idea o pide ayuda con tus estudios.</p><div className="prompt-grid"><button onClick={() => void sendMessage("Explícame las diferencias entre mitosis y meiosis, paso a paso.")}>Explícame un tema de ciencias <span>↗</span></button><button onClick={() => void sendMessage("Ayúdame a organizar una sesión de estudio de 30 minutos para hoy.")}>Ayúdame a organizar el estudio <span>↗</span></button><button onClick={() => void sendMessage("Dame tres preguntas para comprobar si entendí el tema que estoy estudiando.")}>Hazme preguntas de repaso <span>↗</span></button><button onClick={() => void sendMessage("Ayúdame a mejorar la claridad y ortografía de este texto: ")}>Revisa un texto <span>↗</span></button></div></div> : <div className="message-thread">{active?.messages.map(message => <article key={message.id} className={`chat-message ${message.role}`}><div className="message-avatar">{message.role === "user" ? "L" : "✧"}</div><div className="message-copy"><b>{message.role === "user" ? "Tú" : "Study AI"}</b><p>{message.content}</p></div></article>)}{busy && <div className="chat-message assistant"><div className="message-avatar">✧</div><div className="message-copy"><b>Study AI</b><p className="typing">Pensando<span>·</span><span>·</span><span>·</span></p></div></div>}<div ref={endRef}/></div>}
      </div>
      {error && <div className="ai-error" role="alert">{error}</div>}
      <form className="chat-composer" onSubmit={event => { event.preventDefault(); void sendMessage(); }}><textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={ready ? "Escribe tu pregunta…" : "Preparando tu espacio…"} aria-label="Escribe tu mensaje" disabled={!ready || busy} rows={1}/><div className="composer-foot"><span>Enter para enviar · Shift + Enter para nueva línea</span><button type="submit" disabled={!draft.trim() || busy || !ready}>{busy ? "…" : "↑"}</button></div></form>
    </div>
  </section>;
}
