import type { AppData, CreditCard, RecurringBill, Transaction, TransactionKind } from "./app-data";
import { createId, isValidDateKey, localDateKey } from "./format";

export const monthKey = (date = new Date()) => localDateKey(date).slice(0, 7);

export function addMonths(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export function dayInMonth(month: string, day: number) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Mês da fatura em que uma compra no cartão entra. */
export function invoiceMonthFor(date: string, card: CreditCard) {
  const month = date.slice(0, 7);
  const day = Number(date.slice(8, 10));
  return day > card.closingDay ? addMonths(month, 1) : month;
}

export function invoiceDueDate(invoiceMonth: string, card: CreditCard) {
  return dayInMonth(card.dueDay <= card.closingDay ? addMonths(invoiceMonth, 1) : invoiceMonth, card.dueDay);
}

export function cardInvoices(transactions: Transaction[], card: CreditCard) {
  const map = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.account !== "card" || t.kind !== "expense") continue;
    const key = invoiceMonthFor(t.date, card);
    map.set(key, [...(map.get(key) ?? []), t]);
  }
  return [...map.entries()].map(([month, items]) => ({ month, items, total: items.reduce((s, t) => s + t.amount, 0), dueDate: invoiceDueDate(month, card) })).sort((a, b) => a.month.localeCompare(b.month));
}

export function currentInvoiceMonth(card: CreditCard, today = localDateKey()) {
  return invoiceMonthFor(today, card);
}

/** Divide uma compra parcelada em N movimentos mensais. */
export function splitInstallments(base: Transaction, count: number): Transaction[] {
  if (count <= 1) return [base];
  const group = base.installmentGroup ?? createId();
  const cents = Math.round(base.amount * 100);
  const each = Math.floor(cents / count);
  return Array.from({ length: count }, (_, i) => {
    const month = addMonths(base.date.slice(0, 7), i);
    const date = dayInMonth(month, Number(base.date.slice(8, 10)));
    const amount = (i === 0 ? cents - each * (count - 1) : each) / 100;
    return { ...base, id: i === 0 ? base.id : createId(), date, amount, installment: `${i + 1}/${count}`, installmentGroup: group };
  });
}

export function billStatus(bill: RecurringBill, month = monthKey(), today = localDateKey()) {
  const dueDate = dayInMonth(month, bill.dueDay);
  const paid = bill.paidMonths.includes(month);
  const days = Math.round((new Date(`${dueDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000);
  return { dueDate, paid, days, overdue: !paid && days < 0 };
}

export function payBill(data: AppData, bill: RecurringBill, month = monthKey()): AppData {
  if (bill.paidMonths.includes(month)) return data;
  const today = localDateKey();
  const transaction: Transaction = {
    id: createId(), kind: "expense", amount: bill.amount, merchant: bill.name, category: bill.category,
    date: today, dueDate: dayInMonth(month, bill.dueDay), paid: true, priority: "medium", notes: "Conta fixa",
    receiptUri: "", scope: "personal", account: bill.account, recurringBillId: bill.id,
  };
  return {
    ...data,
    transactions: [transaction, ...data.transactions],
    recurringBills: data.recurringBills.map((b) => b.id === bill.id ? { ...b, paidMonths: [...b.paidMonths, month] } : b),
  };
}

const CATEGORY_WORDS: [RegExp, string][] = [
  [/mercado|supermercado|atacad|feira|hortifruti|padaria|açougue|acougue/, "Mercado"],
  [/ifood|delivery|rappi|pizza|lanche|hamb[uú]rguer|restaurante|almo[cç]o|jantar|caf[eé]/, "Alimentação"],
  [/gasolina|combust[ií]vel|posto|etanol|diesel|[aá]lcool/, "Combustível"],
  [/uber|\b99\b|[oô]nibus|metr[oô]|passagem|t[aá]xi|estacionamento|ped[aá]gio/, "Transporte"],
  [/aluguel|condom[ií]nio|iptu/, "Moradia"],
  [/luz|energia|[aá]gua|internet|\bg[aá]s\b|telefone|celular|conta de/, "Contas da casa"],
  [/farm[aá]cia|rem[eé]dio|m[eé]dico|consulta|dentista|exame|academia/, "Saúde"],
  [/faculdade|curso|mensalidade|livro|escola|apostila/, "Educação"],
  [/netflix|spotify|assinatura|prime|disney|youtube|icloud/, "Assinaturas"],
  [/cinema|\bbar\b|show|festa|cerveja|lazer|jogo/, "Lazer"],
  [/roupa|loja|shopping|presente|amazon|shopee|mercado livre/, "Compras"],
];
const INCOME_WORDS: [RegExp, string][] = [
  [/sal[aá]rio|pagamento do trabalho/, "Salário"],
  [/13\s*º|d[eé]cimo/, "13º salário"],
  [/f[eé]rias/, "Férias"],
  [/pix/, "Pix recebido"],
  [/freela|bico|servi[cç]o/, "Freela"],
  [/b[oô]nus|bonifica/, "Bonificação"],
  [/rendimento|dividendo|juros/, "Rendimentos"],
];

export type ParsedPhrase = { kind: TransactionKind; amount: number; category: string; merchant: string; account: "main" | "card" | "cash"; date?: string };

/** Entende frases como "gastei 45 no mercado" ou "recebi 2000 de salário". Tudo local, sem IA externa. */
export function parsePhrase(text: string): ParsedPhrase | null {
  const raw = text.trim();
  if (!raw) return null;
  const lower = raw.toLocaleLowerCase("pt-BR");
  const numberMatch = lower.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  if (!numberMatch) return null;
  const amount = Number(numberMatch[1].replace(/\.(?=\d{3})/g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  // Classifica só pelas palavras: o valor digitado (ex.: 130, 99) não pode virar "13º salário" nem "Transporte".
  const words = lower.replace(numberMatch[0], " ");
  const income = /\b(recebi|ganhei|entrou|caiu|recebido|ganho|sal[aá]rio)\b/.test(lower);
  const kind: TransactionKind = income ? "income" : "expense";
  const table = income ? INCOME_WORDS : CATEGORY_WORDS;
  let category = income ? "Outras receitas" : "Outros";
  for (const [re, cat] of table) if (re.test(words)) { category = cat; break; }
  const place = raw.match(/\b(?:no|na|em|de|do|da|com|pro|pra|para)\s+([^\d,]+?)(?:\s+(?:hoje|ontem|no cart[aã]o|no cr[eé]dito|no d[eé]bito|no pix|em dinheiro))?\s*$/i);
  let merchant = place ? place[1].trim() : "";
  merchant = merchant.replace(/^(o|a|os|as)\s+/i, "");
  if (!merchant) merchant = category;
  merchant = merchant.charAt(0).toUpperCase() + merchant.slice(1);
  const account = /cart[aã]o|cr[eé]dito/.test(lower) ? "card" : /dinheiro|esp[eé]cie/.test(lower) ? "cash" : "main";
  let date: string | undefined;
  if (/\bontem\b/.test(lower)) { const d = new Date(); d.setDate(d.getDate() - 1); date = localDateKey(d); }
  return { kind, amount, category, merchant, account, ...(date ? { date } : {}) };
}

export function guessCategory(description: string, kind: TransactionKind) {
  const lower = description.toLocaleLowerCase("pt-BR");
  for (const [re, cat] of kind === "income" ? INCOME_WORDS : CATEGORY_WORDS) if (re.test(lower)) return cat;
  return kind === "income" ? "Outras receitas" : "Outros";
}

export type StatementRow = { date: string; amount: number; description: string; kind: TransactionKind; category: string };

function toDateKey(value: string) {
  const v = value.trim();
  let key = "";
  let m = v.match(/^(\d{4})(\d{2})(\d{2})/);
  if (m) key = `${m[1]}-${m[2]}-${m[3]}`;
  else if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})/))) key = `${m[1]}-${m[2]}-${m[3]}`;
  else if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) key = `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // Data que não existe (31/02, mês 25...) é descartada: salvar assim travaria o app na próxima abertura.
  return isValidDateKey(key) ? key : "";
}

function toNumber(value: string) {
  const v = value.trim().replace(/[R$\s]/g, "");
  const normalized = /,\d{1,2}$/.test(v) ? v.replace(/\./g, "").replace(",", ".") : v.replace(/,/g, "");
  return Number(normalized);
}

/** Lê extrato bancário em OFX ou CSV (Nubank, Inter, Itaú, BB e outros). */
export function parseStatement(text: string): StatementRow[] {
  const rows: StatementRow[] = [];
  if (/<OFX>|<STMTTRN>/i.test(text)) {
    const blocks = text.split(/<STMTTRN>/i).slice(1);
    for (const block of blocks) {
      const tag = (name: string) => block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, "i"))?.[1]?.trim() ?? "";
      const amount = toNumber(tag("TRNAMT"));
      const date = toDateKey(tag("DTPOSTED"));
      const description = tag("MEMO") || tag("NAME") || "Movimento do extrato";
      if (!date || !Number.isFinite(amount) || amount === 0) continue;
      const kind: TransactionKind = amount < 0 ? "expense" : "income";
      rows.push({ date, amount: Math.abs(amount), description, kind, category: guessCategory(description, kind) });
    }
    return rows;
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return rows;
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const split = (line: string) => line.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
  const header = split(lines[0]).map((h) => h.toLocaleLowerCase("pt-BR"));
  const hasHeader = header.some((h) => /data|date|valor|amount|descri|title|hist/.test(h));
  const find = (re: RegExp, fallback: number) => { const i = header.findIndex((h) => re.test(h)); return i >= 0 ? i : fallback; };
  const isCardStatement = header.includes("title");
  const iDate = hasHeader ? find(/data|date/, 0) : 0;
  const iAmount = hasHeader ? find(/valor|amount|quantia/, 2) : 2;
  const iDesc = hasHeader ? find(/descri|title|hist|estabelecimento|lan[cç]amento/, 1) : 1;
  for (const line of lines.slice(hasHeader ? 1 : 0)) {
    const cells = split(line);
    const date = toDateKey(cells[iDate] ?? "");
    const value = toNumber(cells[iAmount] ?? "");
    const description = cells[iDesc] || "Movimento do extrato";
    if (!date || !Number.isFinite(value) || value === 0) continue;
    // Faturas de cartão (ex.: Nubank: date,title,amount) trazem compras como valores positivos.
    const kind: TransactionKind = isCardStatement ? (value > 0 ? "expense" : "income") : value < 0 ? "expense" : "income";
    rows.push({ date, amount: Math.abs(value), description, kind, category: guessCategory(description, kind) });
  }
  return rows;
}

export function monthSummary(data: AppData, month: string) {
  const inMonth = data.transactions.filter((t) => t.date.startsWith(month) && t.scope === "personal");
  const income = inMonth.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const expense = inMonth.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const byCategory = new Map<string, number>();
  inMonth.filter((t) => t.kind === "expense").forEach((t) => byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount));
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  let planned = 0; let done = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${month}-${String(d).padStart(2, "0")}`;
    if (key > localDateKey()) break;
    const weekday = new Date(`${key}T12:00:00`).getDay();
    const habits = data.habits.filter((h) => !h.archived && h.weekdays.includes(weekday));
    planned += habits.length;
    done += (data.completedByDate[key] ?? []).filter((id) => habits.some((h) => h.id === id)).length;
  }
  const tasksDone = data.tasks.filter((t) => t.status === "done" && t.updatedAt.startsWith(month)).length;
  return { income, expense, balance: income - expense, categories: [...byCategory.entries()].sort((a, b) => b[1] - a[1]), habitRate: planned ? done / planned : null, tasksDone, count: inMonth.length };
}
