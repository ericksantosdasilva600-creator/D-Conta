import { describe, expect, it } from "vitest";
import { invoiceMonthFor, invoiceDueDate, parsePhrase, parseStatement, splitInstallments } from "../lib/finance-extra";
import type { Transaction } from "../lib/app-data";

describe("registro por frase", () => {
  it("entende despesa simples", () => {
    expect(parsePhrase("gastei 45 no mercado")).toMatchObject({ kind: "expense", amount: 45, category: "Mercado", merchant: "Mercado", account: "main" });
  });
  it("entende receita com milhar", () => {
    expect(parsePhrase("recebi 2.500,00 de salário")).toMatchObject({ kind: "income", amount: 2500, category: "Salário" });
    expect(parsePhrase("recebi 13º 2000")).toMatchObject({ amount: 2000, category: "13º salário" });
    expect(parsePhrase("recebi o 13º")).toBeNull();
    expect(parsePhrase("gastei 45 no mercado ontem no cartão")).toMatchObject({ amount: 45, merchant: "Mercado", account: "card" });
    expect(parseStatement('Data,Descrição,Valor\n05/11/2026,Mercado,"-45,90"\n')[0]).toMatchObject({ amount: 45.9, kind: "expense" });
  });
  it("detecta cartão e combustível", () => {
    expect(parsePhrase("paguei 120,50 de gasolina no cartão")).toMatchObject({ amount: 120.5, category: "Combustível", account: "card" });
  });
  it("recusa frase sem valor", () => {
    expect(parsePhrase("fui ao mercado")).toBeNull();
  });
});

describe("importar extrato", () => {
  it("lê valor com ponto de milhar e sem centavos", () => {
    const rows = parseStatement("Data;Descrição;Valor\n01/11/2026;Aluguel;-1.234\n02/11/2026;Salário;R$ 2.500");
    expect(rows.map((r) => r.amount)).toEqual([1234, 2500]);
  });
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

describe("pagamento de conta fixa", () => {
  it("apagar o pagamento devolve a conta para 'a pagar'", async () => {
    const { payBill, removeTransactionAndUnpay, billStatus } = await import("../lib/finance-extra");
    const bill = { id: "b1", name: "Aluguel", amount: 900, category: "Moradia", dueDay: 10, account: "main" as const, paidMonths: [], active: true };
    const base = { transactions: [], recurringBills: [bill] } as unknown as import("../lib/app-data").AppData;
    const paid = payBill(base, bill, "2026-11");
    expect(billStatus(paid.recurringBills[0], "2026-11", "2026-11-05").paid).toBe(true);
    const tx = paid.transactions.find((t) => t.recurringBillId === "b1")!;
    const undone = removeTransactionAndUnpay(paid, tx.id);
    expect(undone.transactions.some((t) => t.id === tx.id)).toBe(false);
    expect(undone.recurringBills[0].paidMonths).toEqual([]);
  });
});

describe("valores digitados", () => {
  it("arredonda para centavos e aceita R$", async () => {
    const { parseAmount } = await import("../lib/format");
    expect(parseAmount("10,999")).toBe(11);
    expect(parseAmount("R$ 1.234,56")).toBe(1234.56);
    expect(parseAmount("-R$ 50")).toBe(-50);
    expect(parseAmount("1,875", 4)).toBe(1.875);
    expect(parseAmount("")).toBeNaN();
    expect(parseAmount("abc")).toBeNaN();
  });
});

describe("revisão 16/11", () => {
  it("parcelas no cartão ficam uma em cada fatura mesmo passando por fevereiro", async () => {
    const { splitInstallments, invoiceMonthFor } = await import("../lib/finance-extra");
    const card = { closingDay: 28, dueDay: 10, limit: 0 };
    const base = { id: "a", kind: "expense", amount: 300, merchant: "Loja", category: "Compras", date: "2027-01-31", dueDate: "2027-02-10", paid: false, priority: "medium", notes: "", receiptUri: "", scope: "personal", account: "card" } as any;
    const parts = splitInstallments(base, 3, card);
    expect(parts.map((p) => invoiceMonthFor(p.date, card))).toEqual(["2027-02", "2027-03", "2027-04"]);
    expect(parts.map((p) => p.dueDate)).toEqual(["2027-02-10", "2027-03-10", "2027-04-10"]);
  });

  it("pagar, voltar para pendente e pagar de novo mantém a conta fixa paga", async () => {
    const { syncBillPaid, payBill } = await import("../lib/finance-extra");
    const bill = { id: "b1", name: "Luz", amount: 100, dueDay: 10, category: "Contas da casa", account: "main", paidMonths: [] } as any;
    const data = { transactions: [], recurringBills: [bill] } as any;
    const paid = payBill(data, bill, "2026-11");
    expect(payBill(paid, bill, "2026-11")).toBe(paid);
    const tx = paid.transactions[0];
    const pending = syncBillPaid({ ...paid, transactions: [{ ...tx, paid: false }] }, "b1", "2026-11");
    expect(pending.recurringBills[0].paidMonths).toEqual([]);
    const again = syncBillPaid({ ...pending, transactions: [{ ...tx, paid: true }] }, "b1", "2026-11");
    expect(again.recurringBills[0].paidMonths).toEqual(["2026-11"]);
  });

  it("sequência de hábitos não zera em dia sem hábito agendado", async () => {
    const { habitStreak } = await import("../lib/habit-streak");
    // 2026-11-16 é segunda; hábito só de segunda a sexta.
    const habits = [{ weekdays: [1, 2, 3, 4, 5] }];
    const done = { "2026-11-16": ["h"], "2026-11-13": ["h"], "2026-11-12": ["h"] };
    expect(habitStreak(done, habits, "2026-11-16")).toBe(3);
    expect(habitStreak({ "2026-11-16": ["h"] }, [], "2026-11-16")).toBe(1);
  });
});

describe("revisão 21/11", () => {
  it("conta fixa com pagamento pendente não duplica ao pagar", async () => {
    const { payBill, markTransactionPaid, shownAsBill } = await import("../lib/finance-extra");
    const bill = { id: "b1", name: "Luz", amount: 100, dueDay: 10, category: "Contas da casa", account: "main", paidMonths: [], active: true } as any;
    const paid = payBill({ transactions: [], recurringBills: [bill] } as any, bill, "2026-11");
    const pendingTx = { ...paid.transactions[0], paid: false };
    const pending = { ...paid, transactions: [pendingTx], recurringBills: [{ ...bill }] } as any;
    expect(shownAsBill(pending.recurringBills, pendingTx, ["2026-11"])).toBe(true);
    const viaBill = payBill(pending, bill, "2026-11");
    expect(viaBill.transactions).toHaveLength(1);
    expect(viaBill.transactions[0].paid).toBe(true);
    expect(viaBill.recurringBills[0].paidMonths).toEqual(["2026-11"]);
    const viaTx = markTransactionPaid(pending, pendingTx.id);
    expect(viaTx.transactions).toHaveLength(1);
    expect(viaTx.recurringBills[0].paidMonths).toEqual(["2026-11"]);
  });

  it("remover exemplo leva junto o pagamento de conta fixa de exemplo", async () => {
    const { removeDemoData } = await import("../lib/demo-data");
    const empty = { transactions: [{ id: "x1", recurringBillId: "demo-b1" }, { id: "x2" }], recurringBills: [], goals: [], debts: [], habits: [], tasks: [], notes: [], studySubjects: [], studyItems: [], healthLogs: [], completedByDate: {} } as any;
    expect(removeDemoData(empty).transactions.map((t: any) => t.id)).toEqual(["x2"]);
  });
});
