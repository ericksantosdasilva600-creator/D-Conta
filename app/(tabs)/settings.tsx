import React, { useEffect, useState } from "react";
import { Linking, Platform, Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { AppModal, Card, ChoiceChips, Field, Header, IconButton, OfflineBanner, Page, PrimaryButton, SectionTitle, StorageBanner, Tag } from "@/components/app-ui";
import { useAppData, makeDefaultData, EXPENSE_CATEGORIES, INCOME_CATEGORIES, STORAGE_KEY, LEGACY_STORAGE_KEY, STORAGE_MIGRATION_BACKUP_KEY, STORAGE_RECOVERY_BACKUP_KEY, type TransactionKind } from "@/lib/app-data";
import { C, SANS } from "@/lib/design";
import { getNotificationPermission, requestNotificationPermission, refreshLocalNotifications, enableNotificationChannel } from "@/lib/local-notifications";
import { daysUntil, money } from "@/lib/format";
import { useAuthContext } from "@/hooks/auth-context";
import { CloudSyncBadge, useCloudSync } from "@/lib/cloud-sync";
import { LOCAL_ONLY } from "@/lib/local-mode";
import { normalizeStoredData } from "@/lib/app-data";

type CategoryDraft = { kind: TransactionKind; name: string } | null;

export default function SettingsScreen() {
  const { data, updateData, accountId, resetLocalData } = useAppData();
  const auth = useAuthContext();
  const sync = useCloudSync();
  const [permission, setPermission] = useState<boolean | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(null);
  const [categoryValue, setCategoryValue] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [deleteCategory, setDeleteCategory] = useState<CategoryDraft>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [working, setWorking] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreText, setRestoreText] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const dueInbox = data.transactions.filter((item) => item.kind === "expense" && !item.paid && item.dueDate && (daysUntil(item.dueDate) ?? 999) <= 30).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const habitInbox = data.remindersEnabled ? data.habits.filter((habit) => !habit.archived) : [];
  const taskInbox = data.tasks.filter((task) => task.status !== "done" && task.dueDate && (daysUntil(task.dueDate) ?? 999) <= 30).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  useEffect(() => {
    void enableNotificationChannel();
    getNotificationPermission().then(setPermission);
  }, []);

  const showToast = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2600); };
  const updatePreferences = async (changes: Partial<typeof data>) => {
    const updated = { ...data, ...changes };
    updateData(() => updated);
    const scheduled = await refreshLocalNotifications(updated);
    if ((changes.remindersEnabled || changes.dueRemindersEnabled || changes.taskRemindersEnabled) && permission && scheduled) showToast("Preferências de lembretes atualizadas.");
  };

  const turnNotificationsOn = async () => {
    if (Platform.OS === "web") { showToast("As notificações locais estão disponíveis no app instalado no celular."); return; }
    setWorking(true);
    const granted = await requestNotificationPermission();
    setPermission(granted);
    if (granted) {
      const updated = { ...data, remindersEnabled: true, dueRemindersEnabled: true };
      updateData(() => updated);
      await refreshLocalNotifications(updated);
      showToast("Notificações ativadas neste aparelho.");
    } else {
      showToast("Sem autorização, os vencimentos e hábitos continuam visíveis na aplicação.");
    }
    setWorking(false);
  };

  const saveCategory = () => {
    if (!categoryDraft || !categoryValue.trim()) { setCategoryError("Escreva um nome para a categoria."); return; }
    const name = categoryValue.trim();
    const builtins = categoryDraft.kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (builtins.some((item) => item.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) { setCategoryError("Essa categoria já existe como opção predefinida."); return; }
    const key = categoryDraft.kind === "expense" ? "customExpenseCategories" : "customIncomeCategories";
    const categories = data[key];
    const original = categoryDraft.name;
    if (categories.some((item) => item.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR") && item !== original)) { setCategoryError("Já existe uma categoria com esse nome."); return; }
    const nextCategories = original ? categories.map((item) => item === original ? name : item) : [...categories, name];
    const transactions = original ? data.transactions.map((item) => item.kind === categoryDraft.kind && item.category === original ? { ...item, category: name } : item) : data.transactions;
    updateData((current) => ({ ...current, [key]: nextCategories, transactions }));
    setCategoryDraft(null); setCategoryValue(""); setCategoryError("");
    showToast(original ? "Categoria renomeada." : "Categoria criada.");
  };

  const removeCategory = () => {
    if (!deleteCategory) return;
    const key = deleteCategory.kind === "expense" ? "customExpenseCategories" : "customIncomeCategories";
    updateData((current) => ({ ...current, [key]: current[key].filter((item) => item !== deleteCategory.name) }));
    setDeleteCategory(null);
    showToast("Categoria removida das opções. Os movimentos antigos mantêm o nome original.");
  };

  const resetAllData = async () => {
    setWorking(true);
    try {
      for (const transaction of data.transactions) {
        if (transaction.receiptUri.startsWith("file://")) {
          try { await FileSystem.deleteAsync(transaction.receiptUri, { idempotent: true }); } catch { /* Continue removing the rest of local data. */ }
        }
      }
      const reset = { ...makeDefaultData(), onboarded: true };
      if (accountId !== null) {
        await resetLocalData();
      } else {
        const allKeys = await AsyncStorage.getAllKeys();
        const appKeys = allKeys.filter((key) => key === STORAGE_KEY || key === LEGACY_STORAGE_KEY || key === STORAGE_MIGRATION_BACKUP_KEY || key === STORAGE_RECOVERY_BACKUP_KEY || key.startsWith(`${STORAGE_MIGRATION_BACKUP_KEY}.`) || key.startsWith(`${STORAGE_RECOVERY_BACKUP_KEY}.`));
        await AsyncStorage.multiRemove(appKeys);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
        updateData(() => reset);
      }
      await refreshLocalNotifications(reset);
      setResetOpen(false);
      showToast(accountId !== null ? "Cache local limpo. A cópia da nuvem permanece na sua conta." : "Dados locais e cópias de recuperação removidos deste aparelho.");
    } catch {
      showToast("Não foi possível apagar todos os dados. Tente novamente.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Page>
      <Header eyebrow="NYVO · PREFERÊNCIAS" title="Configurações." subtitle={LOCAL_ONLY ? "Ajuste lembretes, finanças e o backup dos seus dados." : "Ajuste notificações, conta, sincronização e dados locais."} right={<IconButton name="arrow-left" label="Voltar ao Resumo" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />} />
      <OfflineBanner /><StorageBanner />
      <View style={{ gap: 12 }}>
        <SectionTitle title="Caixa de lembretes" />
        <Card>
          <Text style={helper}>Vencimentos e rotinas próximos. Mesmo sem autorização de notificações, estes itens continuam visíveis aqui.</Text>
          {dueInbox.map((item) => {
            const days = daysUntil(item.dueDate);
            const label = days === null ? "Ver data" : days < 0 ? `Atrasada há ${Math.abs(days)} d` : days === 0 ? "Vence hoje" : days === 1 ? "Vence amanhã" : `Vence em ${days} d`;
            return <ReminderRow key={item.id} icon="calendar-alert" title={item.merchant} detail={`${money(item.amount, data.currency)} · ${label}`} badge={data.dueRemindersEnabled && permission ? "Aviso ativo" : "Só no app"} tone={days !== null && days < 0 ? "coral" : "amber"} />;
          })}
          {habitInbox.map((habit) => <ReminderRow key={habit.id} icon="checkbox-marked-circle-outline" title={habit.name} detail={`${habit.reminderTime} · ${habit.weekdays.length === 7 ? "todos os dias" : "dias selecionados"}`} badge={permission ? "Lembrete local" : "Só no app"} tone="green" />)}
          {taskInbox.map((task) => { const days = daysUntil(task.dueDate); const label = days === null ? "Ver data" : days < 0 ? `Atrasada há ${Math.abs(days)} d` : days === 0 ? "Prazo hoje" : days === 1 ? "Prazo amanhã" : `Prazo em ${days} d`; return <ReminderRow key={`task-${task.id}`} icon="clipboard-text-clock-outline" title={task.title} detail={label} badge={data.taskRemindersEnabled && task.remindAtDue && permission ? "Aviso ativo" : "Só no app"} tone={days !== null && days < 0 ? "coral" : "amber"} />; })}
          {!dueInbox.length && !habitInbox.length && !taskInbox.length ? <Text style={emptyReminder}>Não há lembretes próximos. Você pode definir datas de vencimento, criar uma rotina ou adicionar um prazo a uma tarefa.</Text> : null}
        </Card>
      </View>
      <View style={{ gap: 12 }}>
        <SectionTitle title="Lembretes" />
        <Card>
          <View style={row}><View style={iconBox}><MaterialCommunityIcons name="bell-outline" size={20} color={C.green} /></View><View style={textColumn}><Text style={rowTitle}>Notificações neste aparelho</Text><Text style={rowSub}>{Platform.OS === "web" ? "No navegador não há notificações: seus vencimentos, rotinas e prazos aparecem na Caixa de lembretes acima." : permission === null ? "Verificando a autorização…" : permission ? "Autorização concedida pelo dispositivo." : "Autorize para receber lembretes de rotinas, despesas e tarefas."}</Text></View></View>
          {permission || Platform.OS === "web" ? <View style={{ height: 1, backgroundColor: C.line }} /> : <PrimaryButton title={working ? "Pedindo autorização…" : "Ativar notificações"} icon="bell-check-outline" onPress={() => void turnNotificationsOn()} disabled={working} />}
          {!permission && Platform.OS !== "web" ? <Pressable onPress={() => void Linking.openSettings()} accessibilityRole="button" style={{ paddingVertical: 7 }}><Text style={linkText}>Abrir configurações do aparelho</Text></Pressable> : null}
          <SettingToggle title="Lembretes dos hábitos" description="Receba um aviso nos dias e hora definidos em cada rotina." value={data.remindersEnabled} onChange={(value) => void updatePreferences({ remindersEnabled: value })} />
          <SettingToggle title="Avisos de vencimento" description="Um dia antes às 09:00 e no próprio dia, se a despesa continuar pendente." value={data.dueRemindersEnabled} onChange={(value) => void updatePreferences({ dueRemindersEnabled: value })} />
          <SettingToggle title="Lembretes das tarefas" description="Receba um aviso às 09:00 na data definida nas tarefas que têm lembrete ativado." value={data.taskRemindersEnabled} onChange={(value) => void updatePreferences({ taskRemindersEnabled: value })} />
          <Text style={helper}>A autorização do sistema é independente destas preferências. Se estiver desligada, as datas continuam visíveis nas listas.</Text>
        </Card>
      </View>
      <View style={{ gap: 12 }}>
        <SectionTitle title="Finanças" />
        <Card>
          <Text style={rowTitle}>Moeda dos montantes</Text>
          <ChoiceChips values={["BRL", "USD", "EUR", "GBP"]} selected={data.currency} onSelect={(currency) => updateData((current) => ({ ...current, currency }))} />
          <Text style={helper}>A moeda só altera a apresentação. Os valores existentes não são convertidos.</Text>
          <Field label="Viagem atual" value={data.tripName} onChangeText={(tripName) => updateData((current) => ({ ...current, tripName }))} placeholder="Ex.: Rio e São Paulo" maxLength={45} />
          <View style={{ height: 1, backgroundColor: C.line }} />
          <View style={row}><View style={iconBox}><MaterialCommunityIcons name="shape-outline" size={20} color={C.green} /></View><View style={textColumn}><Text style={rowTitle}>Categorias personalizadas</Text><Text style={rowSub}>Crie e organiza categorias de despesas e receitas.</Text></View></View>
          <PrimaryButton title="Gerenciar categorias" tone="light" icon="shape-plus-outline" onPress={() => { setCategoryDraft({ kind: "expense", name: "" }); setCategoryValue(""); setCategoryError(""); setCategoryManagerOpen(true); }} />
        </Card>
      </View>
      <View style={{ gap: 12 }}>
        <SectionTitle title="Acessibilidade" />
        <Card>
          <View style={row}><View style={iconBox}><MaterialCommunityIcons name="eye-outline" size={20} color={C.green} /></View><View style={textColumn}><Text style={rowTitle}>Ajustes do aparelho</Text><Text style={rowSub}>O app respeita a escala do texto e os leitores de tela do celular.</Text></View></View>
          <SettingToggle title="Reduzir movimento" description="Abra os diálogos sem a animação deslizante." value={data.reduceMotion} onChange={(value) => updateData((current) => ({ ...current, reduceMotion: value }))} />
        </Card>
      </View>
      {LOCAL_ONLY ? (
      <View style={{ gap: 12 }}>
        <SectionTitle title="Backup dos dados" />
        <Card>
          <View style={row}><View style={iconBox}><MaterialCommunityIcons name="content-save-outline" size={20} color={C.green} /></View><View style={textColumn}><Text style={rowTitle}>Modo local</Text><Text style={rowSub}>Seus dados ficam salvos só neste navegador. Para não perder nada ou levar para outro aparelho, copie um backup de vez em quando e guarde-o num lugar seguro.</Text></View></View>
          <PrimaryButton title="Copiar backup" icon="content-copy" onPress={() => { copyBackup(data).then(() => showToast("Backup copiado. Cole num lugar seguro, como uma nota ou e-mail para você mesmo.")).catch(() => showToast("Não foi possível copiar neste navegador.")); }} />
          <PrimaryButton title="Restaurar backup" tone="light" icon="backup-restore" onPress={() => { setRestoreText(""); setRestoreError(""); setRestoreOpen(true); }} />
          <Text style={helper}>Restaurar substitui os dados atuais deste navegador pelos dados do backup.</Text>
        </Card>
      </View>
      ) : (
      <View style={{ gap: 12 }}>
        <SectionTitle title="Conta e sincronização" />
        <Card>
          <View style={row}><View style={iconBox}><MaterialCommunityIcons name="account-circle-outline" size={20} color={C.green} /></View><View style={textColumn}><Text style={rowTitle}>{auth.user?.name || auth.user?.email || "Conta Manus"}</Text><Text style={rowSub}>{auth.user?.email || "Sessão Manus ativa"}</Text></View></View>
          <CloudSyncBadge />
          {sync.error ? <Text accessibilityRole="alert" style={{ color: C.danger, fontFamily: SANS, fontSize: 12, lineHeight: 18 }}>{sync.error}</Text> : null}
          <Text style={helper}>As alterações são salvas primeiro neste aparelho. Se você estiver offline, ficam locais até a próxima sincronização. Sair da conta não apaga a cópia local desta conta.</Text>
          <PrimaryButton title="Sincronizar agora" icon="cloud-sync-outline" onPress={() => void sync.syncNow()} disabled={sync.status === "syncing" || sync.status === "checking"} />
          <PrimaryButton title="Sair da conta" tone="light" icon="logout" onPress={() => void auth.logout()} />
        </Card>
      </View>
      )}
      <View style={{ gap: 12 }}>
        <SectionTitle title="Seus dados" />
        <Card>
          <View style={row}><View style={iconBox}><MaterialCommunityIcons name="database-lock-outline" size={20} color={C.green} /></View><View style={textColumn}><Text style={rowTitle}>Dados pessoais</Text><Text style={rowSub}>Notas, finanças, rotinas, saúde, tarefas e referências a recibos ficam associados à sua conta depois que você confirmar a primeira sincronização. Recibos são enviados como imagens comprimidas.</Text></View></View>
          <View style={privacyBox}><MaterialCommunityIcons name="wifi-off" size={17} color="#80611E" /><Text style={{ flex: 1, color: "#80611E", fontFamily: SANS, fontSize: 12, lineHeight: 17 }}>A aplicação funciona offline. A limpeza local não apaga a cópia na nuvem; os dados podem ser baixados novamente quando você sincronizar de novo.</Text></View>
          <PrimaryButton title={accountId !== null ? "Limpar cache deste aparelho" : "Apagar dados locais"} tone="ink" icon="delete-outline" onPress={() => setResetOpen(true)} />
        </Card>
      </View>
      {toast ? <View accessibilityRole="alert" style={toastStyle}><MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" /><Text style={{ flex: 1, color: "#FFFFFF", fontFamily: SANS, fontSize: 13, fontWeight: "700" }}>{toast}</Text></View> : null}

      <AppModal visible={restoreOpen} title="Restaurar backup" subtitle="Cole o texto do backup que você copiou antes. Os dados atuais deste navegador serão substituídos." onClose={() => setRestoreOpen(false)} footer={<View style={{ gap: 9 }}><PrimaryButton title="Restaurar dados" icon="backup-restore" onPress={() => { const restored = parseBackup(restoreText); if (!restored) { setRestoreError("Esse texto não é um backup válido do Nyvo."); return; } updateData(() => ({ ...restored, onboarded: true })); setRestoreOpen(false); showToast("Backup restaurado."); }} /><PrimaryButton title="Escolher arquivo .json" tone="light" icon="file-upload-outline" onPress={() => pickBackupFile((text) => setRestoreText(text))} /></View>}>
        <Field label="Texto do backup" value={restoreText} onChangeText={(value) => { setRestoreText(value); setRestoreError(""); }} multiline placeholder='{"transactions": [...]}' style={{ minHeight: 120 }} />
        {restoreError ? <Text accessibilityRole="alert" style={{ color: C.danger, fontFamily: SANS, fontSize: 12 }}>{restoreError}</Text> : null}
      </AppModal>
      <AppModal visible={categoryManagerOpen} title="Suas categorias" subtitle="As opções iniciais não podem ser removidas." onClose={() => setCategoryManagerOpen(false)} footer={<PrimaryButton title="Fechar" tone="light" onPress={() => setCategoryManagerOpen(false)} />}>
        <CategoryList title="Despesas" kind="expense" names={data.customExpenseCategories} onEdit={(name) => { setCategoryDraft({ kind: "expense", name }); setCategoryValue(name); }} onDelete={(name) => setDeleteCategory({ kind: "expense", name })} />
        <CategoryList title="Receitas" kind="income" names={data.customIncomeCategories} onEdit={(name) => { setCategoryDraft({ kind: "income", name }); setCategoryValue(name); }} onDelete={(name) => setDeleteCategory({ kind: "income", name })} />
        <View style={{ height: 1, backgroundColor: C.line }} />
        <Text style={rowTitle}>Adicionar nova categoria</Text>
        <ChoiceChips values={["Despesa", "Receita"]} selected={categoryDraft?.kind === "income" ? "Receita" : "Despesa"} onSelect={(label) => { setCategoryDraft({ kind: label === "Despesa" ? "expense" : "income", name: "" }); setCategoryValue(""); setCategoryError(""); }} />
        <Field label="Nome" value={categoryValue} onChangeText={setCategoryValue} placeholder="Ex.: Passeios de barco" />
        {categoryError ? <Text accessibilityRole="alert" style={{ color: C.danger, fontFamily: SANS, fontSize: 12 }}>{categoryError}</Text> : null}
        <PrimaryButton title={categoryDraft?.name ? "Salvar novo nome" : "Adicionar categoria"} icon="plus" onPress={saveCategory} />
      </AppModal>
      <AppModal visible={Boolean(deleteCategory)} title="Remover categoria?" subtitle="Os movimentos antigos mantêm o nome desta categoria." onClose={() => setDeleteCategory(null)} footer={<View style={{ gap: 9 }}><PrimaryButton title="Manter categoria" tone="light" onPress={() => setDeleteCategory(null)} /><PrimaryButton title="Remover das opções" tone="ink" icon="delete-outline" onPress={removeCategory} /></View>}>
        <Text style={{ color: C.ink, fontFamily: SANS, fontSize: 14 }}>{deleteCategory?.name}</Text>
      </AppModal>
      <AppModal visible={resetOpen} title={accountId !== null ? "Limpar a cache local?" : "Apagar os dados locais?"} subtitle="Esta ação não pode ser desfeita neste aparelho." onClose={() => setResetOpen(false)} footer={<View style={{ gap: 9 }}><PrimaryButton title="Manter meus dados" tone="light" onPress={() => setResetOpen(false)} /><PrimaryButton title={working ? "Apagando…" : accountId !== null ? "Limpar cache local" : "Apagar tudo neste aparelho"} tone="ink" icon="delete-forever-outline" onPress={() => void resetAllData()} disabled={working} /></View>}>
        <Text style={{ color: C.muted, fontFamily: SANS, fontSize: 14, lineHeight: 21 }}>{accountId !== null ? "Serão removidos os recibos e os dados salvos localmente neste aparelho. A cópia da conta na nuvem não será apagada e poderá voltar a ser baixada quando a sincronização funcionar." : "Serão removidos notas, finanças, orçamentos, tarefas, hábitos, registros de saúde, recibos, checklists e cópias de recuperação salvos neste aparelho."}</Text>
      </AppModal>
    </Page>
  );
}

function SettingToggle({ title, description, value, onChange }: { title: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={[row, { alignItems: "flex-start" }]}><View style={textColumn}><Text style={rowTitle}>{title}</Text><Text style={rowSub}>{description}</Text></View><Switch value={value} onValueChange={onChange} accessibilityLabel={title} trackColor={{ false: "#D8D4C9", true: "#B5DACA" }} thumbColor={value ? C.green : "#F7F5EF"} /></View>;
}

function CategoryList({ title, kind, names, onEdit, onDelete }: { title: string; kind: TransactionKind; names: string[]; onEdit: (name: string) => void; onDelete: (name: string) => void }) {
  const defaults = kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return <View style={{ gap: 10 }}><Text style={rowTitle}>{title}</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{defaults.map((name) => <Tag key={name} label={name} tone="muted" />)}</View>{names.length ? names.map((name) => <View key={name} style={categoryRow}><View style={{ flex: 1 }}><Tag label={name} tone="green" /></View><IconButton name="pencil-outline" label={`Renomear ${name}`} onPress={() => onEdit(name)} tone="soft" /><IconButton name="delete-outline" label={`Remover ${name}`} onPress={() => onDelete(name)} tone="danger" /></View>) : <Text style={helper}>Ainda não criaste categorias próprias para {kind === "expense" ? "despesas" : "receitas"}.</Text>}</View>;
}

function ReminderRow({ icon, title, detail, badge, tone }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; title: string; detail: string; badge: string; tone: "green" | "amber" | "coral" }) {
  return <View style={inboxRow}><View style={iconBox}><MaterialCommunityIcons name={icon} size={19} color={tone === "coral" ? C.coral : tone === "amber" ? "#80611E" : C.green} /></View><View style={textColumn}><Text numberOfLines={1} style={rowTitle}>{title}</Text><Text style={rowSub}>{detail}</Text></View><Tag label={badge} tone={tone} /></View>;
}

const row = { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 };
const textColumn = { flex: 1, gap: 4 };
const iconBox = { width: 39, height: 39, borderRadius: 14, backgroundColor: C.greenSoft, alignItems: "center" as const, justifyContent: "center" as const };
const rowTitle = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const rowSub = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 };
const helper = { color: C.muted, fontFamily: SANS, fontSize: 11, lineHeight: 16 };
const linkText = { color: C.green, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const privacyBox = { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 8, padding: 12, borderRadius: 13, backgroundColor: C.amberSoft };
const categoryRow = { flexDirection: "row" as const, alignItems: "center" as const, gap: 7 };
const inboxRow = { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.line };
const emptyReminder = { color: C.muted, fontFamily: SANS, fontSize: 13, lineHeight: 19 };
const toastStyle = { position: "absolute" as const, bottom: 15, left: 20, right: 20, padding: 13, borderRadius: 15, backgroundColor: C.ink, flexDirection: "row" as const, alignItems: "center" as const, gap: 9 };

async function copyBackup(data: unknown) {
  const text = JSON.stringify(data);
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
  throw new Error("clipboard unavailable");
}

function parseBackup(text: string) {
  try {
    const parsed = JSON.parse(text.trim());
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.transactions)) return null;
    return normalizeStoredData(parsed);
  } catch { return null; }
}

function pickBackupFile(onText: (text: string) => void) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json,.txt";
  input.onchange = () => { const file = input.files?.[0]; if (file) void file.text().then(onText); };
  input.click();
}
