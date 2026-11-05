import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, Card, Header, IconButton, OfflineBanner, Page, PrimaryButton, SectionTitle, StorageBanner } from "@/components/app-ui";
import { useAppData } from "@/lib/app-data";
import { PhraseCapture, QuickAddModal } from "@/components/QuickAdd";
import { billStatus, cardInvoices, currentInvoiceMonth, payBill } from "@/lib/finance-extra";
import { C, SANS } from "@/lib/design";
import { daysUntil, displayDate, localDateKey, money } from "@/lib/format";

type CaptureTarget = "notes" | "finance" | "habit" | "health" | "tasks";

export function DashboardScreen() {
  const { data, loading, updateData } = useAppData();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2600); };
  const today = localDateKey();
  const month = today.slice(0, 7);
  const personalThisMonth = useMemo(() => data.transactions.filter((item) => item.scope === "personal" && item.date.startsWith(month)), [data.transactions, month]);
  const monthlyBalance = personalThisMonth.reduce((sum, item) => sum + (item.kind === "income" ? item.amount : -item.amount), 0);
  const weekday = new Date(`${today}T12:00:00`).getDay();
  const plannedHabits = data.habits.filter((habit) => !habit.archived && habit.weekdays.includes(weekday));
  const completed = data.completedByDate[today] ?? [];
  const openTasks = data.tasks.filter((task) => task.status !== "done");
  const tasksDue = openTasks.filter((task) => task.dueDate && task.dueDate <= today).length;
  const rawDateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const dueItems = useMemo(() => {
    const items: { key: string; title: string; detail: string; days: number; amount: number; onPay?: () => void }[] = [];
    data.recurringBills.filter((b) => b.active).forEach((bill) => {
      const st = billStatus(bill);
      if (!st.paid && st.days <= 5) items.push({ key: `bill-${bill.id}`, title: bill.name, detail: "Conta fixa", days: st.days, amount: bill.amount, onPay: () => { updateData((c) => payBill(c, bill)); showToast(`${bill.name} paga.`); } });
    });
    data.transactions.filter((t) => t.kind === "expense" && !t.paid && t.dueDate).forEach((t) => {
      const d = daysUntil(t.dueDate);
      if (d !== null && d <= 5) items.push({ key: `tx-${t.id}`, title: t.merchant, detail: "Despesa pendente", days: d, amount: t.amount, onPay: () => { updateData((c) => ({ ...c, transactions: c.transactions.map((x) => x.id === t.id ? { ...x, paid: true } : x) })); showToast("Despesa marcada como paga."); } });
    });
    const invoice = cardInvoices(data.transactions, data.creditCard).find((i) => i.month === currentInvoiceMonth(data.creditCard));
    if (invoice && invoice.total > 0) { const d = daysUntil(invoice.dueDate); if (d !== null && d >= 0 && d <= 7) items.push({ key: "card", title: "Fatura do cartão", detail: `Vence ${displayDate(invoice.dueDate)}`, days: d, amount: invoice.total }); }
    return items.sort((a, b) => a.days - b.days);
  }, [data.recurringBills, data.transactions, data.creditCard, updateData]);
  const tasksToday = openTasks.filter((task) => task.dueDate && task.dueDate <= today).slice(0, 5);
  const studySoon = data.studyItems.filter((item) => !item.done && item.dueDate && (daysUntil(item.dueDate) ?? 99) <= 3).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
  const toggleHabit = (id: string) => updateData((c) => { const list = c.completedByDate[today] ?? []; return { ...c, completedByDate: { ...c.completedByDate, [today]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } }; });
  const completeTask = (id: string) => { updateData((c) => ({ ...c, tasks: c.tasks.map((t) => t.id === id ? { ...t, status: "done", updatedAt: new Date().toISOString() } : t) })); showToast("Tarefa concluída."); };
  const dateLabel = rawDateLabel.charAt(0).toLocaleUpperCase("pt-BR") + rawDateLabel.slice(1);

  const openCapture = (target: CaptureTarget) => {
    setCaptureOpen(false);
    if (target === "notes") router.push({ pathname: "/notes", params: { create: "1" } });
    if (target === "finance") router.push({ pathname: "/finance", params: { create: "1" } });
    if (target === "habit") router.push({ pathname: "/habits", params: { create: "habit" } });
    if (target === "health") router.push({ pathname: "/habits", params: { create: "health" } });
    if (target === "tasks") router.push({ pathname: "/tasks", params: { create: "1" } });
  };

  return (
    <Page>
      <Header eyebrow={`NYVO · ${dateLabel.toUpperCase()}`} title="Hoje." subtitle="O que importa agora, numa tela só." right={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><IconButton name="bell-outline" label="Lembretes" onPress={() => router.push("/reminders")} /><IconButton name="cog-outline" label="Abrir configurações" onPress={() => router.push("/settings")} /></View>} />
      <OfflineBanner />
      <StorageBanner />
      <PhraseCapture onSaved={showToast} />
      <View style={{ flexDirection: "row", gap: 9 }}>
        <View style={{ flex: 1 }}><PrimaryButton title="Registro rápido" onPress={() => setQuickOpen(true)} icon="cash-plus" disabled={loading} /></View>
        <View style={{ flex: 1 }}><PrimaryButton title="Adicionar" tone="light" onPress={() => setCaptureOpen(true)} icon="plus" disabled={loading} /></View>
      </View>
      <Pressable onPress={() => router.push("/finance")} accessibilityRole="button" style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        <Card style={{ backgroundColor: C.greenDark, borderColor: C.greenDark, padding: 17, gap: 6 }}>
          <Text style={heroEyebrow}>SALDO DO MÊS</Text>
          <Text style={heroValue}>{money(monthlyBalance, data.currency)}</Text>
          <Text style={heroSub}>{dueItems.length ? `${dueItems.length} ${dueItems.length === 1 ? "conta vence" : "contas vencem"} nos próximos dias · ${money(dueItems.reduce((sum, item) => sum + item.amount, 0), data.currency)}` : "Nenhuma conta vencendo nos próximos dias."}</Text>
        </Card>
      </Pressable>
      {dueItems.length ? <View style={{ gap: 9 }}>
        <SectionTitle title="Vence logo" action="Contas fixas" onAction={() => router.push("/finance")} />
        {dueItems.map((item) => <View key={item.key} style={todayRow}>
          <View style={[todayIcon, { backgroundColor: item.days < 0 ? C.dangerSoft : C.amberSoft }]}><MaterialCommunityIcons name="calendar-alert" size={18} color={item.days < 0 ? C.danger : "#80611E"} /></View>
          <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={pillarTitle}>{item.title}</Text><Text style={pillarDetail}>{money(item.amount, data.currency)} · {item.days < 0 ? `atrasada há ${Math.abs(item.days)} d` : item.days === 0 ? "vence hoje" : item.days === 1 ? "vence amanhã" : `vence em ${item.days} d`} · {item.detail}</Text></View>
          {item.onPay ? <Pressable onPress={item.onPay} accessibilityRole="button" accessibilityLabel={`Marcar ${item.title} como paga`} style={smallBtn}><Text style={smallBtnText}>Pagar</Text></Pressable> : null}
        </View>)}
      </View> : null}
      <View style={{ gap: 9 }}>
        <SectionTitle title="Hábitos de hoje" action="Ver todos" onAction={() => router.push("/habits")} />
        {plannedHabits.length ? plannedHabits.map((habit) => { const done = completed.includes(habit.id); return <Pressable key={habit.id} onPress={() => toggleHabit(habit.id)} accessibilityRole="checkbox" accessibilityState={{ checked: done }} style={todayRow}>
          <MaterialCommunityIcons name={done ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} size={24} color={done ? C.green : C.muted} />
          <Text style={[pillarTitle, { flex: 1, textDecorationLine: done ? "line-through" : "none", color: done ? C.muted : C.ink }]}>{habit.name}</Text>
          <Text style={pillarDetail}>{habit.reminderTime}</Text>
        </Pressable>; }) : <Card><Text style={pillarDetail}>Nenhum hábito para hoje. Crie um em Hábitos: água, leitura, academia…</Text></Card>}
      </View>
      {tasksToday.length || studySoon.length ? <View style={{ gap: 9 }}>
        <SectionTitle title="Para fazer" action="Tarefas" onAction={() => router.push("/tasks")} />
        {tasksToday.map((task) => <View key={task.id} style={todayRow}>
          <Pressable onPress={() => completeTask(task.id)} accessibilityRole="button" accessibilityLabel={`Concluir ${task.title}`}><MaterialCommunityIcons name="checkbox-blank-outline" size={23} color={C.green} /></Pressable>
          <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={pillarTitle}>{task.title}</Text><Text style={pillarDetail}>{task.dueDate < today ? `Atrasada desde ${displayDate(task.dueDate)}` : "Prazo hoje"}</Text></View>
        </View>)}
        {studySoon.map((item) => <View key={item.id} style={todayRow}>
          <View style={[todayIcon, { backgroundColor: C.blueSoft }]}><MaterialCommunityIcons name={item.kind === "exam" ? "school-outline" : "book-open-variant"} size={18} color={C.blue} /></View>
          <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={pillarTitle}>{item.title}</Text><Text style={pillarDetail}>{item.kind === "exam" ? "Prova" : item.kind === "reading" ? "Leitura" : "Trabalho"} · {displayDate(item.dueDate)}</Text></View>
        </View>)}
      </View> : null}
      <View style={{ gap: 12 }}>
        <SectionTitle title="Seus pilares" />
        <View style={{ gap: 9 }}>
          <PillarCard icon="note-text-outline" title="Anotações" metric={loading ? "Carregando" : `${data.notes.length} ${data.notes.length === 1 ? "nota" : "notas"}`} detail={loading ? "Preparando seus dados locais" : "Ideias salvas e pesquisáveis"} onPress={() => router.push("/notes")} />
          <PillarCard icon="wallet-outline" title="Finanças" metric={loading ? "Carregando" : money(monthlyBalance, data.currency)} detail={loading ? "Preparando seus dados locais" : "Saldo deste mês · contas fixas, cartão e metas"} onPress={() => router.push("/finance")} />
          <PillarCard icon="heart-pulse" title="Hábitos & Saúde" metric={loading ? "Carregando" : plannedHabits.length ? `${completed.filter((id) => plannedHabits.some((habit) => habit.id === id)).length}/${plannedHabits.length} rotinas` : `${data.healthLogs.filter((log) => log.date === today).length} registros de saúde`} detail={loading ? "Preparando seus dados locais" : "Check-ins, água e atividades do dia"} onPress={() => router.push("/habits")} />
          <PillarCard icon="checkbox-marked-circle-outline" title="Tarefas" metric={loading ? "Carregando" : tasksDue ? `${tasksDue} para hoje ou atrasadas` : `${openTasks.length} em aberto`} detail={loading ? "Preparando seus dados locais" : "Prioridades, próximos prazos e backlog"} onPress={() => router.push("/tasks")} />
        </View>
      </View>
      <AppModal visible={captureOpen} title="O que você quer adicionar?" subtitle="Escolha um tipo de registro. Você pode completar os detalhes no formulário seguinte." onClose={() => setCaptureOpen(false)}>
        <CaptureOption icon="note-plus-outline" title="Nota rápida" detail="Uma ideia, anotação ou referência" onPress={() => openCapture("notes")} />
        <CaptureOption icon="cash-plus" title="Movimento financeiro" detail="Receita ou despesa pessoal ou de viagem" onPress={() => openCapture("finance")} />
        <CaptureOption icon="checkbox-marked-circle-outline" title="Novo hábito" detail="Crie uma rotina semanal e define um lembrete" onPress={() => openCapture("habit")} />
        <CaptureOption icon="heart-plus-outline" title="Registro de saúde" detail="Água, atividade física, leitura ou estudo" onPress={() => openCapture("health")} />
        <CaptureOption icon="playlist-plus" title="Tarefa" detail="Próximo passo, prioridade ou prazo" onPress={() => openCapture("tasks")} />
      </AppModal>
      <QuickAddModal visible={quickOpen} onClose={() => setQuickOpen(false)} onSaved={showToast} />
      {toast ? <View accessibilityRole="alert" style={toastStyle}><MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" /><Text style={{ flex: 1, color: "#FFFFFF", fontFamily: SANS, fontSize: 13, fontWeight: "700" }}>{toast}</Text></View> : null}
    </Page>
  );
}

function PillarCard({ icon, title, metric, detail, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; title: string; metric: string; detail: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${metric}. ${detail}`} style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}>
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
      <View style={pillarIcon}><MaterialCommunityIcons name={icon} size={21} color={C.greenDark} /></View>
      <View style={{ flex: 1, gap: 3 }}><Text style={pillarTitle}>{title}</Text><Text style={pillarMetric}>{metric}</Text><Text style={pillarDetail}>{detail}</Text></View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
    </Card>
  </Pressable>;
}

function CaptureOption({ icon, title, detail, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; title: string; detail: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [captureRow, { opacity: pressed ? 0.78 : 1 }]}>
    <View style={pillarIcon}><MaterialCommunityIcons name={icon} size={21} color={C.greenDark} /></View>
    <View style={{ flex: 1, gap: 3 }}><Text style={pillarTitle}>{title}</Text><Text style={pillarDetail}>{detail}</Text></View>
    <MaterialCommunityIcons name="chevron-right" size={19} color={C.muted} />
  </Pressable>;
}

const heroEyebrow = { color: "#B7D9C7", fontFamily: SANS, fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.2 };
const heroSub = { color: "#D7E9DE", fontFamily: SANS, fontSize: 13, lineHeight: 19 };
const pillarIcon = { width: 43, height: 43, borderRadius: 15, backgroundColor: C.greenSoft, alignItems: "center" as const, justifyContent: "center" as const };
const pillarTitle = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "800" as const };
const pillarMetric = { color: C.greenDark, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const pillarDetail = { color: C.muted, fontFamily: SANS, fontSize: 11, lineHeight: 16 };
const captureRow = { minHeight: 68, flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: C.line };
const heroValue = { color: "#FFFFFF", fontFamily: SANS, fontSize: 30, fontWeight: "700" as const, letterSpacing: -0.6 };
const todayRow = { flexDirection: "row" as const, alignItems: "center" as const, gap: 11, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 11 };
const todayIcon = { width: 36, height: 36, borderRadius: 12, alignItems: "center" as const, justifyContent: "center" as const };
const smallBtn = { backgroundColor: C.green, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8 };
const smallBtnText = { color: "#FFFFFF", fontFamily: SANS, fontSize: 12, fontWeight: "800" as const };
const toastStyle = { position: "absolute" as const, bottom: 16, left: 20, right: 20, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 15, backgroundColor: C.ink, flexDirection: "row" as const, alignItems: "center" as const, gap: 9 };
