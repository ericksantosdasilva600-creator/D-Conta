import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { Card, ChoiceChips, Header, IconButton, Page } from "@/components/app-ui";
import { useAppData } from "@/lib/app-data";
import { C, SANS } from "@/lib/design";
import { localDateKey, money } from "@/lib/format";
import { addMonths, monthKey, monthLabel, monthSummary } from "@/lib/finance-extra";

const CAT_COLORS = [C.green, C.blue, C.amber, C.coral, C.greenDark, C.blueDark, C.muted];
const shortMoney = (v: number) => v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : Math.round(v).toLocaleString("pt-BR");
const dayKeys = (n: number) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return localDateKey(d); });
const weekdayShort = (key: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(new Date(`${key}T12:00:00`)).replace(".", "").slice(0, 3);

export function InsightsScreen() {
  const { data } = useAppData();
  const [range, setRange] = useState("6 meses");
  const monthsBack = range === "3 meses" ? 3 : range === "12 meses" ? 12 : 6;

  const months = useMemo(() => Array.from({ length: monthsBack }, (_, i) => { const key = addMonths(monthKey(), -(monthsBack - 1 - i)); const s = monthSummary(data, key); return { key, label: monthLabel(key).slice(0, 3), income: s.income, expense: s.expense }; }), [data, monthsBack]);
  const maxMonth = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const current = monthSummary(data, monthKey());
  const cats = current.categories.slice(0, 6);
  const otherTotal = current.categories.slice(6).reduce((s, [, v]) => s + v, 0);
  const slices = otherTotal ? [...cats, ["Outras", otherTotal] as [string, number]] : cats;

  const habitDays = useMemo(() => dayKeys(14).map((key) => {
    const wd = new Date(`${key}T12:00:00`).getDay();
    const planned = data.habits.filter((h) => !h.archived && h.weekdays.includes(wd));
    const done = (data.completedByDate[key] ?? []).filter((id) => planned.some((h) => h.id === id)).length;
    return { key, rate: planned.length ? done / planned.length : null };
  }), [data.habits, data.completedByDate]);
  const water = useMemo(() => dayKeys(7).map((key) => ({ key, ml: data.healthLogs.filter((l) => l.kind === "hydration" && l.date === key).reduce((s, l) => s + l.amountMl, 0) })), [data.healthLogs]);
  const maxWater = Math.max(2000, ...water.map((w) => w.ml));
  const activity = useMemo(() => dayKeys(7).map((key) => ({ key, min: data.healthLogs.filter((l) => l.kind !== "hydration" && l.date === key).reduce((s, l) => s + l.durationMinutes, 0) })), [data.healthLogs]);
  const maxAct = Math.max(30, ...activity.map((a) => a.min));
  const weeks = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const end = new Date(); end.setDate(end.getDate() - 7 * (5 - i)); const start = new Date(end); start.setDate(end.getDate() - 6);
    const s = localDateKey(start); const e = localDateKey(end);
    const n = data.tasks.filter((t) => t.status === "done" && t.updatedAt.slice(0, 10) >= s && t.updatedAt.slice(0, 10) <= e).length;
    return { label: `${start.getDate()}/${start.getMonth() + 1}`, n };
  }), [data.tasks]);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.n));
  const habitAvg = habitDays.filter((d) => d.rate !== null);
  const anyHabitDone = habitDays.some((d) => (d.rate ?? 0) > 0);
  const avg = habitAvg.length && anyHabitDone ? habitAvg.reduce((s, d) => s + (d.rate ?? 0), 0) / habitAvg.length : null;
  const hasMoney = months.some((m) => m.income || m.expense);
  const hasWater = water.some((w) => w.ml > 0);
  const hasActivity = activity.some((a) => a.min > 0);
  const hasTasksDone = weeks.some((w) => w.n > 0);

  return (
    <Page>
      <Header eyebrow="NYVO · GRÁFICOS" title="Seus números." subtitle="Dinheiro, hábitos, saúde e tarefas em gráficos." right={<IconButton name="arrow-left" label="Voltar" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />} />

      <ChartCard title="Entradas e saídas por mês" subtitle={`Receitas e despesas · últimos ${monthsBack} meses`}>
        <ChoiceChips values={["3 meses", "6 meses", "12 meses"]} selected={range} onSelect={setRange} />
        {hasMoney ? <>
        <Legend items={[["Entrou", C.green], ["Saiu", C.blue]]} />
        <View style={barArea}>
          {months.map((m) => <View key={m.key} style={barCol}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 130 }}>
              <View accessibilityLabel={`${m.label}: entrou ${money(m.income, data.currency)}`} style={[bar, { height: Math.max(2, (m.income / maxMonth) * 130), backgroundColor: C.green }]} />
              <View accessibilityLabel={`${m.label}: saiu ${money(m.expense, data.currency)}`} style={[bar, { height: Math.max(2, (m.expense / maxMonth) * 130), backgroundColor: C.blue }]} />
            </View>
            <Text style={axis}>{m.label}</Text>
          </View>)}
        </View>
        <Text style={note}>Maior valor no período: {money(maxMonth, data.currency)}</Text>
        </> : <Empty text="Ainda não há movimentos nesse período. O gráfico aparece depois do primeiro gasto ou receita." action="Registrar movimento" onAction={() => router.push({ pathname: "/finance", params: { create: "1" } })} />}
      </ChartCard>

      <ChartCard title="Para onde foi o dinheiro" subtitle={`Despesas de ${monthLabel(monthKey()).toLowerCase()}`}>
        {slices.length ? <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Donut values={slices.map(([, v]) => v)} colors={CAT_COLORS} center={shortMoney(current.expense)} />
          <View style={{ flex: 1, minWidth: 160, gap: 7 }}>{slices.map(([name, v], i) => <View key={name} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={[swatch, { backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} /><Text style={[legendText, { flex: 1 }]} numberOfLines={1}>{name}</Text><Text style={value}>{Math.round((v / (current.expense || 1)) * 100)}%</Text></View>)}</View>
        </View> : <Empty text="Ainda não há despesas neste mês." action="Registrar gasto" onAction={() => router.push({ pathname: "/finance", params: { create: "1" } })} />}
      </ChartCard>

      <ChartCard title="Hábitos cumpridos" subtitle={`Últimos 14 dias${avg !== null ? ` · média ${Math.round(avg * 100)}%` : ""}`}>
        {data.habits.length && anyHabitDone ? <View style={barArea}>{habitDays.map((d) => <View key={d.key} style={barCol}>
          <View style={{ height: 100, justifyContent: "flex-end" }}><View accessibilityLabel={`${d.key}: ${d.rate === null ? "sem hábitos" : `${Math.round(d.rate * 100)}%`}`} style={[bar, { width: 12, height: d.rate === null ? 2 : Math.max(3, d.rate * 100), backgroundColor: d.rate === null ? C.line : d.rate >= 1 ? C.green : C.greenSoft, borderWidth: d.rate !== null && d.rate < 1 ? 1 : 0, borderColor: C.green }]} /></View>
          <Text style={[axis, { fontSize: 9 }]}>{Number(d.key.slice(8))}</Text>
        </View>)}</View> : <Empty text={data.habits.length ? "Marque um hábito como feito para ver esta evolução." : "Crie um hábito para acompanhar aqui."} action={data.habits.length ? "Ir para Hábitos" : "Criar hábito"} onAction={() => router.push(data.habits.length ? "/habits" : { pathname: "/habits", params: { create: "habit" } })} />}
        {data.habits.length && anyHabitDone ? <Legend items={[["Dia completo", C.green], ["Parcial", C.greenSoft]]} /> : null}
      </ChartCard>

      <ChartCard title="Água por dia" subtitle="Últimos 7 dias · meta de referência 2 litros">
        {!hasWater ? <Empty text="Nenhum registro de água nos últimos 7 dias." action="Registrar água" onAction={() => router.push("/habits")} /> : <View style={barArea}>{water.map((w) => <View key={w.key} style={barCol}>
          <Text style={value}>{w.ml ? `${(w.ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L` : ""}</Text>
          <View style={{ height: 100, justifyContent: "flex-end" }}><View style={[bar, { width: 20, height: Math.max(2, (w.ml / maxWater) * 100), backgroundColor: w.ml >= 2000 ? C.blue : C.blueSoft, borderWidth: w.ml && w.ml < 2000 ? 1 : 0, borderColor: C.blue }]} /></View>
          <Text style={axis}>{weekdayShort(w.key)}</Text>
        </View>)}</View>}
      </ChartCard>

      <ChartCard title="Atividade, leitura e estudo" subtitle="Minutos por dia · últimos 7 dias">
        {!hasActivity ? <Empty text="Nenhuma atividade registrada nos últimos 7 dias." action="Registrar atividade" onAction={() => router.push({ pathname: "/habits", params: { create: "health" } })} /> : <View style={barArea}>{activity.map((a) => <View key={a.key} style={barCol}>
          <Text style={value}>{a.min || ""}</Text>
          <View style={{ height: 100, justifyContent: "flex-end" }}><View style={[bar, { width: 20, height: Math.max(2, (a.min / maxAct) * 100), backgroundColor: C.green }]} /></View>
          <Text style={axis}>{weekdayShort(a.key)}</Text>
        </View>)}</View>}
      </ChartCard>

      <ChartCard title="Tarefas concluídas" subtitle="Por semana · últimas 6 semanas">
        {!hasTasksDone ? <Empty text="Nenhuma tarefa concluída nas últimas 6 semanas." action="Ver tarefas" onAction={() => router.push("/tasks")} /> : <View style={barArea}>{weeks.map((w) => <View key={w.label} style={barCol}>
          <Text style={value}>{w.n || ""}</Text>
          <View style={{ height: 100, justifyContent: "flex-end" }}><View style={[bar, { width: 22, height: Math.max(2, (w.n / maxWeek) * 100), backgroundColor: C.greenDark }]} /></View>
          <Text style={axis}>{w.label}</Text>
        </View>)}</View>}
      </ChartCard>

      {data.goals.length ? <ChartCard title="Metas de economia" subtitle="Quanto já foi guardado">
        {data.goals.map((g) => { const pct = g.target ? Math.min(1, g.saved / g.target) : 0; return <View key={g.id} style={{ gap: 5 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={legendText}>{g.name}</Text><Text style={value}>{Math.round(pct * 100)}%</Text></View>
          <View style={track}><View style={[fill, { width: `${pct * 100}%` }]} /></View>
          <Text style={note}>{money(g.saved, data.currency)} de {money(g.target, data.currency)}</Text>
        </View>; })}
      </ChartCard> : null}
    </Page>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <Card style={{ gap: 12 }}><View style={{ gap: 3 }}><Text style={titleStyle}>{title}</Text><Text style={note}>{subtitle}</Text></View>{children}</Card>;
}
function Legend({ items }: { items: [string, string][] }) {
  return <View style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>{items.map(([l, c]) => <View key={l} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={[swatch, { backgroundColor: c, borderWidth: 1, borderColor: C.line }]} /><Text style={legendText}>{l}</Text></View>)}</View>;
}
function Empty({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return <View style={{ alignItems: "center", gap: 10, paddingVertical: 14 }}>
    <Text style={[note, { textAlign: "center", lineHeight: 18 }]}>{text}</Text>
    {action && onAction ? <Pressable onPress={onAction} accessibilityRole="button" style={emptyBtn}><Text style={{ color: C.greenDark, fontFamily: SANS, fontSize: 13, fontWeight: "800" }}>{action}</Text></Pressable> : null}
  </View>;
}
function Donut({ values, colors, center }: { values: number[]; colors: string[]; center: string }) {
  const total = values.reduce((s, v) => s + v, 0) || 1; const r = 54; const circ = 2 * Math.PI * r;
  const lens = values.map((v) => (v / total) * circ);
  const offsets = lens.map((_, i) => lens.slice(0, i).reduce((s, l) => s + l, 0));
  return <View style={{ width: 140, height: 140, alignItems: "center", justifyContent: "center" }}>
    <Svg width={140} height={140} viewBox="0 0 140 140" style={{ position: "absolute" }}>
      <Circle cx={70} cy={70} r={r} stroke={C.line} strokeWidth={20} fill="none" />
      {lens.map((len, i) => <Circle key={i} cx={70} cy={70} r={r} stroke={colors[i % colors.length]} strokeWidth={20} fill="none" strokeDasharray={`${Math.max(0, len - 2)} ${circ}`} strokeDashoffset={-offsets[i]} transform="rotate(-90 70 70)" />)}
    </Svg>
    <Text style={{ color: C.ink, fontFamily: SANS, fontSize: 15, fontWeight: "800" }}>{center}</Text>
    <Text style={note}>gasto no mês</Text>
  </View>;
}

const titleStyle = { color: C.ink, fontFamily: SANS, fontSize: 15, fontWeight: "800" as const };
const note = { color: C.muted, fontFamily: SANS, fontSize: 12 };
const axis = { color: C.muted, fontFamily: SANS, fontSize: 10, marginTop: 5 };
const value = { color: C.ink, fontFamily: SANS, fontSize: 11, fontWeight: "700" as const, fontVariant: ["tabular-nums" as const] };
const legendText = { color: C.ink, fontFamily: SANS, fontSize: 12 };
const barArea = { flexDirection: "row" as const, alignItems: "flex-end" as const, justifyContent: "space-between" as const, gap: 4, paddingTop: 6, borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 2 };
const barCol = { flex: 1, alignItems: "center" as const, minWidth: 0 };
const bar = { width: 14, borderTopLeftRadius: 5, borderTopRightRadius: 5 };
const swatch = { width: 11, height: 11, borderRadius: 3 };
const track = { height: 9, borderRadius: 5, backgroundColor: C.line, overflow: "hidden" as const };
const fill = { height: 9, borderRadius: 5, backgroundColor: C.green };
const emptyBtn = { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: C.greenSoft };
