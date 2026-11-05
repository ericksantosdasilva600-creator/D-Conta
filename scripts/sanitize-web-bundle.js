import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "dist-web");
const textExtensions = new Set([".html", ".js", ".json", ".map", ".txt"]);
let configEntries = 0;
let changedFiles = 0;

if (!fs.existsSync(root)) throw new Error("A exportação Web não existe em dist-web.");

function sanitizeDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      sanitizeDirectory(filePath);
      continue;
    }
    if (!textExtensions.has(path.extname(entry.name))) continue;

    const source = fs.readFileSync(filePath, "utf8");
    const apiBasePattern = /(\\?"apiBaseUrl\\?"\s*:\s*)(\\?")([^\\"]*)(\\?")/g;
    const sanitized = source.replace(apiBasePattern, (_match, prefix, openingQuote, _value, closingQuote) => {
      configEntries += 1;
      return `${prefix}${openingQuote}${closingQuote}`;
    });
    if (sanitized !== source) {
      fs.writeFileSync(filePath, sanitized);
      changedFiles += 1;
    }
    if (/(\\?"apiBaseUrl\\?"\s*:\s*)(\\?")[^\\"]+(\\?")/.test(sanitized)) {
      throw new Error(`A configuração apiBaseUrl não foi limpa em ${path.relative(root, filePath)}.`);
    }
  }
}

sanitizeDirectory(root);
if (configEntries === 0) {
  console.log("Web same-origin API: no apiBaseUrl field was emitted in the static bundle.");
} else {
  console.log(`Web same-origin API: cleared ${configEntries} apiBaseUrl field(s) in ${changedFiles} static file(s).`);
}
