import { IconPicker } from "@/components/ThemePickers";
import { iconFor } from "@/lib/themes";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, Card, ChoiceChips, EmptyState, Field, IconButton, PrimaryButton, SectionTitle, Tag } from "@/components/app-ui";
import { ACCOUNTS, EXPENSE_CATEGORIES, accountLabel, useAppData, type AccountId, type Debt, type RecurringBill, type SavingsGoal, type Transaction } from "@/lib/app-data";
import { C, SANS } from "@/lib/design";
import { createId, displayDate, localDateKey, money, parseAmount } from "@/lib/format";
import { addMonths, billStatus, cardInvoices, currentInvoiceMonth, monthKey, monthLabel, monthSummary, parseStatement, payBill, type StatementRow } from "@/lib/finance-extra";

/* ---------- Contas fixas ---------- */

export function RecurringBillsPanel({ onToast }: { onToast: (message: string) => void }) {
  const { data, updateData } = useAppData();
  const [editing, setEditing] = useState<RecurringBill | null>(null);
  const [open, setOpen] = useState(false);
  const month = monthKey();
  const bills = data.recurringBills.filter((b) => b.active).map((b) => ({ bill: b, ...billStatus(b, month) })).sort((a, b) => Number(a.paid) - Number(b.paid) || a.dueDate.localeCompare(b.dueDate));
  const total = bills.reduce((s, b) => s + b.bill.amount, 0);
  const pending = bills.filter((b) => !b.paid).reduce((s, b) => s + b.bill.amount, 0);

  const save = (bill: RecurringBill) => {
    updateData((current) => ({ ...current, recurringBills: [bill, ...current.recurringBills.filter((b) => b.id !== bill.id)] }));
    setOpen(false); onToast("Conta fixa salva.");
  };
  const remove = (bill: RecurringBill) => {
    updateData((current) => ({ ...current, recurringBills: current.recurringBills.filter((b) => b.id !== bill.id) }));
    setOpen(false); onToast("Conta fixa removida. Os pagamentos já registrados continuam nos movimentos.");
  };
  const pay = (bill: RecurringBill) => { updateData((current) => payBill(current, bill, month)); onToast(`${bill.name} paga. O pagamento entrou nos movimentos.`); };

  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title={`Contas fixas · ${monthLabel(month)}`} action="Nova conta" onAction={() => { setEditing(null); setOpen(true); }} />
      {bills.length ? <Card style={{ gap: 4 }}>
        <View style={summaryRow}><Text style={muted}>Total do mês</Text><Text style={strong}>{money(total, data.currency)}</Text></View>
        <View style={summaryRow}><Text style={muted}>Falta pagar</Text><Text style={[strong, { color: pending ? C.danger : C.green }]}>{money(pending, data.currency)}</Text></View>
      </Card> : null}
      {bills.length ? bills.map(({ bill, paid, days, overdue, dueDate }) => (
        <Pressable key={bill.id} onPress={() => { setEditing(bill); setOpen(true); }} accessibilityRole="button" style={row}>
          <View style={[icon, { backgroundColor: paid ? C.greenSoft : overdue ? C.dangerSoft : C.amberSoft }]}><MaterialCommunityIcons name={(paid ? "check" : iconFor(bill.icon, bill.name, "calendar-clock")) as "check"} size={18} color={paid ? C.green : overdue ? C.danger : "#80611E"} /></View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}><Text numberOfLines={1} style={strong}>{bill.name}</Text><Text style={muted}>{money(bill.amount, data.currency)} · vence dia {bill.dueDay} · {accountLabel(bill.account)}</Text></View>
          {paid ? <Tag label="Paga" tone="green" /> : <Pressable onPress={(e) => { e.stopPropagation(); pay(bill); }} accessibilityRole="button" accessibilityLabel={`Pagar ${bill.name}`} style={payButton}><Text style={payText}>{overdue ? `Atrasada ${Math.abs(days)} d · Pagar` : days === 0 ? "Hoje · Pagar" : "Pagar"}</Text></Pressable>}
        </Pressable>
      )) : <Card><EmptyState icon="calendar-sync-outline" title="Nenhuma conta fixa" description={`Cadastre aluguel, luz, internet, faculdade e assinaturas uma vez. Todo mês o Dá Conta lembra o que falta pagar. Vencimento de ${displayDate(localDateKey())} em diante aparece no Hoje.`} action={<PrimaryButton title="Adicionar conta fixa" icon="plus" onPress={() => { setEditing(null); setOpen(true); }} />} /></Card>}
      {open ? <BillForm initial={editing} onClose={() => setOpen(false)} onSave={save} onDelete={remove} /> : null}
    </View>
  );
}

function BillForm({ initial, onClose, onSave, onDelete }: { initial: RecurringBill | null; onClose: () => void; onSave: (bill: RecurringBill) => void; onDelete: (bill: RecurringBill) => void }) {
  const { data } = useAppData();
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount).replace(".", ",") : "");
  const [dueDay, setDueDay] = useState(String(initial?.dueDay ?? 10));
  const [billIcon, setBillIcon] = useState(initial?.icon ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Contas da casa");
  const [account, setAccount] = useState<AccountId>(initial?.account ?? "main");
  const [error, setError] = useState("");
  const submit = () => {
    const value = parseAmount(amount); const day = Number(dueDay);
    if (!name.trim()) return setError("Dê um nome para a conta, como Aluguel ou Internet.");
    if (!Number.isFinite(value) || value <= 0) return setError("Informe o valor mensal.");
    if (!Number.isInteger(day) || day < 1 || day > 31) return setError("O dia do vencimento vai de 1 a 31.");
    onSave({ id: initial?.id ?? createId(), name: name.trim(), amount: value, dueDay: day, category, account, paidMonths: initial?.paidMonths ?? [], active: true, ...(billIcon ? { icon: billIcon } : {}) });
  };
  return (
    <AppModal visible title={initial ? "Editar conta fixa" : "Nova conta fixa"} subtitle="Contas que se repetem todo mês." onClose={onClose} footer={<View style={{ gap: 9 }}><PrimaryButton title="Salvar conta" icon="check" onPress={submit} />{initial ? <PrimaryButton title="Remover conta fixa" tone="light" icon="delete-outline" onPress={() => onDelete(initial)} /> : null}</View>}>
      <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Aluguel, Internet, Faculdade" />
      <IconPicker text={name} value={billIcon} onChange={setBillIcon} />
      <ChoiceChips values={["Aluguel", "Luz", "Água", "Internet", "Celular", "Faculdade", "Academia", "Streaming"]} selected={name} onSelect={(v) => { setName(v); setCategory(v === "Aluguel" ? "Moradia" : v === "Faculdade" ? "Educação" : v === "Academia" ? "Saúde" : v === "Streaming" ? "Assinaturas" : "Contas da casa"); }} horizontal={false} />
      <Field label="Valor mensal" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" />
      <Field label="Dia do vencimento" value={dueDay} onChangeText={(v) => setDueDay(v.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder="10" />
      <View style={{ gap: 7 }}><Text style={label}>Categoria</Text><ChoiceChips values={[...EXPENSE_CATEGORIES, ...data.customExpenseCategories]} selected={category} onSelect={setCategory} horizontal={false} /></View>
      <View style={{ gap: 7 }}><Text style={label}>Paga com</Text><ChoiceChips values={ACCOUNTS.map((a) => a.label)} selected={accountLabel(account)} onSelect={(v) => setAccount(ACCOUNTS.find((a) => a.label === v)?.id ?? "main")} horizontal={false} /></View>
      {error ? <Text accessibilityRole="alert" style={errorText}>{error}</Text> : null}
    </AppModal>
  );
}

/* ---------- Cartão de crédito ---------- */

export function CreditCardPanel() {
  const { data, updateData } = useAppData();
  const [configOpen, setConfigOpen] = useState(false);
  const invoices = useMemo(() => cardInvoices(data.transactions, data.creditCard), [data.transactions, data.creditCard]);
  const current = currentInvoiceMonth(data.creditCard);
  const [selected, setSelected] = useState(current);
  const invoice = invoices.find((i) => i.month === selected) ?? { month: selected, items: [] as Transaction[], total: 0, dueDate: "" };
  const futureTotal = invoices.filter((i) => i.month >= current).reduce((s, i) => s + i.total, 0);
  const limit = data.creditCard.limit;
  const months = [addMonths(current, -1), current, addMonths(current, 1), addMonths(current, 2)];
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title="Cartão de crédito" action="Configurar" onAction={() => setConfigOpen(true)} />
      <Card style={{ backgroundColor: C.blueDark, borderColor: C.blueDark, gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={cardEyebrow}>FATURA DE {monthLabel(invoice.month).toUpperCase()}</Text><MaterialCommunityIcons name="credit-card-outline" size={19} color="rgba(255,255,255,0.82)" /></View>
        <Text style={cardValue}>{money(invoice.total, data.currency)}</Text>
        <Text style={cardSub}>Fecha dia {data.creditCard.closingDay} · vence dia {data.creditCard.dueDay}{invoice.dueDate ? ` (${displayDate(invoice.dueDate)})` : ""}</Text>
        {limit > 0 ? <View style={{ gap: 6 }}>
          <View style={bar}><View style={[barFill, { width: `${Math.min(100, (futureTotal / limit) * 100)}%`, backgroundColor: futureTotal > limit * 0.8 ? "#F2A58E" : "#9BD3B8" }]} /></View>
          <Text style={cardSub}>Limite usado: {money(futureTotal, data.currency)} de {money(limit, data.currency)} · disponível {money(Math.max(0, limit - futureTotal), data.currency)}</Text>
        </View> : null}
      </Card>
      <ChoiceChips values={months.map(monthLabel)} selected={monthLabel(selected)} onSelect={(v) => setSelected(months.find((m) => monthLabel(m) === v) ?? current)} />
      {invoice.items.length ? <Card style={{ gap: 2 }}>{invoice.items.sort((a, b) => b.date.localeCompare(a.date)).map((t) => <View key={t.id} style={summaryRow}><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={strongSmall}>{t.merchant}{t.installment ? ` · ${t.installment}` : ""}</Text><Text style={muted}>{t.category} · {displayDate(t.date)}</Text></View><Text style={strongSmall}>{money(t.amount, data.currency)}</Text></View>)}</Card>
        : <Card><Text style={muted}>Nenhuma compra no cartão nesta fatura. Ao registrar uma despesa, escolha “Cartão de crédito” em “Paga com” e, se for parcelada, o número de parcelas.</Text></Card>}
      {configOpen ? <CardConfig onClose={() => setConfigOpen(false)} onSave={(card) => { updateData((c) => ({ ...c, creditCard: card })); setConfigOpen(false); }} /> : null}
    </View>
  );
}

function CardConfig({ onClose, onSave }: { onClose: () => void; onSave: (card: { closingDay: number; dueDay: number; limit: number }) => void }) {
  const { data } = useAppData();
  const [closing, setClosing] = useState(String(data.creditCard.closingDay));
  const [due, setDue] = useState(String(data.creditCard.dueDay));
  const [limit, setLimit] = useState(data.creditCard.limit ? String(data.creditCard.limit).replace(".", ",") : "");
  const [error, setError] = useState("");
  const submit = () => {
    const c = Number(closing); const d = Number(due); const l = limit ? parseAmount(limit) : 0;
    if (!(c >= 1 && c <= 31) || !(d >= 1 && d <= 31)) return setError("Os dias vão de 1 a 31.");
    if (!Number.isFinite(l) || l < 0) return setError("Informe um limite válido ou deixe em branco.");
    onSave({ closingDay: c, dueDay: d, limit: l });
  };
  return (
    <AppModal visible title="Seu cartão" subtitle="Veja no app do banco o dia de fechamento e de vencimento da fatura." onClose={onClose} footer={<PrimaryButton title="Salvar cartão" icon="check" onPress={submit} />}>
      <Field label="Dia do fechamento" value={closing} onChangeText={(v) => setClosing(v.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" />
      <Field label="Dia do vencimento" value={due} onChangeText={(v) => setDue(v.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" />
      <Field label="Limite (opcional)" value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder="0,00" />
      {error ? <Text accessibilityRole="alert" style={errorText}>{error}</Text> : null}
    </AppModal>
  );
}

/* ---------- Metas de economia ---------- */

export function GoalsPanel({ onToast }: { onToast: (message: string) => void }) {
  const { data, updateData } = useAppData();
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [open, setOpen] = useState(false);
  const [deposit, setDeposit] = useState<SavingsGoal | null>(null);
  const [depositValue, setDepositValue] = useState("");
  const addDeposit = () => {
    const v = parseAmount(depositValue);
    if (!deposit || !Number.isFinite(v) || v === 0) return;
    updateData((c) => ({ ...c, goals: c.goals.map((g) => g.id === deposit.id ? { ...g, saved: Math.max(0, Math.round((g.saved + v) * 100) / 100) } : g) }));
    onToast(v > 0 ? `${money(v, data.currency)} guardados em ${deposit.name}.` : "Retirada registrada.");
    setDeposit(null); setDepositValue("");
  };
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title="Metas de economia" action="Nova meta" onAction={() => { setEditing(null); setOpen(true); }} />
      {data.goals.length ? data.goals.map((g) => {
        const pct = g.target ? Math.min(1, g.saved / g.target) : 0;
        const rawMonths = g.deadline ? (Number(g.deadline.slice(0, 4)) - new Date().getFullYear()) * 12 + Number(g.deadline.slice(5, 7)) - (new Date().getMonth() + 1) : 0;
        const expired = Boolean(g.deadline) && rawMonths < 0;
        const monthsLeft = g.deadline && !expired ? Math.max(1, rawMonths) : 0;
        const perMonth = monthsLeft ? Math.max(0, g.target - g.saved) / monthsLeft : 0;
        return <Card key={g.id} style={{ gap: 9 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={[icon, { backgroundColor: C.greenSoft }]}><MaterialCommunityIcons name={(pct >= 1 ? "trophy-outline" : iconFor(g.icon, g.name, "piggy-bank-outline")) as "check"} size={18} color={C.green} /></View><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={strong}>{g.name}</Text><Text style={muted}>{money(g.saved, data.currency)} de {money(g.target, data.currency)}{g.deadline ? ` · até ${displayDate(g.deadline)}` : ""}</Text></View><IconButton name="pencil-outline" label={`Editar ${g.name}`} tone="soft" onPress={() => { setEditing(g); setOpen(true); }} /></View>
          <View style={barLight}><View style={[barFill, { width: `${pct * 100}%`, backgroundColor: C.green }]} /></View>
          <Text style={muted}>{pct >= 1 ? "Meta alcançada. Parabéns!" : expired ? `Prazo encerrado · ${Math.round(pct * 100)}% do caminho. Edite a meta para escolher um novo prazo.` : perMonth ? `Guardando ${money(perMonth, data.currency)} por mês você chega lá no prazo.` : `${Math.round(pct * 100)}% do caminho.`}</Text>
          <PrimaryButton title="Guardar dinheiro" tone="light" icon="plus" onPress={() => { setDeposit(g); setDepositValue(""); }} />
        </Card>;
      }) : <Card><EmptyState icon="piggy-bank-outline" title="Nenhuma meta ainda" description="Comece pela reserva de emergência: o ideal é juntar de 3 a 6 meses dos seus gastos." action={<PrimaryButton title="Criar reserva de emergência" icon="plus" onPress={() => { setEditing({ id: "", name: "Reserva de emergência", target: 0, saved: 0, deadline: "" }); setOpen(true); }} />} /></Card>}
      {open ? <GoalForm initial={editing} onClose={() => setOpen(false)} onSave={(g) => { updateData((c) => ({ ...c, goals: [g, ...c.goals.filter((x) => x.id !== g.id)] })); setOpen(false); onToast("Meta salva."); }} onDelete={(g) => { updateData((c) => ({ ...c, goals: c.goals.filter((x) => x.id !== g.id) })); setOpen(false); onToast("Meta removida."); }} /> : null}
      <AppModal visible={Boolean(deposit)} title={`Guardar em ${deposit?.name ?? ""}`} subtitle="Use um valor negativo para registrar uma retirada." onClose={() => setDeposit(null)} footer={<PrimaryButton title="Confirmar" icon="check" onPress={addDeposit} />}>
        <Field label="Valor" value={depositValue} onChangeText={setDepositValue} keyboardType="numbers-and-punctuation" placeholder="0,00" />
      </AppModal>
    </View>
  );
}

function GoalForm({ initial, onClose, onSave, onDelete }: { initial: SavingsGoal | null; onClose: () => void; onSave: (g: SavingsGoal) => void; onDelete: (g: SavingsGoal) => void }) {
  const { data } = useAppData();
  const monthlyExpense = useMemo(() => { const s = monthSummary(data, addMonths(monthKey(), -1)); return s.expense || monthSummary(data, monthKey()).expense; }, [data]);
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial?.target ? String(initial.target).replace(".", ",") : "");
  const [saved, setSaved] = useState(initial?.saved ? String(initial.saved).replace(".", ",") : "");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [goalIcon, setGoalIcon] = useState(initial?.icon ?? "");
  const [error, setError] = useState("");
  const submit = () => {
    const t = parseAmount(target); const s = saved ? parseAmount(saved) : 0;
    if (!name.trim()) return setError("Dê um nome para a meta.");
    if (!Number.isFinite(t) || t <= 0) return setError("Informe quanto quer juntar.");
    if (deadline && !/^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/.test(deadline)) return setError("Use o prazo no formato AAAA-MM, por exemplo 2027-06.");
    onSave({ id: initial?.id || createId(), name: name.trim(), target: t, saved: Number.isFinite(s) ? s : 0, deadline: deadline.length === 7 ? `${deadline}-28` : deadline, ...(goalIcon ? { icon: goalIcon } : {}) });
  };
  return (
    <AppModal visible title={initial?.id ? "Editar meta" : "Nova meta"} onClose={onClose} footer={<View style={{ gap: 9 }}><PrimaryButton title="Salvar meta" icon="check" onPress={submit} />{initial?.id ? <PrimaryButton title="Remover meta" tone="light" icon="delete-outline" onPress={() => onDelete(initial)} /> : null}</View>}>
      <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Reserva de emergência, Viagem, Moto" />
      <IconPicker text={name} value={goalIcon} onChange={setGoalIcon} />
      <Field label="Quanto quer juntar" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="0,00" />
      {monthlyExpense > 0 && /reserva/i.test(name) ? <Pressable onPress={() => setTarget(String(Math.round(monthlyExpense * 6)))}><Text style={link}>Sugestão: 6 meses dos seus gastos = {money(monthlyExpense * 6, data.currency)}</Text></Pressable> : null}
      <Field label="Já guardado (opcional)" value={saved} onChangeText={setSaved} keyboardType="decimal-pad" placeholder="0,00" />
      <Field label="Prazo (opcional, AAAA-MM)" value={deadline.slice(0, 7)} onChangeText={setDeadline} placeholder="2027-06" />
      {error ? <Text accessibilityRole="alert" style={errorText}>{error}</Text> : null}
    </AppModal>
  );
}

/* ---------- Plano de dívidas ---------- */

export function DebtsPanel({ onToast }: { onToast: (message: string) => void }) {
  const { data, updateData } = useAppData();
  const [editing, setEditing] = useState<Debt | null>(null);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"Bola de neve" | "Avalanche">("Avalanche");
  const active = data.debts.filter((d) => d.total - d.paid > 0.009);
  const ordered = [...active].sort((a, b) => method === "Avalanche" ? b.interest - a.interest || (a.total - a.paid) - (b.total - b.paid) : (a.total - a.paid) - (b.total - b.paid));
  const remaining = active.reduce((s, d) => s + d.total - d.paid, 0);
  const monthly = active.reduce((s, d) => s + d.monthly, 0);
  const pay = (d: Debt) => {
    const amount = Math.min(d.monthly || d.total - d.paid, d.total - d.paid);
    updateData((c) => ({ ...c, debts: c.debts.map((x) => x.id === d.id ? { ...x, paid: Math.round((x.paid + amount) * 100) / 100 } : x), transactions: [{ id: createId(), kind: "expense", amount, merchant: `Parcela: ${d.name}`, category: "Outros", date: localDateKey(), dueDate: "", paid: true, priority: "high", notes: "Pagamento de dívida", receiptUri: "", scope: "personal", account: "main" }, ...c.transactions] }));
    onToast(`Pagamento de ${money(amount, data.currency)} registrado.`);
  };
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title="Plano de dívidas" action="Nova dívida" onAction={() => { setEditing(null); setOpen(true); }} />
      {active.length ? <>
        <Card style={{ gap: 4 }}>
          <View style={summaryRow}><Text style={muted}>Total que falta pagar</Text><Text style={[strong, { color: C.danger }]}>{money(remaining, data.currency)}</Text></View>
          <View style={summaryRow}><Text style={muted}>Parcelas por mês</Text><Text style={strong}>{money(monthly, data.currency)}</Text></View>
          {monthly > 0 ? <View style={summaryRow}><Text style={muted}>Livre das dívidas em cerca de</Text><Text style={strong}>{Math.ceil(remaining / monthly)} meses</Text></View> : null}
        </Card>
        <ChoiceChips values={["Avalanche", "Bola de neve"]} selected={method} onSelect={(v) => setMethod(v as typeof method)} />
        <Text style={muted}>{method === "Avalanche" ? "Avalanche: pague o mínimo em todas e jogue o dinheiro extra na de juros mais altos. Economiza mais." : "Bola de neve: quite primeiro a menor dívida. Cada uma que acaba dá ânimo para a próxima."}</Text>
        {ordered.map((d, i) => { const left = d.total - d.paid; return (
          <Card key={d.id} style={{ gap: 8, borderColor: i === 0 ? C.green : C.line }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={[icon, { backgroundColor: i === 0 ? C.greenSoft : C.paper }]}><Text style={[strong, { color: i === 0 ? C.green : C.muted }]}>{i + 1}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={strong}>{d.name}</Text><Text style={muted}>Falta {money(left, data.currency)}{d.interest ? ` · ${String(d.interest).replace(".", ",")}% ao mês` : ""}{d.monthly ? ` · parcela ${money(d.monthly, data.currency)}` : ""}</Text></View>
              <IconButton name="pencil-outline" label={`Editar ${d.name}`} tone="soft" onPress={() => { setEditing(d); setOpen(true); }} />
            </View>
            <View style={barLight}><View style={[barFill, { width: `${d.total ? (d.paid / d.total) * 100 : 0}%`, backgroundColor: C.green }]} /></View>
            {i === 0 ? <Text style={[muted, { color: C.greenDark, fontWeight: "700" }]}>Foque aqui primeiro.</Text> : null}
            <PrimaryButton title={`Registrar pagamento de ${money(Math.min(d.monthly || left, left), data.currency)}`} tone="light" icon="cash-check" onPress={() => pay(d)} />
          </Card>); })}
      </> : <Card><EmptyState icon="hand-coin-outline" title={data.debts.length ? "Nenhuma dívida em aberto" : "Sem dívidas cadastradas"} description={data.debts.length ? "Todas as dívidas cadastradas foram quitadas." : "Liste cartão rotativo, empréstimos e parcelas atrasadas. O Dá Conta mostra qual quitar primeiro e quando você fica livre."} action={<PrimaryButton title="Adicionar dívida" icon="plus" onPress={() => { setEditing(null); setOpen(true); }} />} /></Card>}
      {open ? <DebtForm initial={editing} onClose={() => setOpen(false)} onSave={(d) => { updateData((c) => ({ ...c, debts: [d, ...c.debts.filter((x) => x.id !== d.id)] })); setOpen(false); onToast("Dívida salva."); }} onDelete={(d) => { updateData((c) => ({ ...c, debts: c.debts.filter((x) => x.id !== d.id) })); setOpen(false); onToast("Dívida removida."); }} /> : null}
    </View>
  );
}

function DebtForm({ initial, onClose, onSave, onDelete }: { initial: Debt | null; onClose: () => void; onSave: (d: Debt) => void; onDelete: (d: Debt) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [total, setTotal] = useState(initial ? String(Math.round((initial.total - initial.paid) * 100) / 100).replace(".", ",") : "");
  const [monthly, setMonthly] = useState(initial?.monthly ? String(initial.monthly).replace(".", ",") : "");
  const [interest, setInterest] = useState(initial?.interest ? String(initial.interest).replace(".", ",") : "");
  const [error, setError] = useState("");
  const submit = () => {
    const t = parseAmount(total); const m = monthly ? parseAmount(monthly) : 0; const j = interest ? parseAmount(interest) : 0;
    if (!name.trim()) return setError("Dê um nome, como Cartão Nubank ou Empréstimo.");
    if (!Number.isFinite(t) || t <= 0) return setError("Informe quanto ainda falta pagar.");
    onSave({ id: initial?.id ?? createId(), name: name.trim(), total: t, paid: 0, monthly: Number.isFinite(m) ? m : 0, interest: Number.isFinite(j) ? j : 0 });
  };
  return (
    <AppModal visible title={initial ? "Editar dívida" : "Nova dívida"} onClose={onClose} footer={<View style={{ gap: 9 }}><PrimaryButton title="Salvar dívida" icon="check" onPress={submit} />{initial ? <PrimaryButton title="Remover dívida" tone="light" icon="delete-outline" onPress={() => onDelete(initial)} /> : null}</View>}>
      <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Cartão rotativo, Empréstimo, Loja" />
      <Field label="Quanto ainda falta pagar" value={total} onChangeText={setTotal} keyboardType="decimal-pad" placeholder="0,00" />
      <Field label="Parcela mensal (opcional)" value={monthly} onChangeText={setMonthly} keyboardType="decimal-pad" placeholder="0,00" />
      <Field label="Juros ao mês em % (opcional)" value={interest} onChangeText={setInterest} keyboardType="decimal-pad" placeholder="Ex.: 12,5" />
      {error ? <Text accessibilityRole="alert" style={errorText}>{error}</Text> : null}
    </AppModal>
  );
}

/* ---------- Resumo do mês ---------- */

export function MonthSummaryPanel() {
  const { data } = useAppData();
  const [month, setMonth] = useState(monthKey());
  const s = monthSummary(data, month);
  const prev = monthSummary(data, addMonths(month, -1));
  const diff = prev.expense ? (s.expense - prev.expense) / prev.expense : null;
  const top = s.categories.slice(0, 5);
  const max = top[0]?.[1] ?? 1;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <IconButton name="chevron-left" label="Mês anterior" tone="soft" onPress={() => setMonth(addMonths(month, -1))} />
        <Text style={[strong, { fontSize: 16 }]}>{monthLabel(month)}</Text>
        <IconButton name="chevron-right" label="Próximo mês" tone="soft" onPress={() => setMonth(addMonths(month, 1))} />
      </View>
      <Card style={{ gap: 6 }}>
        <View style={summaryRow}><Text style={muted}>Entrou</Text><Text style={[strong, { color: C.green }]}>{money(s.income, data.currency)}</Text></View>
        <View style={summaryRow}><Text style={muted}>Saiu</Text><Text style={[strong, { color: C.blueDark }]}>{money(s.expense, data.currency)}</Text></View>
        <View style={[summaryRow, { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }]}><Text style={strong}>Sobrou</Text><Text style={[strong, { color: s.balance >= 0 ? C.green : C.danger }]}>{money(s.balance, data.currency)}</Text></View>
        {diff !== null ? <Text style={muted}>{diff > 0 ? `Você gastou ${Math.round(diff * 100)}% a mais que em ${monthLabel(addMonths(month, -1)).split(" ")[0].toLowerCase()}.` : diff < 0 ? `Você gastou ${Math.round(-diff * 100)}% a menos que em ${monthLabel(addMonths(month, -1)).split(" ")[0].toLowerCase()}. Muito bem!` : "Mesmo gasto do mês anterior."}</Text> : null}
      </Card>
      <Card style={{ gap: 9 }}>
        <Text style={strong}>Para onde foi o dinheiro</Text>
        {top.length ? top.map(([cat, value]) => <View key={cat} style={{ gap: 4 }}><View style={summaryRow}><Text style={strongSmall}>{cat}</Text><Text style={muted}>{money(value, data.currency)} · {Math.round((value / (s.expense || 1)) * 100)}%</Text></View><View style={barLight}><View style={[barFill, { width: `${(value / max) * 100}%`, backgroundColor: C.blue }]} /></View></View>) : <Text style={muted}>Nenhuma despesa neste mês.</Text>}
      </Card>
      <Card style={{ gap: 6 }}>
        <Text style={strong}>Rotina no mês</Text>
        <View style={summaryRow}><Text style={muted}>Hábitos cumpridos</Text><Text style={strong}>{s.habitRate === null ? "Sem hábitos" : `${Math.round(s.habitRate * 100)}%`}</Text></View>
        <View style={summaryRow}><Text style={muted}>Tarefas concluídas</Text><Text style={strong}>{s.tasksDone}</Text></View>
      </Card>
    </View>
  );
}

/* ---------- Importar extrato ---------- */

export function ImportPanel({ onToast }: { onToast: (message: string) => void }) {
  const { data, updateData } = useAppData();
  const [rows, setRows] = useState<StatementRow[] | null>(null);
  const [account, setAccount] = useState<AccountId>("main");
  const [error, setError] = useState("");
  const existing = useMemo(() => new Set(data.transactions.map((t) => `${t.date}|${t.amount.toFixed(2)}|${t.merchant.toLowerCase()}`)), [data.transactions]);
  const pick = () => {
    setError("");
    if (Platform.OS !== "web" || typeof document === "undefined") { setError("A importação está disponível no site."); return; }
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".ofx,.csv,.txt,text/csv";
    input.onchange = () => { const f = input.files?.[0]; if (!f) return; void f.text().then((text) => { const parsed = parseStatement(text); if (!parsed.length) setError("Não encontrei movimentos nesse arquivo. Use o extrato em OFX ou CSV exportado pelo app ou site do banco."); setRows(parsed); if (/title/.test(text.split("\n")[0] ?? "")) setAccount("card"); }); };
    input.click();
  };
  const fresh = (rows ?? []).filter((r) => !existing.has(`${r.date}|${r.amount.toFixed(2)}|${r.description.toLowerCase()}`));
  const confirm = () => {
    const items: Transaction[] = fresh.map((r) => ({ id: createId(), kind: r.kind, amount: r.amount, merchant: r.description, category: r.category, date: r.date, dueDate: "", paid: true, priority: "medium", notes: "Importado do extrato", receiptUri: "", scope: "personal", account }));
    updateData((c) => ({ ...c, transactions: [...items, ...c.transactions] }));
    onToast(`${items.length} movimentos importados.`); setRows(null);
  };
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title="Importar extrato do banco" />
      <Card style={{ gap: 10 }}>
        <Text style={muted}>No app ou site do seu banco, exporte o extrato ou a fatura em <Text style={strongSmall}>OFX</Text> ou <Text style={strongSmall}>CSV</Text> (Nubank, Inter, Itaú, Bradesco, BB, Caixa e outros). O arquivo é lido só neste aparelho e nada é enviado para a internet.</Text>
        <PrimaryButton title="Escolher arquivo do extrato" icon="file-upload-outline" onPress={pick} />
        {error ? <Text accessibilityRole="alert" style={errorText}>{error}</Text> : null}
      </Card>
      {rows && rows.length ? <Card style={{ gap: 8 }}>
        <Text style={strong}>{fresh.length} novos movimentos{rows.length > fresh.length ? ` · ${rows.length - fresh.length} já existiam e serão ignorados` : ""}</Text>
        <View style={{ gap: 7 }}><Text style={label}>Entram em</Text><ChoiceChips values={ACCOUNTS.map((a) => a.label)} selected={accountLabel(account)} onSelect={(v) => setAccount(ACCOUNTS.find((a) => a.label === v)?.id ?? "main")} horizontal={false} /></View>
        {fresh.slice(0, 8).map((r, i) => <View key={i} style={summaryRow}><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={strongSmall}>{r.description}</Text><Text style={muted}>{r.category} · {displayDate(r.date)}</Text></View><Text style={[strongSmall, { color: r.kind === "expense" ? C.blueDark : C.green }]}>{r.kind === "expense" ? "−" : "+"}{money(r.amount, data.currency)}</Text></View>)}
        {fresh.length > 8 ? <Text style={muted}>e mais {fresh.length - 8}…</Text> : null}
        <PrimaryButton title={`Importar ${fresh.length} movimentos`} icon="check" onPress={confirm} disabled={!fresh.length} />
        <PrimaryButton title="Cancelar" tone="light" onPress={() => setRows(null)} />
      </Card> : null}
    </View>
  );
}

const summaryRow = { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: 10, paddingVertical: 4 };
const muted = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 };
const strong = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const strongSmall = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const label = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const link = { color: C.green, fontFamily: SANS, fontSize: 12, fontWeight: "700" as const };
const errorText = { color: C.danger, fontFamily: SANS, fontSize: 12 };
const row = { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 12 };
const icon = { width: 36, height: 36, borderRadius: 12, alignItems: "center" as const, justifyContent: "center" as const };
const payButton = { backgroundColor: C.green, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8 };
const payText = { color: "#FFFFFF", fontFamily: SANS, fontSize: 12, fontWeight: "800" as const };
const cardEyebrow = { color: "rgba(255,255,255,0.82)", fontFamily: SANS, fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.1 };
const cardValue = { color: "#FFFFFF", fontFamily: SANS, fontSize: 30, fontWeight: "700" as const };
const cardSub = { color: "rgba(255,255,255,0.82)", fontFamily: SANS, fontSize: 12 };
const bar = { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" as const };
const barLight = { height: 8, borderRadius: 4, backgroundColor: C.line, overflow: "hidden" as const };
const barFill = { height: 8, borderRadius: 4 };
