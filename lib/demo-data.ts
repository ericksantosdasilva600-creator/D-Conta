import type { AppData, Transaction } from "./app-data";
import { localDateKey } from "./format";

const DEMO = "demo-";
const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return localDateKey(d); };

export const hasDemoData = (data: AppData) => data.transactions.some((t) => t.id.startsWith(DEMO)) || data.habits.some((h) => h.id.startsWith(DEMO));

/** Dados de exemplo para explorar o Nyvo. Todos os IDs começam com "demo-" e podem ser removidos de uma vez. */
export function addDemoData(data: AppData): AppData {
  if (hasDemoData(data)) return data;
  const tx = (id: string, kind: "expense" | "income", amount: number, merchant: string, category: string, offset: number, extra: Partial<Transaction> = {}): Transaction => ({ id: DEMO + id, kind, amount, merchant, category, date: day(offset), dueDate: "", paid: true, priority: "medium", notes: "Exemplo", receiptUri: "", scope: "personal", account: "main", ...extra });
  const transactions: Transaction[] = [
    tx("t1", "income", 3200, "Salário", "Salário", -4),
    tx("t2", "expense", 186.4, "Mercado", "Mercado", -3),
    tx("t3", "expense", 42.9, "iFood", "Delivery", -2, { account: "card" }),
    tx("t4", "expense", 150, "Posto de gasolina", "Combustível", -1, { account: "card" }),
    tx("t5", "expense", 23.5, "Uber", "Transporte", 0),
    tx("t6", "income", 350, "Freela de planilha", "Freela", -6),
    tx("t7", "expense", 89.9, "Farmácia", "Saúde", -8),
    tx("t8", "expense", 2100, "Mercado do mês passado", "Mercado", -35),
    tx("t9", "income", 3200, "Salário", "Salário", -34),
  ];
  const habitDays = [-6, -5, -4, -3, -2, -1].map(day);
  const completedByDate = { ...data.completedByDate };
  habitDays.forEach((d, i) => { completedByDate[d] = [...(completedByDate[d] ?? []), DEMO + "h1", ...(i % 2 ? [DEMO + "h2"] : [])]; });
  return {
    ...data,
    transactions: [...transactions, ...data.transactions],
    recurringBills: [
      { id: DEMO + "b1", name: "Aluguel", amount: 900, category: "Moradia", dueDay: Math.min(28, new Date().getDate() + 2), account: "main", paidMonths: [], active: true },
      { id: DEMO + "b2", name: "Internet", amount: 99.9, category: "Contas da casa", dueDay: 15, account: "main", paidMonths: [], active: true },
      ...data.recurringBills,
    ],
    goals: [{ id: DEMO + "g1", name: "Reserva de emergência", target: 6000, saved: 1450, deadline: day(240) }, ...data.goals],
    debts: [{ id: DEMO + "d1", name: "Cartão rotativo", total: 1200, paid: 300, monthly: 200, interest: 12 }, ...data.debts],
    habits: [
      { id: DEMO + "h1", name: "Beber 2 litros de água", weekdays: [0, 1, 2, 3, 4, 5, 6], reminderTime: "09:00", priority: "medium", archived: false, goalLabel: "Mais energia" },
      { id: DEMO + "h2", name: "Ler 10 páginas", weekdays: [0, 1, 2, 3, 4, 5, 6], reminderTime: "21:00", priority: "low", archived: false, goalLabel: "12 livros no ano" },
      ...data.habits,
    ],
    completedByDate,
    tasks: [
      { id: DEMO + "k1", title: "Enviar currículo", description: "Exemplo", status: "next", priority: "high", dueDate: day(0), project: "Carreira", linkedBudgetId: "", remindAtDue: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: DEMO + "k2", title: "Revisar orçamento do mês", description: "Exemplo", status: "backlog", priority: "medium", dueDate: day(3), project: "", linkedBudgetId: "", remindAtDue: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ...data.tasks,
    ],
    notes: [{ id: DEMO + "n1", title: "Ideias para economizar", body: "Levar marmita 3x por semana. Cancelar um streaming. Comparar preço do mercado.", tags: ["finanças"], project: "", relatedTaskId: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...data.notes],
    studySubjects: [{ id: DEMO + "s1", name: "Estatística" }, ...data.studySubjects],
    studyItems: [{ id: DEMO + "i1", subjectId: DEMO + "s1", title: "Prova 2 de Estatística", kind: "exam", dueDate: day(2), done: false }, ...data.studyItems],
    healthLogs: [{ id: DEMO + "w1", kind: "hydration", date: day(0), amountMl: 1250, durationMinutes: 0, notes: "" }, { id: DEMO + "w2", kind: "workout", date: day(-1), amountMl: 0, durationMinutes: 45, notes: "Academia" }, ...data.healthLogs],
  };
}

export function removeDemoData(data: AppData): AppData {
  const keep = <T extends { id: string }>(list: T[]) => list.filter((x) => !x.id.startsWith(DEMO));
  const completedByDate: Record<string, string[]> = {};
  Object.entries(data.completedByDate).forEach(([d, ids]) => { const rest = ids.filter((id) => !id.startsWith(DEMO)); if (rest.length) completedByDate[d] = rest; });
  return { ...data, transactions: keep(data.transactions), recurringBills: keep(data.recurringBills), goals: keep(data.goals), debts: keep(data.debts), habits: keep(data.habits), tasks: keep(data.tasks), notes: keep(data.notes), studySubjects: keep(data.studySubjects), studyItems: keep(data.studyItems), healthLogs: keep(data.healthLogs), completedByDate };
}
