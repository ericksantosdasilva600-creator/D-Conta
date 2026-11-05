import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, Card, ChoiceChips, EmptyState, Field, Header, IconButton, Page, PrimaryButton, SectionTitle, Tag } from "@/components/app-ui";
import { DatePickerField } from "@/components/DatePickerField";
import { useAppData } from "@/lib/app-data";
import { C, SANS } from "@/lib/design";
import { createId, localDateKey } from "@/lib/format";
import { describeReminder, eventsBetween, isTime, nextOccurrences, REMINDER_TEMPLATES, type NotificationPrefs, type Reminder, type ReminderRepeat } from "@/lib/reminders";
import { notificationsSupported, showSystemNotification } from "@/lib/web-effects";
import { getNotificationPermission, refreshLocalNotifications, requestNotificationPermission } from "@/lib/local-notifications";

const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const REPEATS: { id: ReminderRepeat; label: string }[] = [
  { id: "once", label: "Uma vez" },
  { id: "minutes", label: "A cada X minutos" },
  { id: "hours", label: "A cada X horas" },
  { id: "daily", label: "Todo dia" },
  { id: "weekly", label: "Dias da semana" },
  { id: "monthly", label: "Todo mês" },
  { id: "days", label: "A cada X dias" },
];

const fmtWhen = (d: Date) => {
  const today = localDateKey();
  const key = localDateKey(d);
  const tomorrow = localDateKey(new Date(Date.now() + 86400000));
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (key === today) return `Hoje, ${time}`;
  if (key === tomorrow) return `Amanhã, ${time}`;
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).format(d).replace(".", "");
  return `${label}, ${time}`;
};

/** Campo de hora com máscara HH:MM. */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  const setText = setDraft;
  const change = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    const masked = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
    setText(masked);
    if (isTime(masked)) onChange(masked);
  };
  const invalid = text.length === 5 && !isTime(text);
  return (
    <View style={{ gap: 6, flex: 1, minWidth: 110 }}>
      <Text style={labelStyle}>{label}</Text>
      <TextInput value={text} onChangeText={change} onBlur={() => setDraft(null)} placeholder="HH:MM" placeholderTextColor={C.muted} keyboardType="number-pad" accessibilityLabel={label} style={[timeInput, invalid ? { borderColor: C.danger } : null]} maxLength={5} />
    </View>
  );
}

export function RemindersScreen() {
  const { data, updateData } = useAppData();
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<"granted" | "denied" | "default" | "unsupported">(() => Platform.OS === "web" ? (notificationsSupported() ? Notification.permission : "unsupported") : "default");
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };
  const prefs = data.notificationPrefs;
  const setPrefs = (changes: Partial<NotificationPrefs>) => updateData((c) => ({ ...c, notificationPrefs: { ...c.notificationPrefs, ...changes } }));

  useEffect(() => {
    if (Platform.OS !== "web") void getNotificationPermission().then((ok) => setPermission(ok ? "granted" : "default"));
  }, []);

  const upcoming = useMemo(() => { const now = new Date(); return eventsBetween(data, now, new Date(now.getTime() + 7 * 86400000), 20).slice(0, 8); }, [data]);
  const active = permission === "granted" && (Platform.OS !== "web" || data.browserNotifications);

  const enable = async () => {
    if (Platform.OS !== "web") {
      const ok = await requestNotificationPermission();
      setPermission(ok ? "granted" : "denied");
      if (ok) { updateData((c) => ({ ...c, remindersEnabled: true, dueRemindersEnabled: true })); await refreshLocalNotifications(data); showToast("Notificações ativadas."); }
      return;
    }
    if (!notificationsSupported()) { showToast("Este navegador não mostra notificações. Os avisos aparecem dentro do Nyvo."); return; }
    const result = await Notification.requestPermission().catch(() => "denied" as NotificationPermission);
    setPermission(result);
    if (result === "granted") { updateData((c) => ({ ...c, browserNotifications: true })); showToast("Notificações ativadas neste aparelho."); }
    else showToast("O navegador bloqueou. Libere as notificações nas configurações do site e tente de novo.");
  };

  const test = async () => {
    const ok = Platform.OS === "web" ? await showSystemNotification("Nyvo · teste", "As notificações estão funcionando.", "nyvo-test") : false;
    showToast(ok ? "Notificação de teste enviada." : "Aviso de teste: se as notificações do sistema estiverem bloqueadas, você vê só esta mensagem.");
  };

  const save = (r: Reminder) => { updateData((c) => ({ ...c, reminders: [r, ...c.reminders.filter((x) => x.id !== r.id)] })); setOpen(false); showToast("Lembrete salvo."); };
  const remove = (r: Reminder) => { updateData((c) => ({ ...c, reminders: c.reminders.filter((x) => x.id !== r.id) })); setOpen(false); showToast("Lembrete excluído."); };
  const toggle = (r: Reminder, enabled: boolean) => updateData((c) => ({ ...c, reminders: c.reminders.map((x) => x.id === r.id ? { ...x, enabled } : x) }));
  const fromTemplate = (i: number) => { setEditing({ id: "", ...REMINDER_TEMPLATES[i].make(localDateKey()) }); setOpen(true); };
  const dayChips = (selected: number[], onChange: (v: number[]) => void, options: { v: number; l: string }[]) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
      {options.map((o) => { const on = selected.includes(o.v); return <Pressable key={o.v} onPress={() => onChange(on ? selected.filter((x) => x !== o.v) : [...selected, o.v].sort((a, b) => b - a))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[chip, on ? chipOn : null]}><Text style={[chipText, on ? { color: C.greenDark } : null]}>{o.l}</Text></Pressable>; })}
    </View>
  );
  const BEFORE = [{ v: 0, l: "No dia" }, { v: 1, l: "1 dia antes" }, { v: 2, l: "2 dias" }, { v: 3, l: "3 dias" }, { v: 5, l: "5 dias" }, { v: 7, l: "7 dias" }];

  return (
    <Page>
      <Header eyebrow="NYVO · LEMBRETES" title="Lembretes." subtitle="Escolha quando e com que frequência o Nyvo avisa você." right={<IconButton name="arrow-left" label="Voltar" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />} />

      <Card style={{ gap: 10, backgroundColor: active ? C.greenSoft : C.amberSoft, borderColor: "transparent" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MaterialCommunityIcons name={active ? "bell-check-outline" : "bell-off-outline"} size={22} color={active ? C.greenDark : "#80611E"} />
          <Text style={[strong, { flex: 1, color: active ? C.greenDark : "#80611E" }]}>{active ? "Notificações ativadas neste aparelho" : permission === "unsupported" ? "Este navegador não mostra notificações" : "Notificações desativadas"}</Text>
        </View>
        <Text style={[muted, { color: active ? C.greenDark : "#80611E" }]}>{Platform.OS === "web" ? "No site, os avisos tocam enquanto o Nyvo estiver aberto, mesmo em outra aba ou minimizado. Se estiver fechado, os avisos perdidos aparecem quando você abrir. Instale na tela inicial para usar como app. Na versão da Play Store, os avisos tocam mesmo com o app fechado." : "Os avisos tocam mesmo com o app fechado."}</Text>
        {!active && permission !== "unsupported" ? <PrimaryButton title="Ativar notificações" icon="bell-ring-outline" onPress={() => void enable()} /> : null}
        {active ? <PrimaryButton title="Testar agora" tone="light" icon="bell-outline" onPress={() => void test()} /> : null}
      </Card>

      <View style={{ gap: 10 }}>
        <SectionTitle title="Próximos avisos (7 dias)" />
        {upcoming.length ? <Card style={{ gap: 2 }}>{upcoming.map((e) => <View key={e.key} style={listRow}>
          <MaterialCommunityIcons name={e.source === "custom" ? "bell-outline" : "calendar-clock"} size={18} color={e.source === "custom" ? C.green : C.blue} />
          <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={strongSmall}>{e.title}</Text><Text numberOfLines={1} style={muted}>{e.body}</Text></View>
          <Text style={[muted, { fontWeight: "700", color: C.ink }]}>{fmtWhen(e.at)}</Text>
        </View>)}</Card> : <Card><Text style={muted}>Nenhum aviso nos próximos 7 dias. Crie um lembrete abaixo ou cadastre contas fixas, provas e hábitos.</Text></Card>}
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle title="Seus lembretes" action="Novo lembrete" onAction={() => { setEditing(null); setOpen(true); }} />
        <Text style={muted}>Modelos prontos · toque para ajustar e salvar</Text>
        <ChoiceChips values={REMINDER_TEMPLATES.map((t) => t.label)} selected="" onSelect={(v) => fromTemplate(REMINDER_TEMPLATES.findIndex((t) => t.label === v))} horizontal={false} />
        {data.reminders.length ? data.reminders.map((r) => { const next = nextOccurrences(r, 1)[0]; return (
          <Pressable key={r.id} onPress={() => { setEditing(r); setOpen(true); }} accessibilityRole="button" style={[card, !r.enabled ? { opacity: 0.6 } : null]}>
            <View style={[iconBox, { backgroundColor: C.greenSoft }]}><MaterialCommunityIcons name="bell-outline" size={18} color={C.green} /></View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text numberOfLines={1} style={strong}>{r.title}</Text>
              <Text style={muted}>{describeReminder(r)}</Text>
              <Text style={[muted, { color: C.greenDark }]}>{r.enabled ? next ? `Próximo: ${fmtWhen(next)}` : "Sem próximos avisos" : "Pausado"}</Text>
            </View>
            <Switch value={r.enabled} onValueChange={(v) => toggle(r, v)} accessibilityLabel={`Ativar ${r.title}`} trackColor={{ false: "#D8D4C9", true: "#B5DACA" }} thumbColor={r.enabled ? C.green : "#F7F5EF"} />
          </Pressable>); }) : <Card><EmptyState icon="bell-plus-outline" title="Nenhum lembrete personalizado" description="Crie avisos do seu jeito: uma vez numa data, todo dia em vários horários, em dias da semana, todo mês ou a cada X minutos ou horas." action={<PrimaryButton title="Criar lembrete" icon="plus" onPress={() => { setEditing(null); setOpen(true); }} />} /></Card>}
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle title="Avisos automáticos" />
        <Card style={{ gap: 12 }}>
          <ToggleRow title="Contas e despesas a vencer" detail="Contas fixas, despesas pendentes com vencimento." value={data.dueRemindersEnabled} onChange={(v) => updateData((c) => ({ ...c, dueRemindersEnabled: v }))} />
          {data.dueRemindersEnabled ? <>
            {dayChips(prefs.billDaysBefore, (v) => setPrefs({ billDaysBefore: v }), BEFORE)}
            <TimeField label="Horário do aviso" value={prefs.billTime} onChange={(v) => setPrefs({ billTime: v })} />
          </> : null}
          <View style={divider} />
          <ToggleRow title="Tarefas com prazo" detail="Só tarefas com “Lembrar na data” marcado." value={data.taskRemindersEnabled} onChange={(v) => updateData((c) => ({ ...c, taskRemindersEnabled: v }))} />
          {data.taskRemindersEnabled ? <>
            <TimeField label="Horário no dia do prazo" value={prefs.taskTime} onChange={(v) => setPrefs({ taskTime: v })} />
            <ToggleRow title="Avisar também 1 dia antes" value={prefs.taskDayBefore} onChange={(v) => setPrefs({ taskDayBefore: v })} />
          </> : null}
          <View style={divider} />
          <Text style={strong}>Provas, trabalhos e leituras</Text>
          {dayChips(prefs.studyDaysBefore, (v) => setPrefs({ studyDaysBefore: v }), BEFORE)}
          <TimeField label="Horário do aviso" value={prefs.studyTime} onChange={(v) => setPrefs({ studyTime: v })} />
          <View style={divider} />
          <ToggleRow title="Hábitos" detail="Usa o horário e os dias de cada hábito. Não avisa se você já marcou." value={prefs.habitReminders && data.remindersEnabled} onChange={(v) => { setPrefs({ habitReminders: v }); updateData((c) => ({ ...c, remindersEnabled: v || c.remindersEnabled })); }} />
          <View style={divider} />
          <ToggleRow title="Resumo do dia" detail="Quantos hábitos e tarefas você tem para hoje." value={prefs.dailySummary} onChange={(v) => setPrefs({ dailySummary: v })} />
          {prefs.dailySummary ? <TimeField label="Horário do resumo" value={prefs.dailySummaryTime} onChange={(v) => setPrefs({ dailySummaryTime: v })} /> : null}
          <View style={divider} />
          <ToggleRow title="Horário de silêncio" detail="Não avisar neste período (lembretes de “Uma vez” continuam tocando)." value={prefs.quietEnabled} onChange={(v) => setPrefs({ quietEnabled: v })} />
          {prefs.quietEnabled ? <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}><TimeField label="De" value={prefs.quietStart} onChange={(v) => setPrefs({ quietStart: v })} /><TimeField label="Até" value={prefs.quietEnd} onChange={(v) => setPrefs({ quietEnd: v })} /></View> : null}
        </Card>
      </View>

      {open ? <ReminderForm initial={editing} onClose={() => setOpen(false)} onSave={save} onDelete={remove} /> : null}
      {toast ? <View accessibilityRole="alert" style={toastStyle}><MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" /><Text style={{ flex: 1, color: "#FFFFFF", fontFamily: SANS, fontSize: 13, fontWeight: "700" }}>{toast}</Text></View> : null}
    </Page>
  );
}

function ToggleRow({ title, detail, value, onChange }: { title: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ flex: 1, gap: 3 }}><Text style={strong}>{title}</Text>{detail ? <Text style={muted}>{detail}</Text> : null}</View><Switch value={value} onValueChange={onChange} accessibilityLabel={title} trackColor={{ false: "#D8D4C9", true: "#B5DACA" }} thumbColor={value ? C.green : "#F7F5EF"} /></View>;
}

function ReminderForm({ initial, onClose, onSave, onDelete }: { initial: Reminder | null; onClose: () => void; onSave: (r: Reminder) => void; onDelete: (r: Reminder) => void }) {
  const today = localDateKey();
  const [r, setR] = useState<Reminder>(initial ?? { id: "", title: "", message: "", enabled: true, repeat: "daily", date: today, times: ["09:00"], every: 1, weekdays: [], monthDay: Number(today.slice(8, 10)), windowStart: "08:00", windowEnd: "22:00", endDate: "" });
  const [everyText, setEveryText] = useState(String(r.every));
  const [error, setError] = useState("");
  const patch = (c: Partial<Reminder>) => setR((x) => ({ ...x, ...c }));
  const interval = r.repeat === "minutes" || r.repeat === "hours";
  const usesTimes = !interval;
  const preview = useMemo(() => nextOccurrences({ ...r, enabled: true }, 5), [r]);
  const submit = () => {
    if (!r.title.trim()) return setError("Dê um nome ao lembrete, como Beber água.");
    if (usesTimes && !r.times.filter(isTime).length) return setError("Adicione pelo menos um horário.");
    if (r.repeat === "weekly" && !r.weekdays.length) return setError("Escolha pelo menos um dia da semana.");
    if (r.repeat === "once" && !r.date) return setError("Escolha a data.");
    if (interval && r.repeat === "minutes" && r.every < 1) return setError("O intervalo mínimo é 1 minuto.");
    if (!preview.length) return setError("Com essas opções o lembrete não tocaria nenhuma vez. Confira a data e o horário.");
    onSave({ ...r, id: r.id || createId(), title: r.title.trim(), message: r.message.trim(), times: [...new Set(r.times.filter(isTime))].sort() });
  };
  const setTime = (i: number, v: string) => patch({ times: r.times.map((t, j) => j === i ? v : t) });
  const quickEvery = r.repeat === "minutes" ? [1, 5, 10, 15, 30, 45] : r.repeat === "hours" ? [1, 2, 3, 4, 6, 8] : [2, 3, 7, 15];

  return (
    <AppModal visible title={initial?.id ? "Editar lembrete" : "Novo lembrete"} subtitle="Do jeito que você quiser." onClose={onClose} footer={<View style={{ gap: 9 }}><PrimaryButton title="Salvar lembrete" icon="check" onPress={submit} />{initial?.id ? <PrimaryButton title="Excluir lembrete" tone="light" icon="delete-outline" onPress={() => onDelete(initial)} /> : null}</View>}>
      <Field label="Nome" value={r.title} onChangeText={(v) => patch({ title: v })} placeholder="Ex.: Beber água, Remédio, Pagar fatura" />
      <Field label="Mensagem (opcional)" value={r.message} onChangeText={(v) => patch({ message: v })} placeholder="O texto que aparece no aviso" />
      <View style={{ gap: 7 }}><Text style={labelStyle}>Repetir</Text><ChoiceChips values={REPEATS.map((x) => x.label)} selected={REPEATS.find((x) => x.id === r.repeat)?.label ?? ""} onSelect={(v) => { const rep = REPEATS.find((x) => x.label === v)?.id ?? "daily"; const every = rep === "minutes" ? 30 : rep === "days" ? 2 : 1; setEveryText(String(every)); patch({ repeat: rep, every, times: r.times.length ? r.times : ["09:00"] }); }} horizontal={false} /></View>

      {r.repeat === "minutes" || r.repeat === "hours" || r.repeat === "days" ? <View style={{ gap: 7 }}>
        <Field label={r.repeat === "minutes" ? "A cada quantos minutos" : r.repeat === "hours" ? "A cada quantas horas" : "A cada quantos dias"} value={everyText} onChangeText={(v) => { const d = v.replace(/\D/g, "").slice(0, 3); setEveryText(d); if (Number(d) >= 1) patch({ every: Number(d) }); }} keyboardType="number-pad" />
        <ChoiceChips values={quickEvery.map(String)} selected={String(r.every)} onSelect={(v) => { setEveryText(v); patch({ every: Number(v) }); }} />
      </View> : null}

      {interval ? <>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}><TimeField label="Das" value={r.windowStart} onChange={(v) => patch({ windowStart: v })} /><TimeField label="Até" value={r.windowEnd} onChange={(v) => patch({ windowEnd: v })} /></View>
        <View style={{ gap: 7 }}><Text style={labelStyle}>Em quais dias (vazio = todos)</Text><WeekPicker value={r.weekdays} onChange={(v) => patch({ weekdays: v })} /></View>
      </> : null}

      {r.repeat === "weekly" ? <View style={{ gap: 7 }}><Text style={labelStyle}>Dias da semana</Text><WeekPicker value={r.weekdays} onChange={(v) => patch({ weekdays: v })} /><ChoiceChips values={["Seg a sex", "Fim de semana", "Todos"]} selected="" onSelect={(v) => patch({ weekdays: v === "Seg a sex" ? [1, 2, 3, 4, 5] : v === "Fim de semana" ? [0, 6] : [0, 1, 2, 3, 4, 5, 6] })} /></View> : null}
      {r.repeat === "monthly" ? <Field label="Dia do mês (1 a 31)" value={String(r.monthDay)} onChangeText={(v) => { const n = Number(v.replace(/\D/g, "").slice(0, 2)); if (n >= 1 && n <= 31) patch({ monthDay: n }); }} keyboardType="number-pad" /> : null}
      {r.repeat === "once" ? <DatePickerField label="Data" value={r.date} onChange={(v) => patch({ date: v })} placeholder="Toque para escolher" /> : null}

      {usesTimes ? <View style={{ gap: 8 }}>
        <Text style={labelStyle}>{r.repeat === "once" ? "Hora" : "Horários"}</Text>
        {r.times.map((t, i) => <View key={i} style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}><TimeField label={`Horário ${i + 1}`} value={t} onChange={(v) => setTime(i, v)} />{r.times.length > 1 ? <IconButton name="close" label="Remover horário" tone="soft" onPress={() => patch({ times: r.times.filter((_, j) => j !== i) })} /> : null}</View>)}
        {r.repeat !== "once" && r.times.length < 12 ? <Pressable onPress={() => patch({ times: [...r.times, "12:00"] })} accessibilityRole="button"><Text style={link}>+ Adicionar outro horário</Text></Pressable> : null}
      </View> : null}

      {r.repeat !== "once" ? <View style={{ gap: 8 }}>
        <DatePickerField label="Começa em" value={r.date} onChange={(v) => patch({ date: v })} placeholder="Hoje" />
        <DatePickerField label="Termina em (opcional)" value={r.endDate} onChange={(v) => patch({ endDate: v })} placeholder="Sem data final" clearable />
      </View> : null}

      <Card style={{ gap: 6, backgroundColor: C.paper }}>
        <Text style={strongSmall}>{describeReminder({ ...r, times: r.times.filter(isTime) })}</Text>
        <Text style={muted}>{preview.length ? `Próximos: ${preview.map(fmtWhen).join(" · ")}` : "Nenhum aviso com essas opções."}</Text>
        {r.repeat === "minutes" && r.every < 5 ? <Tag label="Avisos muito frequentes" tone="amber" icon="alert-outline" /> : null}
      </Card>
      {error ? <Text accessibilityRole="alert" style={{ color: C.danger, fontFamily: SANS, fontSize: 12 }}>{error}</Text> : null}
    </AppModal>
  );
}

function WeekPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>{WEEK.map((d, i) => { const on = value.includes(i); return <Pressable key={d} onPress={() => onChange(on ? value.filter((x) => x !== i) : [...value, i].sort())} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={d} style={[dayBtn, on ? chipOn : null]}><Text style={[chipText, on ? { color: C.greenDark } : null]}>{d}</Text></Pressable>; })}</View>;
}

const labelStyle = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const strong = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const strongSmall = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const muted = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 };
const link = { color: C.green, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const timeInput = { minHeight: 46, borderWidth: 1, borderColor: C.line, borderRadius: 13, backgroundColor: C.surface, paddingHorizontal: 13, color: C.ink, fontFamily: SANS, fontSize: 16, fontVariant: ["tabular-nums" as const] };
const listRow = { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line };
const card = { flexDirection: "row" as const, alignItems: "center" as const, gap: 11, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 12 };
const iconBox = { width: 36, height: 36, borderRadius: 12, alignItems: "center" as const, justifyContent: "center" as const };
const chip = { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface };
const chipOn = { borderColor: C.green, backgroundColor: C.greenSoft };
const chipText = { color: C.muted, fontFamily: SANS, fontSize: 12, fontWeight: "700" as const };
const dayBtn = { width: 46, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface, alignItems: "center" as const, justifyContent: "center" as const };
const divider = { height: 1, backgroundColor: C.line };
const toastStyle = { position: "absolute" as const, bottom: 16, left: 20, right: 20, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 15, backgroundColor: C.ink, flexDirection: "row" as const, alignItems: "center" as const, gap: 9 };
