import type { AppData } from "./app-data";
import { addMonths, billStatus, monthKey, monthLabel, monthSummary } from "./finance-extra";
import { displayDate, localDateKey, money } from "./format";
import { FAQ } from "./help";

const monthName = (month: string) => monthLabel(month).toLocaleLowerCase("pt-BR");

export type SearchHit = { id: string; group: string; title: string; detail: string; icon: string; path: string };

export const SCREENS: { title: string; words: string; icon: string; path: string }[] = [
  { title: "Hoje", words: "inicio resumo dia", icon: "white-balance-sunny", path: "/" },
  { title: "Finanças", words: "gastos despesas receitas dinheiro cartao orcamento metas dividas contas extrato importar", icon: "wallet-outline", path: "/finance" },
  { title: "Anotações", words: "notas ideias", icon: "note-text-outline", path: "/notes" },
  { title: "Hábitos & Saúde", words: "agua treino leitura estudos", icon: "heart-pulse", path: "/habits" },
  { title: "Tarefas", words: "afazeres projetos prazos", icon: "checkbox-marked-circle-outline", path: "/tasks" },
  { title: "Gráficos", words: "relatorios evolucao", icon: "chart-box-outline", path: "/insights" },
  { title: "Lembretes", words: "avisos notificacoes alarme", icon: "bell-outline", path: "/reminders" },
  { title: "Ajuda e feedback", words: "suporte duvidas perfil tour", icon: "lifebuoy", path: "/support" },
  { title: "Configurações", words: "backup aparencia cores conta moeda tema", icon: "cog-outline", path: "/settings" },
];

/** Minúsculas e sem acento: "Olá" e "ola" contam como a mesma palavra. */
export const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const STOP = new Set("a o as os um uma de do da dos das no na nos nas em e ou para por com como que qual quais eu meu minha meus minhas se ao aos nao mais onde quando porque por que tem ter posso faco fazer".split(" "));
const words = (text: string) => normalize(text).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));

/** Busca dentro do aparelho. Nada aqui sai do celular ou do navegador. */
export function searchApp(data: AppData, query: string, limit = 12): SearchHit[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const match = (...parts: string[]) => { const hay = normalize(parts.join(" ")); return terms.every((t) => hay.includes(t)); };
  const hits: SearchHit[] = [];
  SCREENS.filter((s) => match(s.title, s.words)).forEach((s) => hits.push({ id: `screen-${s.path}`, group: "Telas", title: s.title, detail: "Abrir tela", icon: s.icon, path: s.path }));
  data.tasks.filter((t) => match(t.title, t.description, t.project)).slice(0, 5).forEach((t) => hits.push({ id: `task-${t.id}`, group: "Tarefas", title: t.title, detail: t.status === "done" ? "Concluída" : t.dueDate ? `Prazo: ${displayDate(t.dueDate)}` : "Sem prazo", icon: "checkbox-marked-circle-outline", path: "/tasks" }));
  data.notes.filter((n) => match(n.title, n.body, n.project, n.tags.join(" "))).slice(0, 5).forEach((n) => hits.push({ id: `note-${n.id}`, group: "Anotações", title: n.title || "Sem título", detail: n.body.replace(/\s+/g, " ").slice(0, 70), icon: "note-text-outline", path: "/notes" }));
  data.transactions.filter((t) => match(t.merchant, t.category, t.notes)).slice(0, 5).forEach((t) => hits.push({ id: `tx-${t.id}`, group: "Finanças", title: t.merchant || t.category, detail: `${t.kind === "expense" ? "-" : "+"}${money(t.amount, data.currency)} · ${displayDate(t.date)}`, icon: "wallet-outline", path: "/finance" }));
  data.habits.filter((h) => !h.archived && match(h.name, h.goalLabel)).slice(0, 3).forEach((h) => hits.push({ id: `habit-${h.id}`, group: "Hábitos", title: h.name, detail: h.goalLabel || "Hábito", icon: "heart-pulse", path: "/habits" }));
  return hits.slice(0, limit);
}

function faqAnswer(question: string) {
  const asked = words(question);
  if (!asked.length) return null;
  let best: { a: string; score: number } | null = null;
  for (const item of FAQ) {
    const known = new Set(words(item.q));
    const score = asked.filter((w) => known.has(w)).length;
    if (score >= 2 && score / asked.length >= 0.5 && (!best || score > best.score)) best = { a: item.a, score };
  }
  return best?.a ?? null;
}

/** Responde no próprio aparelho o que dá para calcular ou está na ajuda. Devolve null quando precisa da IA. */
export function localAnswer(data: AppData, question: string, today = localDateKey()): string | null {
  const q = normalize(question);
  const month = q.includes("mes passado") ? addMonths(monthKey(new Date(`${today}T12:00:00`)), -1) : monthKey(new Date(`${today}T12:00:00`));
  const asksAmount = /\b(quanto|quantos|total|resumo)\b/.test(q);
  if (asksAmount && /\b(gastei|gastos?|despesas?)\b/.test(q)) {
    const s = monthSummary(data, month);
    if (!s.expense) return `Não encontrei despesas em ${monthName(month)}.`;
    const top = s.categories[0];
    return `Em ${monthName(month)} você gastou ${money(s.expense, data.currency)}. A maior categoria foi ${top[0]}, com ${money(top[1], data.currency)}.`;
  }
  if (asksAmount && /\b(recebi|receitas?|saldo|sobrou|sobra)\b/.test(q)) {
    const s = monthSummary(data, month);
    return `Em ${monthName(month)}: receitas de ${money(s.income, data.currency)}, despesas de ${money(s.expense, data.currency)} e saldo de ${money(s.balance, data.currency)}.`;
  }
  if (/\btarefas?\b/.test(q) && /\b(quantas?|pendentes?|atrasadas?|falta|faltam|hoje)\b/.test(q)) {
    const open = data.tasks.filter((t) => t.status !== "done");
    if (!open.length) return "Você não tem tarefas pendentes.";
    const late = open.filter((t) => t.dueDate && t.dueDate < today).length;
    const list = open.slice(0, 3).map((t) => t.title).join("; ");
    return `Você tem ${open.length} ${open.length === 1 ? "tarefa pendente" : "tarefas pendentes"}${late ? `, ${late} com prazo vencido` : ""}. ${open.length > 3 ? "Algumas delas" : open.length === 1 ? "É esta" : "São estas"}: ${list}.`;
  }
  if (/\b(contas?|boletos?)\b/.test(q) && /\b(vence|vencem|vencer|pagar|vencimento)\b/.test(q) && !q.includes("como")) {
    const open = data.recurringBills.filter((b) => b.active).map((b) => ({ b, st: billStatus(b, monthKey(new Date(`${today}T12:00:00`)), today) })).filter((x) => !x.st.paid).sort((x, y) => x.st.days - y.st.days);
    if (!open.length) return "Não há contas fixas em aberto neste mês.";
    return `Contas fixas em aberto: ${open.slice(0, 4).map((x) => `${x.b.name}, ${money(x.b.amount, data.currency)}, ${x.st.overdue ? "vencida em" : "vence em"} ${displayDate(x.st.dueDate)}`).join("; ")}.`;
  }
  return faqAnswer(question);
}
