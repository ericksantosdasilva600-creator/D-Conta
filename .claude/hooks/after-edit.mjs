// PostToolUse (Edit/Write/MultiEdit): roda os testes das calculadoras quando calc.js muda.
import { execSync } from "node:child_process";
import { readInput } from "./lib.mjs";
const input = await readInput();
const file = String(input.tool_input?.file_path ?? "").replace(/\\/g, "/");
if (!/site-static\/calculadoras\/calc\.js$|tests\/calculadoras\.test\.ts$/.test(file)) process.exit(0);
try {
  execSync("npx vitest run tests/calculadoras.test.ts", { cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(), stdio: "pipe", timeout: 120000 });
} catch (e) {
  // Código 2: o texto do stderr volta para o Claude corrigir (a edição já aconteceu, não é desfeita).
  process.stderr.write("Os testes das calculadoras falharam depois desta edição:\n" + String(e.stdout ?? "").slice(-3000));
  process.exit(2);
}
process.exit(0);
