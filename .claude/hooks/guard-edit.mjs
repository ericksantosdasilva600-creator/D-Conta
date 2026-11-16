// PreToolUse (Edit/Write/MultiEdit): protege as regras fixas do CLAUDE.md.
import { readInput, decide, redact } from "./lib.mjs";
const input = await readInput();
const ti = input.tool_input ?? {};
const file = String(ti.file_path ?? "").replace(/\\/g, "/");
const edits = Array.isArray(ti.edits) ? ti.edits : [{ old_string: ti.old_string ?? "", new_string: ti.new_string ?? ti.content ?? "" }];
const oldText = edits.map((e) => e.old_string ?? "").join("\n");
const newText = edits.map((e) => e.new_string ?? "").join("\n");

if (/\/(site-static|docs)\/fb\//.test(file)) decide("deny", "site-static/fb e docs/fb não podem ser alterados.");
if (/PRO_SALES_OPEN\s*=\s*true/.test(newText)) decide("deny", "Monetização desligada: PRO_SALES_OPEN tem que continuar false.");
if (/ADSENSE_CLIENT\s*=\s*"ca-pub-|AD_SLOT\s*=\s*"\d/.test(newText)) decide("deny", "AdSense desligado: não preencha ADSENSE_CLIENT/AD_SLOT (ver CLAUDE.md).");
// Identificadores que não podem sumir: pacote Android, slug, chaves nyvo.* do localStorage.
const keep = ["com.ericksantos.nyvo", 'appSlug: "nyvo"', 'scheme: "nyvo"', "NYVO_BASE_URL"];
for (const k of keep) if (oldText.includes(k) && !newText.includes(k)) decide("deny", `"${k}" não pode ser trocado nem removido (quebra dados ou credenciais).`);
const nyvoKeys = (t) => (t.match(/["'`]nyvo\.[A-Za-z0-9.-]+/g) ?? []).sort().join("|");
if (oldText && nyvoKeys(oldText) && nyvoKeys(oldText) !== nyvoKeys(newText)) decide("ask", "Esta edição muda chaves nyvo.* do localStorage. Isso pode apagar dados de quem já usa o app. Confirme.");
if (/\/supabase\/functions\//.test(file) && /messages|anthropic/i.test(newText) && /transactions|app-data|localStorage/.test(newText)) decide("ask", "Parece que dados do usuário vão para a IA. Só com consentimento e política de privacidade atualizada.");
if (redact(newText).found) decide("deny", "O texto tem uma chave secreta. Use variável de ambiente ou segredo do Supabase.");
process.exit(0);
