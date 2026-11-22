import { describe, expect, it } from "vitest";
// @ts-ignore script em .mjs, sem tipos
import { anoDasTabelas, mencoesDoAno, PAGINAS_COM_REGRAS } from "../scripts/check-tabelas.mjs";
// @ts-ignore arquivo estático do site, sem tipos
import "../site-static/calculadoras/calc.js";

const C = (globalThis as any).DaContaCalc;

describe("ano das tabelas", () => {
  it("calc.js exporta o mesmo ano que o script lê", () => {
    expect(C.ANO_TABELAS).toBe(anoDasTabelas());
  });
  it("toda página com regras do ano cita o ano das tabelas", () => {
    // Se trocar o ano em calc.js e esquecer uma página, este teste avisa.
    const semAno = mencoesDoAno(anoDasTabelas()).filter((p: { linhas: number[] }) => p.linhas.length === 0);
    expect(semAno).toEqual([]);
    expect(PAGINAS_COM_REGRAS.length).toBeGreaterThan(5);
  });
});
