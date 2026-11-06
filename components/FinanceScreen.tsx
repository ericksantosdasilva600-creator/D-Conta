import { iconFor } from "@/lib/themes";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, BrandMark, Card, ChoiceChips, EmptyState, Header, IconButton, OfflineBanner, Page, PrimaryButton, PriorityTag, SectionTitle, StorageBanner, Tag } from "@/components/app-ui";
import { TransactionForm } from "@/components/TransactionForm";
import { FinanceCharts } from "@/components/FinanceCharts";
import { BudgetPanel } from "@/components/BudgetPanel";
import { CreditCardPanel, DebtsPanel, GoalsPanel, ImportPanel, MonthSummaryPanel, RecurringBillsPanel } from "@/components/FinanceExtras";
import { splitInstallments } from "@/lib/finance-extra";
import { ACCOUNTS, accountLabel, useAppData, type AccountId, type FinanceScope, type Priority, type Transaction, type TransactionKind } from "@/lib/app-data";
import { toast } from "@/lib/toast";
import { C, PRIORITY_LABELS, SANS } from "@/lib/design";
import { daysUntil, displayDate, localDateKey, money } from "@/lib/format";
import { refreshLocalNotifications } from "@/lib/local-notifications";

type FilterKind = "all" | TransactionKind | "pending";
type DateWindow = "all" | "7" | "30";

export function FinanceScreen({ autoCreate = false }: { autoCreate?: boolean } = {}) {
  const { data, updateData, loading } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [query, setQuery] = useState("");
  const [filterKind, setFilterKind] = useState<FilterKind>("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterCategory, setFilterCategory] = useState("Todas categorias");
  const [dateWindow, setDateWindow] = useState<DateWindow>("all");
  const [sortPriority, setSortPriority] = useState(false);
  const [scope, setScope] = useState<FinanceScope>("personal");
  const [section, setSection] = useState("Movimentos");
  const [accountFilter, setAccountFilter] = useState<AccountId | "all">("all");
  const [moreFilters, setMoreFilters] = useState(false);
  const hasTrip = useMemo(() => data.transactions.some((item) => item.scope === "trip"), [data.transactions]);
  const previousAutoCreate = useRef(false);

  useEffect(() => {
    if (autoCreate && !previousAutoCreate.current) { setEditing(null); setFormOpen(true); }
    previousAutoCreate.current = autoCreate;
  }, [autoCreate]);
  const visibleTransactions = useMemo(() => data.transactions.filter((item) => item.scope === scope), [data.transactions, scope]);
  const expenseTotal = visibleTransactions.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
  const incomeTotal = visibleTransactions.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const dueSoon = visibleTransactions.filter((item) => item.kind === "expense" && !item.paid && item.dueDate && ((daysUntil(item.dueDate) ?? 999) >= 0 && (daysUntil(item.dueDate) ?? 999) <= 7)).length;
  const balance = incomeTotal - expenseTotal;
  const monthKeyNow = localDateKey().slice(0, 7);
  const monthTx = visibleTransactions.filter((item) => item.date.startsWith(monthKeyNow));
  const monthIncome = monthTx.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const monthExpense = monthTx.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date());
  const advancedFilterCount = (filterPriority !== "all" ? 1 : 0) + (accountFilter !== "all" ? 1 : 0) + (dateWindow !== "all" ? 1 : 0) + (filterCategory !== "Todas categorias" ? 1 : 0);
  const openNew = () => { setEditing(null); setFormOpen(true); };
  const categoryOptions = useMemo(() => ["Todas categorias", ...new Set(visibleTransactions.map((item) => item.category))], [visibleTransactions]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const priorityRank = { high: 0, medium: 1, low: 2 };
    const cutoff = dateWindow === "all" ? "" : (() => { const date = new Date(); date.setDate(date.getDate() - Number(dateWindow)); return localDateKey(date); })();
    return visibleTransactions.filter((item) => {
      if (filterKind === "expense" && item.kind !== "expense") return false;
      if (filterKind === "income" && item.kind !== "income") return false;
      if (filterKind === "pending" && (item.kind !== "expense" || item.paid)) return false;
      if (filterPriority !== "all" && item.priority !== filterPriority) return false;
      if (filterCategory !== "Todas categorias" && item.category !== filterCategory) return false;
      if (accountFilter !== "all" && (item.account ?? "main") !== accountFilter) return false;
      if (cutoff && item.date < cutoff) return false;
      if (normalizedQuery && !`${item.merchant} ${item.category} ${item.notes}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery)) return false;
      return true;
    }).sort((a, b) => sortPriority ? priorityRank[a.priority] - priorityRank[b.priority] || b.date.localeCompare(a.date) : b.date.localeCompare(a.date));
  }, [visibleTransactions, filterKind, filterPriority, filterCategory, dateWindow, query, sortPriority, accountFilter]);

  const showToast = (message: string) => {
    toast(message);
  };

  const saveTransaction = (transaction: Transaction, categoryToAdd?: { kind: TransactionKind; name: string }, installments = 1) => {
    const isNew = !data.transactions.some((item) => item.id === transaction.id);
    const created = isNew && installments > 1 ? splitInstallments(transaction, installments) : [transaction];
    const existingCustom = categoryToAdd?.kind === "expense" ? data.customExpenseCategories : data.customIncomeCategories;
    const duplicate = Boolean(categoryToAdd && existingCustom.some((item) => item.toLocaleLowerCase("pt-BR") === categoryToAdd.name.toLocaleLowerCase("pt-BR")));
    const updated = {
      ...data,
      transactions: [...created, ...data.transactions.filter((item) => item.id !== transaction.id)],
      customExpenseCategories: categoryToAdd?.kind === "expense" && !duplicate ? [...data.customExpenseCategories, categoryToAdd.name] : data.customExpenseCategories,
      customIncomeCategories: categoryToAdd?.kind === "income" && !duplicate ? [...data.customIncomeCategories, categoryToAdd.name] : data.customIncomeCategories,
    };
    updateData(() => updated);
    void refreshLocalNotifications(updated);
    setEditing(null);
    showToast(created.length > 1 ? `Compra dividida em ${created.length} parcelas.` : "Movimento salvo.");
  };

  const removeTransaction = () => {
    if (!deleting) return;
    const updated = { ...data, transactions: data.transactions.filter((item) => item.id !== deleting.id) };
    updateData(() => updated);
    void refreshLocalNotifications(updated);
    setDeleting(null);
    showToast("Movimento removido.");
  };

  const togglePaid = (transaction: Transaction) => {
    const updated = { ...data, transactions: data.transactions.map((item) => item.id === transaction.id ? { ...item, paid: !item.paid } : item) };
    updateData(() => updated);
    void refreshLocalNotifications(updated);
    showToast(transaction.paid ? "Despesa marcada como pendente." : "Despesa paga; os lembretes foram atualizados.");
  };

  return (
    <Page>
      <Header eyebrow={scope === "personal" ? "DÁ CONTA · FINANÇAS PESSOAIS" : "DÁ CONTA · DESPESAS DE VIAGEM"} title={scope === "personal" ? "Seu dinheiro, com clareza." : "Finanças da viagem."} subtitle={scope === "personal" ? "Receitas, despesas e orçamentos do dia a dia." : `${data.tripName} · recibos, movimentos e vencimentos.`} right={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><BrandMark size={42} /><IconButton name="cog-outline" label="Abrir configurações" onPress={() => router.push("/settings")} /></View>} />
      <OfflineBanner />
      <StorageBanner />
      <ChoiceChips values={["Movimentos", "Contas fixas", "Cartão", "Metas", "Dívidas", "Resumo do mês", "Importar"]} selected={section} onSelect={setSection} />
      {section === "Contas fixas" ? <RecurringBillsPanel onToast={showToast} /> : null}
      {section === "Cartão" ? <CreditCardPanel /> : null}
      {section === "Metas" ? <GoalsPanel onToast={showToast} /> : null}
      {section === "Dívidas" ? <DebtsPanel onToast={showToast} /> : null}
      {section === "Resumo do mês" ? <MonthSummaryPanel /> : null}
      {section === "Importar" ? <ImportPanel onToast={showToast} /> : null}
      {section === "Movimentos" ? <>
      {hasTrip ? <ChoiceChips values={["Pessoal", "Viagem"]} selected={scope === "personal" ? "Pessoal" : "Viagem"} onSelect={(value) => { setScope(value === "Viagem" ? "trip" : "personal"); setFilterCategory("Todas categorias"); }} /> : null}
      {!loading && !visibleTransactions.length ? <Card style={{ gap: 14, alignItems: "center", paddingVertical: 28 }}>
        <View style={emptyIcon}><MaterialCommunityIcons name="cash-plus" size={30} color={C.greenDark} /></View>
        <Text accessibilityRole="header" style={emptyTitle}>{scope === "trip" ? "Ainda sem movimentos de viagem" : "Registre seu primeiro gasto"}</Text>
        <Text style={[mutedText, { textAlign: "center", maxWidth: 380 }]}>Pode ser o café de hoje ou o seu salário. Depois disso aparecem o saldo do mês, os gráficos por categoria e os orçamentos.</Text>
        <PrimaryButton title="Registrar primeiro gasto" onPress={openNew} icon="plus" />
        <Text style={[mutedText, { fontSize: 12, textAlign: "center" }]}>Dica: na tela Hoje dá para escrever “gastei 45 no mercado”.</Text>
      </Card> : <>
      <Card style={{ backgroundColor: C.greenDark, borderColor: C.greenDark, padding: 19, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={balanceLabel}>{scope === "personal" ? `RESUMO DE ${monthName.toUpperCase()}` : "SALDO DA VIAGEM"}</Text><MaterialCommunityIcons name={scope === "personal" ? "wallet-outline" : "map-marker-path"} size={19} color="rgba(255,255,255,0.78)" /></View>
        {scope === "personal" ? <>
          <Text accessibilityLabel={`Saldo de ${monthName}: ${money(monthIncome - monthExpense, data.currency)}`} style={balanceValue}>{monthTx.length ? money(monthIncome - monthExpense, data.currency) : "Sem movimentos"}</Text>
          <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.18)" }} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={metricBox}><View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}><MaterialCommunityIcons name="arrow-down-left" size={15} color="rgba(255,255,255,0.8)" /><Text style={metricLabel}>Entrou no mês</Text></View><Text style={metricValue}>{money(monthIncome, data.currency)}</Text></View>
            <View style={metricBox}><View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}><MaterialCommunityIcons name="arrow-up-right" size={15} color="rgba(255,255,255,0.8)" /><Text style={metricLabel}>Saiu no mês</Text></View><Text style={metricValue}>{money(monthExpense, data.currency)}</Text></View>
          </View>
          <Text style={[metricLabel, { opacity: 0.85 }]}>Saldo de todos os meses: {money(balance, data.currency)}</Text>
        </> : <>
          <Text accessibilityLabel={`Saldo da viagem: ${money(balance, data.currency)}`} style={balanceValue}>{money(balance, data.currency)}</Text>
          <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.18)" }} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={metricBox}><Text style={metricLabel}>Receitas</Text><Text style={metricValue}>{money(incomeTotal, data.currency)}</Text></View>
            <View style={metricBox}><Text style={metricLabel}>Despesas</Text><Text style={metricValue}>{money(expenseTotal, data.currency)}</Text></View>
          </View>
        </>}
      </Card>
      {dueSoon > 0 ? <Pressable onPress={() => setFilterKind("pending")} accessibilityRole="button" style={dueBanner}><MaterialCommunityIcons name="calendar-alert" size={19} color={C.danger} /><Text style={{ flex: 1, color: C.danger, fontFamily: SANS, fontSize: 13, fontWeight: "700" }}>{dueSoon} {dueSoon === 1 ? "despesa pendente vence" : "despesas pendentes vencem"} nos próximos 7 dias</Text><MaterialCommunityIcons name="chevron-right" size={18} color={C.danger} /></Pressable> : null}
      <PrimaryButton title="Novo movimento" onPress={openNew} icon="plus" />
      <View style={{ gap: 12 }}>
        <SectionTitle title="Movimentos" action={sortPriority ? "Mais recentes" : "Por prioridade"} onAction={() => setSortPriority((value) => !value)} />
        <View style={searchBox}><MaterialCommunityIcons name="magnify" size={19} color={C.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Pesquisar local, categoria…" placeholderTextColor={C.muted} accessibilityLabel="Pesquisar movimentos financeiros" style={searchInput} returnKeyType="search" /><Pressable accessibilityRole="button" accessibilityLabel="Limpar pesquisa" onPress={() => setQuery("")}><MaterialCommunityIcons name="close-circle" size={18} color={query ? C.muted : "transparent"} /></Pressable></View>
        <View style={{ gap: 9 }}>
          <ChoiceChips values={["Tudo", "Despesas", "Receitas", "Pendentes"]} selected={filterKind === "all" ? "Tudo" : filterKind === "expense" ? "Despesas" : filterKind === "income" ? "Receitas" : "Pendentes"} onSelect={(value) => setFilterKind(value === "Despesas" ? "expense" : value === "Receitas" ? "income" : value === "Pendentes" ? "pending" : "all")} />
          <Pressable onPress={() => setMoreFilters((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: moreFilters }} style={moreFiltersBtn}>
            <MaterialCommunityIcons name="tune-variant" size={17} color={C.greenDark} />
            <Text style={{ color: C.greenDark, fontFamily: SANS, fontSize: 13, fontWeight: "700" }}>{moreFilters ? "Esconder filtros" : `Mais filtros${advancedFilterCount ? ` (${advancedFilterCount} ativos)` : ""}`}</Text>
            <MaterialCommunityIcons name={moreFilters ? "chevron-up" : "chevron-down"} size={17} color={C.greenDark} />
          </Pressable>
          {moreFilters ? <>
            <ChoiceChips values={["Qualquer data", "7 dias", "30 dias"]} selected={dateWindow === "all" ? "Qualquer data" : `${dateWindow} dias`} onSelect={(value) => setDateWindow(value === "7 dias" ? "7" : value === "30 dias" ? "30" : "all")} />
            {categoryOptions.length > 1 ? <ChoiceChips values={categoryOptions} selected={filterCategory} onSelect={setFilterCategory} /> : null}
            <ChoiceChips values={["Todas as contas", ...ACCOUNTS.map((a) => a.label)]} selected={accountFilter === "all" ? "Todas as contas" : accountLabel(accountFilter)} onSelect={(value) => setAccountFilter(ACCOUNTS.find((a) => a.label === value)?.id ?? "all")} />
            <ChoiceChips values={["Todas prioridades", "Alta", "Média", "Baixa"]} selected={filterPriority === "all" ? "Todas prioridades" : PRIORITY_LABELS[filterPriority]} onSelect={(value) => setFilterPriority(value === "Alta" ? "high" : value === "Média" ? "medium" : value === "Baixa" ? "low" : "all")} />
          </> : null}
        </View>
        {loading ? <View style={{ padding: 28, alignItems: "center" }}><Text style={mutedText}>Carregando seus movimentos…</Text></View> : filtered.length ? <View style={{ gap: 10 }}>{filtered.map((item) => <TransactionRow key={item.id} transaction={item} currency={data.currency} onPress={() => { setEditing(item); setFormOpen(true); }} onDelete={() => setDeleting(item)} onTogglePaid={() => togglePaid(item)} />)}</View> : <Card><EmptyState icon="receipt-text-outline" title="Nada encontrado" description="Experimente mudar a pesquisa ou os filtros." /></Card>}
      </View>
      <View style={{ gap: 12 }}><SectionTitle title={scope === "personal" ? "Visão financeira" : "Visão da viagem"} /><FinanceCharts transactions={visibleTransactions} currency={data.currency} /></View>
      <BudgetPanel scope={scope} transactions={visibleTransactions} currency={data.currency} />
      </>}
      </> : null}
      {formOpen ? <TransactionForm visible initial={editing} defaultScope={scope} onClose={() => setFormOpen(false)} onSave={saveTransaction} /> : null}
      <AppModal visible={Boolean(deleting)} title="Remover movimento?" subtitle="Esta ação não pode ser desfeita." onClose={() => setDeleting(null)} footer={<View style={{ gap: 9 }}><PrimaryButton title="Manter movimento" tone="light" onPress={() => setDeleting(null)} /><PrimaryButton title="Remover" tone="ink" onPress={removeTransaction} icon="delete-outline" /></View>}>
        <Text style={{ color: C.muted, fontFamily: SANS, fontSize: 14, lineHeight: 21 }}>{deleting?.merchant} · {deleting ? money(deleting.amount, data.currency) : ""}</Text>
      </AppModal>
    </Page>
  );
}

function TransactionRow({ transaction, currency, onPress, onDelete, onTogglePaid }: { transaction: Transaction; currency: string; onPress: () => void; onDelete: () => void; onTogglePaid: () => void }) {
  const countdown = transaction.kind === "expense" && !transaction.paid ? daysUntil(transaction.dueDate) : null;
  const dueLabel = countdown === null ? "" : countdown < 0 ? `Atrasada há ${Math.abs(countdown)} d` : countdown === 0 ? "Vence hoje" : countdown === 1 ? "Vence amanhã" : `Vence em ${countdown} d`;
  const dueTone = countdown !== null && countdown <= 2 ? "coral" : "amber";
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${transaction.kind === "expense" ? "Despesa" : "Receita"} ${transaction.merchant}, ${money(transaction.amount, currency)}, categoria ${transaction.category}. Toque para editar.`} style={({ pressed }) => [rowCard, { opacity: pressed ? 0.82 : 1 }]}>
      <View style={rowTop}>
        <View style={[rowIcon, { backgroundColor: transaction.kind === "expense" ? C.blueSoft : C.greenSoft }]}><MaterialCommunityIcons name={iconFor(transaction.icon, `${transaction.merchant} ${transaction.category}`, transaction.kind === "expense" ? "arrow-top-right" : "arrow-bottom-left") as "arrow-top-right"} size={19} color={transaction.kind === "expense" ? C.blue : C.green} /></View>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}><Text numberOfLines={1} style={merchantStyle}>{transaction.merchant}</Text><Text numberOfLines={1} style={rowMeta}>{transaction.category} · {displayDate(transaction.date)}</Text></View>
        <View style={{ alignItems: "flex-end", gap: 5 }}><Text style={[amountNumber, { color: transaction.kind === "expense" ? C.blueDark : C.greenDark }]}>{transaction.kind === "expense" ? "−" : "+"}{money(transaction.amount, currency)}</Text><PriorityTag priority={transaction.priority} /></View>
      </View>
      <View style={rowBottom}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 }}>
          <Tag label={transaction.kind === "expense" ? transaction.paid ? "Pago" : "Pendente" : "Recebido"} tone={transaction.kind === "expense" && !transaction.paid ? "amber" : transaction.kind === "expense" ? "muted" : "green"} />
          {dueLabel ? <Tag label={dueLabel} tone={dueTone} icon="calendar-clock" /> : null}
          {transaction.account && transaction.account !== "main" ? <Tag label={accountLabel(transaction.account)} tone="blue" icon={ACCOUNTS.find((a) => a.id === transaction.account)?.icon as never} /> : null}
          {transaction.installment ? <Tag label={`Parcela ${transaction.installment}`} tone="muted" /> : null}
          {transaction.receiptUri ? <Tag label="Recibo" tone="blue" icon="receipt" /> : null}
        </View>
        {transaction.kind === "expense" ? <Pressable onPress={(event) => { event.stopPropagation(); onTogglePaid(); }} accessibilityRole="button" accessibilityLabel={transaction.paid ? "Marcar despesa como pendente" : "Marcar despesa como paga"} style={paidAction}><MaterialCommunityIcons name={transaction.paid ? "checkbox-marked-circle-outline" : "circle-outline"} size={17} color={C.green} /><Text style={{ color: C.greenDark, fontFamily: SANS, fontSize: 11, fontWeight: "700" }}>{transaction.paid ? "Paga" : "Marcar paga"}</Text></Pressable> : <Pressable onPress={(event) => { event.stopPropagation(); onDelete(); }} accessibilityRole="button" accessibilityLabel="Remover movimento" style={{ padding: 4 }}><MaterialCommunityIcons name="delete-outline" size={18} color={C.muted} /></Pressable>}
      </View>
      {transaction.notes ? <Text numberOfLines={2} style={{ color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 18 }}>{transaction.notes}</Text> : null}
    </Pressable>
  );
}

const balanceLabel = { color: "rgba(255,255,255,0.78)", fontFamily: SANS, fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.2 };
const balanceValue = { color: "#FFFFFF", fontFamily: SANS, fontSize: 33, fontWeight: "700" as const, letterSpacing: -0.8 };
const metricBox = { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, paddingHorizontal: 11, paddingVertical: 10, gap: 7 };
const metricLabel = { color: "rgba(255,255,255,0.8)", fontFamily: SANS, fontSize: 11, fontWeight: "600" as const };
const metricValue = { color: "#FFFFFF", fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const dueBanner = { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, backgroundColor: C.dangerSoft, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 15 };
const searchBox = { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, minHeight: 47, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 13 };
const searchInput = { flex: 1, paddingVertical: 10, color: C.ink, fontFamily: SANS, fontSize: 14 };
const mutedText = { color: C.muted, fontFamily: SANS, fontSize: 13 };
const rowCard = { backgroundColor: C.surface, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: C.line, gap: 12 };
const rowTop = { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 };
const rowIcon = { width: 38, height: 38, borderRadius: 14, alignItems: "center" as const, justifyContent: "center" as const };
const merchantStyle = { color: C.ink, fontFamily: SANS, fontWeight: "700" as const, fontSize: 14 };
const rowMeta = { color: C.muted, fontFamily: SANS, fontSize: 11 };
const amountNumber = { fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const rowBottom = { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, justifyContent: "space-between" as const };
const paidAction = { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, paddingVertical: 6, paddingLeft: 6 };
const emptyIcon = { width: 62, height: 62, borderRadius: 22, backgroundColor: C.greenSoft, alignItems: "center" as const, justifyContent: "center" as const };
const emptyTitle = { color: C.ink, fontFamily: SANS, fontSize: 19, fontWeight: "800" as const, textAlign: "center" as const };
const moreFiltersBtn = { alignSelf: "flex-start" as const, flexDirection: "row" as const, alignItems: "center" as const, gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: C.greenSoft };
