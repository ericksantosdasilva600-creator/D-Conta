import React, { useMemo } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { Card } from "@/components/app-ui";
import { C, SANS } from "@/lib/design";
import { money } from "@/lib/format";
import type { Transaction } from "@/lib/app-data";

const CATEGORY_COLORS = [C.green, C.blue, C.greenDark, C.blueDark, "#74A99F"];

type MonthSummary = { key: string; label: string; income: number; expense: number; balance: number };

export function FinanceCharts({ transactions, currency }: { transactions: Transaction[]; currency: string }) {
  const week = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setHours(12, 0, 0, 0);
      date.setDate(now.getDate() - (6 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const day = transactions.filter((item) => item.date === key);
      return {
        key,
        label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "").slice(0, 2),
        income: day.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0),
        expense: day.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0),
      };
    });
  }, [transactions]);

  const months = useMemo<MonthSummary[]>(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1, 12);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const entries = transactions.filter((item) => item.date.startsWith(key));
      const income = entries.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
      const expense = entries.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
      return { key, label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", ""), income, expense, balance: income - expense };
    });
  }, [transactions]);

  const total = transactions.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    transactions.filter((item) => item.kind === "expense").forEach((item) => map.set(item.category, (map.get(item.category) ?? 0) + item.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [transactions]);

  const maxWeek = Math.max(1, ...week.flatMap((day) => [day.income, day.expense]));
  const maxCategory = Math.max(1, ...categories.map(([, value]) => value));
  const hasWeek = week.some((day) => day.income > 0 || day.expense > 0);
  const hasMonthlyData = months.some((month) => month.income > 0 || month.expense > 0);
  const minBalance = Math.min(0, ...months.map((month) => month.balance));
  const maxBalance = Math.max(0, ...months.map((month) => month.balance));
  const balanceRange = Math.max(1, maxBalance - minBalance);
  const monthlyPoints = months.map((month, index) => ({
    ...month,
    x: 18 + (index * 284) / (months.length - 1),
    y: 14 + ((maxBalance - month.balance) / balanceRange) * 112,
  }));
  const linePoints = monthlyPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const zeroY = 14 + (maxBalance / balanceRange) * 112;
  const monthlySummary = months.map((month) => `${month.label}: ${month.balance >= 0 ? "+" : "−"}${money(Math.abs(month.balance), currency)}`).join(" · ");

  return (
    <View style={{ gap: 13 }}>
      <Card>
        <View style={{ gap: 3 }}>
          <Text accessibilityRole="header" style={titleStyle}>Últimos 7 dias</Text>
          <Text style={captionStyle}>Entradas e saídas por dia</Text>
        </View>
        {hasWeek ? <>
          <View style={{ height: 128, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 7, paddingTop: 10 }}>
            {week.map((day) => {
              const heightExpense = Math.max(day.expense ? 5 : 0, Math.round((day.expense / maxWeek) * 92));
              const heightIncome = Math.max(day.income ? 5 : 0, Math.round((day.income / maxWeek) * 92));
              return <View key={day.key} accessibilityLabel={`${day.label}: despesas ${money(day.expense, currency)}, receitas ${money(day.income, currency)}`} style={{ flex: 1, alignItems: "center", gap: 8 }}>
                <View style={{ height: 96, width: "100%", flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 3 }}>
                  <View style={{ width: 9, height: heightExpense, borderRadius: 6, backgroundColor: C.blue }} />
                  <View style={{ width: 9, height: heightIncome, borderRadius: 6, backgroundColor: C.green }} />
                </View>
                <Text style={axisStyle}>{day.label}</Text>
              </View>;
            })}
          </View>
          <View style={{ flexDirection: "row", gap: 15 }}><Legend color={C.blue} label="Despesas" /><Legend color={C.green} label="Receitas" /></View>
        </> : <View style={emptyChart}><Text style={emptyText}>Os gráficos aparecem depois do primeiro movimento.</Text></View>}
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1, gap: 3 }}><Text accessibilityRole="header" style={titleStyle}>Despesas por categoria</Text><Text style={captionStyle}>Distribuição dos seus gastos</Text></View>
          {total > 0 ? <Text style={totalStyle}>{money(total, currency)}</Text> : null}
        </View>
        {categories.length ? categories.map(([name, amount], index) => {
          const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
          return <View key={name} accessibilityLabel={`${name}: ${money(amount, currency)}`} style={{ gap: 7 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><Text style={categoryStyle}>{name}</Text><Text style={amountStyle}>{money(amount, currency)}</Text></View>
            <View style={{ height: 7, borderRadius: 20, backgroundColor: C.paper, overflow: "hidden" }}><View style={{ width: `${Math.max(4, (amount / maxCategory) * 100)}%`, height: "100%", backgroundColor: color, borderRadius: 20 }} /></View>
          </View>;
        }) : <View style={emptyChart}><Text style={emptyText}>Ainda não há despesas para comparar.</Text></View>}
      </Card>

      <Card>
        <View style={{ gap: 3 }}><Text accessibilityRole="header" style={titleStyle}>Saldo líquido mensal</Text><Text style={captionStyle}>Receitas menos despesas · últimos 6 meses</Text></View>
        {hasMonthlyData ? <>
          <View accessible accessibilityRole="image" accessibilityLabel={`Saldo líquido mensal dos últimos seis meses. ${monthlySummary}. Acima da linha, saldo positivo; abaixo, saldo negativo.`} style={{ gap: 1 }}>
            <Svg width="100%" height={145} viewBox="0 0 320 150" preserveAspectRatio="none">
              <Line x1="18" y1={zeroY} x2="302" y2={zeroY} stroke={C.line} strokeWidth="1.5" strokeDasharray="4,4" />
              <Polyline points={linePoints} fill="none" stroke={C.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {monthlyPoints.map((point) => <Circle key={point.key} cx={point.x} cy={point.y} r="5" fill={point.balance >= 0 ? C.green : C.blue} stroke="#FFFFFF" strokeWidth="2" />)}
            </Svg>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 }}>{months.map((month) => <Text key={month.key} style={axisStyle}>{month.label}</Text>)}</View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 13 }}><Legend color={C.green} label="Saldo positivo" /><Legend color={C.blue} label="Saldo negativo" /></View>
          <Text style={captionStyle}>{monthlySummary}</Text>
        </> : <View style={emptyChart}><Text style={emptyText}>Registre receitas ou despesas para ver a evolução mensal do saldo.</Text></View>}
      </Card>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /><Text style={captionStyle}>{label}</Text></View>;
}

const titleStyle = { color: C.ink, fontFamily: SANS, fontSize: 16, fontWeight: "700" as const };
const captionStyle = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 };
const axisStyle = { color: C.muted, fontFamily: SANS, fontSize: 10, textTransform: "capitalize" as const };
const emptyChart = { minHeight: 75, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 14 };
const emptyText = { color: C.muted, fontFamily: SANS, fontSize: 13, lineHeight: 19, textAlign: "center" as const };
const totalStyle = { color: C.greenDark, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const categoryStyle = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "600" as const };
const amountStyle = { color: C.ink, fontFamily: SANS, fontSize: 12, fontWeight: "700" as const };
