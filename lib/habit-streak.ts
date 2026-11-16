import { localDateKey } from "./format";

type StreakHabit = { weekdays: number[]; archived?: boolean };

/**
 * Dias seguidos com algum hábito feito. Dias sem nenhum hábito agendado (por exemplo,
 * o fim de semana de quem só tem hábitos de segunda a sexta) não quebram a sequência.
 */
export function habitStreak(completedByDate: Record<string, string[]>, habits: StreakHabit[], today: string) {
  const active = habits.filter((h) => !h.archived);
  const d = new Date(`${today}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  if (!(completedByDate[today] ?? []).length) d.setDate(d.getDate() - 1);
  let streak = 0;
  for (let guard = 0; guard < 3660; guard += 1) {
    const key = localDateKey(d);
    if ((completedByDate[key] ?? []).length) {
      streak += 1;
    } else {
      const scheduled = active.some((h) => h.weekdays.includes(d.getDay()));
      if (scheduled || !active.length) break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
