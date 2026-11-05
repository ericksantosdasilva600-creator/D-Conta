import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, BrandMark, Card, EmptyState, Field, Header, IconButton, OfflineBanner, Page, PrimaryButton, PriorityPicker, PriorityTag, SectionTitle, StorageBanner, Tag } from "@/components/app-ui";
import { useAppData, type Habit, type Priority } from "@/lib/app-data";
import { C, SANS, SERIF } from "@/lib/design";
import { createId, localDateKey } from "@/lib/format";
import { refreshLocalNotifications } from "@/lib/local-notifications";
import { HealthTracker } from "@/components/HealthTracker";

const DAYS = [{ label: "Se", value: 1 }, { label: "Te", value: 2 }, { label: "Qa", value: 3 }, { label: "Qi", value: 4 }, { label: "Sx", value: 5 }, { label: "Sa", value: 6 }, { label: "Do", value: 0 }];
type ViewMode = "today" | "all" | "history" | "archived";

export default function HabitsScreen() {
  const { create } = useLocalSearchParams<{ create?: string }>();
  const router = useRouter();
  const { data, updateData, loading } = useAppData();
  const [section, setSection] = useState<"habits" | "health">("habits");
  const activeSection = create === "health" ? "health" : create === "habit" ? "habits" : section;
  const [mode, setMode] = useState<ViewMode>("today");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [toast, setToast] = useState("");
  const today = localDateKey();
  const [historyDate, setHistoryDate] = useState(today);
  const checklistDate = mode === "history" ? historyDate : today;
  const weekday = mode === "history" ? new Date(`${historyDate}T12:00:00`).getDay() : new Date().getDay();
  const completed = data.completedByDate[checklistDate] ?? [];
  const activeHabits = data.habits.filter((habit) => !habit.archived);
  const scheduledHabits = activeHabits.filter((habit) => habit.weekdays.includes(weekday));
  const focusedHabits = mode === "history"
    ? data.habits.filter((habit) => habit.weekdays.includes(weekday) || completed.includes(habit.id))
    : scheduledHabits;
  const doneCount = focusedHabits.filter((habit) => completed.includes(habit.id)).length;
  const streakDays = useMemo(() => {
    const cursor = new Date(`${today}T12:00:00`);
    if (!(data.completedByDate[today] ?? []).length) cursor.setDate(cursor.getDate() - 1);
    let total = 0;
    while ((data.completedByDate[localDateKey(cursor)] ?? []).length) { total += 1; cursor.setDate(cursor.getDate() - 1); }
    return total;
  }, [today, data.completedByDate]);
  const visibleHabits = useMemo(() => {
    const selected = mode === "archived" ? data.habits.filter((habit) => habit.archived) : mode === "all" ? activeHabits : mode === "history" ? focusedHabits : scheduledHabits;
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    const rank = { high: 0, medium: 1, low: 2 };
    return selected.filter((habit) => priorityFilter === "all" || habit.priority === priorityFilter)
      .filter((habit) => !normalized || habit.name.toLocaleLowerCase("pt-BR").includes(normalized))
      .sort((a, b) => rank[a.priority] - rank[b.priority] || a.name.localeCompare(b.name, "pt-BR"));
  }, [data.habits, activeHabits, focusedHabits, scheduledHabits, mode, priorityFilter, query]);

  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2500); };
  const toggleDone = (habit: Habit, dateKey = checklistDate) => {
    let isCompleted = false;
    updateData((current) => {
      const completedOnDate = current.completedByDate[dateKey] ?? [];
      isCompleted = !completedOnDate.includes(habit.id);
      const nextForDay = isCompleted ? [...completedOnDate, habit.id] : completedOnDate.filter((id) => id !== habit.id);
      return { ...current, completedByDate: { ...current.completedByDate, [dateKey]: nextForDay } };
    });
    const completeNow = isCompleted && focusedHabits.length > 0 && completed.length + 1 >= focusedHabits.length;
    notify(isCompleted ? completeNow ? dateKey === today ? "Rotinas de hoje concluídas. Bom trabalho — siga no seu ritmo." : "Checklist deste dia concluída. Bom trabalho." : `Hábito marcado em ${formatHistoryDate(dateKey)}.` : `Check-in removido de ${formatHistoryDate(dateKey)}.`);
  };
  const moveHistoryDate = (days: number) => {
    const next = new Date(`${historyDate}T12:00:00`);
    next.setDate(next.getDate() + days);
    const nextKey = localDateKey(next);
    if (nextKey <= today) setHistoryDate(nextKey);
  };
  const saveHabit = (habit: Habit) => {
    const updated = { ...data, habits: [habit, ...data.habits.filter((item) => item.id !== habit.id)] };
    updateData(() => updated);
    void refreshLocalNotifications(updated);
    setFormOpen(false);
    setEditing(null);
    if (create === "habit") { setSection("habits"); router.setParams({ create: undefined }); }
    notify("Hábito salvo. Os lembretes foram atualizados.");
  };
  const archiveHabit = (habit: Habit) => {
    const updated = { ...data, habits: data.habits.map((item) => item.id === habit.id ? { ...item, archived: !item.archived } : item) };
    updateData(() => updated);
    void refreshLocalNotifications(updated);
    setFormOpen(false);
    setEditing(null);
    notify(habit.archived ? "Hábito reativado." : "Hábito arquivado.");
  };
  const finishHealthCapture = () => { setSection("health"); router.setParams({ create: undefined }); };

  return (
    <Page>
      <Header eyebrow="NYVO · HÁBITOS & SAÚDE" title={activeSection === "habits" ? "Um passo de cada vez." : "Cuide do seu ritmo."} subtitle="Rotinas e registros pessoais, no seu ritmo." right={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><BrandMark size={42} /><IconButton name="cog-outline" label="Abrir configurações" onPress={() => router.push("/settings")} /></View>} />
      <OfflineBanner />
      <StorageBanner />
      <View style={modeRow}><ModeButton label="Hábitos" selected={activeSection === "habits"} onPress={() => setSection("habits")} /><ModeButton label="Saúde" selected={activeSection === "health"} onPress={() => setSection("health")} /></View>
      {loading ? <Card><Text style={progressHint}>Carregando suas rotinas e registros locais…</Text></Card> : activeSection === "health" ? <HealthTracker autoCreate={create === "health"} onCreateHandled={create === "health" ? finishHealthCapture : undefined} /> : <View style={{ gap: 20 }}>
      <Card style={{ backgroundColor: C.greenDark, borderColor: C.greenDark, padding: 18, gap: 13 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><MaterialCommunityIcons name="calendar-check-outline" size={19} color="rgba(255,255,255,0.78)" /><Text style={progressEyebrow}>{mode === "history" ? "HISTÓRICO DA CHECKLIST" : "CHECKLIST DE HOJE"}</Text></View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}><Text style={progressTitle}>{focusedHabits.length ? `${doneCount} de ${focusedHabits.length} feitos` : mode === "history" ? "Sem rotinas neste dia" : "Sua lista começa aqui"}</Text><Text style={progressPercent}>{focusedHabits.length ? `${Math.round((doneCount / focusedHabits.length) * 100)}%` : "—"}</Text></View>
        <View style={progressTrack}><View style={[progressFill, { width: `${focusedHabits.length ? (doneCount / focusedHabits.length) * 100 : 0}%` }]} /></View>
        <Text style={progressHint}>{mode === "history" ? focusedHabits.length ? doneCount === focusedHabits.length ? "Todas as rotinas previstas ficaram marcadas nesse dia." : "Consulte ou ajusta os check-ins salvos para esta data." : "Não há rotinas previstas para esta data. Use as setas para consultar outro dia." : focusedHabits.length ? doneCount === focusedHabits.length ? "Tudo feito. Aproveite esse momento." : "Cada marca conta. Continue no seu ritmo." : "Escolha dias e hora para criar sua primeira rotina."}</Text>
        {mode === "today" ? <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 9 }}><Tag label={streakDays ? `${streakDays} ${streakDays === 1 ? "dia" : "dias"} com check-in em sequência` : "A sequência começa quando você quiser"} icon="calendar-star" tone="green" /><Text style={streakHint}>Um check-in conta; uma pausa não apaga o histórico.</Text></View> : null}
      </Card>
      <PrimaryButton title="Novo hábito" icon="plus" onPress={() => { setEditing(null); setFormOpen(true); }} />
      <View style={{ gap: 12 }}>
        <SectionTitle title="Suas rotinas" action={mode === "archived" ? "Ver de hoje" : "Arquivados"} onAction={() => setMode(mode === "archived" ? "today" : "archived")} />
        <View style={searchBox}><MaterialCommunityIcons name="magnify" size={18} color={C.muted} /><TextInput value={query} onChangeText={setQuery} accessibilityLabel="Pesquisar hábitos" placeholder="Pesquisar hábitos…" placeholderTextColor={C.muted} style={searchInput} /><Pressable accessibilityRole="button" accessibilityLabel="Limpar pesquisa" onPress={() => setQuery("")}><MaterialCommunityIcons name="close-circle" size={18} color={query ? C.muted : "transparent"} /></Pressable></View>
        <View style={{ gap: 9 }}>
          <View style={modeRow}><ModeButton label="Hoje" selected={mode === "today"} onPress={() => setMode("today")} /><ModeButton label="Todos" selected={mode === "all"} onPress={() => setMode("all")} /><ModeButton label="Histórico" selected={mode === "history"} onPress={() => setMode("history")} /><ModeButton label="Arquivo" selected={mode === "archived"} onPress={() => setMode("archived")} /></View>
          {mode === "history" ? <View style={dateNavigator}><Pressable onPress={() => moveHistoryDate(-1)} accessibilityRole="button" accessibilityLabel="Consultar dia anterior" style={dateArrow}><MaterialCommunityIcons name="chevron-left" size={22} color={C.greenDark} /></Pressable><View style={{ flex: 1, alignItems: "center", gap: 2 }}><Text accessibilityRole="header" style={dateHeading}>{formatHistoryDate(historyDate)}</Text><Text style={dateHint}>{historyDate === today ? "Hoje" : "Check-ins salvos"}</Text></View><Pressable onPress={() => moveHistoryDate(1)} disabled={historyDate >= today} accessibilityRole="button" accessibilityLabel="Consultar dia seguinte" accessibilityState={{ disabled: historyDate >= today }} style={[dateArrow, historyDate >= today ? { opacity: 0.35 } : null]}><MaterialCommunityIcons name="chevron-right" size={22} color={C.greenDark} /></Pressable></View> : null}
          <View style={{ flexDirection: "row", gap: 7, flexWrap: "wrap" }}>
            {["Todas", "Alta", "Média", "Baixa"].map((label) => { const value = label === "Alta" ? "high" : label === "Média" ? "medium" : label === "Baixa" ? "low" : "all"; return <Pressable key={label} onPress={() => setPriorityFilter(value)} accessibilityRole="radio" accessibilityState={{ checked: priorityFilter === value }} style={[priorityChip, priorityFilter === value ? priorityActive : null]}><Text style={[priorityLabel, priorityFilter === value ? { color: C.greenDark, fontWeight: "700" } : null]}>{label === "Todas" ? "Todas prioridades" : label}</Text></Pressable>; })}
          </View>
        </View>
        {visibleHabits.length ? <View style={{ gap: 10 }}>{visibleHabits.map((habit) => <HabitCard key={habit.id} habit={habit} checked={completed.includes(habit.id)} canCheck={!habit.archived && (mode === "today" || mode === "all" || mode === "history")} onCheck={() => toggleDone(habit, checklistDate)} onEdit={() => { setEditing(habit); setFormOpen(true); }} />)}</View> : <Card><EmptyState icon={mode === "archived" ? "archive-outline" : "check-all"} title={mode === "archived" ? "Nada arquivado" : mode === "history" ? focusedHabits.length ? "Nada encontrado" : "Sem hábitos neste dia" : mode === "today" && activeHabits.length ? "Dia mais leve" : "Crie uma rotina sua"} description={mode === "archived" ? "Quando você arquivar um hábito, poderá encontrá-lo aqui." : mode === "history" ? focusedHabits.length ? "Experimente mudar a pesquisa ou os filtros." : "Não há rotinas previstas para esta data. Consulte o dia anterior ou veja todos os hábitos." : mode === "today" && activeHabits.length ? "Você não tem hábitos marcados para hoje. Veja todos ou ajuste os dias de uma rotina." : "Escolha os dias e a hora, recebe um lembrete e marca cada pequeno progresso."} action={mode === "history" && !focusedHabits.length ? <PrimaryButton title="Ver todos os hábitos" onPress={() => setMode("all")} icon="format-list-bulleted" /> : mode !== "archived" && mode !== "history" ? <PrimaryButton title="Criar hábito" onPress={() => setFormOpen(true)} icon="plus" /> : undefined} /></Card>}
      </View>
      {toast ? <View accessibilityRole="alert" style={toastStyle}><MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" /><Text style={toastText}>{toast}</Text></View> : null}
      {formOpen || create === "habit" ? <HabitForm visible initial={editing} onClose={() => { setFormOpen(false); setEditing(null); if (create === "habit") { setSection("habits"); router.setParams({ create: undefined }); } }} onSave={saveHabit} onArchive={archiveHabit} /> : null}
      </View>}
    </Page>
  );
}

function formatHistoryDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function ModeButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected }} style={[modeButton, selected ? { backgroundColor: C.green, borderColor: C.green } : null]}><Text style={[modeButtonText, selected ? { color: "#FFFFFF" } : null]}>{label}</Text></Pressable>;
}

function HabitCard({ habit, checked, canCheck, onCheck, onEdit }: { habit: Habit; checked: boolean; canCheck: boolean; onCheck: () => void; onEdit: () => void }) {
  const dayText = habit.weekdays.length === 7 ? "Todos os dias" : habit.weekdays.length === 5 && [1, 2, 3, 4, 5].every((day) => habit.weekdays.includes(day)) ? "Dias úteis" : DAYS.filter((day) => habit.weekdays.includes(day.value)).map((day) => day.label).join(" · ");
  return (
    <View style={[habitCard, checked ? { borderColor: "rgba(255,255,255,0.8)", backgroundColor: "#FBFDFB" } : null]}>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Editar hábito ${habit.name}`} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        {canCheck ? <Pressable onPress={(event) => { event.stopPropagation(); onCheck(); }} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={checked ? `Desmarcar ${habit.name}` : `Marcar ${habit.name} como concluído`} style={[checkButton, checked ? { backgroundColor: C.green, borderColor: C.green } : null]}><MaterialCommunityIcons name={checked ? "check" : "check"} size={21} color={checked ? "#FFFFFF" : C.muted} /></Pressable> : <View style={[checkButton, { backgroundColor: "#F0EFEA", borderColor: "#F0EFEA" }]}><MaterialCommunityIcons name={habit.archived ? "archive-outline" : "checkbox-blank-outline"} size={18} color={C.muted} /></View>}
        <View style={{ flex: 1, gap: 4 }}><Text style={[habitTitle, checked ? { textDecorationLine: "line-through", color: C.muted } : null]}>{habit.name}</Text><Text style={habitDetails}>{dayText || "Sem dias selecionados"} · {habit.reminderTime}</Text></View>
        <MaterialCommunityIcons name="chevron-right" size={19} color={C.muted} />
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginLeft: canCheck ? 54 : 0 }}><PriorityTag priority={habit.priority} /><Tag label={habit.archived ? "Arquivado" : "Lembrete"} icon={habit.archived ? "archive-outline" : "bell-outline"} tone={habit.archived ? "muted" : "green"} /></View>
      {habit.goalLabel ? <Tag label={`Objetivo: ${habit.goalLabel}`} icon="flag-outline" tone="blue" /> : null}
    </View>
  );
}

function HabitForm({ visible, initial, onClose, onSave, onArchive }: { visible: boolean; initial: Habit | null; onClose: () => void; onSave: (habit: Habit) => void; onArchive: (habit: Habit) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [1, 2, 3, 4, 5]);
  const [time, setTime] = useState(initial?.reminderTime ?? "09:00");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [goalLabel, setGoalLabel] = useState(initial?.goalLabel ?? "");
  const [error, setError] = useState("");
  const toggleDay = (day: number) => setWeekdays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  const submit = () => {
    if (!name.trim()) { setError("Dê um nome a este hábito."); return; }
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) { setError("Use o formato de 24 horas, por exemplo 08:30."); return; }
    if (!weekdays.length) { setError("Escolha pelo menos um dia da semana."); return; }
    onSave({ id: initial?.id ?? createId(), name: name.trim(), weekdays: [...weekdays].sort((a, b) => a - b), reminderTime: time, priority, archived: initial?.archived ?? false, goalLabel: goalLabel.trim() });
  };
  return <AppModal visible={visible} title={initial ? "Editar hábito" : "Novo hábito"} subtitle="Escolha uma rotina que você quer acompanhar." onClose={onClose} footer={<View style={{ gap: 9 }}>{initial ? <PrimaryButton title={initial.archived ? "Reativar hábito" : "Arquivar hábito"} tone="light" icon={initial.archived ? "restore" : "archive-outline"} onPress={() => onArchive(initial)} /> : null}<PrimaryButton title="Salvar hábito" icon="check" onPress={submit} /></View>}>
    <Field label="Nome do hábito" value={name} onChangeText={setName} placeholder="Ex.: Beber água" maxLength={55} />
    <View style={{ gap: 8 }}><Text style={formLabel}>Dias da semana</Text><View style={{ flexDirection: "row", gap: 7, justifyContent: "space-between" }}>{DAYS.map((day) => { const selected = weekdays.includes(day.value); return <Pressable key={day.value} onPress={() => toggleDay(day.value)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={day.label} style={[dayChip, selected ? { backgroundColor: C.green, borderColor: C.green } : null]}><Text style={[dayTextStyle, selected ? { color: "#FFFFFF" } : null]}>{day.label}</Text></Pressable>; })}</View></View>
    <Field label="Hora do lembrete" value={time} onChangeText={setTime} placeholder="09:00" keyboardType="numbers-and-punctuation" />
    <Field label="Objetivo (opcional)" value={goalLabel} onChangeText={setGoalLabel} placeholder="Ex.: mais energia, aprender um tema" maxLength={70} />
    <View style={{ gap: 8 }}><Text style={formLabel}>Prioridade</Text><PriorityPicker value={priority} onChange={setPriority} /></View>
    {error ? <Text accessibilityRole="alert" style={{ color: C.danger, fontFamily: SANS, fontSize: 12 }}>{error}</Text> : null}
    <Text style={hint}>O lembrete é local e depende da autorização das notificações do aparelho. Você pode usar a checklist mesmo sem essa autorização.</Text>
  </AppModal>;
}

const progressEyebrow = { color: "rgba(255,255,255,0.78)", fontFamily: SANS, fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.2 };
const progressTitle = { color: "#FFFFFF", fontFamily: SERIF, fontSize: 23, fontWeight: "700" as const };
const progressPercent = { color: "rgba(255,255,255,0.8)", fontFamily: SANS, fontSize: 16, fontWeight: "700" as const };
const progressTrack = { height: 8, borderRadius: 20, overflow: "hidden" as const, backgroundColor: "rgba(255,255,255,0.18)" };
const progressFill = { height: "100%" as const, backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 20 };
const progressHint = { color: "rgba(255,255,255,0.84)", fontFamily: SANS, fontSize: 12, lineHeight: 18 };
const streakHint = { color: "rgba(255,255,255,0.84)", fontFamily: SANS, fontSize: 11, lineHeight: 16, flex: 1, minWidth: 140 };
const searchBox = { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, minHeight: 46, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 13 };
const searchInput = { flex: 1, paddingVertical: 10, color: C.ink, fontFamily: SANS, fontSize: 14 };
const modeRow = { flexDirection: "row" as const, gap: 5 };
const dateNavigator = { flexDirection: "row" as const, alignItems: "center" as const, gap: 9, minHeight: 62, paddingHorizontal: 7, borderRadius: 16, backgroundColor: C.greenSoft };
const dateArrow = { width: 42, height: 42, borderRadius: 14, backgroundColor: C.surface, alignItems: "center" as const, justifyContent: "center" as const };
const dateHeading = { color: C.greenDark, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const, textTransform: "capitalize" as const };
const dateHint = { color: C.muted, fontFamily: SANS, fontSize: 10 };
const modeButton = { flex: 1, minHeight: 38, alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 1, borderColor: C.line, borderRadius: 13, backgroundColor: C.surface, paddingHorizontal: 4 };
const modeButtonText = { color: C.muted, fontFamily: SANS, fontSize: 10, fontWeight: "700" as const };
const priorityChip = { minHeight: 34, borderRadius: 18, paddingHorizontal: 11, justifyContent: "center" as const, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line };
const priorityActive = { backgroundColor: C.greenSoft, borderColor: C.green };
const priorityLabel = { color: C.muted, fontFamily: SANS, fontSize: 11, fontWeight: "600" as const };
const habitCard = { backgroundColor: C.surface, borderRadius: 19, borderWidth: 1, borderColor: C.line, padding: 14, gap: 12 };
const checkButton = { width: 42, height: 42, borderRadius: 15, borderWidth: 1.5, borderColor: C.line, backgroundColor: "#FCFBF8", alignItems: "center" as const, justifyContent: "center" as const };
const habitTitle = { color: C.ink, fontFamily: SANS, fontSize: 15, fontWeight: "700" as const };
const habitDetails = { color: C.muted, fontFamily: SANS, fontSize: 11 };
const formLabel = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const dayChip = { width: 38, height: 38, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: "center" as const, justifyContent: "center" as const };
const dayTextStyle = { color: C.muted, fontFamily: SANS, fontSize: 12, fontWeight: "700" as const };
const hint = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 18 };
const toastStyle = { position: "absolute" as const, bottom: 15, left: 20, right: 20, padding: 13, borderRadius: 15, backgroundColor: C.ink, flexDirection: "row" as const, alignItems: "center" as const, gap: 9 };
const toastText = { flex: 1, color: "#FFFFFF", fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
