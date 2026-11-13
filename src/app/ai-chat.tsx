"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/env";
import type { AppLanguage } from "@/lib/app-languages";

type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
type Conversation = { id: string; title: string; updatedAt: string; messages: Message[] };
const LOCAL_KEY = "study-ai-ai-conversations-v1";

function readableError(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la acción.";
}

const chatCopy: Record<AppLanguage, Record<string, string>> = {
  es: { assistant: "ASISTENTE PERSONAL", conversations: "Conversaciones", newChat: "Nueva conversación", search: "Buscar conversaciones", delete: "Eliminar conversación", empty: "Tus conversaciones aparecerán aquí.", local: "Guardado en este dispositivo", cloud: "Sincronizado con tu cuenta", private: "Con Ollama · conversación privada", welcome: "¿Qué te gustaría entender?", welcomeText: "Pregunta, explora una idea o pide ayuda con tus estudios.", science: "Explícame un tema de ciencias", organize: "Ayúdame a organizar el estudio", review: "Hazme preguntas de repaso", revise: "Revisa un texto", you: "Tú", thinking: "Pensando", ask: "Escribe tu pregunta…", loading: "Preparando tu espacio…", keys: "Enter para enviar · Shift + Enter para nueva línea" },
  en: { assistant: "PERSONAL ASSISTANT", conversations: "Conversations", newChat: "New conversation", search: "Search conversations", delete: "Delete conversation", empty: "Your conversations will appear here.", local: "Saved on this device", cloud: "Synced with your account", private: "Powered by Ollama · private conversation", welcome: "What would you like to understand?", welcomeText: "Ask a question, explore an idea, or get help with your studies.", science: "Explain a science topic", organize: "Help me plan my study", review: "Quiz me on what I’m learning", revise: "Review a piece of writing", you: "You", thinking: "Thinking", ask: "Type your question…", loading: "Preparing your space…", keys: "Enter to send · Shift + Enter for a new line" },
  "pt-BR": { assistant: "ASSISTENTE PESSOAL", conversations: "Conversas", newChat: "Nova conversa", search: "Buscar conversas", delete: "Excluir conversa", empty: "Suas conversas aparecerão aqui.", local: "Salvo neste dispositivo", cloud: "Sincronizado com sua conta", private: "Com Ollama · conversa privada", welcome: "O que você gostaria de entender?", welcomeText: "Faça uma pergunta, explore uma ideia ou peça ajuda nos estudos.", science: "Explique um tema de ciências", organize: "Ajude a organizar meus estudos", review: "Faça perguntas de revisão", revise: "Revise um texto", you: "Você", thinking: "Pensando", ask: "Digite sua pergunta…", loading: "Preparando seu espaço…", keys: "Enter para enviar · Shift + Enter para nova linha" },
  fr: { assistant: "ASSISTANT PERSONNEL", conversations: "Conversations", newChat: "Nouvelle conversation", search: "Rechercher des conversations", delete: "Supprimer la conversation", empty: "Vos conversations apparaîtront ici.", local: "Enregistré sur cet appareil", cloud: "Synchronisé avec votre compte", private: "Avec Ollama · conversation privée", welcome: "Que souhaitez-vous comprendre ?", welcomeText: "Posez une question, explorez une idée ou demandez de l’aide pour vos études.", science: "Explique un sujet scientifique", organize: "Aide-moi à organiser mes révisions", review: "Pose-moi des questions de révision", revise: "Relis un texte", you: "Vous", thinking: "Réflexion", ask: "Saisissez votre question…", loading: "Préparation de votre espace…", keys: "Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne" },
  de: { assistant: "PERSÖNLICHER ASSISTENT", conversations: "Gespräche", newChat: "Neues Gespräch", search: "Gespräche suchen", delete: "Gespräch löschen", empty: "Deine Gespräche erscheinen hier.", local: "Auf diesem Gerät gespeichert", cloud: "Mit deinem Konto synchronisiert", private: "Mit Ollama · privates Gespräch", welcome: "Was möchtest du verstehen?", welcomeText: "Stelle eine Frage, erkunde eine Idee oder bitte um Lernhilfe.", science: "Erkläre ein naturwissenschaftliches Thema", organize: "Hilf mir beim Lernen planen", review: "Stelle mir Wiederholungsfragen", revise: "Überarbeite einen Text", you: "Du", thinking: "Denke nach", ask: "Schreibe deine Frage…", loading: "Dein Bereich wird vorbereitet…", keys: "Enter zum Senden · Umschalt + Enter für eine neue Zeile" },
  "zh-CN": { assistant: "个人学习助手", conversations: "对话", newChat: "新对话", search: "搜索对话", delete: "删除对话", empty: "对话会显示在这里。", local: "已保存在此设备", cloud: "已与账户同步", private: "由 Ollama 提供 · 私密对话", welcome: "你想了解什么？", welcomeText: "提出问题、探索想法，或获取学习帮助。", science: "解释一个科学主题", organize: "帮我安排学习计划", review: "出题检查我的理解", revise: "帮我修改文本", you: "你", thinking: "思考中", ask: "输入你的问题…", loading: "正在准备学习空间…", keys: "按 Enter 发送 · Shift + Enter 换行" },
  ja: { assistant: "パーソナルアシスタント", conversations: "会話", newChat: "新しい会話", search: "会話を検索", delete: "会話を削除", empty: "会話がここに表示されます。", local: "この端末に保存済み", cloud: "アカウントと同期済み", private: "Ollama を使用 · プライベートな会話", welcome: "何を理解したいですか？", welcomeText: "質問したり、アイデアを探ったり、学習のサポートを頼んだりできます。", science: "科学のテーマを説明して", organize: "学習計画を手伝って", review: "復習問題を出して", revise: "文章を見直して", you: "あなた", thinking: "考え中", ask: "質問を入力…", loading: "学習スペースを準備中…", keys: "Enter で送信 · Shift + Enter で改行" },
};

export function AIChat({ language }: { language: AppLanguage }) {
  const copy = chatCopy[language];
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
    const conversation: Conversation = { id, title: copy.newChat, updatedAt: new Date().toISOString(), messages: [] };
    if (storage === "cloud") {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("conversations").insert({ id, user_id: userId, section: "ai", title: conversation.title });
      if (insertError) throw new Error("No se pudo crear la conversación en Supabase. Revisa las tablas y sus políticas RLS.");
    }
    setConversations(current => [conversation, ...current]);
    setActiveId(id);
    setError("");
    return conversation;
  }, [storage, userId, copy.newChat]);

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
        body: JSON.stringify({ language, messages: history.slice(-40).map(message => ({ role: message.role, content: message.content })) }),
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
      <div className="ai-history-head"><div><div className="eyebrow">{copy.assistant}</div><h2>{copy.conversations}</h2></div><button className="new-conversation" title={copy.newChat} aria-label={copy.newChat} onClick={() => void createConversation().catch(cause => setError(readableError(cause)))}>＋</button></div>
      <input className="conversation-search" value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.search} aria-label={copy.search}/>
      <div className="conversation-list">{visibleConversations.length ? visibleConversations.map(item => <div key={item.id} className={`conversation-row ${activeId === item.id ? "selected" : ""}`}><button className="conversation-select" onClick={() => void selectConversation(item)}><span>✧</span><span>{item.title}</span></button><button className="conversation-delete" title={copy.delete} aria-label={copy.delete} onClick={() => void deleteConversation(item)}>×</button></div>) : <p className="empty-history">{copy.empty}</p>}</div>
      <div className="history-storage"><span className="status-dot"/>{storage === "local" ? copy.local : copy.cloud}</div>
    </aside>
    <div className="ai-workspace panel">
      <div className="ai-workspace-head"><div className="ai-head-mark">✧</div><div><strong>{language === "en" ? "Free AI" : language === "pt-BR" ? "IA livre" : language === "fr" ? "IA libre" : language === "de" ? "Freie KI" : language === "zh-CN" ? "自由 AI" : language === "ja" ? "AI チャット" : "IA libre"}</strong><small>{copy.private}</small></div><span className="ollama-chip">{language === "en" ? "Provider" : language === "de" ? "Anbieter" : language === "zh-CN" ? "服务商" : language === "ja" ? "プロバイダー" : language === "fr" ? "Fournisseur" : language === "pt-BR" ? "Provedor" : "Proveedor"} · <b>Ollama</b></span></div>
      <div className="ai-messages">
        {!active?.messages.length && !busy ? <div className="ai-welcome"><div className="ai-welcome-icon">✧</div><h2>{copy.welcome}</h2><p>{copy.welcomeText}</p><div className="prompt-grid"><button onClick={() => void sendMessage(copy.science)}>{copy.science} <span>↗</span></button><button onClick={() => void sendMessage(copy.organize)}>{copy.organize} <span>↗</span></button><button onClick={() => void sendMessage(copy.review)}>{copy.review} <span>↗</span></button><button onClick={() => void sendMessage(copy.revise)}>{copy.revise} <span>↗</span></button></div></div> : <div className="message-thread">{active?.messages.map(message => <article key={message.id} className={`chat-message ${message.role}`}><div className="message-avatar">{message.role === "user" ? "L" : "✧"}</div><div className="message-copy"><b>{message.role === "user" ? copy.you : "Study AI"}</b><p>{message.content}</p></div></article>)}{busy && <div className="chat-message assistant"><div className="message-avatar">✧</div><div className="message-copy"><b>Study AI</b><p className="typing">{copy.thinking}<span>·</span><span>·</span><span>·</span></p></div></div>}<div ref={endRef}/></div>}
      </div>
      {error && <div className="ai-error" role="alert">{error}</div>}
      <form className="chat-composer" onSubmit={event => { event.preventDefault(); void sendMessage(); }}><textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={ready ? copy.ask : copy.loading} aria-label={copy.ask} disabled={!ready || busy} rows={1}/><div className="composer-foot"><span>{copy.keys}</span><button type="submit" disabled={!draft.trim() || busy || !ready}>{busy ? "…" : "↑"}</button></div></form>
    </div>
  </section>;
}
