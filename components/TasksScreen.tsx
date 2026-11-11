import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, BrandMark, Card, ChoiceChips, EmptyState, Field, Header, IconButton, OfflineBanner, Page, PrimaryButton, PriorityTag, SectionTitle, StorageBanner, Tag } from "@/components/app-ui";
import { DatePickerField } from "@/components/DatePickerField";
import { StudyPanel } from "@/components/StudyPanel";
import { useAppData, type Priority, type Task, type TaskStatus } from "@/lib/app-data";
import { toast } from "@/lib/toast";
import { C, PRIORITY_LABELS, SANS } from "@/lib/design";
import { createId, displayDate } from "@/lib/format";
import { IconPicker, SoundPicker } from "@/components/ThemePickers";
import { iconFor } from "@/lib/themes";
import { refreshLocalNotifications } from "@/lib/local-notifications";

type StatusFilter = "all" | TaskStatus;
type Draft = Pick<Task, "title" | "description" | "status" | "priority" | "dueDate" | "project" | "linkedBudgetId" | "remindAtDue" | "icon" | "sound">;
const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "next", label: "Próxima" },
  { value: "in_progress", label: "Em andamento" },
  { value: "done", label: "Concluída" },
];
const EMPTY_DRAFT: Draft = { title: "", description: "", status: "backlog", priority: "medium", dueDate: "", project: "", linkedBudgetId: "", remindAtDue: false };

export function TasksScreen({ autoCreate = false }: { autoCreate?: boolean }) {
  const { data, updateData, loading } = useAppData();
  const [tab, setTab] = useState("Tarefas");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Task | null>(null);
  const previousAutoCreate = useRef(false);

  useEffect(() => {
    if (autoCreate && !previousAutoCreate.current) {
      setEditing(null);
      setDraft(EMPTY_DRAFT);
      setError("");
      setFormOpen(true);
    }
    previousAutoCreate.current = autoCreate;
  }, [autoCreate]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return data.tasks.filter((task) => {
      if (filter !== "all" && task.status !== filter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      return !normalized || `${task.title} ${task.description} ${task.project}`.toLocaleLowerCase("pt-BR").includes(normalized);
    }).sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title, "pt-BR"));
  }, [data.tasks, filter, priorityFilter, query]);

  const notify = (message: string) => {
    toast(message);
  };
  const openNew = () => { setEditing(null); setDraft(EMPTY_DRAFT); setError(""); setFormOpen(true); };
  const openEdit = (task: Task) => {
    setEditing(task);
    setDraft({ title: task.title, description: task.description, status: task.status, priority: task.priority, dueDate: task.dueDate, project: task.project, linkedBudgetId: task.linkedBudgetId, remindAtDue: task.remindAtDue, icon: task.icon, sound: task.sound });
    setError("");
    setFormOpen(true);
  };
  const saveTask = () => {
    const title = draft.title.trim();
    if (!title) { setError("Escreva um título para a tarefa."); return; }
    const now = new Date().toISOString();
    const task: Task = { ...draft, title, description: draft.description.trim(), project: draft.project.trim(), id: editing?.id ?? createId(), createdAt: editing?.createdAt ?? now, updatedAt: editing?.status === "done" && draft.status === "done" ? editing.updatedAt : now };
    const updated = { ...data, tasks: [task, ...data.tasks.filter((item) => item.id !== task.id)] };
    updateData(() => updated);
    void refreshLocalNotifications(updated);
    setFormOpen(false);
    notify(editing ? "Tarefa atualizada." : "Tarefa criada.");
  };
  const removeTask = () => {
    if (!deleting) return;
    const updated = { ...data, tasks: data.tasks.filter((task) => task.id !== deleting.id) };
    updateData(() => updated);
    void refreshLocalNotifications(updated);
    setDeleting(null);
    notify("Tarefa excluída.");
  };
  const changeStatus = (task: Task, status: TaskStatus) => {
    const now = new Date().toISOString();
    const updated = { ...data, tasks: data.tasks.map((item) => item.id === task.id ? { ...item, status, updatedAt: now } : item) };
    updateData(() => updated);
    void refreshLocalNotifications(updated);
    notify(status === "done" ? "Tarefa concluída." : "Tarefa reaberta.");
  };
  const patch = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const statusLabel = (status: TaskStatus) => STATUS_OPTIONS.find((item) => item.value === status)?.label ?? "Backlog";

  return (
    <Page>
      <Header eyebrow="DÁ CONTA · TAREFAS E ESTUDOS" title="Priorize o que importa." subtitle="Tarefas, prazos, provas e trabalhos." right={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><BrandMark size={42} /><IconButton name="cog-outline" label="Abrir configurações" onPress={() => router.push("/settings")} /></View>} />
      <OfflineBanner />
      <StorageBanner />
      <ChoiceChips values={["Tarefas", "Estudos"]} selected={tab} onSelect={setTab} />
      {tab === "Estudos" ? <StudyPanel /> : <>
      {data.tasks.length ? <PrimaryButton title="Nova tarefa" onPress={openNew} icon="plus" /> : null}
      <View style={{ gap: 12 }}>
        <SectionTitle title="Tarefas" />
        {data.tasks.length ? <>
        <View style={searchBox}><MaterialCommunityIcons name="magnify" size={19} color={C.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Pesquisar tarefas ou projetos…" placeholderTextColor={C.muted} accessibilityLabel="Pesquisar tarefas" style={searchInput} returnKeyType="search" />{query ? <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Limpar pesquisa" hitSlop={8}><MaterialCommunityIcons name="close-circle" size={18} color={C.muted} /></Pressable> : <View style={{ width: 18 }} />}</View>
        <ChoiceChips values={["Todos", ...STATUS_OPTIONS.map((item) => item.label)]} selected={filter === "all" ? "Todos" : statusLabel(filter)} onSelect={(value) => setFilter(value === "Todos" ? "all" : STATUS_OPTIONS.find((item) => item.label === value)?.value ?? "all")} />
        <ChoiceChips values={["Todas prioridades", "Alta", "Média", "Baixa"]} selected={priorityFilter === "all" ? "Todas prioridades" : PRIORITY_LABELS[priorityFilter]} onSelect={(value) => setPriorityFilter(value === "Alta" ? "high" : value === "Média" ? "medium" : value === "Baixa" ? "low" : "all")} />
        </> : null}
        {loading ? <View style={{ padding: 28, alignItems: "center" }}><Text style={mutedText}>Carregando suas tarefas…</Text></View> : filtered.length ? <View style={{ gap: 10 }}>{filtered.map((task) => <TaskCard key={task.id} task={task} budgetLabel={data.budgets.find((budget) => budget.id === task.linkedBudgetId)?.category} onEdit={() => openEdit(task)} onDelete={() => setDeleting(task)} onToggle={() => changeStatus(task, task.status === "done" ? "next" : "done")} />)}</View> : <Card><EmptyState icon="clipboard-text-outline" title={data.tasks.length ? "Nada encontrado" : "Comece a planejar"} description={data.tasks.length ? "Experimente alterar a pesquisa ou os filtros." : "Divida um projeto em passos simples e acompanhe os prazos. Pesquisa e filtros aparecem quando houver tarefas."} action={!data.tasks.length ? <PrimaryButton title="Criar primeira tarefa" onPress={openNew} icon="plus" /> : undefined} /></Card>}
      </View>

      <AppModal visible={formOpen} title={editing ? "Editar tarefa" : "Nova tarefa"} subtitle="Os detalhes ficam salvos neste aparelho." onClose={() => setFormOpen(false)} footer={<PrimaryButton title={editing ? "Salvar alterações" : "Criar tarefa"} onPress={saveTask} icon="check" />}>
        <Field label="Título" value={draft.title} onChangeText={(value) => { patch("title", value); setError(""); }} placeholder="Ex.: Reservar hospedagem" returnKeyType="next" error={error} />
        <IconPicker text={draft.title} value={draft.icon ?? ""} onChange={(value) => patch("icon", value)} />
        <SoundPicker text={draft.title} value={draft.sound ?? ""} onChange={(value) => patch("sound", value)} />
        <Field label="Descrição (opcional)" value={draft.description} onChangeText={(value) => patch("description", value)} placeholder="Notas ou próximos passos" multiline />
        <View style={{ gap: 8 }}><Text style={labelStyle}>Estado</Text><ChoiceChips values={STATUS_OPTIONS.map((item) => item.label)} selected={statusLabel(draft.status)} onSelect={(value) => patch("status", STATUS_OPTIONS.find((item) => item.label === value)?.value ?? "backlog")} /></View>
        <View style={{ gap: 8 }}><Text style={labelStyle}>Prioridade</Text><ChoiceChips values={["Baixa", "Média", "Alta"]} selected={PRIORITY_LABELS[draft.priority]} onSelect={(value) => patch("priority", value === "Alta" ? "high" : value === "Baixa" ? "low" : "medium")} /></View>
        <DatePickerField label="Data de vencimento (opcional)" value={draft.dueDate} onChange={(value) => patch("dueDate", value)} clearable />
        <Field label="Projeto (opcional)" value={draft.project} onChangeText={(value) => patch("project", value)} placeholder="Ex.: Férias de verão" />
        <View style={{ gap: 8 }}>
          <Text style={labelStyle}>Orçamento associado (opcional)</Text>
          <ChoiceChips values={["Nenhum", ...data.budgets.map((budget) => `${budget.category} · ${budget.month} · ${budget.scope === "trip" ? "Viagem" : "Pessoal"}`)]} selected={data.budgets.find((budget) => budget.id === draft.linkedBudgetId) ? `${data.budgets.find((budget) => budget.id === draft.linkedBudgetId)!.category} · ${data.budgets.find((budget) => budget.id === draft.linkedBudgetId)!.month} · ${data.budgets.find((budget) => budget.id === draft.linkedBudgetId)!.scope === "trip" ? "Viagem" : "Pessoal"}` : "Nenhum"} onSelect={(value) => { const index = data.budgets.findIndex((budget) => `${budget.category} · ${budget.month} · ${budget.scope === "trip" ? "Viagem" : "Pessoal"}` === value); patch("linkedBudgetId", index < 0 ? "" : data.budgets[index].id); }} horizontal={false} />
          {!data.budgets.length ? <Text style={mutedText}>Ainda não existem orçamentos para associar.</Text> : null}
        </View>
        <Pressable onPress={() => patch("remindAtDue", !draft.remindAtDue)} accessibilityRole="checkbox" accessibilityState={{ checked: draft.remindAtDue }} style={reminderRow}>
          <MaterialCommunityIcons name={draft.remindAtDue ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={draft.remindAtDue ? C.green : C.muted} />
          <View style={{ flex: 1, gap: 3 }}><Text style={labelStyle}>Lembrar na data de vencimento</Text><Text style={mutedText}>Salve apenas a preferência do lembrete.</Text></View>
        </Pressable>
      </AppModal>
      <AppModal visible={Boolean(deleting)} title="Excluir tarefa?" subtitle="Esta ação não pode ser desfeita." onClose={() => setDeleting(null)} footer={<View style={{ gap: 9 }}><PrimaryButton title="Manter tarefa" tone="light" onPress={() => setDeleting(null)} /><PrimaryButton title="Excluir" tone="ink" onPress={removeTask} icon="delete-outline" /></View>}>
        <Text style={mutedText}>{deleting?.title}</Text>
      </AppModal>
      </>}
    </Page>
  );
}

function TaskCard({ task, budgetLabel, onEdit, onDelete, onToggle }: { task: Task; budgetLabel?: string; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  return (
    <Card style={{ padding: 15, gap: 11 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityLabel={task.status === "done" ? `Reabrir tarefa ${task.title}` : `Concluir tarefa ${task.title}`} accessibilityState={{ checked: task.status === "done" }} hitSlop={7} style={{ paddingTop: 1 }}><MaterialCommunityIcons name={task.status === "done" ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} size={23} color={task.status === "done" ? C.green : C.muted} /></Pressable>
        <MaterialCommunityIcons name={iconFor(task.icon, task.title, "clipboard-text-outline") as "clipboard-text-outline"} size={21} color={C.green} style={{ paddingTop: 1 }} />
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Editar tarefa ${task.title}`} style={{ flex: 1, gap: 5 }}><Text style={[titleStyle, task.status === "done" ? { textDecorationLine: "line-through", color: C.muted } : null]}>{task.title}</Text>{task.description ? <Text style={descriptionStyle} numberOfLines={3}>{task.description}</Text> : null}</Pressable>
        <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Excluir tarefa ${task.title}`} hitSlop={8} style={{ padding: 4 }}><MaterialCommunityIcons name="delete-outline" size={19} color={C.muted} /></Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7 }}>
        <Tag label={STATUS_OPTIONS.find((item) => item.value === task.status)?.label ?? "Backlog"} tone={task.status === "done" ? "muted" : task.status === "in_progress" ? "blue" : task.status === "next" ? "amber" : "green"} />
        <PriorityTag priority={task.priority} />
        {task.dueDate ? <Tag label={displayDate(task.dueDate)} tone="blue" icon="calendar-month-outline" /> : null}
        {task.project ? <Tag label={task.project} tone="muted" icon="folder-outline" /> : null}
        {budgetLabel ? <Tag label={budgetLabel} tone="amber" icon="wallet-outline" /> : null}
        {task.remindAtDue ? <Tag label="Com lembrete" tone="green" icon="bell-outline" /> : null}
      </View>
    </Card>
  );
}

const searchBox = { minHeight: 48, flexDirection: "row" as const, alignItems: "center" as const, gap: 9, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface };
const searchInput = { flex: 1, minWidth: 0, color: C.ink, fontFamily: SANS, fontSize: 14 };
const mutedText = { color: C.muted, fontFamily: SANS, fontSize: 13, lineHeight: 19 };
const titleStyle = { color: C.ink, fontFamily: SANS, fontSize: 15, fontWeight: "700" as const, lineHeight: 21 };
const descriptionStyle = { color: C.muted, fontFamily: SANS, fontSize: 13, lineHeight: 19 };
const labelStyle = { color: C.ink, fontFamily: SANS, fontWeight: "700" as const, fontSize: 13 };
const reminderRow = { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingVertical: 5 };
