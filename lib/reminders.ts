/**
 * Motor de lembretes do Nyvo: calcula quando cada aviso deve tocar.
 * Funções puras (sem React), usadas pelo site e pelo app nativo.
 */
import type { AppData } from "./app-data";
import { soundFor, type SoundId } from "./themes";

export type ReminderRepeat = "once" | "minutes" | "hours" | "daily" | "weekly" | "monthly" | "days";

export type Reminder = {
  id: string;
  title: string;
  message: string;
  enabled: boolean;
  repeat: ReminderRepeat;
  /** Data de início (ou a data única, em "once"), AAAA-MM-DD. */
  date: string;
  /** Horários do dia (HH:MM) para once/daily/weekly/monthly/days. */
  times: string[];
  /** Intervalo: N minutos, N horas ou N dias. */
  every: number;
  /** Dias da semana 0=domingo … 6=sábado (weekly; também limita minutes/hours se preenchido). */
  weekdays: number[];
  monthDay: number;
  /** Janela para minutes/hours. */
  windowStart: string;
  windowEnd: string;
  /** Opcional: para de avisar depois desta data. */
  endDate: string;
  icon?: string;
  /** Vazio: som sugerido pelo título. */
  sound?: string;
};

export type NotificationPrefs = {
  billDaysBefore: number[];
  billTime: string;
  taskTime: string;
  taskDayBefore: boolean;
  studyDaysBefore: number[];
  studyTime: string;
  habitReminders: boolean;
  dailySummary: boolean;
  dailySummaryTime: string;
  quietStart: string;
  quietEnd: string;
  quietEnabled: boolean;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  billDaysBefore: [1, 0],
  billTime: "09:00",
  taskTime: "09:00",
  taskDayBefore: false,
  studyDaysBefore: [3, 1],
  studyTime: "19:00",
  habitReminders: true,
  dailySummary: false,
  dailySummaryTime: "07:30",
  quietStart: "22:00",
  quietEnd: "07:00",
  quietEnabled: false,
};

export type ReminderEvent = { key: string; title: string; body: string; at: Date; source: "custom" | "auto"; sound: SoundId };

const pad = (n: number) => String(n).padStart(2, "0");
export const dateKeyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const minutesOf = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const at = (dayKey: string, minutes: number) => { const [y, mo, d] = dayKey.split("-").map(Number); return new Date(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0); };
const addDays = (dayKey: string, n: number) => { const [y, mo, d] = dayKey.split("-").map(Number); return dateKeyOf(new Date(y, mo - 1, d + n)); };
const dayDiff = (a: string, b: string) => Math.round((at(b, 0).getTime() - at(a, 0).getTime()) / 86400000);

export function inQuietHours(date: Date, prefs: NotificationPrefs) {
  if (!prefs.quietEnabled || !isTime(prefs.quietStart) || !isTime(prefs.quietEnd)) return false;
  const m = date.getHours() * 60 + date.getMinutes();
  const s = minutesOf(prefs.quietStart); const e = minutesOf(prefs.quietEnd);
  return s <= e ? m >= s && m < e : m >= s || m < e;
}

function dayMatches(r: Reminder, day: string) {
  if (r.date && day < r.date) return false;
  if (r.endDate && day > r.endDate) return false;
  const weekday = at(day, 12 * 60).getDay();
  switch (r.repeat) {
    case "once": return day === r.date;
    case "daily": return true;
    case "weekly": return r.weekdays.includes(weekday);
    case "monthly": {
      const [y, m] = day.split("-").map(Number);
      const last = new Date(y, m, 0).getDate();
      return Number(day.slice(8, 10)) === Math.min(Math.max(1, r.monthDay), last);
    }
    case "days": return r.date ? dayDiff(r.date, day) % Math.max(1, r.every) === 0 : true;
    case "minutes": case "hours": return r.weekdays.length ? r.weekdays.includes(weekday) : true;
  }
}

function minutesForDay(r: Reminder): number[] {
  if (r.repeat === "minutes" || r.repeat === "hours") {
    const step = Math.max(1, r.every) * (r.repeat === "hours" ? 60 : 1);
    const start = isTime(r.windowStart) ? minutesOf(r.windowStart) : 0;
    const end = isTime(r.windowEnd) ? minutesOf(r.windowEnd) : 23 * 60 + 59;
    const out: number[] = [];
    for (let m = start; m <= end; m += step) out.push(m);
    return out;
  }
  return [...new Set(r.times.filter(isTime).map(minutesOf))].sort((a, b) => a - b);
}

/** Ocorrências do lembrete no intervalo (from, to]. */
export function occurrences(r: Reminder, from: Date, to: Date, limit = 200): Date[] {
  if (!r.enabled || to <= from) return [];
  const out: Date[] = [];
  const mins = minutesForDay(r);
  if (!mins.length) return out;
  let day = dateKeyOf(from);
  const last = dateKeyOf(to);
  for (let guard = 0; day <= last && guard < 800 && out.length < limit; guard++, day = addDays(day, 1)) {
    if (!dayMatches(r, day)) continue;
    for (const m of mins) {
      const d = at(day, m);
      if (d > from && d <= to) { out.push(d); if (out.length >= limit) break; }
    }
  }
  return out;
}

export function nextOccurrences(r: Reminder, count = 5, now = new Date()) {
  return occurrences(r, now, new Date(now.getTime() + 400 * 86400000), count);
}

const REPEAT_LABEL = (r: Reminder) => {
  const days = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const times = r.times.filter(isTime).join(", ");
  const win = `das ${r.windowStart} às ${r.windowEnd}`;
  const wd = r.weekdays.length && r.weekdays.length < 7 ? ` (${[...r.weekdays].sort().map((d) => days[d]).join(", ")})` : "";
  switch (r.repeat) {
    case "once": return `Uma vez, ${r.date.split("-").reverse().join("/")} às ${times}`;
    case "minutes": return `A cada ${r.every} min, ${win}${wd}`;
    case "hours": return `A cada ${r.every} h, ${win}${wd}`;
    case "daily": return `Todo dia às ${times}`;
    case "weekly": return `${wd ? wd.slice(2, -1) : "Toda semana"} às ${times}`;
    case "monthly": return `Todo dia ${r.monthDay} do mês às ${times}`;
    case "days": return `A cada ${r.every} dias às ${times}`;
  }
};
export const describeReminder = REPEAT_LABEL;

/** Avisos automáticos: contas, cartão, tarefas, provas, hábitos e resumo do dia. */
export function autoEvents(data: AppData, prefs: NotificationPrefs, from: Date, to: Date): ReminderEvent[] {
  const events: ReminderEvent[] = [];
  const push = (key: string, title: string, body: string, when: Date, sound: SoundId = "padrao") => { if (when > from && when <= to) events.push({ key, title, body, at: when, source: "auto", sound }); };
  const billMin = isTime(prefs.billTime) ? minutesOf(prefs.billTime) : 9 * 60;
  const dueText = (d: number) => d === 0 ? "vence hoje" : d === 1 ? "vence amanhã" : `vence em ${d} dias`;
  const startDay = dateKeyOf(from);
  const endDay = dateKeyOf(to);
  // Contas fixas: mês atual e próximo.
  for (const bill of data.recurringBills.filter((b) => b.active)) {
    for (const offset of [0, 1]) {
      const base = at(startDay, 0); base.setDate(1); base.setMonth(base.getMonth() + offset);
      const month = dateKeyOf(base).slice(0, 7);
      if (bill.paidMonths.includes(month)) continue;
      const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      const due = `${month}-${pad(Math.min(bill.dueDay, lastDay))}`;
      for (const d of prefs.billDaysBefore) push(`bill:${bill.id}:${month}:${d}`, "Conta a pagar", `${bill.name} ${dueText(d)}.`, at(addDays(due, -d), billMin), "moedas");
    }
  }
  // Despesas pendentes com vencimento.
  for (const t of data.transactions) {
    if (t.kind !== "expense" || t.paid || !t.dueDate) continue;
    for (const d of prefs.billDaysBefore) push(`tx:${t.id}:${d}`, "Despesa pendente", `${t.merchant || "Uma despesa"} ${dueText(d)}.`, at(addDays(t.dueDate.slice(0, 10), -d), billMin), "moedas");
  }
  // Tarefas.
  const taskMin = isTime(prefs.taskTime) ? minutesOf(prefs.taskTime) : 9 * 60;
  for (const task of data.tasks) {
    if (task.status === "done" || !task.dueDate || !task.remindAtDue) continue;
    push(`task:${task.id}:0`, "Tarefa para hoje", task.title, at(task.dueDate.slice(0, 10), taskMin), soundFor(task.sound, task.title));
    if (prefs.taskDayBefore) push(`task:${task.id}:1`, "Tarefa para amanhã", task.title, at(addDays(task.dueDate.slice(0, 10), -1), taskMin), soundFor(task.sound, task.title));
  }
  // Provas, trabalhos e leituras.
  const studyMin = isTime(prefs.studyTime) ? minutesOf(prefs.studyTime) : 19 * 60;
  const kindLabel = { exam: "Prova", assignment: "Trabalho", reading: "Leitura" } as const;
  for (const item of data.studyItems) {
    if (item.done || !item.dueDate) continue;
    for (const d of prefs.studyDaysBefore) push(`study:${item.id}:${d}`, `${kindLabel[item.kind]} ${d === 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`}`, item.title, at(addDays(item.dueDate, -d), studyMin), "livro");
  }
  // Hábitos e resumo diário: percorre os dias do intervalo.
  for (let day = startDay, guard = 0; day <= endDay && guard < 400; day = addDays(day, 1), guard++) {
    const weekday = at(day, 12 * 60).getDay();
    if (prefs.habitReminders && data.remindersEnabled) {
      for (const h of data.habits) {
        if (h.archived || !h.weekdays.includes(weekday) || !isTime(h.reminderTime)) continue;
        if ((data.completedByDate[day] ?? []).includes(h.id)) continue;
        push(`habit:${h.id}:${day}`, "Hora do seu hábito", h.name, at(day, minutesOf(h.reminderTime)), soundFor(h.sound, h.name));
      }
    }
    if (prefs.dailySummary && isTime(prefs.dailySummaryTime)) {
      const habits = data.habits.filter((h) => !h.archived && h.weekdays.includes(weekday)).length;
      const tasks = data.tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate <= day).length;
      push(`summary:${day}`, "Seu dia no Nyvo", `${habits} ${habits === 1 ? "hábito" : "hábitos"} e ${tasks} ${tasks === 1 ? "tarefa" : "tarefas"} para hoje.`, at(day, minutesOf(prefs.dailySummaryTime)));
    }
  }
  return events.filter((e) => !inQuietHours(e.at, prefs));
}

/** Todos os avisos (personalizados + automáticos) no intervalo, em ordem. */
export function eventsBetween(data: AppData, from: Date, to: Date, limitPerReminder = 200): ReminderEvent[] {
  const prefs = data.notificationPrefs;
  const custom = data.reminders.flatMap((r) => occurrences(r, from, to, limitPerReminder)
    .filter((d) => r.repeat === "once" || !inQuietHours(d, prefs))
    .map((d) => ({ key: `custom:${r.id}:${d.getTime()}`, title: r.title, body: r.message || describeReminder(r), at: d, source: "custom" as const, sound: soundFor(r.sound, r.title) })));
  const auto = autoEvents(data, prefs, from, to).filter((e) => {
    if (e.key.startsWith("bill:") || e.key.startsWith("tx:")) return data.dueRemindersEnabled;
    if (e.key.startsWith("task:")) return data.taskRemindersEnabled;
    return true;
  });
  return [...custom, ...auto].sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function normalizeReminder(value: unknown): Reminder | null {
  const r = value && typeof value === "object" ? value as Record<string, unknown> : null;
  if (!r || typeof r.id !== "string" || typeof r.title !== "string") return null;
  const repeats: ReminderRepeat[] = ["once", "minutes", "hours", "daily", "weekly", "monthly", "days"];
  const nums = (v: unknown) => Array.isArray(v) ? v.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6) : [];
  return {
    id: r.id, title: r.title, message: typeof r.message === "string" ? r.message : "",
    enabled: r.enabled !== false,
    repeat: repeats.includes(r.repeat as ReminderRepeat) ? r.repeat as ReminderRepeat : "daily",
    date: typeof r.date === "string" ? r.date : "",
    times: Array.isArray(r.times) ? r.times.filter((t): t is string => typeof t === "string" && isTime(t)) : ["09:00"],
    every: Math.max(1, Math.round(Number(r.every) || 1)),
    weekdays: nums(r.weekdays),
    monthDay: Math.min(31, Math.max(1, Math.round(Number(r.monthDay) || 1))),
    windowStart: typeof r.windowStart === "string" && isTime(r.windowStart) ? r.windowStart : "08:00",
    windowEnd: typeof r.windowEnd === "string" && isTime(r.windowEnd) ? r.windowEnd : "22:00",
    endDate: typeof r.endDate === "string" ? r.endDate : "",
    ...(typeof r.icon === "string" && r.icon ? { icon: r.icon } : {}),
    ...(typeof r.sound === "string" && r.sound ? { sound: r.sound } : {}),
  };
}

export function normalizePrefs(value: unknown): NotificationPrefs {
  const r = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const days = (v: unknown, fb: number[]) => Array.isArray(v) ? [...new Set(v.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 30))] : fb;
  const time = (v: unknown, fb: string) => typeof v === "string" && isTime(v) ? v : fb;
  return {
    billDaysBefore: days(r.billDaysBefore, DEFAULT_PREFS.billDaysBefore),
    billTime: time(r.billTime, DEFAULT_PREFS.billTime),
    taskTime: time(r.taskTime, DEFAULT_PREFS.taskTime),
    taskDayBefore: r.taskDayBefore === true,
    studyDaysBefore: days(r.studyDaysBefore, DEFAULT_PREFS.studyDaysBefore),
    studyTime: time(r.studyTime, DEFAULT_PREFS.studyTime),
    habitReminders: r.habitReminders !== false,
    dailySummary: r.dailySummary === true,
    dailySummaryTime: time(r.dailySummaryTime, DEFAULT_PREFS.dailySummaryTime),
    quietStart: time(r.quietStart, DEFAULT_PREFS.quietStart),
    quietEnd: time(r.quietEnd, DEFAULT_PREFS.quietEnd),
    quietEnabled: r.quietEnabled === true,
  };
}

export const REMINDER_TEMPLATES: { label: string; make: (today: string) => Omit<Reminder, "id"> }[] = [
  { label: "Beber água a cada 1 h", make: (today) => ({ title: "Beber água", message: "Um copo de água agora.", enabled: true, repeat: "hours", date: today, times: [], every: 1, weekdays: [], monthDay: 1, windowStart: "08:00", windowEnd: "22:00", endDate: "" }) },
  { label: "Pausa a cada 50 min", make: (today) => ({ title: "Pausa rápida", message: "Levante, alongue e respire.", enabled: true, repeat: "minutes", date: today, times: [], every: 50, weekdays: [1, 2, 3, 4, 5], monthDay: 1, windowStart: "08:00", windowEnd: "18:00", endDate: "" }) },
  { label: "Remédio 8h e 20h", make: (today) => ({ title: "Remédio", message: "Hora do remédio.", enabled: true, repeat: "daily", date: today, times: ["08:00", "20:00"], every: 1, weekdays: [], monthDay: 1, windowStart: "08:00", windowEnd: "22:00", endDate: "" }) },
  { label: "Anotar gastos às 21h", make: (today) => ({ title: "Anotar os gastos do dia", message: "Leva 1 minuto: registre o que gastou hoje.", enabled: true, repeat: "daily", date: today, times: ["21:00"], every: 1, weekdays: [], monthDay: 1, windowStart: "08:00", windowEnd: "22:00", endDate: "" }) },
  { label: "Academia seg, qua, sex", make: (today) => ({ title: "Academia", message: "Bora treinar!", enabled: true, repeat: "weekly", date: today, times: ["18:00"], every: 1, weekdays: [1, 3, 5], monthDay: 1, windowStart: "08:00", windowEnd: "22:00", endDate: "" }) },
  { label: "Guardar dinheiro dia 5", make: (today) => ({ title: "Guardar dinheiro", message: "Separe a parte da reserva de emergência.", enabled: true, repeat: "monthly", date: today, times: ["10:00"], every: 1, weekdays: [], monthDay: 5, windowStart: "08:00", windowEnd: "22:00", endDate: "" }) },
];
