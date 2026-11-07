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
  it("conta os avos do 13º e das férias na rescisão", () => {
    const d = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
    expect(C.avosDecimo(d("2026-03-10"), d("2026-11-14"))).toBe(8); // março (22 dias) e abril a outubro contam; novembro (14 dias) não
    expect(C.avosFerias(d("2025-03-01"), d("2026-02-20"))).toBe(12); // 11 meses e 20 dias
    expect(C.avosFerias(d("2026-03-01"), d("2026-04-15"))).toBe(2); // 1 mês e 15 dias
    expect(C.avosFerias(d("2026-03-01"), d("2026-04-14"))).toBe(1); // a fração de 14 dias não conta
  });
  it("calcula rescisão sem justa causa com aviso proporcional e multa de 40%", () => {
    const r = C.rescisao({ salario: 3000, admissao: "2023-03-01", saida: "2026-11-20", tipo: "sem", avisoIndenizado: true, fgts: 10000 });
    // 3 anos completos: 39 dias de aviso; a projeção vai até 29/12 e completa o 13º.
    expect(r).toMatchObject({ anos: 3, diasSaldo: 20, saldo: 2000, diasAviso: 39, aviso: 3900, avos13: 12, decimo: 3000, avosFerias: 10, proporcionais: 3333.33, multa: 4284.8 });
    expect(r.inss).toBe(404.29); // INSS do saldo (R$ 155,69) e do 13º (R$ 248,60), separados
    expect(r.irrf).toBe(0);
    expect(r.liquido).toBe(16113.84);
  });
  it("limita o aviso a 90 dias e corta pela metade no acordo", () => {
    expect(C.rescisao({ salario: 3000, admissao: "2000-01-01", saida: "2026-11-30", tipo: "sem", avisoIndenizado: true }).diasAviso).toBe(90);
    const a = C.rescisao({ salario: 3000, admissao: "2023-03-01", saida: "2026-11-20", tipo: "acordo", avisoIndenizado: true, fgts: 10000 });
    expect(a).toMatchObject({ diasAviso: 19, aviso: 1950, avos13: 11, percMulta: 20, multa: 2107.2 });
  });
  it("tira aviso e multa no pedido de demissão e só deixa saldo e férias vencidas na justa causa", () => {
    const p = C.rescisao({ salario: 3000, admissao: "2026-02-01", saida: "2026-07-31", tipo: "pedido", avisoIndenizado: true, fgts: 5000 });
    expect(p).toMatchObject({ diasSaldo: 30, aviso: 0, multa: 0, avos13: 6, avosFerias: 6, proporcionais: 2000 });
    const j = C.rescisao({ salario: 3000, admissao: "2020-01-01", saida: "2026-07-10", tipo: "justa", vencidas: 1, fgts: 5000 });
    expect(j).toMatchObject({ saldo: 1000, decimo: 0, proporcionais: 0, vencidas: 4000, multa: 0 });
  });
  it("desconta o adiantamento do 13º e recusa datas trocadas", () => {
    const r = C.rescisao({ salario: 3000, admissao: "2023-03-01", saida: "2026-12-10", tipo: "pedido", adiantamento: 1500 });
    expect(r.adiantamento).toBe(1500);
    expect(C.rescisao({ salario: 3000, admissao: "2026-05-01", saida: "2026-04-01", tipo: "sem" })).toBeNull();
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
  it("calcula juros compostos com e sem aporte mensal", () => {
    expect(C.jurosCompostos(1000, 0, 1, false, 12).total).toBe(1126.83); // 1000 × 1,01^12
    expect(C.jurosCompostos(0, 100, 1, false, 12).total).toBe(1268.25); // 100 × (1,01^12 − 1) / 0,01
    const r = C.jurosCompostos(1000, 200, 12, true, 60);
    expect(r.taxaMensal).toBe(0.9489); // 12% ao ano ≈ 0,9489% ao mês
    expect(r.investido).toBe(13000);
    expect(r.total).toBe(17830.6);
    expect(r.anos).toHaveLength(5);
    expect(r.anos[4].total).toBe(r.total);
  });
  it("juros compostos com taxa zero só somam os depósitos", () => {
    const r = C.jurosCompostos(500, 50, 0, false, 10);
    expect(r.total).toBe(1000);
    expect(r.juros).toBe(0);
  });
});
