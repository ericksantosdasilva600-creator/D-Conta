import { describe, expect, it } from "vitest";
import { autoEvents, DEFAULT_PREFS, describeReminder, inQuietHours, nextOccurrences, occurrences, type Reminder } from "../lib/reminders";

const base: Reminder = { id: "r", title: "T", message: "", enabled: true, repeat: "daily", date: "2026-11-05", times: ["09:00"], every: 1, weekdays: [], monthDay: 1, windowStart: "08:00", windowEnd: "22:00", endDate: "" };
const fmt = (ds: Date[]) => ds.map((d) => `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
const now = new Date(2026, 10, 5, 10, 0);

describe("lembretes personalizados", () => {
  it("todo dia, vários horários", () => {
    expect(fmt(nextOccurrences({ ...base, times: ["08:00", "20:00"] }, 3, now))).toEqual(["5/11 20:00", "6/11 08:00", "6/11 20:00"]);
  });
  it("a cada 2 horas dentro da janela", () => {
    expect(fmt(nextOccurrences({ ...base, repeat: "hours", every: 2, windowStart: "08:00", windowEnd: "16:00" }, 4, now))).toEqual(["5/11 12:00", "5/11 14:00", "5/11 16:00", "6/11 08:00"]);
  });
  it("a cada 15 minutos", () => {
    expect(fmt(occurrences({ ...base, repeat: "minutes", every: 15 }, now, new Date(2026, 10, 5, 11, 0)))).toEqual(["5/11 10:15", "5/11 10:30", "5/11 10:45", "5/11 11:00"]);
  });
  it("dias da semana", () => {
    expect(fmt(nextOccurrences({ ...base, repeat: "weekly", weekdays: [1, 3], times: ["18:00"] }, 3, now))).toEqual(["9/11 18:00", "11/11 18:00", "16/11 18:00"]);
  });
  it("mensal no dia 31 cai no último dia de meses curtos", () => {
    expect(fmt(nextOccurrences({ ...base, repeat: "monthly", monthDay: 31, times: ["10:00"] }, 3, now))).toEqual(["30/11 10:00", "31/12 10:00", "31/1 10:00"]);
  });
  it("a cada 3 dias a partir da data", () => {
    expect(fmt(nextOccurrences({ ...base, repeat: "days", every: 3, times: ["07:00"] }, 3, now))).toEqual(["8/11 07:00", "11/11 07:00", "14/11 07:00"]);
  });
  it("uma vez e data final", () => {
    expect(fmt(nextOccurrences({ ...base, repeat: "once", date: "2026-12-24", times: ["19:30"] }, 3, now))).toEqual(["24/12 19:30"]);
    expect(nextOccurrences({ ...base, endDate: "2026-11-06" }, 5, now)).toHaveLength(1);
    expect(nextOccurrences({ ...base, enabled: false }, 5, now)).toHaveLength(0);
  });
  it("descreve em português", () => {
    expect(describeReminder({ ...base, repeat: "hours", every: 1 })).toBe("A cada 1 h, das 08:00 às 22:00");
  });
  it("horário de silêncio atravessa a meia-noite", () => {
    const prefs = { ...DEFAULT_PREFS, quietEnabled: true, quietStart: "22:00", quietEnd: "07:00" };
    expect(inQuietHours(new Date(2026, 10, 5, 23, 0), prefs)).toBe(true);
    expect(inQuietHours(new Date(2026, 10, 5, 6, 59), prefs)).toBe(true);
    expect(inQuietHours(new Date(2026, 10, 5, 7, 0), prefs)).toBe(false);
  });
});

describe("avisos automáticos", () => {
  it("conta fixa avisa 1 dia antes e no dia, no horário escolhido", () => {
    const data = { recurringBills: [{ id: "b", name: "Internet", amount: 99, category: "x", dueDay: 10, account: "main", paidMonths: [], active: true }], transactions: [], tasks: [], studyItems: [], habits: [], completedByDate: {}, remindersEnabled: true } as never;
    const ev = autoEvents(data, { ...DEFAULT_PREFS, billTime: "08:30" }, now, new Date(2026, 10, 30));
    expect(ev.map((e) => [fmt([e.at])[0], e.body])).toEqual([["9/11 08:30", "Internet vence amanhã."], ["10/11 08:30", "Internet vence hoje."]]);
  });
});
