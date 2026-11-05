import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, Card, ChoiceChips, EmptyState, Field, PrimaryButton, SectionTitle } from "@/components/app-ui";
import { useAppData, EXPENSE_CATEGORIES, type FinanceScope, type MonthlyBudget, type Transaction } from "@/lib/app-data";
import { C, SANS } from "@/lib/design";
import { createId, localDateKey, money, parseAmount } from "@/lib/format";

type BudgetPanelProps = { scope: FinanceScope; transactions: Transaction[]; currency: string };

export function BudgetPanel({ scope, transactions, currency }: BudgetPanelProps) {
  const { data, updateData } = useAppData();
  const month = localDateKey().slice(0, 7);
  const [editing, setEditing] = useState<MonthlyBudget | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [limitText, setLimitText] = useState("");
  const [error, setError] = useState("");

  const budgets = useMemo(
    () => data.budgets.filter((budget) => budget.month === month && budget.scope === scope),
    [data.budgets, month, scope],
  );
  const categories = useMemo(
    () => [...new Set([...EXPENSE_CATEGORIES, ...data.customExpenseCategories, ...budgets.map((budget) => budget.category)])],
    [data.customExpenseCategories, budgets],
  );

  const spentFor = (budget: MonthlyBudget) => transactions
    .filter((transaction) => transaction.kind === "expense"
      && transaction.scope === scope
      && transaction.category === budget.category
      && transaction.date.slice(0, 7) === month)
    .reduce((total, transaction) => total + transaction.amount, 0);

  const openCreate = () => {
    setEditing(null);
    setCategory(categories[0] ?? EXPENSE_CATEGORIES[0]);
    setLimitText("");
    setError("");
    setConfirmDelete(false);
    setModalOpen(true);
  };

  const openEdit = (budget: MonthlyBudget) => {
    setEditing(budget);
    setCategory(budget.category);
    setLimitText(String(budget.limit).replace(".", ","));
    setError("");
    setConfirmDelete(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setConfirmDelete(false);
  };

  const saveBudget = () => {
    const cleanCategory = category.trim();
    const limit = parseAmount(limitText);
    if (!cleanCategory) { setError("Escolha uma categoria."); return; }
    if (!Number.isFinite(limit) || limit <= 0) { setError("Informe um limite superior a zero."); return; }
    updateData((current) => {
      const matching = current.budgets.find((budget) => budget.month === month && budget.scope === scope && budget.category.toLocaleLowerCase("pt-BR") === cleanCategory.toLocaleLowerCase("pt-BR"));
      const id = editing?.id ?? matching?.id ?? createId();
      const next: MonthlyBudget = { id, month, category: cleanCategory, scope, limit };
      return { ...current, budgets: [...current.budgets.filter((budget) => budget.id !== id && !(budget.month === month && budget.scope === scope && budget.category.toLocaleLowerCase("pt-BR") === cleanCategory.toLocaleLowerCase("pt-BR"))), next] };
    });
    closeModal();
  };

  const removeBudget = () => {
    if (!editing) return;
    updateData((current) => ({ ...current, budgets: current.budgets.filter((budget) => budget.id !== editing.id) }));
    closeModal();
  };

  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title="Orçamentos deste mês" action="Novo orçamento" onAction={openCreate} />
      {budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon="wallet-outline"
            title="Defina um limite para este mês"
            description="Crie um orçamento por categoria para acompanhar as despesas deste mês neste grupo. Os valores gastos são calculados automaticamente a partir dos movimentos."
            action={<PrimaryButton title="Criar orçamento" onPress={openCreate} icon="plus" />}
          />
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {budgets.map((budget) => {
            const spent = spentFor(budget);
            const remaining = budget.limit - spent;
            const ratio = spent / budget.limit;
            const over = remaining < 0;
            const progressColor = over ? C.danger : ratio >= 0.8 ? C.amber : C.green;
            const amountLabel = over ? `Excesso de ${money(Math.abs(remaining), currency)}` : `Restam ${money(remaining, currency)}`;
            const percent = Math.round(ratio * 100);
            return (
              <Pressable key={budget.id} onPress={() => openEdit(budget)} accessibilityRole="button" accessibilityLabel={`${budget.category}. Limite ${money(budget.limit, currency)}. Gasto ${money(spent, currency)}. ${amountLabel}. Toque para editar.`} style={({ pressed }) => [styles.budgetCard, pressed ? { opacity: 0.84 } : null]}>
                <View style={styles.row}>
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Text numberOfLines={1} style={styles.category}>{budget.category}</Text>
                    <Text style={styles.helper}>Limite mensal · {money(budget.limit, currency)}</Text>
                  </View>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={C.muted} />
                </View>
                <View style={styles.row}>
                  <Text style={styles.spent}>{money(spent, currency)} <Text style={styles.helper}>gastos</Text></Text>
                  <Text style={[styles.remaining, { color: over ? C.danger : C.greenDark }]}>{amountLabel}</Text>
                </View>
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel={`Progresso do orçamento de ${budget.category}`}
                  accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.max(0, percent)), text: `${percent}% utilizado${over ? ", acima do limite" : ""}` }}
                  style={styles.progressTrack}
                >
                  <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: progressColor }]} />
                </View>
                <Text style={styles.progressCaption}>{percent}% do limite utilizado{over ? " · acima do orçamento" : ""}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <AppModal
        visible={modalOpen}
        title={editing ? "Editar orçamento" : "Novo orçamento"}
        subtitle="Defina um limite para uma categoria neste mês."
        onClose={closeModal}
        footer={<View style={{ gap: 9 }}>
          {editing ? <PrimaryButton title="Limpar orçamento" tone="light" icon="delete-outline" onPress={() => setConfirmDelete(true)} /> : null}
          <PrimaryButton title={editing ? "Salvar alterações" : "Salvar orçamento"} icon="check" onPress={saveBudget} />
        </View>}
      >
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Categoria</Text>
          <ChoiceChips values={categories} selected={category} onSelect={setCategory} horizontal={false} />
        </View>
        <Field label={`Limite (${currency})`} value={limitText} onChangeText={(value) => { setLimitText(value); setError(""); }} placeholder="Ex.: 250,00" keyboardType="decimal-pad" error={error || undefined} />
        {confirmDelete ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>Queres eliminar o orçamento de {editing?.category}? Esta ação não pode ser desfeita.</Text>
            <View style={{ flexDirection: "row", gap: 9 }}>
              <View style={{ flex: 1 }}><PrimaryButton title="Cancelar" tone="light" onPress={() => setConfirmDelete(false)} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title="Excluir" tone="ink" icon="delete-outline" onPress={removeBudget} /></View>
            </View>
          </View>
        ) : null}
        <Text style={styles.helper}>Os gastos consideram apenas despesas registradas neste mês e neste grupo. O total não é salvo.</Text>
      </AppModal>
    </View>
  );
}

const styles = {
  budgetCard: { backgroundColor: C.surface, borderRadius: 19, padding: 16, borderWidth: 1, borderColor: C.line, gap: 12 } as const,
  row: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: 10 },
  category: { color: C.ink, fontFamily: SANS, fontSize: 16, fontWeight: "700" as const },
  helper: { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 },
  spent: { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const },
  remaining: { fontFamily: SANS, fontSize: 12, fontWeight: "700" as const, textAlign: "right" as const, flexShrink: 1 },
  progressTrack: { height: 9, borderRadius: 8, backgroundColor: C.greenSoft, overflow: "hidden" as const },
  progressFill: { height: "100%" as const, borderRadius: 8 },
  progressCaption: { color: C.muted, fontFamily: SANS, fontSize: 11, fontWeight: "600" as const },
  label: { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const },
  confirmBox: { backgroundColor: C.dangerSoft, borderRadius: 15, padding: 13, gap: 11 },
  confirmText: { color: C.ink, fontFamily: SANS, fontSize: 13, lineHeight: 19 },
};
