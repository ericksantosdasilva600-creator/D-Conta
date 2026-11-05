import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, BrandMark, Card, Header, IconButton, OfflineBanner, Page, PrimaryButton, SectionTitle, StorageBanner } from "@/components/app-ui";
import { useAppData } from "@/lib/app-data";
import { CloudSyncBadge } from "@/lib/cloud-sync";
import { C, SANS } from "@/lib/design";
import { localDateKey, money } from "@/lib/format";

type CaptureTarget = "notes" | "finance" | "habit" | "health" | "tasks";

export function DashboardScreen() {
  const { data, loading } = useAppData();
  const [captureOpen, setCaptureOpen] = useState(false);
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
      <Header eyebrow="NYVO · RESUMO" title="O essencial, em um só lugar." subtitle="Um próximo passo de cada vez." right={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><BrandMark size={42} /><IconButton name="cog-outline" label="Abrir configurações" onPress={() => router.push("/settings")} /></View>} />
      <OfflineBanner />
      <StorageBanner />
      <CloudSyncBadge />
      <Card style={{ backgroundColor: C.greenDark, borderColor: C.greenDark, padding: 19, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><MaterialCommunityIcons name="weather-sunny" size={18} color="#B7D9C7" /><Text style={heroEyebrow}>{dateLabel}</Text></View>
        <Text style={heroTitle}>Ideias, dinheiro e planos — com espaço para você.</Text>
        <Text style={heroSub}>Seus registros ficam salvos neste aparelho, prontos quando você precisar.</Text>
        <PrimaryButton title="Adicionar" onPress={() => setCaptureOpen(true)} icon="plus" disabled={loading} />
      </Card>
      <View style={{ gap: 12 }}>
        <SectionTitle title="Seus quatro pilares" />
        <View style={{ gap: 9 }}>
          <PillarCard icon="note-text-outline" title="Anotações" metric={loading ? "Carregando" : `${data.notes.length} ${data.notes.length === 1 ? "nota" : "notas"}`} detail={loading ? "Preparando seus dados locais" : "Ideias salvas e pesquisáveis"} onPress={() => router.push("/notes")} />
          <PillarCard icon="wallet-outline" title="Finanças" metric={loading ? "Carregando" : money(monthlyBalance, data.currency)} detail={loading ? "Preparando seus dados locais" : "Saldo pessoal deste mês · Viagem fica separada"} onPress={() => router.push("/finance")} />
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

const heroEyebrow = { color: "#D7E9DE", fontFamily: SANS, fontSize: 12, fontWeight: "700" as const };
const heroTitle = { color: "#FFFFFF", fontFamily: SANS, fontSize: 22, lineHeight: 29, fontWeight: "800" as const, letterSpacing: -0.35 };
const heroSub = { color: "#D7E9DE", fontFamily: SANS, fontSize: 13, lineHeight: 19 };
const pillarIcon = { width: 43, height: 43, borderRadius: 15, backgroundColor: C.greenSoft, alignItems: "center" as const, justifyContent: "center" as const };
const pillarTitle = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "800" as const };
const pillarMetric = { color: C.greenDark, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const pillarDetail = { color: C.muted, fontFamily: SANS, fontSize: 11, lineHeight: 16 };
const captureRow = { minHeight: 68, flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: C.line };
