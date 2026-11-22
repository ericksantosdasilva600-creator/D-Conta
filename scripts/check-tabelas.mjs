// Confere se as tabelas de INSS, IRRF, salário mínimo e MEI estão no ano atual.
// Uso: pnpm tabelas   (só lê arquivos; não muda nada). Passo a passo em ATUALIZAR-TABELAS.md.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Páginas cujo texto depende das regras do ano (valores, faixas, "em 2026").
export const PAGINAS_COM_REGRAS = [
  "site-static/calculadoras/calc.js",
  "site-static/calculadoras/salario-liquido.html",
  "site-static/calculadoras/13-salario.html",
  "site-static/calculadoras/ferias.html",
  "site-static/calculadoras/rescisao.html",
  "site-static/calculadoras/horas-extras.html",
  "site-static/calculadoras/calculadora-mei.html",
  "site-static/calculadoras/quanto-rende.html",
  "site-static/calculadoras/index.html",
  "site-static/index.html",
  "site-static/guias/financas-com-salario-minimo.html",
  "site-static/guias/o-que-fazer-com-o-13.html",
];

export function anoDasTabelas() {
  const m = readFileSync(path.join(root, "site-static/calculadoras/calc.js"), "utf8").match(/var ANO_TABELAS = (\d{4});/);
  if (!m) throw new Error("ANO_TABELAS não encontrado em calc.js");
  return Number(m[1]);
}

export function mencoesDoAno(ano) {
  return PAGINAS_COM_REGRAS.map((arquivo) => {
    const linhas = readFileSync(path.join(root, arquivo), "utf8").split("\n");
    const achadas = [];
    linhas.forEach((l, i) => { if (l.includes(String(ano))) achadas.push(i + 1); });
    return { arquivo, linhas: achadas };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ano = anoDasTabelas();
  const hoje = new Date().getFullYear();
  if (ano >= hoje) {
    console.log(`Tabelas de ${ano}: em dia. A próxima revisão é em janeiro de ${ano + 1}.`);
  } else {
    console.log(`ATENÇÃO: as tabelas são de ${ano} e já estamos em ${hoje}. Siga ATUALIZAR-TABELAS.md.`);
    console.log(`Arquivos que citam ${ano} (revise cada linha; datas de "atualizado em" podem ficar):`);
    for (const { arquivo, linhas } of mencoesDoAno(ano)) {
      if (linhas.length) console.log(`- ${arquivo}: linhas ${linhas.join(", ")}`);
    }
  }
}
