import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, Card, Header, IconButton, OfflineBanner, Page, PrimaryButton, SectionTitle, StorageBanner } from "@/components/app-ui";
import { useAppData } from "@/lib/app-data";
import { PhraseCapture, QuickAddModal } from "@/components/QuickAdd";
import { greeting, tipFor } from "@/lib/brand";
import { useOptionalSupabaseSync } from "@/lib/supabase-sync";
import { hasDemoData, removeDemoData } from "@/lib/demo-data";
import { billStatus, cardInvoices, currentInvoiceMonth, payBill } from "@/lib/finance-extra";
import { C, SANS } from "@/lib/design";
import { daysUntil, displayDate, localDateKey, money } from "@/lib/format";
import { toast } from "@/lib/toast";
import { AnimatedProgress, Pop } from "@/components/motion";

const readFlag = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const writeFlag = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* sem armazenamento */ } };
function tipAction(tip: string): { label: string; path: "/tasks" | "/finance" | "/habits" | "/notes" } | null {
  const t = tip.toLowerCase();
  if (/hábito|habito|água|agua|treino|academia|sono|leitura|páginas|paginas/.test(t)) return { label: "Abrir Hábitos", path: "/habits" };
  if (/prova|estud|trabalho/.test(t)) return { label: "Abrir Estudos", path: "/tasks" };
  if (/gasto|dinheiro|conta|dívida|divida|reserva|cartão|cartao|meta|salário|salario/.test(t)) return { label: "Abrir Finanças", path: "/finance" };
  if (/hábito|habito|água|agua|treino|academia|sono|saúde|saude/.test(t)) return { label: "Abrir Hábitos", path: "/habits" };
  if (/ideia|nota|anot/.test(t)) return { label: "Abrir Anotações", path: "/notes" };
  return null;
}
function habitStreak(completedByDate: Record<string, string[]>, today: string) {
  let streak = 0;
  const d = new Date(`${today}T12:00:00`);
  if (!(completedByDate[today] ?? []).length) d.setDate(d.getDate() - 1);
  for (;;) {
    const key = localDateKey(d);
    if (!(completedByDate[key] ?? []).length) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

type CaptureTarget = "notes" | "finance" | "habit" | "health" | "tasks";

export function DashboardScreen() {
  const { data, loading, updateData } = useAppData();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const showToast = (message: string) => toast(message);
  const [firstStepsHidden, setFirstStepsHidden] = useState(() => readFlag("nyvo.first-steps") === "hidden");
  const cloud = useOptionalSupabaseSync();
  // Depois do primeiro "Agora não" o aviso não volta mais aqui; a conta continua em Configurações.
  const [accountNudgeHidden, setAccountNudgeHidden] = useState(() => readFlag("nyvo.account-nudge") !== null);
  const recordCount = data.transactions.length + data.tasks.length + data.notes.length + data.healthLogs.length + Object.values(data.completedByDate).reduce((n, l) => n + l.length, 0);
  const showAccountNudge = !accountNudgeHidden && cloud !== null && !cloud.session && cloud.status === "signed_out" && recordCount >= 3;
  const today = localDateKey();
  const month = today.slice(0, 7);
  const personalThisMonth = data.transactions.filter((item) => item.scope === "personal" && item.date.startsWith(month));
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
      if (!st.paid && st.days <= 5) items.push({ key: `bill-${bill.id}`, title: bill.name, detail: "Conta fixa", days: st.days, amount: bill.amount, onPay: () => { updateData((c) => payBill(c, bill)); toast(`${bill.name} paga.`); } });
    });
    data.transactions.filter((t) => t.kind === "expense" && !t.paid && t.dueDate).forEach((t) => {
      const d = daysUntil(t.dueDate);
      if (d !== null && d <= 5) items.push({ key: `tx-${t.id}`, title: t.merchant, detail: "Despesa pendente", days: d, amount: t.amount, onPay: () => { updateData((c) => ({ ...c, transactions: c.transactions.map((x) => x.id === t.id ? { ...x, paid: true } : x) })); toast("Despesa marcada como paga."); } });
    });
    const invoice = cardInvoices(data.transactions, data.creditCard).find((i) => i.month === currentInvoiceMonth(data.creditCard));
    if (invoice && invoice.total > 0) { const d = daysUntil(invoice.dueDate); if (d !== null && d >= 0 && d <= 7) items.push({ key: "card", title: "Fatura do cartão", detail: `Vence ${displayDate(invoice.dueDate)}`, days: d, amount: invoice.total }); }
    return items.sort((a, b) => a.days - b.days);
  }, [data.recurringBills, data.transactions, data.creditCard, updateData]);
  const tasksToday = openTasks.filter((task) => task.dueDate && task.dueDate <= today).slice(0, 5);
  const studySoon = data.studyItems.filter((item) => !item.done && item.dueDate && (daysUntil(item.dueDate) ?? 99) <= 3).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
  const doneToday = plannedHabits.filter((h) => completed.includes(h.id)).length;
  const streak = habitStreak(data.completedByDate, today);
  const toggleHabit = (id: string) => {
    const wasDone = completed.includes(id);
    updateData((c) => { const list = c.completedByDate[today] ?? []; return { ...c, completedByDate: { ...c.completedByDate, [today]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } }; });
    if (!wasDone) showToast(doneToday + 1 === plannedHabits.length ? "Todos os hábitos de hoje feitos! 🎉" : `Hábito feito · ${doneToday + 1}/${plannedHabits.length} hoje`);
  };
  const hasMoneyThisMonth = personalThisMonth.length > 0;
  const firstSteps = [
    { key: "money", label: "Registrar o primeiro gasto ou receita", done: data.transactions.length > 0, onPress: () => setQuickOpen(true) },
    { key: "habit", label: "Marcar um hábito como feito", done: Object.values(data.completedByDate).some((l) => l.length > 0), onPress: () => router.push(plannedHabits.length ? "/habits" : { pathname: "/habits", params: { create: "habit" } }) },
    { key: "task", label: "Criar uma tarefa", done: data.tasks.length > 0, onPress: () => router.push({ pathname: "/tasks", params: { create: "1" } }) },
    { key: "reminder", label: "Configurar um lembrete", done: data.reminders.length > 0 || data.recurringBills.length > 0, onPress: () => router.push("/reminders") },
  ];
  const firstStepsDone = firstSteps.filter((x) => x.done).length;
  const showFirstSteps = !firstStepsHidden && firstStepsDone < firstSteps.length && !hasDemoData(data);
  const tip = tipFor(data.profile);
  const tipGo = tipAction(tip);
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
      <Header eyebrow={`DÁ CONTA · ${dateLabel.toUpperCase()}`} title="Hoje." subtitle={data.profile.name ? `${greeting(data.profile.name)} O que importa agora, numa tela só.` : "O que importa agora, numa tela só."} right={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><IconButton name="bell-outline" label="Lembretes" onPress={() => router.push("/reminders")} /><IconButton name="cog-outline" label="Abrir configurações" onPress={() => router.push("/settings")} /></View>} />
      <OfflineBanner />
      <StorageBanner />
      {hasDemoData(data) ? <Pressable onPress={() => { updateData((c) => removeDemoData(c)); showToast("Dados de exemplo removidos."); }} accessibilityRole="button" style={demoBanner}><MaterialCommunityIcons name="flask-outline" size={18} color="#80611E" /><Text style={{ flex: 1, color: "#80611E", fontFamily: SANS, fontSize: 12, fontWeight: "700" }}>Você está vendo dados de exemplo. Toque para remover e começar com os seus.</Text></Pressable> : null}
      {showAccountNudge ? <View style={nudge}>
        <MaterialCommunityIcons name="cloud-upload-outline" size={20} color={C.blueDark} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" }}>Não perca seus dados</Text>
          <Text style={{ color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 }}>Crie uma conta grátis e seus registros ficam salvos mesmo se trocar de celular ou limpar o navegador.</Text>
          <View style={{ flexDirection: "row", gap: 14 }}>
            <Pressable onPress={() => router.push("/settings")} accessibilityRole="button"><Text style={{ color: C.blueDark, fontFamily: SANS, fontSize: 13, fontWeight: "800" }}>Criar conta</Text></Pressable>
            <Pressable onPress={() => { writeFlag("nyvo.account-nudge", "dismissed"); setAccountNudgeHidden(true); showToast("Tudo bem. Dá para criar a conta quando quiser em Configurações."); }} accessibilityRole="button"><Text style={{ color: C.muted, fontFamily: SANS, fontSize: 13, fontWeight: "700" }}>Agora não</Text></Pressable>
          </View>
        </View>
      </View> : null}
      {showFirstSteps ? <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MaterialCommunityIcons name="flag-checkered" size={20} color={C.green} />
          <View style={{ flex: 1 }}><Text style={pillarTitle}>Primeiros passos</Text><Text style={pillarDetail}>{firstStepsDone} de {firstSteps.length} feitos · leva 2 minutos</Text></View>
          <Pressable onPress={() => { writeFlag("nyvo.first-steps", "hidden"); setFirstStepsHidden(true); }} accessibilityRole="button" accessibilityLabel="Esconder primeiros passos" hitSlop={10}><MaterialCommunityIcons name="close" size={18} color={C.muted} /></Pressable>
        </View>
        <ProgressBar value={firstStepsDone} max={firstSteps.length} />
        {firstSteps.map((item) => <Pressable key={item.key} disabled={item.done} onPress={item.onPress} accessibilityRole="button" accessibilityState={{ checked: item.done, disabled: item.done }} style={({ pressed }) => [stepRow, { opacity: pressed ? 0.75 : 1 }]}>
          <MaterialCommunityIcons name={item.done ? "check-circle" : "circle-outline"} size={21} color={item.done ? C.green : C.muted} />
          <Text style={[pillarTitle, { flex: 1, fontWeight: "600", color: item.done ? C.muted : C.ink, textDecorationLine: item.done ? "line-through" : "none" }]}>{item.label}</Text>
          {item.done ? null : <MaterialCommunityIcons name="chevron-right" size={18} color={C.muted} />}
        </Pressable>)}
      </Card> : null}
      <PhraseCapture onSaved={showToast} />
      <View style={{ flexDirection: "row", gap: 9 }}>
        <View style={{ flex: 1 }}><PrimaryButton title="Registro rápido" onPress={() => setQuickOpen(true)} icon="cash-plus" disabled={loading} /></View>
        <View style={{ flex: 1 }}><PrimaryButton title="Adicionar" tone="light" onPress={() => setCaptureOpen(true)} icon="plus" disabled={loading} /></View>
      </View>
      <Pressable onPress={() => router.push("/finance")} accessibilityRole="button" style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        <Card style={{ backgroundColor: C.greenDark, borderColor: C.greenDark, padding: 17, gap: 6 }}>
          <Text style={heroEyebrow}>SALDO DO MÊS</Text>
          {hasMoneyThisMonth ? <Text style={heroValue}>{money(monthlyBalance, data.currency)}</Text>
            : <Text style={[heroValue, { fontSize: 20, lineHeight: 26 }]}>Ainda não há movimentos este mês</Text>}
          <Text style={heroSub}>{dueItems.length ? `${dueItems.length} ${dueItems.length === 1 ? "conta vence" : "contas vencem"} nos próximos dias · ${money(dueItems.reduce((sum, item) => sum + item.amount, 0), data.currency)}` : hasMoneyThisMonth ? "Nenhuma conta vencendo nos próximos dias." : "Registre um gasto ou o seu salário e o saldo aparece aqui. Toque para abrir Finanças."}</Text>
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
        {plannedHabits.length ? <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={[pillarDetail, { fontSize: 12, color: C.ink, fontWeight: "700" }]}>{doneToday}/{plannedHabits.length} feitos hoje{doneToday === plannedHabits.length ? " · dia completo!" : ""}</Text>
            {streak > 0 ? <View style={streakPill}><MaterialCommunityIcons name="fire" size={14} color="#B5541B" /><Text style={streakText}>{streak} {streak === 1 ? "dia" : "dias"} seguidos</Text></View> : null}
          </View>
          <ProgressBar value={doneToday} max={plannedHabits.length} />
        </View> : null}
        {plannedHabits.length ? plannedHabits.map((habit) => { const done = completed.includes(habit.id); return <Pressable key={habit.id} onPress={() => toggleHabit(habit.id)} accessibilityRole="checkbox" accessibilityState={{ checked: done }} style={todayRow}>
          <Pop active={done}><MaterialCommunityIcons name={done ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} size={24} color={done ? C.green : C.muted} /></Pop>
          <Text style={[pillarTitle, { flex: 1, textDecorationLine: done ? "line-through" : "none", color: done ? C.muted : C.ink }]}>{habit.name}</Text>
          <Text style={pillarDetail}>{habit.reminderTime}</Text>
        </Pressable>; }) : <Card style={{ gap: 10, alignItems: "flex-start" }}><Text style={pillarDetail}>Nenhum hábito para hoje. Comece com um simples, como beber água ou ler 10 páginas.</Text><PrimaryButton title="Criar meu primeiro hábito" tone="light" icon="plus" onPress={() => openCapture("habit")} /></Card>}
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
      <Card style={{ flexDirection: "row", gap: 11, alignItems: "flex-start", backgroundColor: C.blueSoft, borderColor: "transparent" }}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={C.blueDark} />
        <View style={{ flex: 1, gap: 4 }}><Text style={{ color: C.blueDark, fontFamily: SANS, fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>DICA PARA VOCÊ</Text><Text style={{ color: C.ink, fontFamily: SANS, fontSize: 13, lineHeight: 19 }}>{tip}</Text><View style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>{tipGo ? <Pressable onPress={() => router.push(tipGo.path)} accessibilityRole="button"><Text style={{ color: C.blueDark, fontFamily: SANS, fontSize: 12, fontWeight: "800" }}>{tipGo.label} →</Text></Pressable> : null}{!data.profile.occupation && !data.profile.interests.length ? <Pressable onPress={() => router.push("/support")} accessibilityRole="button"><Text style={{ color: C.blueDark, fontFamily: SANS, fontSize: 12, fontWeight: "700" }}>Personalizar dicas</Text></Pressable> : null}</View></View>
      </Card>
      <Pressable onPress={() => router.push("/insights")} accessibilityRole="button" style={({ pressed }) => [todayRow, { opacity: pressed ? 0.8 : 1 }]}>
        <View style={[todayIcon, { backgroundColor: C.greenSoft }]}><MaterialCommunityIcons name="chart-box-outline" size={19} color={C.green} /></View>
        <View style={{ flex: 1 }}><Text style={pillarTitle}>Gráficos</Text><Text style={pillarDetail}>Dinheiro, hábitos, água e tarefas em gráficos</Text></View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
      </Pressable>
      <View style={{ gap: 12 }}>
        <SectionTitle title="Seus pilares" />
        <View style={{ gap: 9 }}>
          <PillarCard icon="note-text-outline" title="Anotações" metric={loading ? "Carregando" : `${data.notes.length} ${data.notes.length === 1 ? "nota" : "notas"}`} detail={loading ? "Preparando seus dados locais" : "Ideias salvas e pesquisáveis"} onPress={() => router.push("/notes")} />
          <PillarCard icon="wallet-outline" title="Finanças" metric={loading ? "Carregando" : hasMoneyThisMonth ? money(monthlyBalance, data.currency) : "Sem movimentos este mês"} detail={loading ? "Preparando seus dados locais" : "Saldo deste mês · contas fixas, cartão e metas"} onPress={() => router.push("/finance")} />
          <PillarCard icon="heart-pulse" title="Hábitos & Saúde" metric={loading ? "Carregando" : plannedHabits.length ? `${completed.filter((id) => plannedHabits.some((habit) => habit.id === id)).length}/${plannedHabits.length} rotinas` : `${data.healthLogs.filter((log) => log.date === today).length} registros de saúde`} detail={loading ? "Preparando seus dados locais" : "Check-ins, água e atividades do dia"} onPress={() => router.push("/habits")} />
          <PillarCard icon="checkbox-marked-circle-outline" title="Tarefas" metric={loading ? "Carregando" : tasksDue ? `${tasksDue} para hoje ou atrasadas` : `${openTasks.length} em aberto`} detail={loading ? "Preparando seus dados locais" : "Prioridades, próximos prazos e backlog"} onPress={() => router.push("/tasks")} />
        </View>
      </View>
      <AppModal visible={captureOpen} title="O que você quer adicionar?" subtitle="Escolha um tipo de registro. Você pode completar os detalhes no formulário seguinte." onClose={() => setCaptureOpen(false)}>
        <CaptureOption icon="note-plus-outline" title="Nota rápida" detail="Uma ideia, anotação ou referência" onPress={() => openCapture("notes")} />
        <CaptureOption icon="cash-plus" title="Movimento financeiro" detail="Receita ou despesa pessoal ou de viagem" onPress={() => openCapture("finance")} />
        <CaptureOption icon="checkbox-marked-circle-outline" title="Novo hábito" detail="Crie uma rotina semanal e defina um lembrete" onPress={() => openCapture("habit")} />
        <CaptureOption icon="heart-plus-outline" title="Registro de saúde" detail="Água, atividade física, leitura ou estudo" onPress={() => openCapture("health")} />
        <CaptureOption icon="playlist-plus" title="Tarefa" detail="Próximo passo, prioridade ou prazo" onPress={() => openCapture("tasks")} />
      </AppModal>
      <QuickAddModal visible={quickOpen} onClose={() => setQuickOpen(false)} onSaved={showToast} />
    </Page>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  return <AnimatedProgress value={value} max={max} color={C.green} track={C.line} />;
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

const heroEyebrow = { color: "rgba(255,255,255,0.78)", fontFamily: SANS, fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.2 };
const heroSub = { color: "rgba(255,255,255,0.86)", fontFamily: SANS, fontSize: 13, lineHeight: 19 };
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
const demoBanner = { flexDirection: "row" as const, alignItems: "center" as const, gap: 9, backgroundColor: C.amberSoft, borderRadius: 14, padding: 12 };
const nudge = { flexDirection: "row" as const, gap: 11, alignItems: "flex-start" as const, backgroundColor: C.blueSoft, borderRadius: 16, padding: 13 };
const stepRow = { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingVertical: 7 };
const streakPill = { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: "#FCEBDD" };
const streakText = { color: "#8A3F12", fontFamily: SANS, fontSize: 11, fontWeight: "800" as const };
