type OllamaMessage = { role: "system" | "user"; content: string };

export async function askOllamaForJson(system: string, user: string, format: Record<string, unknown>) {
  const baseUrl = (process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434").replace(/\/+$/, "");
  const isCloud = (() => { try { return new URL(baseUrl).hostname === "ollama.com"; } catch { return false; } })();
  let endpoint: URL;
  try {
    const base = new URL(baseUrl);
    endpoint = new URL(`${base.origin}${base.pathname.replace(/\/+$/, "").endsWith("/api") ? `${base.pathname.replace(/\/+$/, "")}/chat` : `${base.pathname.replace(/\/+$/, "")}/api/chat`}`);
    if (!["https:", "http:"].includes(endpoint.protocol) || endpoint.username || endpoint.password) throw new Error("URL no válida");
  } catch { throw new Error("La dirección configurada para Ollama no es válida."); }
  const key = process.env.OLLAMA_API_KEY?.trim();
  if (isCloud && !key) throw new Error("Falta OLLAMA_API_KEY para usar Ollama Cloud.");
  const model = process.env.OLLAMA_MODEL?.trim() || (isCloud ? "gemma4:31b" : "llama3.2");
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...(isCloud && key ? { authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ model, stream: false, format, options: { temperature: 0 }, messages: [{ role: "system", content: system }, { role: "user", content: user } satisfies OllamaMessage] }),
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`Ollama respondió con un error (${response.status}). Comprueba el modelo y la cuota disponible.`);
    const data: unknown = await response.json();
    const content = data && typeof data === "object" ? (data as { message?: { content?: unknown } }).message?.content : null;
    if (typeof content !== "string" || !content.trim()) throw new Error("Ollama devolvió una respuesta vacía.");
    try { return JSON.parse(content) as unknown; }
    catch { throw new Error("Ollama devolvió una respuesta que no cumple el formato matemático solicitado."); }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Ollama")) throw error;
    if (error instanceof Error && error.name === "TimeoutError") throw new Error("Ollama tardó demasiado en responder. Prueba de nuevo o elige menos ejercicios.");
    throw new Error("No se pudo conectar con Ollama. Comprueba que esté ejecutándose y que el servidor pueda acceder a su dirección.");
  }
}

