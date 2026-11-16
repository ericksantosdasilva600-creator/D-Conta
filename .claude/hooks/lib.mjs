// Funções comuns dos hooks do Dá Conta. Cada hook lê o JSON do evento pela entrada padrão.
export async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}
export function decide(decision, reason, updatedInput) {
  const out = { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: decision, permissionDecisionReason: reason } };
  if (updatedInput) out.hookSpecificOutput.updatedInput = updatedInput;
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}
// Padrões de segredos que nunca devem ir para comandos ou arquivos.
export const SECRET_PATTERNS = [
  /sk-ant-[A-Za-z0-9_-]{20,}/g,              // chave da Anthropic
  /sk_live_[A-Za-z0-9]{16,}/g,               // Stripe
  /AKIA[0-9A-Z]{16}/g,                       // AWS
  /eyJhbGciOi[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*c2VydmljZV9yb2xl[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/g, // JWT service_role do Supabase
];
export function redact(text) {
  let out = String(text ?? ""), found = false;
  for (const re of SECRET_PATTERNS) out = out.replace(re, () => { found = true; return "SEGREDO_REMOVIDO"; });
  return { out, found };
}
