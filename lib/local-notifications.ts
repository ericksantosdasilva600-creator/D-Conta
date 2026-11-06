import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { AppData, Transaction, Habit, Task } from "@/lib/app-data";
import { eventsBetween } from "@/lib/reminders";
import { SOUNDS, type SoundId } from "@/lib/themes";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getNotificationPermission() {
  if (Platform.OS === "web") return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    return current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission() {
  if (Platform.OS === "web") return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted || asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch {
    return false;
  }
}

const soundFile = (sound: SoundId) => sound === "padrao" ? "default" : `nyvo_${sound}.wav`;
// No Android, o som pertence ao canal: cada som tem o seu.
const channelOf = (sound: SoundId) => sound === "padrao" ? "reminders" : `reminders_${sound}`;

async function scheduleAt(title: string, body: string, date: Date, sound: SoundId = "padrao") {
  if (date.getTime() <= Date.now()) return;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: soundFile(sound) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: Platform.OS === "android" ? channelOf(sound) : undefined },
  });
}

export async function scheduleTransactionReminders(transaction: Transaction) {
  if (Platform.OS === "web" || transaction.kind !== "expense" || transaction.paid || !transaction.dueDate) return;
  const allowed = await getNotificationPermission();
  if (!allowed) return;
  const due = new Date(`${transaction.dueDate.slice(0, 10)}T09:00:00`);
  if (Number.isNaN(due.getTime())) return;
  const dayBefore = new Date(due);
  dayBefore.setDate(dayBefore.getDate() - 1);
  await scheduleAt("Vencimento amanhã", `${transaction.merchant || "Uma despesa"} vence amanhã.`, dayBefore);
  await scheduleAt("Vencimento hoje", `${transaction.merchant || "Uma despesa"} vence hoje.`, due);
}

export async function scheduleHabitReminders(habit: Habit) {
  if (Platform.OS === "web" || habit.archived || !habit.reminderTime || habit.weekdays.length === 0) return;
  const allowed = await getNotificationPermission();
  if (!allowed) return;
  const [hour, minute] = habit.reminderTime.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
  for (const day of habit.weekdays) {
    // Expo calendar weekdays use 1 for Sunday through 7 for Saturday.
    const weekday = day === 0 ? 1 : day + 1;
    await Notifications.scheduleNotificationAsync({
      content: { title: "Hora do seu hábito", body: `Está na hora de: ${habit.name}.`, sound: "default" },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        weekday,
        hour,
        minute,
        repeats: true,
        channelId: Platform.OS === "android" ? "reminders" : undefined,
      },
    });
  }
}

export async function scheduleTaskReminder(task: Task) {
  if (Platform.OS === "web" || task.status === "done" || !task.remindAtDue || !task.dueDate) return;
  const allowed = await getNotificationPermission();
  if (!allowed) return;
  const due = new Date(`${task.dueDate.slice(0, 10)}T09:00:00`);
  if (Number.isNaN(due.getTime())) return;
  await scheduleAt("Tarefa para hoje", `A tarefa “${task.title}” tem o prazo hoje.`, due);
}

/**
 * Agenda no aparelho os próximos avisos (personalizados e automáticos).
 * O sistema limita a quantidade de avisos agendados, por isso agendamos os próximos 60
 * dentro de 14 dias; a lista é refeita sempre que o app abre ou os dados mudam.
 */
export async function refreshLocalNotifications(data: AppData) {
  if (Platform.OS === "web") return false;
  try {
    await enableNotificationChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();
    const allowed = await getNotificationPermission();
    if (!allowed) return false;
    const now = new Date();
    const events = eventsBetween(data, now, new Date(now.getTime() + 14 * 86400000), 60).slice(0, 60);
    for (const event of events) await scheduleAt(event.title, event.body, event.at, event.sound);
    return true;
  } catch {
    return false;
  }
}

export async function enableNotificationChannel() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Lembretes Nyvo",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: "#187A61",
    });
    for (const { id, label } of SOUNDS) {
      if (id === "padrao") continue;
      await Notifications.setNotificationChannelAsync(channelOf(id), {
        name: `Lembretes com som: ${label}`,
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 120, 200],
        lightColor: "#187A61",
        sound: soundFile(id),
      });
    }
  } catch {
    // Notifications remain optional; the app can still show due dates in its own lists.
  }
}
