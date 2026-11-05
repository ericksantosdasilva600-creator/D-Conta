// Monta a pasta docs/ do GitHub Pages:
//   docs/index.html         página de apresentação (indexada no Google)
//   docs/app/index.html     o aplicativo
//   docs/404.html           cópia do app; endereços antigos (/nyvo/finance…) vão para /nyvo/app/…
import fs from "node:fs";
const base = (process.env.NYVO_BASE_URL || "").replace(/\/$/, "");
const root = base.replace(/\/app$/, "");
fs.cpSync("site-static", "docs", { recursive: true });
const app = fs.readFileSync("docs/app/index.html", "utf8");
const legacy = `<script>(function(){var r=${JSON.stringify(root)},a=${JSON.stringify(base)},p=location.pathname;if(a!==r&&p.indexOf(r+"/")===0&&p.indexOf(a)!==0){location.replace(a+p.slice(r.length)+location.search+location.hash)}})()</script>`;
fs.writeFileSync("docs/404.html", app.replace("<head>", "<head>" + legacy));
console.log("docs pronto:", root || "/", "app em", base);
