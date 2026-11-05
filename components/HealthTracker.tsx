import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, Card, EmptyState, Field, PrimaryButton, SectionTitle } from "@/components/app-ui";
import { DatePickerField } from "@/components/DatePickerField";
import { useAppData, type HealthLog, type HealthLogKind } from "@/lib/app-data";
import { C, SANS } from "@/lib/design";
import { createId, localDateKey } from "@/lib/format";

const ACTIVITY_KINDS: { kind: Exclude<HealthLogKind, "hydration">; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }[] = [
  { kind: "workout", label: "Atividade física", icon: "dumbbell" },
  { kind: "reading", label: "Leitura", icon: "book-open-page-variant-outline" },
  { kind: "study", label: "Estudo", icon: "school-outline" },
];
const KIND_INFO: Record<HealthLogKind, { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }> = {
  hydration: { label: "Água", icon: "cup-water" }, workout: { label: "Atividade física", icon: "dumbbell" },
  reading: { label: "Leitura", icon: "book-open-page-variant-outline" }, study: { label: "Estudo", icon: "school-outline" },
};

export function HealthTracker({ autoCreate = false, onCreateHandled }: { autoCreate?: boolean; onCreateHandled?: () => void }) {
  const { data, updateData, loading } = useAppData();
  const [selectedDate, setSelectedDate] = useState(localDateKey());
  const [customWater, setCustomWater] = useState("");
  const [editing, setEditing] = useState<HealthLog | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [activityKind, setActivityKind] = useState<Exclude<HealthLogKind, "hydration">>("workout");
  const previousAutoCreate = useRef(false);
  useEffect(() => {
    if (autoCreate && !previousAutoCreate.current) {
      setEditing(null);
      setActivityKind("workout");
      setFormOpen(true);
    }
    previousAutoCreate.current = autoCreate;
  }, [autoCreate]);
  const dayLogs = useMemo(() => data.healthLogs.filter((log) => log.date === selectedDate).slice().sort((a, b) => b.id.localeCompare(a.id)), [data.healthLogs, selectedDate]);
  const waterTotal = dayLogs.filter((log) => log.kind === "hydration").reduce((sum, log) => sum + log.amountMl, 0);
  const durationTotal = dayLogs.filter((log) => log.kind !== "hydration").reduce((sum, log) => sum + log.durationMinutes, 0);

  const addWater = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const log: HealthLog = { id: createId(), kind: "hydration", date: selectedDate, amountMl: Math.round(amount), durationMinutes: 0, notes: "" };
    updateData((current) => ({ ...current, healthLogs: [log, ...current.healthLogs] }));
    setCustomWater("");
  };
  const saveLog = (log: HealthLog) => {
    updateData((current) => ({ ...current, healthLogs: editing ? current.healthLogs.map((item) => item.id === log.id ? log : item) : [log, ...current.healthLogs] }));
    setEditing(null); setFormOpen(false); onCreateHandled?.();
  };
  const removeLog = (log: HealthLog) => {
    const perform = () => updateData((current) => ({ ...current, healthLogs: current.healthLogs.filter((item) => item.id !== log.id) }));
    if (typeof globalThis.confirm === "function") {
      if (globalThis.confirm("Apagar este registro?")) perform();
    } else Alert.alert("Apagar registro", "Quer apagar este registro?", [{ text: "Cancelar", style: "cancel" }, { text: "Apagar", style: "destructive", onPress: perform }]);
  };
  const openNewActivity = (kind: Exclude<HealthLogKind, "hydration">) => { setActivityKind(kind); setEditing(null); setFormOpen(true); };

  return <View style={{ gap: 20 }}>
    <DatePickerField label="Dia selecionado" value={selectedDate} onChange={setSelectedDate} />
    {loading ? <Card><Text style={helper}>Carregando seus registros de saúde…</Text></Card> : <>
    <Card style={{ backgroundColor: C.greenDark, borderColor: C.greenDark, padding: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><MaterialCommunityIcons name="chart-box-outline" size={19} color="rgba(255,255,255,0.78)" /><Text style={eyebrow}>RESUMO DO DIA</Text></View>
      <Text style={summary}>{waterTotal.toLocaleString("pt-BR")} ml de água</Text>
      <Text style={summarySub}>{dayLogs.length} {dayLogs.length === 1 ? "registro" : "registros"} · {durationTotal} min de atividades</Text>
    </Card>
    <View style={{ gap: 10 }}>
      <SectionTitle title="Água" />
      <Text style={helper}>Registre a quantidade que você bebeu; sem metas predefinidas.</Text>
      <View style={{ flexDirection: "row", gap: 9 }}>
        {[250, 500].map((amount) => <Pressable key={amount} onPress={() => addWater(amount)} accessibilityRole="button" accessibilityLabel={`Adicionar ${amount} mililitros de água`} style={quickButton}><MaterialCommunityIcons name="plus" size={17} color={C.greenDark} /><Text style={quickText}>+{amount} ml</Text></Pressable>)}
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 9 }}>
        <View style={{ flex: 1 }}><Field label="Outra quantidade (ml)" value={customWater} onChangeText={(value) => setCustomWater(value.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="Ex.: 350" /></View>
        <Pressable onPress={() => addWater(Number(customWater))} disabled={!customWater || Number(customWater) <= 0} accessibilityRole="button" accessibilityLabel="Adicionar quantidade de água" style={[addButton, (!customWater || Number(customWater) <= 0) ? { opacity: 0.45 } : null]}><MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" /></Pressable>
      </View>
    </View>
    <View style={{ gap: 10 }}>
      <SectionTitle title="Atividades" />
      <Text style={helper}>Registre sessões de atividade física, leitura ou estudo.</Text>
      {ACTIVITY_KINDS.map((item) => <Pressable key={item.kind} onPress={() => openNewActivity(item.kind)} accessibilityRole="button" accessibilityLabel={`Registrar ${item.label.toLocaleLowerCase("pt-BR")}`} style={activityButton}><MaterialCommunityIcons name={item.icon} size={20} color={C.greenDark} /><Text style={activityText}>{item.label}</Text><MaterialCommunityIcons name="plus" size={19} color={C.green} /></Pressable>)}
    </View>
    <View style={{ gap: 11 }}>
      <SectionTitle title="Registros do dia" />
      {!dayLogs.length ? <Card><EmptyState icon="notebook-outline" title="Ainda sem registros" description="Os registros que você adicionar para este dia aparecerão aqui. Você pode escolher outra data no calendário." /></Card> : dayLogs.map((log) => <LogCard key={log.id} log={log} onEdit={() => { setEditing(log); if (log.kind !== "hydration") setActivityKind(log.kind); setFormOpen(true); }} onDelete={() => removeLog(log)} />)}
    </View>
    {formOpen ? <HealthLogForm key={editing?.id ?? `new-${activityKind}`} initial={editing} kind={activityKind} date={selectedDate} onClose={() => { setFormOpen(false); setEditing(null); onCreateHandled?.(); }} onSave={saveLog} /> : null}
    </>}
  </View>;
}

function LogCard({ log, onEdit, onDelete }: { log: HealthLog; onEdit: () => void; onDelete: () => void }) {
  const info = KIND_INFO[log.kind];
  const detail = log.kind === "hydration" ? `${log.amountMl.toLocaleString("pt-BR")} ml` : `${log.durationMinutes} min`;
  return <Card style={{ padding: 14, gap: 10 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
      <View style={iconWrap}><MaterialCommunityIcons name={info.icon} size={20} color={C.greenDark} /></View>
      <View style={{ flex: 1, gap: 3 }}><Text style={logTitle}>{info.label}</Text><Text style={helper}>{detail}{log.notes.trim() ? ` · ${log.notes.trim()}` : ""}</Text></View>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Editar registro: ${info.label}`} hitSlop={6} style={actionButton}><MaterialCommunityIcons name="pencil-outline" size={18} color={C.greenDark} /></Pressable>
      <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Apagar registro: ${info.label}`} hitSlop={6} style={actionButton}><MaterialCommunityIcons name="trash-can-outline" size={18} color={C.danger} /></Pressable>
    </View>
  </Card>;
}

function HealthLogForm({ initial, kind, date, onClose, onSave }: { initial: HealthLog | null; kind: Exclude<HealthLogKind, "hydration">; date: string; onClose: () => void; onSave: (log: HealthLog) => void }) {
  const [selectedKind, setSelectedKind] = useState<HealthLogKind>(initial?.kind ?? kind);
  const [formDate, setFormDate] = useState(initial?.date ?? date);
  const [amountMl, setAmountMl] = useState(initial?.amountMl ? String(initial.amountMl) : "");
  const [duration, setDuration] = useState(initial ? String(initial.durationMinutes) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const submit = () => {
    if (selectedKind === "hydration") {
      const amount = Number(amountMl);
      if (!Number.isFinite(amount) || amount <= 0) { setError("Informe uma quantidade de água superior a zero."); return; }
      onSave({ id: initial?.id ?? createId(), kind: selectedKind, date: formDate, amountMl: Math.round(amount), durationMinutes: 0, notes: notes.trim() });
      return;
    }
    const minutes = Number(duration);
    if (!Number.isInteger(minutes) || minutes <= 0) { setError("Informe uma duração em minutos superior a zero."); return; }
    onSave({ id: initial?.id ?? createId(), kind: selectedKind, date: formDate, amountMl: 0, durationMinutes: minutes, notes: notes.trim() });
  };
  return <AppModal visible title={initial ? "Editar registro" : "Nova atividade"} subtitle="Registre o que você fez, no seu ritmo." onClose={onClose} footer={<PrimaryButton title="Salvar registro" icon="check" onPress={submit} />}>
    <View style={{ gap: 8 }}><Text style={fieldTitle}>Tipo de registro</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[{ kind: "hydration" as const, label: "Água" }, ...ACTIVITY_KINDS].map((item) => <Pressable key={item.kind} onPress={() => { setSelectedKind(item.kind); setError(""); }} accessibilityRole="radio" accessibilityState={{ checked: selectedKind === item.kind }} style={[kindChip, selectedKind === item.kind ? { backgroundColor: C.greenSoft, borderColor: C.green } : null]}><Text style={[chipText, selectedKind === item.kind ? { color: C.greenDark } : null]}>{item.label}</Text></Pressable>)}</View></View>
    <DatePickerField label="Data" value={formDate} onChange={setFormDate} />
    {selectedKind === "hydration" ? <Field label="Quantidade de água (ml)" value={amountMl} onChangeText={(value) => { setAmountMl(value.replace(/[^0-9]/g, "")); setError(""); }} keyboardType="number-pad" placeholder="Ex.: 350" error={error} /> : <Field label="Duração (minutos)" value={duration} onChangeText={(value) => { setDuration(value.replace(/[^0-9]/g, "")); setError(""); }} keyboardType="number-pad" placeholder="Ex.: 30" error={error} />}
    <Field label="Nota (opcional)" value={notes} onChangeText={setNotes} placeholder="Quer acrescentar algum detalhe?" multiline maxLength={300} />
  </AppModal>;
}

const eyebrow = { color: "rgba(255,255,255,0.78)", fontFamily: SANS, fontWeight: "800" as const, fontSize: 11, letterSpacing: 1.2 };
const summary = { color: "#FFFFFF", fontFamily: SANS, fontWeight: "800" as const, fontSize: 25, marginTop: 8 };
const summarySub = { color: "rgba(255,255,255,0.86)", fontFamily: SANS, fontSize: 13, marginTop: 3 };
const helper = { color: C.muted, fontFamily: SANS, fontSize: 13, lineHeight: 19 };
const quickButton = { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.greenSoft, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 4 };
const quickText = { color: C.greenDark, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const addButton = { width: 49, height: 49, borderRadius: 14, backgroundColor: C.green, alignItems: "center" as const, justifyContent: "center" as const };
const activityButton = { minHeight: 50, paddingHorizontal: 14, borderRadius: 15, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, flexDirection: "row" as const, alignItems: "center" as const, gap: 11 };
const activityText = { flex: 1, color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const iconWrap = { width: 40, height: 40, borderRadius: 14, backgroundColor: C.greenSoft, alignItems: "center" as const, justifyContent: "center" as const };
const logTitle = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const actionButton = { width: 35, height: 38, borderRadius: 12, backgroundColor: C.paper, alignItems: "center" as const, justifyContent: "center" as const };
const fieldTitle = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const kindChip = { minHeight: 38, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, justifyContent: "center" as const };
const chipText = { color: C.muted, fontFamily: SANS, fontSize: 12, fontWeight: "600" as const };
