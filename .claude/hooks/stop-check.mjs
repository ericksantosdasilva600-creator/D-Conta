// Stop: não deixa terminar com o app ou o site alterado e docs/ sem reconstruir.
import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";
import { readInput } from "./lib.mjs";
const input = await readInput();
if (input.stop_hook_active) process.exit(0); // já pediu uma vez: evita laço infinito
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let changed = [];
try {
  changed = execSync("git status --porcelain -- app components lib hooks constants site-static", { cwd: root, encoding: "utf8" })
    .split("\n").map((l) => l.slice(3).trim()).filter(Boolean).filter((f) => !f.startsWith("site-static/fb/"));
} catch { process.exit(0); }
if (!changed.length) process.exit(0);
const mtime = (f) => { try { return statSync(join(root, f)).mtimeMs; } catch { return 0; } };
const newestSource = Math.max(...changed.map(mtime));
const built = mtime("docs/app/index.html");
if (newestSource > built) {
  process.stderr.write("Há mudanças em " + changed.slice(0, 5).join(", ") + (changed.length > 5 ? "…" : "") +
    " depois do último build. Rode: NYVO_BASE_URL=/D-Conta/app pnpm build:site && pnpm check && pnpm test, e inclua docs/ no commit.");
  process.exit(2);
}
process.exit(0);
