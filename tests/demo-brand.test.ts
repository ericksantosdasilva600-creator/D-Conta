import { describe, expect, it } from "vitest";
import { addDemoData, hasDemoData, removeDemoData } from "../lib/demo-data";
import { tipFor } from "../lib/brand";
import type { AppData } from "../lib/app-data";

describe("dados de exemplo", () => {
  it("adiciona e remove sem tocar nos dados do usuário", () => {
    const base = { transactions: [{ id: "meu", kind: "expense", amount: 10, merchant: "Pão", category: "Mercado", date: "2026-11-01", scope: "personal" }], habits: [], completedByDate: {}, recurringBills: [], goals: [], debts: [], tasks: [], notes: [], studySubjects: [], studyItems: [], healthLogs: [] } as unknown as AppData;
    const demo = addDemoData(base);
    expect(hasDemoData(demo)).toBe(true);
    expect(demo.transactions.length).toBeGreaterThan(5);
    const clean = removeDemoData(demo);
    expect(hasDemoData(clean)).toBe(false);
    expect(clean.transactions.map((t) => t.id)).toEqual(["meu"]);
    expect(Object.values(clean.completedByDate).flat().some((id) => id.startsWith("demo-"))).toBe(false);
  });
  it("não marca dias de hábitos de exemplo que não entraram e não duplica ao ligar de novo", () => {
    const habit = (id: string, name: string) => ({ id, name, weekdays: [0, 1, 2, 3, 4, 5, 6], reminderTime: "", priority: "medium", archived: false, goalLabel: "" });
    const base = { transactions: [], habits: [habit("a", "Beber 2 litros de água"), habit("b", "Ler 10 páginas")], completedByDate: {}, recurringBills: [], goals: [], debts: [], tasks: [], notes: [], studySubjects: [], studyItems: [], healthLogs: [] } as unknown as AppData;
    const demo = addDemoData(base);
    expect(demo.habits.map((h) => h.id)).toEqual(["a", "b"]);
    expect(Object.values(demo.completedByDate).flat()).toEqual([]);
    // Sem os movimentos de exemplo, ainda sobram contas e tarefas de exemplo: continua "com exemplo".
    const partial = { ...demo, transactions: [] };
    expect(hasDemoData(partial)).toBe(true);
    expect(addDemoData(partial).recurringBills.length).toBe(partial.recurringBills.length);
  });
});

describe("dicas personalizadas", () => {
  it("escolhe dica pelo objetivo", () => {
    expect(tipFor({ occupation: "", interests: [], goal: "Sair das dívidas" }, 0)).toContain("Dívidas");
  });
});
