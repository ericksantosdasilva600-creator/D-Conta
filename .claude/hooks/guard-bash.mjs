// PreToolUse (Bash): bloqueia comandos que apagam histórico ou dados e tira segredos do comando.
import { readInput, decide, redact } from "./lib.mjs";
const input = await readInput();
const cmd = String(input.tool_input?.command ?? "");
const blocked = [
  [/git\s+push\b[^\n]*(\s--force\b|\s-f\b|\s--force-with-lease\b|\s\+\S)/, "Force push está proibido no Dá Conta (apaga histórico)."],
  [/git\s+reset\s+--hard\b/, "git reset --hard descarta trabalho. Use git stash ou um commit novo."],
  [/git\s+(filter-branch|filter-repo)\b/, "Reescrever o histórico do git está proibido."],
  [/git\s+clean\s+-[a-z]*f/, "git clean -f apaga arquivos sem volta."],
  [/rm\s+-[a-z]*r[a-z]*\s+[^\n]*\b(docs|site-static|lib|app|components|\.git)\b/, "Apagar pastas do projeto inteiras está proibido."],
];
// Ignora textos de heredoc e entre aspas (ex.: mensagem de commit que só cita um comando).
const code = cmd
  .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(\n|$)/g, "\n")
  .replace(/'[^']*'/g, "''")
  .replace(/"(?:\\.|[^"\\])*"/g, '""');
for (const [re, why] of blocked) if (re.test(code)) decide("deny", why);
const { out, found } = redact(cmd);
// updatedInput substitui a entrada inteira: mantém os outros campos (description, timeout...).
if (found) decide("allow", "Segredo trocado por SEGREDO_REMOVIDO antes de rodar.", { ...input.tool_input, command: out });
process.exit(0);
