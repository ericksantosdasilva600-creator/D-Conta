import { describe, expect, it } from "vitest";
import { invoiceMonthFor, invoiceDueDate, parsePhrase, parseStatement, splitInstallments } from "../lib/finance-extra";
import type { Transaction } from "../lib/app-data";

describe("registro por frase", () => {
  it("entende despesa simples", () => {
    expect(parsePhrase("gastei 45 no mercado")).toMatchObject({ kind: "expense", amount: 45, category: "Mercado", merchant: "Mercado", account: "main" });
  });
  it("entende receita com milhar", () => {
    expect(parsePhrase("recebi 2.500,00 de salário")).toMatchObject({ kind: "income", amount: 2500, category: "Salário" });
  });
  it("detecta cartão e combustível", () => {
    expect(parsePhrase("paguei 120,50 de gasolina no cartão")).toMatchObject({ amount: 120.5, category: "Combustível", account: "card" });
  });
  it("recusa frase sem valor", () => {
    expect(parsePhrase("fui ao mercado")).toBeNull();
  });
});

describe("importar extrato", () => {
  it("lê CSV de banco com ponto e vírgula", () => {
    const rows = parseStatement("Data;Descrição;Valor\n01/11/2026;Supermercado Bom Preço;-150,30\n02/11/2026;Pix recebido João;200,00");
    expect(rows).toEqual([
      { date: "2026-11-01", amount: 150.3, description: "Supermercado Bom Preço", kind: "expense", category: "Mercado" },
      { date: "2026-11-02", amount: 200, description: "Pix recebido João", kind: "income", category: "Pix recebido" },
    ]);
  });
  it("lê fatura do cartão (compras positivas)", () => {
    const rows = parseStatement("date,title,amount\n2026-11-01,Ifood,35.90\n2026-11-03,Pagamento recebido,-500");
    expect(rows[0]).toMatchObject({ kind: "expense", amount: 35.9, category: "Alimentação" });
    expect(rows[1]).toMatchObject({ kind: "income", amount: 500 });
  });
  it("lê OFX", () => {
    const rows = parseStatement("<OFX><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261102120000<TRNAMT>-89.90<MEMO>POSTO SHELL</STMTTRN>");
    expect(rows).toEqual([{ date: "2026-11-02", amount: 89.9, description: "POSTO SHELL", kind: "expense", category: "Combustível" }]);
  });
});

describe("cartão de crédito", () => {
  const base = { id: "a", kind: "expense", amount: 100, merchant: "TV", category: "Compras", date: "2026-01-31", dueDate: "", paid: true, priority: "medium", notes: "", receiptUri: "", scope: "personal", account: "card" } as Transaction;
  it("divide parcelas sem perder centavos e ajusta fim do mês", () => {
    const parts = splitInstallments(base, 3);
    expect(parts.map((p) => [p.date, p.amount, p.installment])).toEqual([["2026-01-31", 33.34, "1/3"], ["2026-02-28", 33.33, "2/3"], ["2026-03-31", 33.33, "3/3"]]);
  });
  it("compra depois do fechamento vai para a próxima fatura", () => {
    const card = { closingDay: 3, dueDay: 10, limit: 0 };
    expect(invoiceMonthFor("2026-11-05", card)).toBe("2026-12");
    expect(invoiceMonthFor("2026-11-03", card)).toBe("2026-11");
    expect(invoiceDueDate("2026-11", card)).toBe("2026-11-10");
    expect(invoiceDueDate("2026-11", { closingDay: 25, dueDay: 5, limit: 0 })).toBe("2026-12-05");
  });

  it("extrato ignora datas que não existem (não pode travar o app)", () => {
    const rows = parseStatement("Data;Descrição;Valor\n31/02/2026;Compra X;-10,00\n11/25/2026;Compra Y;-20,00\n05/11/2026;Compra Z;-30,00");
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-11-05");
  });

  it("frase rápida não classifica pelo valor e entende ontem", () => {
    expect(parsePhrase("recebi 130 do pix")?.category).toBe("Pix recebido");
    expect(parsePhrase("gastei 99 na farmácia")?.category).toBe("Saúde");
    expect(parsePhrase("gastei 30 no mercado ontem")?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsePhrase("gastei 30 no mercado")?.date).toBeUndefined();
  });
});
