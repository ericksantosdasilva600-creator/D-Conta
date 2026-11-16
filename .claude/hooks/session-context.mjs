// SessionStart (startup e compact): repõe as regras principais e o estado do git no contexto.
import { execSync } from "node:child_process";
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let git = "";
try { git = execSync("git status -sb | head -15 && git log --oneline -3", { cwd: root, encoding: "utf8", shell: "/bin/bash" }); } catch {}
process.stdout.write(`Regras do Dá Conta (resumo do CLAUDE.md, valem sempre):
- Nome para o usuário: "Dá Conta". Identificadores nyvo.* , com.ericksantos.nyvo, slug e NYVO_BASE_URL não mudam.
- Depois de mudar o app ou o site: NYVO_BASE_URL=/D-Conta/app pnpm build:site, pnpm check, pnpm test, commit com docs/ inteiro.
- Não remover login Manus/MySQL. Não ligar PRO_SALES_OPEN nem AdSense. Não mexer em site-static/fb e docs/fb.
- Nunca enviar dados do usuário para a IA sem consentimento. Sem force push.
Estado do git:
${git}`);
