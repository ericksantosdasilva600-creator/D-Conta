import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { isValidDateKey, localDateKey } from "@/lib/format";
import { deleteCachedReceipt } from "@/lib/receipt-cache";
import { DEFAULT_PREFS, normalizePrefs, normalizeReminder, type NotificationPrefs, type Reminder } from "@/lib/reminders";

export type Priority = "low" | "medium" | "high";
export type TransactionKind = "expense" | "income";
export type FinanceScope = "personal" | "trip";
export type TaskStatus = "backlog" | "next" | "in_progress" | "done";
export type HealthLogKind = "hydration" | "workout" | "reading" | "study";
export type AccountId = "main" | "card" | "cash" | "savings";
export const ACCOUNTS: { id: AccountId; label: string; icon: string }[] = [
  { id: "main", label: "Conta principal", icon: "bank-outline" },
  { id: "card", label: "Cartão de crédito", icon: "credit-card-outline" },
  { id: "cash", label: "Dinheiro", icon: "cash" },
  { id: "savings", label: "Poupança", icon: "piggy-bank-outline" },
];
export const accountLabel = (id?: string) => ACCOUNTS.find((item) => item.id === id)?.label ?? "Conta principal";

export type CreditCard = { closingDay: number; dueDay: number; limit: number };
export type RecurringBill = { id: string; name: string; amount: number; category: string; dueDay: number; account: AccountId; paidMonths: string[]; active: boolean };
export type SavingsGoal = { id: string; name: string; target: number; saved: number; deadline: string };
export type Debt = { id: string; name: string; total: number; paid: number; monthly: number; interest: number };
export type StudySubject = { id: string; name: string };
export type StudyItemKind = "exam" | "assignment" | "reading";
export type StudyItem = { id: string; subjectId: string; title: string; kind: StudyItemKind; dueDate: string; done: boolean };

export type Transaction = {
  id: string;
  kind: TransactionKind;
  amount: number;
  merchant: string;
  category: string;
  date: string;
  dueDate: string;
  paid: boolean;
  priority: Priority;
  notes: string;
  receiptUri: string;
  receiptId?: string;
  receiptPendingBase64?: string;
  receiptMimeType?: string;
  scope: FinanceScope;
  account?: AccountId;
  installment?: string;
  installmentGroup?: string;
  recurringBillId?: string;
};

export type Habit = {
  id: string;
  name: string;
  weekdays: number[];
  reminderTime: string;
  priority: Priority;
  archived: boolean;
  goalLabel: string;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  project: string;
  relatedTaskId: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  project: string;
  linkedBudgetId: string;
  remindAtDue: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HealthLog = {
  id: string;
  kind: HealthLogKind;
  date: string;
  amountMl: number;
  durationMinutes: number;
  notes: string;
};

export type MonthlyBudget = {
  id: string;
  month: string;
  category: string;
  scope: FinanceScope;
  limit: number;
};

export type AppData = {
  schemaVersion: 3;
  onboarded: boolean;
  transactions: Transaction[];
  customExpenseCategories: string[];
  customIncomeCategories: string[];
  habits: Habit[];
  completedByDate: Record<string, string[]>;
  notes: Note[];
  tasks: Task[];
  healthLogs: HealthLog[];
  budgets: MonthlyBudget[];
  remindersEnabled: boolean;
  dueRemindersEnabled: boolean;
  taskRemindersEnabled: boolean;
  reduceMotion: boolean;
  currency: string;
  tripName: string;
  creditCard: CreditCard;
  recurringBills: RecurringBill[];
  goals: SavingsGoal[];
  debts: Debt[];
  studySubjects: StudySubject[];
  studyItems: StudyItem[];
  darkMode: boolean;
  browserNotifications: boolean;
  focus: string[];
  reminders: Reminder[];
  notificationPrefs: NotificationPrefs;
  profile: UserProfile;
  tourDone: boolean;
};

export type UserProfile = { name: string; gender: string; country: string; state: string; source: string; occupation: string; interests: string[]; goal: string; ageRange: string };

// A chave legada permanece intacta após migração; os novos dados Nyvo usam uma chave independente.
export const STORAGE_KEY = "nyvo.app-data.v2";
export const LEGACY_STORAGE_KEY = "viaja.app-data.v1";
export const STORAGE_MIGRATION_BACKUP_KEY = "nyvo.migration.viaja-app-data-v1";
export const STORAGE_RECOVERY_BACKUP_KEY = `${STORAGE_KEY}.recovery-backup`;
export const EXPENSE_CATEGORIES = ["Mercado", "Alimentação", "Delivery", "Moradia", "Contas da casa", "Transporte", "Combustível", "Saúde", "Educação", "Assinaturas", "Lazer", "Compras", "Viagem", "Outros"];
export const INCOME_CATEGORIES = ["Salário", "13º salário", "Férias", "Bonificação", "Pix recebido", "Freela", "Rendimentos", "Reembolsos", "Outras receitas"];

export function makeDefaultData(): AppData {
  return {
    schemaVersion: 3,
    onboarded: false,
    transactions: [],
    customExpenseCategories: [],
    customIncomeCategories: [],
    habits: [],
    completedByDate: {},
    notes: [],
    tasks: [],
    healthLogs: [],
    budgets: [],
    remindersEnabled: true,
    dueRemindersEnabled: true,
    taskRemindersEnabled: false,
    reduceMotion: false,
    currency: "BRL",
    tripName: "Minha viagem",
    creditCard: { closingDay: 1, dueDay: 10, limit: 0 },
    recurringBills: [],
    goals: [],
    debts: [],
    studySubjects: [],
    studyItems: [],
    darkMode: false,
    browserNotifications: false,
    focus: [],
    reminders: [],
    notificationPrefs: { ...DEFAULT_PREFS },
    profile: { name: "", gender: "", country: "", state: "", source: "", occupation: "", interests: [], goal: "", ageRange: "" },
    tourDone: false,
  };
}

const ACCOUNT_IDS: AccountId[] = ["main", "card", "cash", "savings"];
const accountValue = (value: unknown): AccountId => ACCOUNT_IDS.includes(value as AccountId) ? value as AccountId : "main";
const num = (value: unknown, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };
const dayValue = (value: unknown, fallback: number) => Math.min(31, Math.max(1, Math.round(num(value, fallback))));
function listOf<T>(value: unknown, map: (item: Record<string, unknown>) => T | null): T[] {
  return Array.isArray(value) ? value.map((item) => { const r = asRecord(item); return r && typeof r.id === "string" ? map(r) : null; }).filter((item): item is T => item !== null) : [];
}
function normalizeExtras(saved: Record<string, unknown>) {
  const card = asRecord(saved.creditCard);
  return {
    creditCard: { closingDay: dayValue(card?.closingDay, 1), dueDay: dayValue(card?.dueDay, 10), limit: Math.max(0, num(card?.limit)) },
    recurringBills: listOf<RecurringBill>(saved.recurringBills, (r) => typeof r.name === "string" ? { id: r.id as string, name: r.name, amount: Math.max(0, num(r.amount)), category: stringValue(r.category, "Contas da casa"), dueDay: dayValue(r.dueDay, 10), account: accountValue(r.account), paidMonths: stringList(r.paidMonths), active: r.active !== false } : null),
    goals: listOf<SavingsGoal>(saved.goals, (r) => typeof r.name === "string" ? { id: r.id as string, name: r.name, target: Math.max(0, num(r.target)), saved: Math.max(0, num(r.saved)), deadline: stringValue(r.deadline) } : null),
    debts: listOf<Debt>(saved.debts, (r) => typeof r.name === "string" ? { id: r.id as string, name: r.name, total: Math.max(0, num(r.total)), paid: Math.max(0, num(r.paid)), monthly: Math.max(0, num(r.monthly)), interest: Math.max(0, num(r.interest)) } : null),
    studySubjects: listOf<StudySubject>(saved.studySubjects, (r) => typeof r.name === "string" ? { id: r.id as string, name: r.name } : null),
    studyItems: listOf<StudyItem>(saved.studyItems, (r) => typeof r.title === "string" ? { id: r.id as string, subjectId: stringValue(r.subjectId), title: r.title, kind: r.kind === "exam" || r.kind === "reading" ? r.kind : "assignment", dueDate: stringValue(r.dueDate), done: r.done === true } : null),
    darkMode: saved.darkMode === true,
    browserNotifications: saved.browserNotifications === true,
    focus: stringList(saved.focus),
    reminders: Array.isArray(saved.reminders) ? saved.reminders.map(normalizeReminder).filter((r): r is Reminder => r !== null) : [],
    notificationPrefs: normalizePrefs(saved.notificationPrefs),
    profile: (() => { const r = asRecord(saved.profile); return { name: stringValue(r?.name).slice(0, 40), gender: stringValue(r?.gender), country: stringValue(r?.country), state: stringValue(r?.state), source: stringValue(r?.source), occupation: stringValue(r?.occupation), interests: stringList(r?.interests), goal: stringValue(r?.goal), ageRange: stringValue(r?.ageRange) }; })(),
    tourDone: saved.tourDone === true,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function priorityValue(value: unknown): Priority {
  return value === "low" || value === "high" ? value : "medium";
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeTransaction(value: unknown): Transaction | null {
  const item = asRecord(value);
  const amount = Number(item?.amount);
  if (!item || typeof item.id !== "string" || !Number.isFinite(amount)) return null;
  return {
    id: item.id,
    kind: item.kind === "income" ? "income" : "expense",
    amount,
    merchant: stringValue(item.merchant),
    category: stringValue(item.category, "Outros"),
    date: stringValue(item.date),
    dueDate: stringValue(item.dueDate),
    paid: item.paid !== false,
    priority: priorityValue(item.priority),
    notes: stringValue(item.notes),
    receiptUri: stringValue(item.receiptUri),
    ...(typeof item.receiptId === "string" ? { receiptId: item.receiptId } : {}),
    ...(typeof item.receiptPendingBase64 === "string" ? { receiptPendingBase64: item.receiptPendingBase64 } : {}),
    ...(typeof item.receiptMimeType === "string" ? { receiptMimeType: item.receiptMimeType } : {}),
    // In schema v1 every existing movement belongs to the original travel notebook.
    scope: item.scope === "personal" ? "personal" : "trip",
    account: accountValue(item.account),
    ...(typeof item.installment === "string" ? { installment: item.installment } : {}),
    ...(typeof item.installmentGroup === "string" ? { installmentGroup: item.installmentGroup } : {}),
    ...(typeof item.recurringBillId === "string" ? { recurringBillId: item.recurringBillId } : {}),
  };
}

function normalizeHabit(value: unknown): Habit | null {
  const item = asRecord(value);
  if (!item || typeof item.id !== "string" || typeof item.name !== "string") return null;
  const weekdays = Array.isArray(item.weekdays) ? item.weekdays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6) : [];
  return {
    id: item.id,
    name: item.name,
    weekdays,
    reminderTime: stringValue(item.reminderTime, "09:00"),
    priority: priorityValue(item.priority),
    archived: Boolean(item.archived),
    goalLabel: stringValue(item.goalLabel),
  };
}

function normalizeNote(value: unknown): Note | null {
  const item = asRecord(value);
  if (!item || typeof item.id !== "string" || typeof item.title !== "string") return null;
  const timestamp = stringValue(item.updatedAt, stringValue(item.createdAt));
  return {
    id: item.id,
    title: item.title,
    body: stringValue(item.body),
    tags: stringList(item.tags),
    project: stringValue(item.project),
    relatedTaskId: stringValue(item.relatedTaskId),
    createdAt: stringValue(item.createdAt, timestamp),
    updatedAt: timestamp,
  };
}

function normalizeTask(value: unknown): Task | null {
  const item = asRecord(value);
  if (!item || typeof item.id !== "string" || typeof item.title !== "string") return null;
  const status: TaskStatus = item.status === "next" || item.status === "in_progress" || item.status === "done" ? item.status : "backlog";
  const timestamp = stringValue(item.updatedAt, stringValue(item.createdAt));
  return {
    id: item.id,
    title: item.title,
    description: stringValue(item.description),
    status,
    priority: priorityValue(item.priority),
    dueDate: stringValue(item.dueDate),
    project: stringValue(item.project),
    linkedBudgetId: stringValue(item.linkedBudgetId),
    remindAtDue: Boolean(item.remindAtDue),
    createdAt: stringValue(item.createdAt, timestamp),
    updatedAt: timestamp,
  };
}

function normalizeHealthLog(value: unknown): HealthLog | null {
  const item = asRecord(value);
  if (!item || typeof item.id !== "string") return null;
  if (item.kind !== "hydration" && item.kind !== "workout" && item.kind !== "reading" && item.kind !== "study") return null;
  return {
    id: item.id,
    kind: item.kind,
    date: stringValue(item.date, localDateKey()),
    amountMl: Math.max(0, Number(item.amountMl) || 0),
    durationMinutes: Math.max(0, Number(item.durationMinutes) || 0),
    notes: stringValue(item.notes),
  };
}

function normalizeBudget(value: unknown): MonthlyBudget | null {
  const item = asRecord(value);
  const limit = Number(item?.limit);
  if (!item || typeof item.id !== "string" || typeof item.month !== "string" || typeof item.category !== "string" || !Number.isFinite(limit) || limit <= 0) return null;
  return {
    id: item.id,
    month: item.month,
    category: item.category,
    scope: item.scope === "trip" ? "trip" : "personal",
    limit,
  };
}

export function normalizeStoredData(value: unknown): AppData {
  const base = makeDefaultData();
  const saved = asRecord(value);
  if (!saved) throw new Error("Os dados salvos não têm um formato reconhecido.");
  const version = typeof saved.schemaVersion === "number" ? saved.schemaVersion : 1;
  if (version > base.schemaVersion) throw new Error("Os dados foram criados por uma versão mais recente da aplicação.");

  const completedByDate: Record<string, string[]> = {};
  const completions = asRecord(saved.completedByDate);
  if (completions) {
    Object.entries(completions).forEach(([date, ids]) => {
      if (Array.isArray(ids)) completedByDate[date] = stringList(ids);
    });
  }

  return {
    ...base,
    onboarded: Boolean(saved.onboarded),
    transactions: Array.isArray(saved.transactions) ? saved.transactions.map(normalizeTransaction).filter((item): item is Transaction => item !== null) : [],
    customExpenseCategories: stringList(saved.customExpenseCategories),
    customIncomeCategories: stringList(saved.customIncomeCategories),
    habits: Array.isArray(saved.habits) ? saved.habits.map(normalizeHabit).filter((item): item is Habit => item !== null) : [],
    completedByDate,
    notes: Array.isArray(saved.notes) ? saved.notes.map(normalizeNote).filter((item): item is Note => item !== null) : [],
    tasks: Array.isArray(saved.tasks) ? saved.tasks.map(normalizeTask).filter((item): item is Task => item !== null) : [],
    healthLogs: Array.isArray(saved.healthLogs) ? saved.healthLogs.map(normalizeHealthLog).filter((item): item is HealthLog => item !== null) : [],
    budgets: Array.isArray(saved.budgets) ? saved.budgets.map(normalizeBudget).filter((item): item is MonthlyBudget => item !== null) : [],
    remindersEnabled: saved.remindersEnabled !== false,
    dueRemindersEnabled: saved.dueRemindersEnabled !== false,
    taskRemindersEnabled: saved.taskRemindersEnabled === true,
    reduceMotion: Boolean(saved.reduceMotion),
    currency: stringValue(saved.currency, "BRL"),
    tripName: stringValue(saved.tripName, "Minha viagem").trim() || "Minha viagem",
    ...normalizeExtras(saved),
  };
}

function validateStoredPayload(value: unknown, version: number) {
  const saved = asRecord(value);
  if (!saved) return ["estrutura principal"];
  const issues = new Set<string>();
  if (saved.schemaVersion !== undefined && (typeof saved.schemaVersion !== "number" || !Number.isInteger(saved.schemaVersion) || saved.schemaVersion < 1)) issues.add("versão dos dados");
  const validPriority = (priority: unknown) => priority === "low" || priority === "medium" || priority === "high";
  const optionalString = (record: Record<string, unknown>, key: string) => record[key] === undefined || typeof record[key] === "string";
  const optionalBoolean = (record: Record<string, unknown>, key: string) => record[key] === undefined || typeof record[key] === "boolean";
  const optionalDate = (date: unknown) => date === undefined || date === "" || (typeof date === "string" && isValidDateKey(date));
  const validTextList = (list: unknown) => Array.isArray(list) && list.every((item) => typeof item === "string");
  const requireArray = (key: string, label: string, required: boolean, validItem: (item: unknown) => boolean) => {
    const items = saved[key];
    if (items === undefined && !required) return;
    if (!Array.isArray(items) || items.some((item) => !validItem(item))) issues.add(label);
  };

  if (typeof saved.onboarded !== "boolean") issues.add("estado inicial");
  for (const key of ["remindersEnabled", "dueRemindersEnabled", "reduceMotion", "taskRemindersEnabled"]) {
    if (!optionalBoolean(saved, key) || (version >= 2 && key === "taskRemindersEnabled" && typeof saved[key] !== "boolean")) issues.add("preferências");
  }
  for (const key of ["currency", "tripName"]) if (!optionalString(saved, key)) issues.add("preferências");
  for (const key of ["customExpenseCategories", "customIncomeCategories"]) {
    if (!validTextList(saved[key])) issues.add("categorias personalizadas");
  }

  requireArray("transactions", "movimentos financeiros", true, (value) => {
    const item = asRecord(value);
    if (!item || typeof item.id !== "string" || !item.id || typeof item.amount !== "number" || !Number.isFinite(item.amount) || (item.kind !== "expense" && item.kind !== "income") || typeof item.merchant !== "string" || typeof item.category !== "string" || typeof item.date !== "string" || !isValidDateKey(item.date)) return false;
    if (item.scope !== undefined && item.scope !== "personal" && item.scope !== "trip") return false;
    if (version >= 2 && item.scope !== "personal" && item.scope !== "trip") return false;
    if (!optionalDate(item.dueDate) || !optionalString(item, "dueDate") || !optionalString(item, "notes") || !optionalString(item, "receiptUri") || !optionalString(item, "receiptId") || !optionalString(item, "receiptPendingBase64") || !optionalString(item, "receiptMimeType")) return false;
    if (!optionalBoolean(item, "paid") || (item.priority !== undefined && !validPriority(item.priority))) return false;
    return true;
  });

  requireArray("habits", "hábitos", true, (value) => {
    const item = asRecord(value);
    if (!item || typeof item.id !== "string" || !item.id || typeof item.name !== "string" || !Array.isArray(item.weekdays) || !item.weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) return false;
    if (!optionalString(item, "reminderTime") || (item.reminderTime !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.reminderTime as string))) return false;
    return optionalString(item, "goalLabel") && optionalBoolean(item, "archived") && (item.priority === undefined || validPriority(item.priority));
  });

  const completions = asRecord(saved.completedByDate);
  if (!completions) issues.add("histórico de hábitos");
  else if (Object.entries(completions).some(([date, ids]) => !isValidDateKey(date) || !validTextList(ids))) issues.add("histórico de hábitos");

  const checkCollections = version >= 2;
  requireArray("notes", "anotações", checkCollections, (value) => {
    const item = asRecord(value);
    return Boolean(item && typeof item.id === "string" && item.id && typeof item.title === "string" && optionalString(item, "body") && (item.tags === undefined || validTextList(item.tags)) && optionalString(item, "project") && optionalString(item, "relatedTaskId") && optionalString(item, "createdAt") && optionalString(item, "updatedAt"));
  });
  requireArray("tasks", "tarefas", checkCollections, (value) => {
    const item = asRecord(value);
    const statuses = ["backlog", "next", "in_progress", "done"];
    return Boolean(item && typeof item.id === "string" && item.id && typeof item.title === "string" && (item.status === undefined ? version < 2 : statuses.includes(String(item.status))) && (item.priority === undefined ? version < 2 : validPriority(item.priority)) && optionalDate(item.dueDate) && optionalString(item, "dueDate") && optionalString(item, "description") && optionalString(item, "project") && optionalString(item, "linkedBudgetId") && optionalString(item, "createdAt") && optionalString(item, "updatedAt") && (item.remindAtDue === undefined ? version < 2 : typeof item.remindAtDue === "boolean"));
  });
  requireArray("healthLogs", "registros de saúde", checkCollections, (value) => {
    const item = asRecord(value);
    const kinds = ["hydration", "workout", "reading", "study"];
    return Boolean(item && typeof item.id === "string" && item.id && kinds.includes(String(item.kind)) && typeof item.date === "string" && isValidDateKey(item.date) && typeof item.amountMl === "number" && Number.isFinite(item.amountMl) && item.amountMl >= 0 && typeof item.durationMinutes === "number" && Number.isFinite(item.durationMinutes) && item.durationMinutes >= 0 && optionalString(item, "notes"));
  });
  requireArray("budgets", "orçamentos", checkCollections, (value) => {
    const item = asRecord(value);
    return Boolean(item && typeof item.id === "string" && item.id && typeof item.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(item.month) && typeof item.category === "string" && typeof item.limit === "number" && Number.isFinite(item.limit) && item.limit > 0 && (item.scope === "personal" || item.scope === "trip"));
  });

  return [...issues];
}

type StoredLoadResult = { data: AppData; error: string | null; canWrite: boolean };

async function preserveRawPayload(key: string, raw: string) {
  const previous = await AsyncStorage.getItem(key);
  if (previous === raw) return;
  await AsyncStorage.setItem(previous ? `${key}.${Date.now()}` : key, raw);
}

async function writeAndVerifyNyvoData(data: AppData) {
  const expected = JSON.stringify(data);
  await AsyncStorage.setItem(STORAGE_KEY, expected);
  const actual = await AsyncStorage.getItem(STORAGE_KEY);
  if (!actual) throw new Error("A leitura de retorno da migração está vazia.");
  const verified = normalizeStoredData(JSON.parse(actual));
  if (JSON.stringify(verified) !== expected || actual !== expected) throw new Error("A leitura de retorno da migração diverge do conteúdo preparado.");
}

async function loadStoredData(): Promise<StoredLoadResult> {
  let raw: string | null;
  let sourceKey = STORAGE_KEY;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      sourceKey = LEGACY_STORAGE_KEY;
    }
  } catch {
    return { data: makeDefaultData(), error: "Não foi possível ler os dados locais. Tente novamente para recuperar o armazenamento.", canWrite: false };
  }
  if (!raw) return { data: makeDefaultData(), error: null, canWrite: true };

  let normalized: AppData;
  let version = 1;
  try {
    const parsed: unknown = JSON.parse(raw);
    const saved = asRecord(parsed);
    if (!saved) throw new Error("Os dados não têm um formato reconhecido.");
    version = typeof saved.schemaVersion === "number" ? saved.schemaVersion : 1;
    normalized = normalizeStoredData(parsed);
    const issues = validateStoredPayload(parsed, version);
    if (issues.length) {
      const backupKey = sourceKey === LEGACY_STORAGE_KEY ? STORAGE_MIGRATION_BACKUP_KEY : STORAGE_RECOVERY_BACKUP_KEY;
      try {
        await preserveRawPayload(backupKey, raw);
      } catch {
        return { data: normalized, error: "Foram encontrados registros incompletos. A migração foi interrompida e a chave original permanece intacta, mas não foi possível criar outra cópia de recuperação.", canWrite: false };
      }
      return { data: normalized, error: `A migração foi interrompida: alguns registros ou campos são inválidos (${issues.join(", ")}). A cópia original foi preservada e não será substituída. Tente novamente antes de continuares.`, canWrite: false };
    }
  } catch (caught) {
    const backupKey = sourceKey === LEGACY_STORAGE_KEY ? STORAGE_MIGRATION_BACKUP_KEY : STORAGE_RECOVERY_BACKUP_KEY;
    try { await preserveRawPayload(backupKey, raw); } catch { /* A chave original continua intacta. */ }
    const reason = caught instanceof Error ? caught.message : "formato não reconhecido";
    return { data: makeDefaultData(), error: `${reason} A cópia original foi preservada e não será substituída por um perfil vazio. Tente novamente para recuperar o armazenamento.`, canWrite: false };
  }

  if (sourceKey === LEGACY_STORAGE_KEY) {
    try {
      // Primeiro guardar a cópia exata; só depois escrever o formato novo noutra chave.
      await preserveRawPayload(STORAGE_MIGRATION_BACKUP_KEY, raw);
    } catch {
      return { data: normalized, error: "Não foi possível criar a cópia de recuperação. Os dados antigos permanecem intactos; tente novamente.", canWrite: false };
    }
    try {
      await writeAndVerifyNyvoData(normalized);
    } catch {
      return { data: normalized, error: "Os dados foram preparados, mas não foi possível salvá-los no formato Nyvo. A versão original continua preservada; tente novamente.", canWrite: false };
    }
  } else if (version < normalized.schemaVersion) {
    try {
      await preserveRawPayload(STORAGE_RECOVERY_BACKUP_KEY, raw);
      await writeAndVerifyNyvoData(normalized);
    } catch {
      return { data: normalized, error: "Não foi possível concluir a atualização segura dos dados. A versão anterior foi preservada; tente novamente.", canWrite: false };
    }
  }
  return { data: normalized, error: null, canWrite: true };
}

export type SyncMeta = { lastSyncedRevision: number | null; dirty: boolean; linked: boolean };
const EMPTY_SYNC_META: SyncMeta = { lastSyncedRevision: null, dirty: false, linked: false };
const syncMetaKey = (id: number) => `${STORAGE_KEY}.user.${id}.sync-meta`;
const accountStorageKey = (id: number) => `${STORAGE_KEY}.user.${id}`;
const hasAppContent = (data: AppData) => data.transactions.length > 0 || data.habits.length > 0 || data.notes.length > 0 || data.tasks.length > 0 || data.healthLogs.length > 0 || data.budgets.length > 0 || data.customExpenseCategories.length > 0 || data.customIncomeCategories.length > 0;

async function loadAccountData(id: number): Promise<StoredLoadResult & { meta: SyncMeta; unlinked: boolean }> {
  const key = accountStorageKey(id);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const data = normalizeStoredData(JSON.parse(raw));
      const issues = validateStoredPayload(JSON.parse(raw), data.schemaVersion);
      if (issues.length) {
        await preserveRawPayload(`${key}.recovery-backup`, raw);
        return { data, error: `A cópia local da conta contém campos inválidos (${issues.join(", ")}); a cópia original foi preservada.`, canWrite: false, meta: EMPTY_SYNC_META, unlinked: false };
      }
      let meta = EMPTY_SYNC_META;
      try { const savedMeta = asRecord(JSON.parse((await AsyncStorage.getItem(syncMetaKey(id))) || "null")); if (savedMeta) meta = { lastSyncedRevision: typeof savedMeta.lastSyncedRevision === "number" ? savedMeta.lastSyncedRevision : null, dirty: savedMeta.dirty === true, linked: savedMeta.linked === true }; } catch { /* Metadados danificados não invalidam o payload local. */ }
      return { data, error: null, canWrite: true, meta, unlinked: false };
    }
    const global = await loadStoredData();
    if (hasAppContent(global.data)) {
      if (!global.canWrite) return { ...global, meta: EMPTY_SYNC_META, unlinked: false };
      const globalRaw = await AsyncStorage.getItem(STORAGE_KEY);
      if (globalRaw) {
        await preserveRawPayload(`${key}.pre-account-import`, globalRaw);
        await AsyncStorage.setItem(key, globalRaw);
        // Keep the old guest key empty so another account on this device never inherits these records.
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(makeDefaultData()));
      }
      return { ...global, meta: EMPTY_SYNC_META, unlinked: true };
    }
    return { data: makeDefaultData(), error: global.error, canWrite: global.canWrite, meta: EMPTY_SYNC_META, unlinked: false };
  } catch {
    return { data: makeDefaultData(), error: "Não foi possível ler os dados locais da conta.", canWrite: false, meta: EMPTY_SYNC_META, unlinked: false };
  }
}

type AppDataContextValue = {
  data: AppData; updateData: (updater: (current: AppData) => AppData) => void;
  loading: boolean; storageReady: boolean; storageError: string | null; retryStorage: () => Promise<void>; isOnline: boolean | null;
  accountId: number | null; syncMeta: SyncMeta; isLocalDataUnlinked: boolean; linkLocalData: () => Promise<void>;
  replaceFromCloud: (data: unknown, revision: number) => Promise<void>; markSynced: (revision: number) => Promise<void>;
  markDirty: () => Promise<void>; updateSyncMeta: (updates: Partial<SyncMeta>) => Promise<void>; resetLocalData: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children, accountId = null }: { children: React.ReactNode; accountId?: number | null }) {
  const [data, setData] = useState<AppData>(makeDefaultData);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [syncMeta, setSyncMeta] = useState<SyncMeta>(EMPTY_SYNC_META);
  const [isLocalDataUnlinked, setIsLocalDataUnlinked] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<number | null>(accountId);
  const [useGlobalUntilLinked, setUseGlobalUntilLinked] = useState(accountId === null);
  const loadToken = React.useRef(0);
  const metaRef = React.useRef(syncMeta);
  metaRef.current = syncMeta;

  useEffect(() => {
    const token = ++loadToken.current;
    setLoading(true); setStorageReady(false); setData(makeDefaultData()); setStorageError(null);
    setSyncMeta(EMPTY_SYNC_META); setIsLocalDataUnlinked(false); setActiveAccountId(accountId); setUseGlobalUntilLinked(accountId === null);
    const load = accountId === null ? loadStoredData().then((r) => ({ ...r, meta: EMPTY_SYNC_META, unlinked: false })) : loadAccountData(accountId);
    void load.then((result) => {
      if (token !== loadToken.current) return;
      setData(result.data); setStorageError(result.error); setStorageReady(result.canWrite);
      setSyncMeta(result.meta); metaRef.current = result.meta; setIsLocalDataUnlinked(result.unlinked); setUseGlobalUntilLinked(accountId === null); setLoading(false);
    });
    return () => { loadToken.current++; };
  }, [accountId]);

  const currentStorageKey = activeAccountId !== null && !useGlobalUntilLinked ? accountStorageKey(activeAccountId) : STORAGE_KEY;
  const persistMeta = useCallback(async (updates: Partial<SyncMeta>) => {
    const next = { ...metaRef.current, ...updates }; metaRef.current = next; setSyncMeta(next);
    if (activeAccountId !== null && (!useGlobalUntilLinked || next.linked)) await AsyncStorage.setItem(syncMetaKey(activeAccountId), JSON.stringify(next));
  }, [activeAccountId, useGlobalUntilLinked]);
  const updateData = useCallback((updater: (current: AppData) => AppData) => {
    setData((current) => {
      const next = updater(current);
      if (activeAccountId !== null) removeDetachedReceiptCaches(activeAccountId, current, next);
      return next;
    });
    if (activeAccountId !== null && !useGlobalUntilLinked) void persistMeta({ dirty: true });
  }, [activeAccountId, useGlobalUntilLinked, persistMeta]);

  useEffect(() => {
    if (!storageReady || loading) return;
    const key = currentStorageKey;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(key, JSON.stringify(data)).then(() => {
        setStorageError((current) => current?.startsWith("Não foi possível salvar") ? null : current);
      }).catch(() => setStorageError("Não foi possível salvar as alterações no aparelho. Verifique o espaço disponível e tente novamente."));
    }, 180);
    return () => clearTimeout(timer);
  }, [data, loading, storageReady, currentStorageKey]);

  useEffect(() => {
    if (Platform.OS === "web") {
      const update = () => setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
      update();
      if (typeof window !== "undefined") { window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }
      return;
    }
    let active = true;
    Network.getNetworkStateAsync().then((state) => { if (active) setIsOnline(state.isConnected !== false && state.isInternetReachable !== false); }).catch(() => { if (active) setIsOnline(null); });
    const subscription = Network.addNetworkStateListener((state) => setIsOnline(state.isConnected !== false && state.isInternetReachable !== false));
    return () => { active = false; subscription.remove(); };
  }, []);

  const linkLocalData = useCallback(async () => {
    if (activeAccountId === null || !isLocalDataUnlinked) return;
    const key = accountStorageKey(activeAccountId);
    await AsyncStorage.setItem(key, JSON.stringify(data));
    const linkedMeta = { ...metaRef.current, linked: true, dirty: true };
    await AsyncStorage.setItem(syncMetaKey(activeAccountId), JSON.stringify(linkedMeta));
    metaRef.current = linkedMeta; setSyncMeta(linkedMeta); setIsLocalDataUnlinked(false); setUseGlobalUntilLinked(false); setStorageReady(true);
  }, [activeAccountId, data, isLocalDataUnlinked]);

  const replaceFromCloud = useCallback(async (incoming: unknown, revision: number) => {
    if (activeAccountId === null || !Number.isFinite(revision)) throw new Error("É necessária uma conta e uma revisão válida.");
    const normalized = normalizeStoredData(incoming); const issues = validateStoredPayload(incoming, normalized.schemaVersion);
    if (issues.length) throw new Error(`Dados recebidos inválidos: ${issues.join(", ")}`);
    const key = accountStorageKey(activeAccountId); const raw = await AsyncStorage.getItem(key);
    const guestRaw = isLocalDataUnlinked || useGlobalUntilLinked ? await AsyncStorage.getItem(STORAGE_KEY) : null;
    if (raw) await preserveRawPayload(`${key}.replacement-backup`, raw);
    if (guestRaw) await AsyncStorage.setItem(`${key}.pre-cloud-replacement.${Date.now()}`, guestRaw);
    const localRaw = raw ?? guestRaw;
    let prior: AppData | null = null;
    try { if (localRaw) prior = normalizeStoredData(JSON.parse(localRaw)); } catch { /* Mantém backup bruto, sem impedir a substituição válida. */ }
    const preserved = prior ? new Map(prior.transactions.filter((tx) => tx.receiptUri).map((tx) => [tx.id, tx.receiptUri])) : new Map<string, string>();
    const merged = { ...normalized, transactions: normalized.transactions.map((tx) => tx.receiptUri ? tx : { ...tx, ...(preserved.has(tx.id) ? { receiptUri: preserved.get(tx.id)! } : {}) }) };
    if (prior) removeDetachedReceiptCaches(activeAccountId, prior, merged);
    await AsyncStorage.setItem(key, JSON.stringify(merged));
    const nextMeta = { lastSyncedRevision: revision, dirty: false, linked: true };
    await AsyncStorage.setItem(syncMetaKey(activeAccountId), JSON.stringify(nextMeta));
    metaRef.current = nextMeta; setData(merged); setSyncMeta(nextMeta); setIsLocalDataUnlinked(false); setUseGlobalUntilLinked(false); setStorageReady(true);
  }, [activeAccountId, isLocalDataUnlinked, useGlobalUntilLinked]);
  const markSynced = useCallback((revision: number) => persistMeta({ lastSyncedRevision: revision, dirty: false, linked: true }), [persistMeta]);
  const markDirty = useCallback(() => persistMeta({ dirty: true }), [persistMeta]);
  const resetLocalData = useCallback(async () => {
    const key = activeAccountId !== null && !useGlobalUntilLinked ? accountStorageKey(activeAccountId) : STORAGE_KEY;
    if (activeAccountId !== null) removeDetachedReceiptCaches(activeAccountId, data, makeDefaultData());
    await AsyncStorage.removeItem(key);
    if (activeAccountId !== null && !useGlobalUntilLinked) { await AsyncStorage.removeItem(syncMetaKey(activeAccountId)); metaRef.current = EMPTY_SYNC_META; setSyncMeta(EMPTY_SYNC_META); }
    setData(activeAccountId !== null ? { ...makeDefaultData(), onboarded: true } : makeDefaultData()); setStorageReady(true); setStorageError(null); setIsLocalDataUnlinked(false);
  }, [activeAccountId, useGlobalUntilLinked, data]);
  const retryStorage = useCallback(async () => {
    if (!storageReady) {
      if (activeAccountId === null) {
        const result = await loadStoredData();
        setData(result.data); setStorageError(result.error); setStorageReady(result.canWrite);
        setSyncMeta(EMPTY_SYNC_META); setIsLocalDataUnlinked(false); setUseGlobalUntilLinked(true);
      } else {
        const result = await loadAccountData(activeAccountId);
        setData(result.data); setStorageError(result.error); setStorageReady(result.canWrite);
        setSyncMeta(result.meta); metaRef.current = result.meta; setIsLocalDataUnlinked(result.unlinked); setUseGlobalUntilLinked(false);
      }
      return;
    }
    try { await AsyncStorage.setItem(currentStorageKey, JSON.stringify(data)); setStorageError(null); }
    catch { setStorageError("Ainda não foi possível salvar. Libere espaço no aparelho e tente novamente."); }
  }, [data, storageReady, activeAccountId, currentStorageKey]);
  const value = useMemo(() => ({ data, updateData, loading, storageReady, storageError, retryStorage, isOnline, accountId, syncMeta, isLocalDataUnlinked, linkLocalData, replaceFromCloud, markSynced, markDirty, updateSyncMeta: persistMeta, resetLocalData }), [data, updateData, loading, storageReady, storageError, retryStorage, isOnline, accountId, syncMeta, isLocalDataUnlinked, linkLocalData, replaceFromCloud, markSynced, markDirty, persistMeta, resetLocalData]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData tem de ser usado dentro de AppDataProvider.");
  return value;
}

function removeDetachedReceiptCaches(userId: number, previous: AppData, next: AppData) {
  const retained = new Set(next.transactions.map((transaction) => transaction.receiptId).filter((id): id is string => typeof id === "string"));
  const removed = new Set(previous.transactions.map((transaction) => transaction.receiptId).filter((id): id is string => typeof id === "string" && !retained.has(id)));
  for (const receiptId of removed) void deleteCachedReceipt(userId, receiptId).catch(() => undefined);
}
