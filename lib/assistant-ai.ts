import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type AiResult = { ok: true; reply: string } | { ok: false; reason: "limit" | "unavailable" };

/** Envia só a conversa do assistente. Nenhum dado de finanças, tarefas ou anotações vai junto. */
export async function askAssistant(messages: ChatMessage[]): Promise<AiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/nyvo-assistente`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ messages: messages.slice(-6) }),
      signal: controller.signal,
    });
    if (res.status === 429) return { ok: false, reason: "limit" };
    if (!res.ok) return { ok: false, reason: "unavailable" };
    const body = await res.json() as { reply?: string };
    return body.reply ? { ok: true, reply: body.reply } : { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
