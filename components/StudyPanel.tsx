import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, Card, ChoiceChips, EmptyState, Field, IconButton, PrimaryButton, SectionTitle, Tag } from "@/components/app-ui";
import { DatePickerField } from "@/components/DatePickerField";
import { useAppData, type StudyItem, type StudyItemKind } from "@/lib/app-data";
import { C, SANS } from "@/lib/design";
import { createId, daysUntil, displayDate, localDateKey } from "@/lib/format";

const KIND_LABEL: Record<StudyItemKind, string> = { exam: "Prova", assignment: "Trabalho", reading: "Leitura" };
const KIND_ICON: Record<StudyItemKind, "school-outline" | "file-document-edit-outline" | "book-open-variant"> = { exam: "school-outline", assignment: "file-document-edit-outline", reading: "book-open-variant" };

export function StudyPanel() {
  const { data, updateData } = useAppData();
  const [itemOpen, setItemOpen] = useState(false);
  const [editing, setEditing] = useState<StudyItem | null>(null);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [filter, setFilter] = useState("Todas");
  const subjectName_ = (id: string) => data.studySubjects.find((s) => s.id === id)?.name ?? "Sem matéria";
  const items = data.studyItems
    .filter((i) => filter === "Todas" || subjectName_(i.subjectId) === filter)
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const toggle = (item: StudyItem) => updateData((c) => ({ ...c, studyItems: c.studyItems.map((i) => i.id === item.id ? { ...i, done: !i.done } : i) }));
  const addSubject = () => {
    const name = subjectName.trim();
    if (!name || data.studySubjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    updateData((c) => ({ ...c, studySubjects: [...c.studySubjects, { id: createId(), name }] }));
    setSubjectName("");
  };

  return (
    <View style={{ gap: 14 }}>
      <Pomodoro />
      <SectionTitle title="Matérias" action="Gerenciar" onAction={() => setSubjectOpen(true)} />
      {data.studySubjects.length ? <ChoiceChips values={["Todas", ...data.studySubjects.map((s) => s.name)]} selected={filter} onSelect={setFilter} /> : <Card><Text style={muted}>Cadastre suas matérias (ex.: Contabilidade, Estatística, TCC) para organizar provas e trabalhos.</Text><PrimaryButton title="Adicionar matérias" tone="light" icon="plus" onPress={() => setSubjectOpen(true)} /></Card>}
      <SectionTitle title="Provas, trabalhos e leituras" action="Novo" onAction={() => { setEditing(null); setItemOpen(true); }} />
      {items.length ? items.map((item) => {
        const d = daysUntil(item.dueDate);
        const when = !item.dueDate ? "Sem data" : d === null ? displayDate(item.dueDate) : d < 0 ? `Passou há ${Math.abs(d)} d` : d === 0 ? "Hoje" : d === 1 ? "Amanhã" : `Em ${d} dias · ${displayDate(item.dueDate)}`;
        return <Pressable key={item.id} onPress={() => { setEditing(item); setItemOpen(true); }} accessibilityRole="button" style={[row, item.done ? { opacity: 0.6 } : null]}>
          <Pressable onPress={(e) => { e.stopPropagation(); toggle(item); }} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }} accessibilityLabel={`Concluir ${item.title}`}><MaterialCommunityIcons name={item.done ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} size={24} color={item.done ? C.green : C.muted} /></Pressable>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}><Text numberOfLines={1} style={[strong, item.done ? { textDecorationLine: "line-through" } : null]}>{item.title}</Text><Text style={muted}>{subjectName_(item.subjectId)} · {when}</Text></View>
          <Tag label={KIND_LABEL[item.kind]} tone={item.kind === "exam" ? (d !== null && d <= 3 && !item.done ? "coral" : "blue") : "muted"} icon={KIND_ICON[item.kind]} />
        </Pressable>;
      }) : <Card><EmptyState icon="school-outline" title="Nada agendado" description="Adicione a data das provas, a entrega dos trabalhos e as leituras. O que vence em até 3 dias aparece na tela Hoje." action={<PrimaryButton title="Adicionar prova ou trabalho" icon="plus" onPress={() => { setEditing(null); setItemOpen(true); }} />} /></Card>}

      {itemOpen ? <StudyItemForm initial={editing} onClose={() => setItemOpen(false)} /> : null}
      <AppModal visible={subjectOpen} title="Suas matérias" onClose={() => setSubjectOpen(false)} footer={<PrimaryButton title="Fechar" tone="light" onPress={() => setSubjectOpen(false)} />}>
        {data.studySubjects.map((s) => <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Text style={[strong, { flex: 1 }]}>{s.name}</Text><IconButton name="delete-outline" label={`Remover ${s.name}`} tone="danger" onPress={() => updateData((c) => ({ ...c, studySubjects: c.studySubjects.filter((x) => x.id !== s.id) }))} /></View>)}
        <Field label="Nova matéria" value={subjectName} onChangeText={setSubjectName} placeholder="Ex.: Contabilidade" onSubmitEditing={addSubject} />
        <PrimaryButton title="Adicionar matéria" icon="plus" onPress={addSubject} />
      </AppModal>
    </View>
  );
}

function StudyItemForm({ initial, onClose }: { initial: StudyItem | null; onClose: () => void }) {
  const { data, updateData } = useAppData();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [kind, setKind] = useState<StudyItemKind>(initial?.kind ?? "exam");
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? data.studySubjects[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? localDateKey());
  const [error, setError] = useState("");
  const save = () => {
    if (!title.trim()) { setError("Dê um nome, como Prova de Estatística."); return; }
    const item: StudyItem = { id: initial?.id ?? createId(), title: title.trim(), kind, subjectId, dueDate, done: initial?.done ?? false };
    updateData((c) => ({ ...c, studyItems: [item, ...c.studyItems.filter((i) => i.id !== item.id)] }));
    onClose();
  };
  const remove = () => { if (initial) updateData((c) => ({ ...c, studyItems: c.studyItems.filter((i) => i.id !== initial.id) })); onClose(); };
  const subjects = data.studySubjects;
  return (
    <AppModal visible title={initial ? "Editar" : "Nova prova ou trabalho"} onClose={onClose} footer={<View style={{ gap: 9 }}><PrimaryButton title="Salvar" icon="check" onPress={save} />{initial ? <PrimaryButton title="Excluir" tone="light" icon="delete-outline" onPress={remove} /> : null}</View>}>
      <ChoiceChips values={["Prova", "Trabalho", "Leitura"]} selected={KIND_LABEL[kind]} onSelect={(v) => setKind(v === "Prova" ? "exam" : v === "Leitura" ? "reading" : "assignment")} />
      <Field label="Título" value={title} onChangeText={setTitle} placeholder={kind === "exam" ? "Ex.: Prova 2 de Estatística" : kind === "reading" ? "Ex.: Capítulo 3" : "Ex.: Entrega do TCC"} error={error || undefined} />
      {subjects.length ? <View style={{ gap: 7 }}><Text style={strong}>Matéria</Text><ChoiceChips values={subjects.map((s) => s.name)} selected={subjects.find((s) => s.id === subjectId)?.name ?? ""} onSelect={(v) => setSubjectId(subjects.find((s) => s.name === v)?.id ?? "")} horizontal={false} /></View> : null}
      <DatePickerField label="Data" value={dueDate} onChange={setDueDate} placeholder="Toque para escolher" clearable />
    </AppModal>
  );
}

function Pomodoro() {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const state = useRef({ mode: "focus" as "focus" | "break", seconds: 25 * 60 });
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const st = state.current;
      st.seconds -= 1;
      if (st.seconds <= 0) {
        const next = st.mode === "focus" ? "break" : "focus";
        if (st.mode === "focus") setCycles((c) => c + 1);
        st.mode = next;
        st.seconds = next === "focus" ? 25 * 60 : 5 * 60;
        setMode(next);
        try { if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") new Notification(next === "break" ? "Hora da pausa: 5 minutos" : "Pausa acabou: volte ao foco"); } catch { /* sem notificação */ }
      }
      setSeconds(st.seconds);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <Card style={{ backgroundColor: mode === "focus" ? C.blueDark : C.greenDark, borderColor: "transparent", gap: 10, alignItems: "center" }}>
      <Text style={{ color: "#D5E6F2", fontFamily: SANS, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }}>{mode === "focus" ? "FOCO · POMODORO" : "PAUSA"}</Text>
      <Text accessibilityLabel={`${mm} minutos e ${ss} segundos`} style={{ color: "#FFFFFF", fontFamily: SANS, fontSize: 46, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{mm}:{ss}</Text>
      <Text style={{ color: "#D5E6F2", fontFamily: SANS, fontSize: 12 }}>{cycles} {cycles === 1 ? "ciclo concluído" : "ciclos concluídos"} hoje · 25 min de foco, 5 de pausa</Text>
      <View style={{ flexDirection: "row", gap: 9 }}>
        <Pressable onPress={() => setRunning((r) => !r)} accessibilityRole="button" style={pomBtn}><MaterialCommunityIcons name={running ? "pause" : "play"} size={18} color={C.blueDark} /><Text style={pomText}>{running ? "Pausar" : "Iniciar"}</Text></Pressable>
        <Pressable onPress={() => { setRunning(false); state.current = { mode: "focus", seconds: 25 * 60 }; setMode("focus"); setSeconds(25 * 60); }} accessibilityRole="button" style={[pomBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}><MaterialCommunityIcons name="restart" size={18} color="#FFFFFF" /><Text style={[pomText, { color: "#FFFFFF" }]}>Reiniciar</Text></Pressable>
      </View>
    </Card>
  );
}

const row = { flexDirection: "row" as const, alignItems: "center" as const, gap: 11, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 11 };
const strong = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const muted = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 };
const pomBtn = { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, backgroundColor: "#FFFFFF", borderRadius: 13, paddingHorizontal: 16, paddingVertical: 10 };
const pomText = { color: C.blueDark, fontFamily: SANS, fontSize: 13, fontWeight: "800" as const };
