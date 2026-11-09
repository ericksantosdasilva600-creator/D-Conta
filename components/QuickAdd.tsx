import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, ChoiceChips, Field, PrimaryButton } from "@/components/app-ui";
import { ACCOUNTS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, accountLabel, useAppData, type AccountId, type Transaction, type TransactionKind } from "@/lib/app-data";
import { C, SANS } from "@/lib/design";
import { createId, localDateKey, money, parseAmount } from "@/lib/format";
import { parsePhrase } from "@/lib/finance-extra";

function makeTransaction(kind: TransactionKind, amount: number, category: string, merchant: string, account: AccountId, date = localDateKey()): Transaction {
  return { id: createId(), kind, amount, merchant: merchant || category, category, date, dueDate: "", paid: true, priority: "medium", notes: "", receiptUri: "", scope: "personal", account };
}

/** Campo "escreva como fala": "gastei 45 no mercado". Mostra a prévia antes de salvar. */
export function PhraseCapture({ onSaved }: { onSaved: (message: string) => void }) {
  const { data, updateData } = useAppData();
  const [text, setText] = useState("");
  const parsed = useMemo(() => parsePhrase(text), [text]);
  const save = () => {
    if (!parsed) return;
    updateData((c) => ({ ...c, transactions: [makeTransaction(parsed.kind, parsed.amount, parsed.category, parsed.merchant, parsed.account, parsed.date), ...c.transactions] }));
    onSaved(`${parsed.kind === "expense" ? "Despesa" : "Receita"} de ${money(parsed.amount, data.currency)} salva em ${parsed.category}.`);
    setText("");
  };
  return (
    <View style={{ gap: 8 }}>
      <View style={box}>
        <MaterialCommunityIcons name="lightning-bolt-outline" size={19} color={C.green} />
        <TextInput value={text} onChangeText={setText} onSubmitEditing={save} placeholder="Escreva: gastei 45 no mercado" placeholderTextColor={C.muted} accessibilityLabel="Registrar gasto ou receita escrevendo uma frase" style={input} returnKeyType="done" />
        {parsed ? <Pressable onPress={save} accessibilityRole="button" accessibilityLabel="Salvar" style={saveBtn}><MaterialCommunityIcons name="check" size={18} color="#FFFFFF" /></Pressable> : null}
      </View>
      {text.trim() ? <Text style={hint}>{parsed ? `${parsed.kind === "expense" ? "Despesa" : "Receita"} · ${money(parsed.amount, data.currency)} · ${parsed.category} · ${parsed.merchant} · ${accountLabel(parsed.account)}. Toque em ✓ ou Enter para salvar.` : "Inclua um valor. Exemplos: “uber 23”, “recebi 2500 de salário”, “gasolina 150 no cartão”."}</Text> : null}
    </View>
  );
}

/** Registro rápido: só valor e categoria. */
export function QuickAddModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: (message: string) => void }) {
  const { data, updateData } = useAppData();
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [account, setAccount] = useState<AccountId>("main");
  const [error, setError] = useState("");
  const categories = kind === "expense" ? [...EXPENSE_CATEGORIES, ...data.customExpenseCategories] : [...INCOME_CATEGORIES, ...data.customIncomeCategories];
  const save = () => {
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) { setError("Informe o valor."); return; }
    updateData((c) => ({ ...c, transactions: [makeTransaction(kind, value, category, category, account), ...c.transactions] }));
    onSaved(`${kind === "expense" ? "Despesa" : "Receita"} de ${money(value, data.currency)} salva.`);
    setAmount(""); setError(""); onClose();
  };
  return (
    <AppModal visible={visible} title="Registro rápido" subtitle="Valor e categoria. Os detalhes podem ficar para depois." onClose={onClose} footer={<PrimaryButton title="Salvar" icon="check" onPress={save} />}>
      <ChoiceChips values={["Despesa", "Receita"]} selected={kind === "expense" ? "Despesa" : "Receita"} onSelect={(v) => { const k = v === "Receita" ? "income" : "expense"; setKind(k); setCategory(k === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]); }} />
      <Field label="Valor" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" autoFocus error={error || undefined} onSubmitEditing={save} />
      <ChoiceChips values={categories} selected={category} onSelect={setCategory} horizontal={false} />
      <ChoiceChips values={ACCOUNTS.map((a) => a.label)} selected={accountLabel(account)} onSelect={(v) => setAccount(ACCOUNTS.find((a) => a.label === v)?.id ?? "main")} />
    </AppModal>
  );
}

const box = { flexDirection: "row" as const, alignItems: "center" as const, gap: 9, minHeight: 50, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.green, borderRadius: 16, paddingLeft: 13, paddingRight: 6 };
const input = { flex: 1, paddingVertical: 12, color: C.ink, fontFamily: SANS, fontSize: 15 };
const saveBtn = { width: 38, height: 38, borderRadius: 12, backgroundColor: C.green, alignItems: "center" as const, justifyContent: "center" as const };
const hint = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17, paddingHorizontal: 4 };
