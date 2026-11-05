// Empacota dist-web num único HTML autónomo (JS, CSS, ícones e imagens embutidos).
import fs from "node:fs";
import path from "node:path";
const [dist, out] = process.argv.slice(2);
const base = (process.env.NYVO_BASE_URL || "").replace(/\/$/, "");
// O app mora em /nyvo/app; a página de apresentação, o manifesto, os ícones e o service worker ficam na raiz /nyvo.
const root = base.replace(/\/app$/, "");
let html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const strip = (p) => (base && p.startsWith(base + "/") ? p.slice(base.length) : p);
const cssHref = strip(html.match(/<link rel="stylesheet" href="([^"]+)">/)[1]);
const jsSrc = strip(html.match(/<script src="([^"]+)" defer><\/script>/)[1]);
let css = fs.readFileSync(path.join(dist, cssHref), "utf8");
let js = fs.readFileSync(path.join(dist, jsSrc), "utf8");
const mime = { ".ttf": "font/ttf", ".png": "image/png" };
const wanted = /(MaterialCommunityIcons\.[a-f0-9]+\.ttf|\.png)$/;
js = js.replace(/"((?:\/[\w-]+)*\/assets\/[^"]+)"/g, (m, p) => {
  const file = path.join(dist, decodeURIComponent(strip(p)));
  if (!wanted.test(p) || !fs.existsSync(file)) return m;
  return `"data:${mime[path.extname(p)]};base64,${fs.readFileSync(file).toString("base64")}"`;
});
js = js.replace(/<\/script/gi, "<\\/script");
const routes = ["/", "/finance", "/notes", "/habits", "/tasks", "/settings", "/onboarding", "/reminders", "/support", "/plans", "/insights"].map((r) => base + r).concat(base ? [base] : []);
const sw = `<script>if("serviceWorker" in navigator&&location.protocol==="https:"){addEventListener("load",function(){navigator.serviceWorker.register(${JSON.stringify(root + "/sw.js")},{scope:${JSON.stringify(root + "/")}}).catch(function(){})})}</script>`;
const boot = sw + `<script>try{if(!${JSON.stringify(routes)}.includes(location.pathname))history.replaceState(null,"",${JSON.stringify(base + "/")}+location.search+location.hash)}catch(e){}</script>`;
const icon = fs.readFileSync(path.join(dist, "favicon.ico")).toString("base64");
html = html
  .replace(/<html\s+lang="en">/, '<html lang="pt-BR">')
  .replace("</head>", `<style>html,body{background:#F7F5EF;color-scheme:light}</style><meta name="theme-color" content="#187A61"/><meta name="description" content="Nyvo é um organizador pessoal grátis: controle de gastos, contas fixas e cartão, hábitos, estudos e tarefas num lugar só. Funciona sem conta e no celular."/><meta property="og:title" content="Nyvo · organize dinheiro, hábitos e tarefas em um só lugar"/><meta property="og:description" content="Grátis, sem anúncios e funciona sem conta. Gastos, contas, hábitos, estudos e tarefas num app só."/><meta property="og:type" content="website"/><meta property="og:locale" content="pt_BR"/><meta property="og:image" content="https://ericksantosdasilva600-creator.github.io/nyvo/icon-512.png"/><meta name="twitter:card" content="summary"/><meta name="robots" content="noindex"/><link rel="manifest" href="${root}/manifest.webmanifest"/><link rel="apple-touch-icon" href="${root}/icon-192.png"/><meta name="apple-mobile-web-app-capable" content="yes"/><meta name="mobile-web-app-capable" content="yes"/><meta name="apple-mobile-web-app-title" content="Nyvo"/></head>`)
  .replace(/<title[^>]*><\/title>/, "<title>Nyvo · organize dinheiro, hábitos e tarefas em um só lugar</title>")
  .replace(/<link rel="icon" href="[^"]+"\/>/, `<link rel="icon" href="data:image/x-icon;base64,${icon}"/>`)
  .replace(/<link rel="preload" href="[^"]+" as="style">/, "")
  .replace(/<link rel="stylesheet" href="[^"]+">/, () => `<style>${css}</style>`)
  .replace(/<script src="[^"]+" defer><\/script>/, () => `${boot}<script defer>${js}</script>`);
fs.writeFileSync(out, html);
console.log(out, (fs.statSync(out).size / 1048576).toFixed(2) + " MB");
