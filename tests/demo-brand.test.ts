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
});

describe("dicas personalizadas", () => {
  it("escolhe dica pelo objetivo", () => {
    expect(tipFor({ occupation: "", interests: [], goal: "Sair das dívidas" }, 0)).toContain("Dívidas");
  });
});
