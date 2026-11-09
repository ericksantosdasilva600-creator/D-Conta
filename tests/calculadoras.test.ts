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
  it("usa a tabela regressiva do IR da renda fixa", () => {
    expect(C.aliquotaIR(180)).toBe(0.225);
    expect(C.aliquotaIR(181)).toBe(0.2);
    expect(C.aliquotaIR(360)).toBe(0.2);
    expect(C.aliquotaIR(361)).toBe(0.175);
    expect(C.aliquotaIR(720)).toBe(0.175);
    expect(C.aliquotaIR(721)).toBe(0.15);
  });
  it("compara poupança, CDB e LCI em 12 meses", () => {
    const r = C.quantoRende({ inicial: 10000, aporte: 0, meses: 12, selic: 13.75, tr: 0, pctCdb: 100, pctLci: 90 });
    expect(r.cdi).toBe(13.65); // Selic − 0,10 ponto
    expect(r.poupanca.bruto).toBe(10616.78); // 0,5% ao mês com Selic acima de 8,5%
    expect(r.poupanca.ir).toBe(0);
    expect(r.cdb.bruto).toBe(11365);
    expect(r.cdb.ir).toBeCloseTo(238.88, 1); // 17,5% sobre R$ 1.365 (365 dias)
    expect(r.lci.bruto).toBe(11228.5);
    expect(r.lci.ir).toBe(0);
    expect(r.investido).toBe(10000);
  });
  it("poupança usa 70% da Selic quando ela fica em até 8,5%", () => {
    const r = C.quantoRende({ inicial: 1000, meses: 12, selic: 8, tr: 0 });
    expect(r.poupanca.bruto).toBe(1056); // 1000 × (1 + 0,7 × 8%)
  });
  it("cada aporte do CDB paga IR pelo próprio prazo", () => {
    const r = C.quantoRende({ inicial: 0, aporte: 100, meses: 2, selic: 13.75, pctCdb: 100 });
    const i = Math.pow(1.1365, 1 / 12) - 1;
    expect(r.investido).toBe(200);
    expect(r.cdb.ir).toBeCloseTo(100 * i * 0.225, 2); // só o 1º aporte rendeu 1 mês; o 2º entrou no fim
  });
  it("plano de dívidas: avalanche paga menos juros que a bola de neve", () => {
    const dividas = [
      { nome: "Cartão", saldo: 2000, juros: 12, minimo: 300 },
      { nome: "Empréstimo", saldo: 5000, juros: 3, minimo: 250 },
      { nome: "Loja", saldo: 600, juros: 5, minimo: 100 },
    ];
    const av = C.quitarDividas({ dividas, extra: 200, metodo: "avalanche" });
    const bo = C.quitarDividas({ dividas, extra: 200, metodo: "bola" });
    expect(av.orcamento).toBe(850);
    expect(av.ordem.map((d: any) => d.nome)).toEqual(["Cartão", "Loja", "Empréstimo"]);
    expect(bo.ordem.map((d: any) => d.nome)).toEqual(["Loja", "Cartão", "Empréstimo"]);
    expect(av.juros).toBeLessThan(bo.juros);
    expect(av.pago).toBeCloseTo(7600 + av.juros, 2); // tudo que foi pago = dívidas + juros
    expect(bo.ordem[0].mes).toBeLessThan(av.ordem[0].mes); // bola de neve quita a primeira antes
  });
  it("plano de dívidas sem juros divide o saldo pelo pagamento", () => {
    const r = C.quitarDividas({ dividas: [{ saldo: 1000, juros: 0, minimo: 100 }], extra: 0 });
    expect(r.meses).toBe(10);
    expect(r.juros).toBe(0);
  });
  it("plano de dívidas avisa quando o pagamento não cobre os juros", () => {
    expect(C.quitarDividas({ dividas: [{ saldo: 1000, juros: 10, minimo: 100 }], extra: 0 }).impossivel).toBe(true);
    expect(C.quitarDividas({ dividas: [{ saldo: 1000, juros: 2, minimo: 0 }], extra: 0 }).impossivel).toBe(true);
    expect(C.quitarDividas({ dividas: [] })).toBeNull();
  });
  it("plano de dívidas com 1% ao mês e R$ 100 de parcela", () => {
    const r = C.quitarDividas({ dividas: [{ saldo: 1000, juros: 1, minimo: 100 }], extra: 0 });
    expect(r.meses).toBe(11);
    expect(r.juros).toBe(58.98);
  });
  it("calcula os juros do rotativo e o parcelamento da fatura", () => {
    const r = C.rotativo({ fatura: 2000, pago: 500, taxaRotativo: 15, taxaParcelado: 9, parcelas: 12 });
    expect(r).toMatchObject({ saldo: 1500, jurosRotativo: 225, proximaFatura: 1725, parcela: 240.9, teto: false });
    expect(r.totalPago).toBe(2890.77);
    expect(r.taxaAnual).toBe(435.03);
  });
  it("limita juros e encargos do cartão ao valor original da dívida", () => {
    const r = C.rotativo({ fatura: 1000, pago: 0, taxaRotativo: 15, taxaParcelado: 9, parcelas: 24 });
    expect(r).toMatchObject({ saldo: 1000, jurosTotal: 1000, totalPago: 2000, teto: true });
    expect(C.rotativo({ fatura: 500, pago: 500, taxaRotativo: 15 }).saldo).toBe(0);
  });
  it("acha o melhor dia de compra no cartão e o prazo até pagar", () => {
    const r = C.melhorDiaCartao({ fechamento: 3, vencimento: 10, hoje: "2026-11-08" });
    expect(r.compra).toEqual({ compra: "2026-11-08", fechamento: "2026-12-03", vencimento: "2026-12-10", dias: 32 });
    expect(r.melhor).toEqual({ compra: "2026-12-04", fechamento: "2027-01-03", vencimento: "2027-01-10", dias: 37 });
    expect(r).toMatchObject({ melhorDia: 4, menorPrazo: 7 });
  });
  it("vira o mês quando o vencimento vem antes do fechamento e trata meses curtos", () => {
    const r = C.melhorDiaCartao({ fechamento: 25, vencimento: 5, hoje: "2026-11-08", compra: "2026-11-25" });
    expect(r.compra).toMatchObject({ fechamento: "2026-11-25", vencimento: "2026-12-05", dias: 10 });
    expect(r.melhor).toMatchObject({ compra: "2026-11-26", vencimento: "2027-01-05", dias: 40 });
    const f = C.melhorDiaCartao({ fechamento: 31, vencimento: 8, hoje: "2027-02-10" });
    expect(f.compra).toMatchObject({ fechamento: "2027-02-28", vencimento: "2027-03-08" });
    expect(f.melhor.compra).toBe("2027-03-01");
  });
  it("divide a conta com taxa de serviço e itens só de quem consumiu", () => {
    const r = C.dividirConta({ total: 240, taxa: 10, pessoas: 4, extra: 80, quemExtra: 2 });
    expect(r).toMatchObject({ taxa: 24, total: 264, quemExtra: 2, soma: 264 });
    expect(r.grupos).toEqual([{ extra: true, valor: 88, qtd: 2 }, { extra: false, valor: 44, qtd: 2 }]);
  });
  it("reparte os centavos para a soma fechar exata e limita entradas fora do normal", () => {
    const r = C.dividirConta({ total: 200, taxa: 10, pessoas: 3 });
    expect(r.grupos).toEqual([{ extra: false, valor: 73.34, qtd: 1 }, { extra: false, valor: 73.33, qtd: 2 }]);
    expect(r.soma).toBe(220);
    const s = C.dividirConta({ total: 100, taxa: 0, pessoas: 4, extra: 500, quemExtra: 9 });
    expect(s).toMatchObject({ total: 100, quemExtra: 4, soma: 100 });
    const q = C.dividirConta({ total: 99.99, taxa: 13, pessoas: 7, extra: 33.33, quemExtra: 3 });
    expect(q.soma).toBe(112.99);
    expect(q.grupos).toEqual([{ extra: true, valor: 23.32, qtd: 2 }, { extra: true, valor: 23.31, qtd: 1 }, { extra: false, valor: 10.76, qtd: 4 }]);
  });
  it("calcula o custo por km do carro com combustível e gastos fixos", () => {
    const so = C.custoKm({ km: 1000, consumo: 12, preco: 6.2 });
    expect(so).toMatchObject({ litros: 83.3, combustivelMes: 516.67, totalMes: 516.67, combustivelKm: 0.517, porKm: 0.517, cemKm: 51.67 });
    const r = C.custoKm({ km: 1000, consumo: 12, preco: 6.2, anuais: 3000, manutencao: 1800, mensais: 100 });
    expect(r).toMatchObject({ documentosMes: 250, manutencaoMes: 150, outrosMes: 100, desvalorizacaoMes: 0, totalMes: 1016.67, totalAno: 12200, porKm: 1.017, cemKm: 101.67 });
    const d = C.custoKm({ km: 500, consumo: 10, preco: 5, valorCarro: 60000, desvalorizacao: 10 });
    expect(d).toMatchObject({ combustivelMes: 250, desvalorizacaoMes: 500, totalMes: 750, porKm: 1.5 });
    expect(C.custoKm({ km: 0, consumo: 12, preco: 6 })).toBeNull();
    expect(C.custoKm({ km: 100, consumo: 0, preco: 6 })).toBeNull();
  });

  it("rescisão: aviso indenizado que atravessa o ano soma 13º e férias do período novo", () => {
    // Saída em 10/12/2026, aviso de 48 dias vai até 27/01/2027: 12/12 de 2026 + 1/12 de 2027.
    const r = C.rescisao({ salario: 3000, admissao: "2020-01-01", saida: "2026-12-10", tipo: "sem", avisoIndenizado: true });
    expect(r.avos13).toBe(13);
    expect(r.decimo).toBe(3250);
    // Admissão 01/12/2025, saída 20/11/2026: o aviso completa o 1º período aquisitivo (12/12 + 1/12 de férias com 1/3).
    const f = C.rescisao({ salario: 3000, admissao: "2025-12-01", saida: "2026-11-20", tipo: "sem", avisoIndenizado: true });
    expect(f.proporcionais).toBe(4333.33);
  });
  it("dividir a conta limita o número de pessoas", () => {
    expect(C.dividirConta({ total: 1000, pessoas: 1e8 }).pessoas).toBe(1000);
  });
  it("compara alugar e financiar um imóvel pelo patrimônio no fim do prazo", () => {
    const base = { valor: 400000, entrada: 80000, aluguel: 2000, jurosAno: 11, anos: 30, rendAno: 7, valAno: 4, reajAno: 4 };
    expect(C.alugarFinanciar({ ...base, sistema: "sac" })).toMatchObject({ meses: 360, financiado: 320000, primeiraParcela: 3683.96, ultimaParcela: 896.65, totalParcelas: 824510.14, totalJuros: 504510.14, totalAluguel: 1346038.51, aluguelFinal: 6237.3, imovelFinal: 1297359, patrimonioFinanciar: 2320671.13, patrimonioAlugar: 1223144.32, melhor: "financiar", aluguelAno: 6 });
    expect(C.alugarFinanciar({ ...base, sistema: "price" })).toMatchObject({ primeiraParcela: 2922.74, ultimaParcela: 2922.74, totalParcelas: 1052187.73, patrimonioFinanciar: 1864699.36, patrimonioAlugar: 988480.7 });
    expect(C.alugarFinanciar({ valor: 120000, entrada: 0, aluguel: 1000, jurosAno: 0, anos: 1, sistema: "price" })).toMatchObject({ primeiraParcela: 10000, totalJuros: 0, totalAluguel: 12000, patrimonioFinanciar: 120000, patrimonioAlugar: 108000, diferenca: 12000, melhor: "financiar" });
    expect(C.alugarFinanciar({ valor: 300000, entrada: 60000, aluguel: 800, jurosAno: 12, anos: 30, rendAno: 10, valAno: 0, reajAno: 0, custos: 15000 }).melhor).toBe("alugar");
    expect(C.alugarFinanciar({ valor: 100, entrada: 100, aluguel: 1, anos: 1 })).toBeNull();
    expect(C.alugarFinanciar({ valor: 100, aluguel: 0, anos: 1 })).toBeNull();
  });
  it("compara álcool e gasolina pela regra dos 70% e pelo consumo do carro", () => {
    expect(C.alcoolGasolina({ etanol: 4.2, gasolina: 6.3 })).toMatchObject({ razao: 0.6667, rendimento: 0.7, doCarro: false, limiteEtanol: 4.41, melhor: "etanol" });
    expect(C.alcoolGasolina({ etanol: 4.6, gasolina: 6.2 })).toMatchObject({ razao: 0.7419, limiteEtanol: 4.34, melhor: "gasolina" });
    expect(C.alcoolGasolina({ etanol: 4.2, gasolina: 6 }).melhor).toBe("empate");
    const carro = C.alcoolGasolina({ etanol: 4.2, gasolina: 6.3, consGasolina: 12, consEtanol: 8.5, km: 1000 });
    expect(carro).toMatchObject({ doCarro: true, rendimento: 0.7083, kmEtanol: 0.494, kmGasolina: 0.525, mesEtanol: 494.12, mesGasolina: 525, economiaMes: 30.88, economiaAno: 370.56, melhor: "etanol" });
    const est = C.alcoolGasolina({ etanol: 4.6, gasolina: 6.2, consGasolina: 12 });
    expect(est).toMatchObject({ doCarro: false, kmEtanol: 0.548, kmGasolina: 0.517, melhor: "gasolina" });
    expect(est.mesEtanol).toBeUndefined();
    expect(C.alcoolGasolina({ etanol: 0, gasolina: 6 })).toBeNull();
  });
});
