// SessionStart (startup e compact): repõe as regras principais e o estado do git no contexto.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let git = "";
try { git = execSync("git status -sb | head -15 && git log --oneline -3", { cwd: root, encoding: "utf8", shell: "/bin/bash" }); } catch {}
// Lembrete anual: tabelas de INSS, IRRF, salário mínimo e MEI (ver ATUALIZAR-TABELAS.md).
let tabelas = "";
try {
  const ano = Number(readFileSync(`${root}/site-static/calculadoras/calc.js`, "utf8").match(/var ANO_TABELAS = (\d{4});/)?.[1]);
  if (ano && new Date().getFullYear() > ano) tabelas = `ATENÇÃO: as tabelas de INSS/IRRF/salário mínimo/MEI das calculadoras ainda são de ${ano}. Rode \`pnpm tabelas\` e siga ATUALIZAR-TABELAS.md (só com fonte oficial).\n`;
} catch {}
process.stdout.write(`${tabelas}Regras do Dá Conta (resumo do CLAUDE.md, valem sempre):
- Nome para o usuário: "Dá Conta". Identificadores nyvo.* , com.ericksantos.nyvo, slug e NYVO_BASE_URL não mudam.
- Depois de mudar o app ou o site: NYVO_BASE_URL=/D-Conta/app pnpm build:site, pnpm check, pnpm test, commit com docs/ inteiro.
- Não remover login Manus/MySQL. Não ligar PRO_SALES_OPEN nem AdSense. Não mexer em site-static/fb e docs/fb.
- Nunca enviar dados do usuário para a IA sem consentimento. Sem force push.
Estado do git:
${git}`);
