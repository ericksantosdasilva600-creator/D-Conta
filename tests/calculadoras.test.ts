import { describe, expect, it } from "vitest";
// @ts-ignore arquivo estático do site, sem tipos
import "../site-static/calculadoras/calc.js";

const C = (globalThis as any).NyvoCalc;

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
  it("calcula a reserva", () => {
    expect(C.reserva(2500, 6, 3000, 500)).toEqual({ meta: 15000, falta: 12000, mesesAteMeta: 24 });
    expect(C.reserva(1000, 3, 5000, 0).mesesAteMeta).toBe(0);
  });
});
