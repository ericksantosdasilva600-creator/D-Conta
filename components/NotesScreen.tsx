import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, BrandMark, Card, EmptyState, Field, Header, IconButton, OfflineBanner, Page, PrimaryButton, SectionTitle, StorageBanner, Tag } from "@/components/app-ui";
import { useAppData, type Note } from "@/lib/app-data";
import { toast } from "@/lib/toast";
import { C, SANS } from "@/lib/design";

type Draft = { title: string; body: string; tags: string; project: string; relatedTaskId: string };
const emptyDraft: Draft = { title: "", body: "", tags: "", project: "", relatedTaskId: "" };

export function NotesScreen({ autoCreate = false }: { autoCreate?: boolean } = {}) {
  const { data, updateData, loading } = useAppData();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const [viewing, setViewing] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const previousAutoCreate = useRef(false);

  useEffect(() => {
    if (autoCreate && !previousAutoCreate.current) {
      setEditing(null);
      setDraft(emptyDraft);
      setErrors({});
      setFormOpen(true);
    }
    previousAutoCreate.current = autoCreate;
  }, [autoCreate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return [...data.notes]
      .filter((note) => !q || [note.title, note.body, note.project, ...note.tags].join(" ").toLocaleLowerCase("pt-BR").includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [data.notes, query]);

  const announce = (message: string) => {
    toast(message);
  };

  const openNew = () => { setEditing(null); setDraft(emptyDraft); setErrors({}); setFormOpen(true); };
  const openEdit = (note: Note) => {
    setEditing(note);
    setDraft({ title: note.title, body: note.body, tags: note.tags.join(", "), project: note.project, relatedTaskId: note.relatedTaskId });
    setErrors({}); setViewing(null); setFormOpen(true);
  };

  const save = () => {
    const content = draft.body.trim();
    const nextErrors = draft.title.trim() || content ? {} : { body: "Escreva uma ideia ou dá um título à nota." };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const now = new Date().toISOString();
    const note: Note = {
      id: editing?.id ?? `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: draft.title.trim() || content.split(/\r?\n/)[0]?.slice(0, 80) || "Nota rápida", body: content,
      tags: [...new Set(draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean))],
      project: draft.project.trim(),
      relatedTaskId: data.tasks.some((task) => task.id === draft.relatedTaskId) ? draft.relatedTaskId : "",
      createdAt: editing?.createdAt ?? now, updatedAt: now,
    };
    updateData((current) => ({ ...current, notes: [note, ...current.notes.filter((item) => item.id !== note.id)] }));
    setFormOpen(false); setEditing(null); announce(editing ? "Nota atualizada." : "Nota criada.");
  };

  const remove = () => {
    if (!deleting) return;
    updateData((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== deleting.id) }));
    setDeleting(null); setViewing(null); announce("Nota excluída.");
  };

  const set = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const selectedTask = data.tasks.find((task) => task.id === draft.relatedTaskId);
  const formattedDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Data não disponível" : new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" }).format(date);
  };

  return (
    <Page>
      <Header eyebrow="NYVO · ANOTAÇÕES" title="Seu espaço de ideias." subtitle="Anotações, referências e projetos — salvos neste aparelho." right={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><BrandMark size={42} /><IconButton name="cog-outline" label="Abrir configurações" onPress={() => router.push("/settings")} /></View>} />
      <OfflineBanner />
      <StorageBanner />
      {data.notes.length ? <PrimaryButton title="Nova nota" onPress={openNew} icon="plus" /> : null}
      <View style={{ gap: 12 }}>
        <SectionTitle title="Suas notas" />
        {data.notes.length ? <View style={searchBox}><MaterialCommunityIcons name="magnify" size={19} color={C.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Pesquisar notas, etiquetas, projeto…" placeholderTextColor={C.muted} accessibilityLabel="Pesquisar por título, conteúdo, etiquetas ou projeto" style={searchInput} returnKeyType="search" /><Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Limpar pesquisa" hitSlop={8}><MaterialCommunityIcons name="close-circle" size={18} color={query ? C.muted : "transparent"} /></Pressable></View> : null}
        {loading ? <View style={{ padding: 28, alignItems: "center" }}><Text style={meta}>Carregando suas notas…</Text></View> : filtered.length ? <View style={{ gap: 10 }}>{filtered.map((note) => <NoteCard key={note.id} note={note} taskTitle={data.tasks.find((task) => task.id === note.relatedTaskId)?.title} onOpen={() => setViewing(note)} onEdit={() => openEdit(note)} onDelete={() => setDeleting(note)} dateLabel={formattedDate(note.updatedAt)} />)}</View> : <Card><EmptyState icon="note-multiple-outline" title={data.notes.length ? "Nada encontrado" : "Seu caderno está vazio"} description={data.notes.length ? "Experimente outra pesquisa para encontrar uma nota." : "Salve ideias, pequenas descobertas e anotações que você queira reencontrar. A pesquisa aparece quando houver notas."} action={!data.notes.length ? <PrimaryButton title="Criar primeira nota" onPress={openNew} icon="plus" /> : undefined} /></Card>}
      </View>

      <AppModal visible={formOpen} title={editing ? "Editar nota" : "Nova nota rápida"} subtitle="Salve uma frase agora; título e etiquetas podem ficar para depois." onClose={() => setFormOpen(false)} footer={<PrimaryButton title="Salvar nota" onPress={save} icon="check" />}>
        <Field label="Título (opcional)" value={draft.title} onChangeText={(value) => { set("title", value); setErrors({}); }} placeholder="Ex.: Ideia para o fim de semana" error={errors.title} returnKeyType="next" maxLength={120} />
        <Field label="Conteúdo" value={draft.body} onChangeText={(value) => { set("body", value); setErrors({}); }} placeholder="Escreva uma ideia rápida…" multiline error={errors.body} />
        <Field label="Etiquetas (opcional)" value={draft.tags} onChangeText={(value) => set("tags", value)} placeholder="Separadas por vírgulas" />
        <Field label="Projeto (opcional)" value={draft.project} onChangeText={(value) => set("project", value)} placeholder="Ex.: Roteiro de Gramado" />
        <View style={{ gap: 8 }}>
          <Text style={label}>Tarefa relacionada (opcional)</Text>
          {data.tasks.length ? <View style={{ gap: 7 }}>
            <Pressable onPress={() => set("relatedTaskId", "")} accessibilityRole="radio" accessibilityState={{ checked: !draft.relatedTaskId }} style={[taskOption, !draft.relatedTaskId ? taskSelected : null]}><Text style={[taskOptionText, !draft.relatedTaskId ? taskSelectedText : null]}>Sem tarefa relacionada</Text></Pressable>
            {data.tasks.map((task) => <Pressable key={task.id} onPress={() => set("relatedTaskId", task.id)} accessibilityRole="radio" accessibilityState={{ checked: draft.relatedTaskId === task.id }} style={[taskOption, draft.relatedTaskId === task.id ? taskSelected : null]}><Text style={[taskOptionText, draft.relatedTaskId === task.id ? taskSelectedText : null]}>{task.title}</Text></Pressable>)}
          </View> : <Text style={meta}>Ainda não existem tarefas.</Text>}
          {selectedTask ? <Text style={meta}>Ligada a: {selectedTask.title}</Text> : null}
        </View>
      </AppModal>

      <AppModal visible={Boolean(viewing)} title={viewing?.title ?? "Nota"} subtitle={viewing ? `Atualizada a ${formattedDate(viewing.updatedAt)}` : undefined} onClose={() => setViewing(null)} footer={<View style={{ gap: 9 }}><PrimaryButton title="Editar nota" onPress={() => viewing && openEdit(viewing)} icon="pencil-outline" /><PrimaryButton title="Excluir nota" tone="ink" onPress={() => { setDeleting(viewing); }} icon="delete-outline" /></View>}>
        {viewing?.project ? <Tag label={viewing.project} icon="folder-outline" tone="blue" /> : null}
        <Text selectable style={bodyText}>{viewing?.body}</Text>
        {viewing?.tags.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{viewing.tags.map((tag) => <Tag key={tag} label={tag} icon="pound" />)}</View> : null}
        {viewing?.relatedTaskId ? <Text style={meta}>Tarefa: {data.tasks.find((task) => task.id === viewing.relatedTaskId)?.title ?? "Tarefa já não disponível"}</Text> : null}
      </AppModal>

      <AppModal visible={Boolean(deleting)} title="Excluir nota?" subtitle="Esta ação não pode ser desfeita." onClose={() => setDeleting(null)} footer={<View style={{ gap: 9 }}><PrimaryButton title="Manter nota" tone="light" onPress={() => setDeleting(null)} /><PrimaryButton title="Excluir" tone="ink" onPress={remove} icon="delete-outline" /></View>}>
        <Text style={meta}>{deleting?.title}</Text>
      </AppModal>
    </Page>
  );
}

function NoteCard({ note, taskTitle, onOpen, onEdit, onDelete, dateLabel }: { note: Note; taskTitle?: string; onOpen: () => void; onEdit: () => void; onDelete: () => void; dateLabel: string }) {
  return <Card style={{ padding: 15 }}>
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Consultar nota: ${note.title}`} style={{ gap: 8 }}>
      <Text style={cardTitle}>{note.title}</Text>
      {note.body ? <Text numberOfLines={3} style={preview}>{note.body}</Text> : null}
      <Text style={meta}>{dateLabel}{note.project ? ` · ${note.project}` : ""}</Text>
      {taskTitle ? <Text style={taskMeta}>Tarefa: {taskTitle}</Text> : null}
      {note.relatedTaskId && !taskTitle ? <Text style={meta}>Tarefa já não disponível</Text> : null}
      {note.tags.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{note.tags.map((tag) => <Tag key={tag} label={tag} icon="pound" />)}</View> : null}
    </Pressable>
    <View style={actions}><IconButton name="pencil-outline" label={`Editar nota: ${note.title}`} onPress={onEdit} /><IconButton name="delete-outline" label={`Excluir nota: ${note.title}`} tone="danger" onPress={onDelete} /></View>
  </Card>;
}

const searchBox = { minHeight: 49, flexDirection: "row" as const, alignItems: "center" as const, gap: 9, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface };
const searchInput = { flex: 1, minWidth: 0, paddingVertical: 11, color: C.ink, fontFamily: SANS, fontSize: 14 };
const meta = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 18 };
const preview = { color: C.ink, fontFamily: SANS, fontSize: 14, lineHeight: 21 };
const cardTitle = { color: C.ink, fontFamily: SANS, fontWeight: "800" as const, fontSize: 16, lineHeight: 22 };
const taskMeta = { color: C.greenDark, fontFamily: SANS, fontSize: 12, fontWeight: "600" as const };
const actions = { flexDirection: "row" as const, justifyContent: "flex-end" as const, gap: 7, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 9, marginTop: 2 };
const label = { color: C.ink, fontFamily: SANS, fontWeight: "700" as const, fontSize: 13 };
const taskOption = { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, justifyContent: "center" as const, backgroundColor: C.surface };
const taskSelected = { borderColor: C.green, backgroundColor: C.greenSoft };
const taskOptionText = { color: C.muted, fontFamily: SANS, fontSize: 13, fontWeight: "600" as const };
const taskSelectedText = { color: C.greenDark, fontWeight: "700" as const };
const bodyText = { color: C.ink, fontFamily: SANS, fontSize: 15, lineHeight: 24, whiteSpace: "pre-wrap" as any };

export default NotesScreen;
