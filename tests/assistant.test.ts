import { describe, expect, it } from "vitest";
import type { AppData, Transaction } from "../lib/app-data";
import { localAnswer, normalize, searchApp } from "../lib/assistant";

const tx = (over: Partial<Transaction>): Transaction => ({ id: "1", kind: "expense", amount: 100, merchant: "Mercado Bom", category: "Mercado", date: "2026-11-03", dueDate: "", paid: true, priority: "medium", notes: "", receiptUri: "", scope: "personal", ...over });
const base = (): AppData => ({ currency: "BRL", recurringBills: [], completedByDate: {}, transactions: [tx({}), tx({ id: "2", amount: 40, merchant: "Uber", category: "Transporte" }), tx({ id: "3", date: "2026-10-02", amount: 10 })], tasks: [], notes: [], habits: [] } as unknown as AppData);

describe("busca", () => {
  it("ignora acentos e maiúsculas", () => {
    expect(normalize("Finanças")).toBe("financas");
    expect(searchApp(base(), "FINANCAS")[0]).toMatchObject({ title: "Finanças", path: "/finance" });
  });
  it("acha lançamentos pelo nome", () => {
    expect(searchApp(base(), "uber").map((h) => h.group)).toContain("Finanças");
  });
  it("busca vazia não retorna nada", () => {
    expect(searchApp(base(), "   ")).toEqual([]);
  });
});

describe("respostas locais", () => {
  it("soma os gastos do mês atual e aponta a maior categoria", () => {
    const reply = localAnswer(base(), "Quanto gastei este mês?", "2026-11-05");
    expect(reply).toContain("140,00");
    expect(reply).toContain("Mercado");
  });
  it("entende mês passado", () => {
    expect(localAnswer(base(), "quanto gastei no mês passado?", "2026-11-05")).toContain("10,00");
  });
  it("responde dúvidas da ajuda", () => {
    expect(localAnswer(base(), "como importo o extrato do banco?")).toContain("OFX");
  });
  it("deixa para a IA o que não sabe", () => {
    expect(localAnswer(base(), "qual a capital da França?")).toBeNull();
  });
  it("não confunde pergunta sobre como pagar conta com lista de contas", () => {
    expect(localAnswer(base(), "como marcar que paguei uma conta?")).toBeNull();
  });
});
