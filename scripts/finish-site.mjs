// Monta a pasta docs/ do GitHub Pages:
//   docs/index.html         página de apresentação (indexada no Google)
//   docs/app/index.html     o aplicativo
//   docs/404.html           cópia do app; endereços antigos (/D-Conta/finance…) vão para /D-Conta/app/…
import fs from "node:fs";
const base = (process.env.NYVO_BASE_URL || "").replace(/\/$/, "");
const root = base.replace(/\/app$/, "");
fs.cpSync("site-static", "docs", { recursive: true });
// Limita para onde o app pode enviar dados e de onde pode carregar código.
const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' https://bxwcqljlbrwpasfkmdhc.supabase.co wss://bxwcqljlbrwpasfkmdhc.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'">`;
const app = fs.readFileSync("docs/app/index.html", "utf8").replace("</body>", `<script src="${root}/conta.js" defer></script></body>`)
  .replace("<head>", `<head>${csp}`);
fs.writeFileSync("docs/app/index.html", app);
const legacy = `<script>(function(){var r=${JSON.stringify(root)},a=${JSON.stringify(base)},p=location.pathname;if(a!==r&&p.indexOf(r+"/")===0&&p.indexOf(a)!==0){location.replace(a+p.slice(r.length)+location.search+location.hash)}})()</script>`;
fs.writeFileSync("docs/404.html", app.replace("<head>", "<head>" + legacy));
console.log("docs pronto:", root || "/", "app em", base);
