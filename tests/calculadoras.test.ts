import { describe, expect, it } from "vitest";
// @ts-ignore arquivo estático do site, sem tipos
import "../site-static/calculadoras/calc.js";

const C = (globalThis as any).DaContaCalc;

describe("calculadoras 2026", () => {
  it("calcula o INSS progressivo e respeita o teto", () => {
    expect(C.inss(1621)).toBe(121.58);
    expect(C.inss(3000)).toBe(248.6);
    expect(C.inss(10000)).toBe(988.09);
  });
  it("zera o IR mensal até R$ 5.000", () => {
    expect(C.salarioLiquido(5000).irrf).toBe(0);
  });
  it("aplica a redução da lei na faixa de transição", () => {
    expect(C.salarioLiquido(6000).irrf).toBe(385.1); // R$ 564,85 de imposto menos a redução de R$ 179,75
    expect(C.salarioLiquido(8000).irrf).toBe(1037.85);
  });
  it("calcula 13º integral e proporcional", () => {
    expect(C.decimoTerceiro(3000, 12)).toMatchObject({ bruto: 3000, inss: 248.6, irrf: 0, primeira: 1500, segunda: 1251.4, liquido: 2751.4 });
    expect(C.decimoTerceiro(2400, 7).bruto).toBe(1400);
    expect(C.decimoTerceiro(1621, 12).liquido).toBe(1499.42);
  });
  it("acha os dias de férias pelas faltas", () => {
    expect([0, 5, 6, 14, 15, 23, 24, 32, 33].map(C.diasFerias)).toEqual([30, 30, 24, 24, 18, 18, 12, 12, 0]);
  });
  it("calcula férias de 30 dias com o terço", () => {
    expect(C.ferias(3000, 0, 0, false, 0)).toMatchObject({ direito: 30, gozo: 30, ferias: 3000, terco: 1000, abono: 0, bruto: 4000, inss: 368.6, irrf: 0, liquido: 3631.4 });
  });
  it("não cobra INSS sobre a venda de dias e leva o terço dela ao IR", () => {
    const r = C.ferias(6000, 0, 0, true, 0);
    expect(r).toMatchObject({ gozo: 20, vendidos: 10, ferias: 4000, terco: 1333.33, abono: 2666.67, bruto: 8000, inss: C.inss(5333.33) });
    // Base de R$ 6.000 (férias, terço e terço do abono): simplificada dá R$ 574,29; redução de R$ 179,75.
    expect(r.irrf).toBe(394.54);
  });
  it("soma a média e reduz os dias com faltas", () => {
    expect(C.ferias(2800, 200, 10, false, 0)).toMatchObject({ gozo: 24, ferias: 2400, terco: 800, bruto: 3200 });
    expect(C.ferias(3000, 0, 33, false, 0).direito).toBe(0);
  });
  it("calcula a reserva", () => {
    expect(C.reserva(2500, 6, 3000, 500)).toEqual({ meta: 15000, falta: 12000, mesesAteMeta: 24 });
    expect(C.reserva(1000, 3, 5000, 0).mesesAteMeta).toBe(0);
  });
  it("calcula horas extras", () => {
    expect(C.horasExtras(3000, 220, 10, 50)).toEqual({ hora: 13.64, extra: 20.45, total: 204.55 });
    expect(C.horasExtras(2200, 220, 1, 100).extra).toBe(20);
  });
  it("divide o orçamento 50-30-20", () => {
    expect(C.orcamento(3000)).toEqual({ essenciais: 1500, desejos: 900, futuro: 600 });
  });
  it("acha os juros do parcelamento", () => {
    expect(C.parcelamento(1000, 100, 12)).toEqual({ total: 1200, juros: 200, taxa: 2.92 });
    expect(C.parcelamento(1200, 100, 12).taxa).toBe(0);
  });
  it("soma o desafio das 52 semanas", () => {
    const r = C.desafio52(5);
    expect(r.total).toBe(6890);
    expect(r.semanas[51]).toBe(260);
  });
});
