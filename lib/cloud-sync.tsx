import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { AppModal, PrimaryButton } from "@/components/app-ui";
import { trpc } from "@/lib/trpc";
import { useAppData, type AppData, type Transaction } from "@/lib/app-data";
import { useAuthContext } from "@/hooks/auth-context";
import { C, SANS } from "@/lib/design";
import { cacheReceipt, hasCachedReceipt } from "@/lib/receipt-cache";
import { LOCAL_ONLY } from "@/lib/local-mode";
import { useOptionalSupabaseSync } from "@/lib/supabase-sync";

type SyncStatus = "checking" | "synced" | "syncing" | "offline" | "conflict" | "error" | "unlinked" | "signed_out";
type Prompt = { kind: "initial" | "conflict"; data: AppData | null; revision: number };
type SyncContextValue = { status: SyncStatus; label: string; error: string | null; updatedAt: string | null; retry: () => Promise<void>; syncNow: () => Promise<void> };
const SyncContext = createContext<SyncContextValue | null>(null);

function hasLocalContent(data: AppData) {
  return data.transactions.length > 0 || data.habits.length > 0 || data.notes.length > 0 || data.tasks.length > 0 || data.healthLogs.length > 0 || data.budgets.length > 0 || data.customExpenseCategories.length > 0 || data.customIncomeCategories.length > 0;
}

function encodedByteLength(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor(base64.length * 3 / 4) - padding);
}

async function compressLegacyReceipt(uri: string): Promise<string> {
  try {
    let result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], { compress: 0.68, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    if (!result.base64 || encodedByteLength(result.base64) > 1.5 * 1024 * 1024) {
      result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    }
    if (!result.base64 || encodedByteLength(result.base64) > 1.5 * 1024 * 1024) throw new Error("Um recibo excede 1,5 MB após compressão. A sincronização foi interrompida; os dados locais permanecem salvos.");
    return result.base64;
  } catch (error) {
    if (error instanceof Error && error.message.includes("1,5 MB")) throw error;
    throw new Error("Não foi possível ler um recibo antigo neste aparelho. O movimento financeiro foi preservado; abra-o, toque em «Substituir imagem» e anexe o recibo novamente.");
  }
}

function cleanTransactionForCloud(transaction: Transaction, receiptId?: string, mimeType?: string) {
  const { receiptUri: _localUri, receiptPendingBase64: _pendingBytes, receiptId: _oldId, receiptMimeType: _oldMime, ...fields } = transaction;
  return { ...fields, ...(receiptId ? { receiptId, receiptMimeType: mimeType ?? "image/jpeg" } : {}) };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível sincronizar. Os dados locais foram preservados.";
}

function isRevisionConflict(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("conflict") || message.includes("revisão") || message.includes("changed");
}

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthContext();
  const app = useAppData();
  const utils = trpc.useUtils();
  const remote = trpc.sync.get.useQuery(undefined, {
    enabled: Boolean(auth.user) && app.isOnline !== false,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const pushMutation = trpc.sync.push.useMutation();
  const uploadReceipt = trpc.sync.uploadReceipt.useMutation();
  const [status, setStatus] = useState<SyncStatus>(auth.user ? "checking" : "signed_out");
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [dismissedChoice, setDismissedChoice] = useState(false);
  const busy = useRef(false);
  const decisionKey = useRef("");

  const hydrateRemoteReceipts = useCallback(async (snapshot: unknown) => {
    const userId = auth.user?.id;
    if (!snapshot || typeof snapshot !== "object" || userId === undefined || userId === null) return;
    const remoteTransactions = (snapshot as { transactions?: unknown }).transactions;
    if (!Array.isArray(remoteTransactions)) return;
    const localReceiptUris = new Map(app.data.transactions.map((transaction) => [transaction.id, transaction.receiptUri]));
    for (const item of remoteTransactions) {
      if (!item || typeof item !== "object") continue;
      const transaction = item as { id?: unknown; receiptId?: unknown };
      const receiptId = transaction.receiptId;
      if (typeof receiptId !== "string" || !receiptId || (typeof transaction.id === "string" && localReceiptUris.get(transaction.id))) continue;
      if (await hasCachedReceipt(userId, receiptId)) continue;
      const receipt = await utils.sync.getReceipt.fetch({ id: receiptId });
      await cacheReceipt(userId, receiptId, receipt.mimeType, receipt.base64);
    }
  }, [auth.user?.id, app.data.transactions, utils]);

  const pushSnapshot = useCallback(async (source: AppData, expectedRevision: number) => {
    if (!auth.user || busy.current) return;
    busy.current = true;
    setStatus("syncing");
    setError(null);
    try {
      const transactions: ReturnType<typeof cleanTransactionForCloud>[] = [];
      for (const transaction of source.transactions) {
        let receiptId = transaction.receiptId;
        let mimeType: "image/jpeg" | "image/png" | "image/webp" = transaction.receiptMimeType === "image/png" || transaction.receiptMimeType === "image/webp" ? transaction.receiptMimeType : "image/jpeg";
        let pendingBase64 = transaction.receiptPendingBase64;
        if (!receiptId && !pendingBase64 && transaction.receiptUri) {
          pendingBase64 = await compressLegacyReceipt(transaction.receiptUri);
          mimeType = "image/jpeg";
        }
        if (!receiptId && pendingBase64) {
          if (encodedByteLength(pendingBase64) > 1.5 * 1024 * 1024) {
            if (transaction.receiptUri) pendingBase64 = await compressLegacyReceipt(transaction.receiptUri);
            if (encodedByteLength(pendingBase64) > 1.5 * 1024 * 1024) throw new Error("Um recibo excede 1,5 MB. A cópia local não foi apagada; substitua a imagem por uma versão menor.");
          }
          const uploaded = await uploadReceipt.mutateAsync({ mimeType, base64: pendingBase64 });
          receiptId = uploaded.id;
          mimeType = uploaded.mimeType;
          app.updateData((current) => ({
            ...current,
            transactions: current.transactions.map((item) => item.id === transaction.id ? { ...item, receiptId: uploaded.id, receiptMimeType: uploaded.mimeType, receiptPendingBase64: undefined } : item),
          }));
        }
        transactions.push(cleanTransactionForCloud(transaction, receiptId, mimeType));
      }
      const data: AppData = { ...source, schemaVersion: 3, transactions: transactions as unknown as Transaction[] };
      const result = await pushMutation.mutateAsync({ expectedRevision, data });
      await app.markSynced(result.revision);
      await remote.refetch();
      setStatus("synced");
      setError(null);
      setPrompt(null);
    } catch (caught) {
      setError(getErrorMessage(caught));
      if (isRevisionConflict(caught)) {
        setStatus("conflict");
        const latest = await remote.refetch();
        const remoteData = latest.data;
        if (remoteData) setPrompt({ kind: "conflict", data: remoteData.data as AppData | null, revision: remoteData.revision });
      } else {
        setStatus(app.isOnline === false || auth.offlineSession ? "offline" : "error");
      }
    } finally {
      busy.current = false;
    }
  }, [auth.user, auth.offlineSession, app, pushMutation, uploadReceipt, remote]);

  useEffect(() => {
    if (!auth.user) { setStatus("signed_out"); setPrompt(null); return; }
    if (app.loading || !app.storageReady) { setStatus("checking"); return; }
    if (app.isOnline === false || auth.offlineSession) { setStatus("offline"); return; }
    if (remote.isError) { setStatus("error"); setError(getErrorMessage(remote.error)); return; }
    if (remote.isLoading || !remote.data) { setStatus("checking"); return; }

    const localHasData = hasLocalContent(app.data);
    const serverHasData = Boolean(remote.data.data);
    const meta = app.syncMeta;
    const key = [auth.user.id, remote.data.revision, meta.lastSyncedRevision, meta.dirty, meta.linked, app.isLocalDataUnlinked, localHasData, serverHasData].join(":");
    if (decisionKey.current === key) return;
    decisionKey.current = key;

    if (app.isLocalDataUnlinked || !meta.linked) {
      if (serverHasData && localHasData) {
        if (!dismissedChoice) setPrompt({ kind: "initial", data: remote.data.data as AppData, revision: remote.data.revision });
        setStatus("unlinked");
        return;
      }
      if (serverHasData) {
        void hydrateRemoteReceipts(remote.data.data).then(() => app.replaceFromCloud(remote.data.data, remote.data.revision)).then(() => { setStatus("synced"); setError(null); }).catch((caught) => { setStatus("error"); setError(getErrorMessage(caught)); });
        return;
      }
      if (localHasData) {
        if (!dismissedChoice) setPrompt({ kind: "initial", data: null, revision: remote.data.revision });
        setStatus("unlinked");
        return;
      }
      void app.updateSyncMeta({ linked: true, dirty: true, lastSyncedRevision: remote.data.revision });
      setStatus("syncing");
      return;
    }

    if (meta.lastSyncedRevision === null) {
      if (serverHasData && localHasData) {
        if (!dismissedChoice) setPrompt({ kind: "initial", data: remote.data.data as AppData, revision: remote.data.revision });
        setStatus("unlinked");
      } else if (serverHasData) {
        void hydrateRemoteReceipts(remote.data.data).then(() => app.replaceFromCloud(remote.data.data, remote.data.revision)).then(() => { setStatus("synced"); setError(null); }).catch((caught) => { setStatus("error"); setError(getErrorMessage(caught)); });
      } else if (localHasData) {
        if (!dismissedChoice) setPrompt({ kind: "initial", data: null, revision: remote.data.revision });
        setStatus("unlinked");
      } else {
        void app.updateSyncMeta({ linked: true, dirty: true, lastSyncedRevision: remote.data.revision });
        setStatus("syncing");
      }
      return;
    }

    if (remote.data.revision !== meta.lastSyncedRevision) {
      if (meta.dirty || !remote.data.data) {
        setPrompt({ kind: "conflict", data: remote.data.data as AppData | null, revision: remote.data.revision });
        setStatus("conflict");
      } else {
        void hydrateRemoteReceipts(remote.data.data).then(() => app.replaceFromCloud(remote.data.data, remote.data.revision)).then(() => { setStatus("synced"); setError(null); }).catch((caught) => { setStatus("error"); setError(getErrorMessage(caught)); });
      }
      return;
    }
    if (meta.dirty) setStatus("syncing");
    else { setStatus("synced"); setError(null); }
  }, [auth.user, auth.offlineSession, app.loading, app.storageReady, app.isOnline, app.data, app.syncMeta, app.isLocalDataUnlinked, remote.data, remote.isLoading, remote.isError, remote.error, dismissedChoice, app.replaceFromCloud, app.updateSyncMeta, hydrateRemoteReceipts]);

  useEffect(() => {
    if (!auth.user || !app.syncMeta.linked || !app.syncMeta.dirty || !remote.data || prompt || app.isOnline === false || auth.offlineSession || app.loading || !app.storageReady || busy.current) return;
    if (remote.data.revision !== (app.syncMeta.lastSyncedRevision ?? 0)) return;
    const timer = setTimeout(() => { void pushSnapshot(app.data, remote.data!.revision); }, 800);
    return () => clearTimeout(timer);
  }, [auth.user, auth.offlineSession, app.data, app.syncMeta, app.isOnline, app.loading, app.storageReady, remote.data, prompt, pushSnapshot]);

  useEffect(() => {
    if (!auth.user) return;
    const refresh = () => { if (app.isOnline !== false) void remote.refetch(); };
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") refresh(); });
    if (Platform.OS === "web" && typeof window !== "undefined") window.addEventListener("focus", refresh);
    return () => {
      subscription.remove();
      if (Platform.OS === "web" && typeof window !== "undefined") window.removeEventListener("focus", refresh);
    };
  }, [auth.user, app.isOnline, remote.refetch]);

  const keepDevice = useCallback(async () => {
    if (!prompt) return;
    try {
      if (prompt.kind === "initial") {
        if (app.isLocalDataUnlinked) await app.linkLocalData();
        await app.updateSyncMeta({ linked: true, dirty: true, lastSyncedRevision: prompt.revision });
        setDismissedChoice(false);
        setPrompt(null);
        await pushSnapshot(app.data, prompt.revision);
      } else {
        await app.updateSyncMeta({ linked: true, dirty: true, lastSyncedRevision: prompt.revision });
        setPrompt(null);
        await pushSnapshot(app.data, prompt.revision);
      }
    } catch (caught) {
      setStatus("error"); setError(getErrorMessage(caught));
    }
  }, [prompt, app, pushSnapshot]);

  const useCloud = useCallback(async () => {
    if (!prompt?.data) return;
    try {
      await hydrateRemoteReceipts(prompt.data);
      await app.replaceFromCloud(prompt.data, prompt.revision);
      setPrompt(null); setDismissedChoice(false); setStatus("synced"); setError(null);
    } catch (caught) { setStatus("error"); setError(getErrorMessage(caught)); }
  }, [prompt, app, hydrateRemoteReceipts]);

  const dismissPrompt = useCallback(() => {
    setPrompt(null); setDismissedChoice(true);
    setStatus(prompt?.kind === "conflict" ? "conflict" : "unlinked");
  }, [prompt]);

  const retry = useCallback(async () => {
    setError(null); setDismissedChoice(false); decisionKey.current = "";
    await remote.refetch();
  }, [remote]);
  const syncNow = useCallback(async () => {
    setDismissedChoice(false); decisionKey.current = ""; setError(null);
    const latest = await remote.refetch();
    if (latest.data && app.syncMeta.linked && app.syncMeta.dirty && latest.data.revision === (app.syncMeta.lastSyncedRevision ?? 0)) await pushSnapshot(app.data, latest.data.revision);
  }, [remote, app, pushSnapshot]);

  const label = status === "synced" ? "Sincronizado" : status === "syncing" ? "Sincronizando" : status === "offline" ? "Sem conexão" : status === "conflict" ? "Conflito" : status === "error" ? "Erro de sincronização" : status === "unlinked" ? "Associar dados" : status === "signed_out" ? "Sessão não iniciada" : "Verificando sincronização";
  const value = useMemo(() => ({ status, label, error, updatedAt: remote.data?.updatedAt ?? null, retry, syncNow }), [status, label, error, remote.data?.updatedAt, retry, syncNow]);

  return (
    <SyncContext.Provider value={value}>
      {children}
      <AppModal visible={Boolean(prompt)} title={prompt?.kind === "conflict" ? "Conflito de sincronização" : prompt?.data ? "Já existem dados na nuvem" : "Associar os dados deste aparelho?"} subtitle={prompt?.kind === "conflict" ? "Foram feitas alterações em outro dispositivo." : "Escolha de forma explícita como ligar este dispositivo à sua conta."} onClose={dismissPrompt}>
        <Text style={{ color: C.ink, fontFamily: SANS, fontSize: 13, lineHeight: 20 }}>
          {prompt?.kind === "conflict" ? "Você pode carregar a versão da nuvem, ou substituir a nuvem pela versão deste aparelho. Antes de substituir, o Dá Conta salva uma cópia local recuperável." : prompt?.data ? "Este dispositivo tem dados locais e a conta já tem uma cópia na nuvem. Escolha qual versão usar; a versão local é salva antes de ser substituída." : "Seus registros locais não serão enviados até você confirmar. Você pode sincronizar agora ou manter este dispositivo apenas local."}
        </Text>
        {prompt?.data ? <PrimaryButton title="Usar versão da nuvem" icon="cloud-download-outline" tone="light" onPress={() => void useCloud()} /> : null}
        <PrimaryButton title={prompt?.kind === "conflict" || prompt?.data ? "Manter este dispositivo" : "Sincronizar dados locais"} icon="cloud-upload-outline" onPress={() => void keepDevice()} />
        <Pressable accessibilityRole="button" onPress={dismissPrompt} style={{ padding: 9 }}><Text style={{ color: C.muted, fontFamily: SANS, fontSize: 12, textAlign: "center" }}>Manter só neste aparelho por agora</Text></Pressable>
      </AppModal>
    </SyncContext.Provider>
  );
}

export function useCloudSync() {
  const value = useContext(SyncContext);
  if (!value) throw new Error("useCloudSync tem de ser usado dentro de CloudSyncProvider.");
  return value;
}

export function CloudSyncBadge() {
  if (LOCAL_ONLY) return <LocalSavedBadge />;
  return <RemoteSyncBadge />;
}

function LocalSavedBadge() {
  const cloud = useOptionalSupabaseSync();
  const signedIn = Boolean(cloud?.session);
  const ok = !signedIn || cloud?.status === "synced";
  const label = signedIn ? cloud?.label ?? "Sincronizando…" : "Salvo neste aparelho";
  return (
    <View accessibilityLabel={label} style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, backgroundColor: ok ? C.greenSoft : C.amberSoft, alignSelf: "flex-start", maxWidth: "100%" }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ok ? C.green : "#80611E" }} />
      <Text style={{ color: ok ? C.green : "#80611E", fontFamily: SANS, fontSize: 11, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

function RemoteSyncBadge() {
  const { status, label, error, retry } = useCloudSync();
  const color = status === "synced" ? C.green : status === "syncing" ? C.blue : status === "conflict" || status === "error" ? C.danger : status === "offline" || status === "unlinked" ? "#80611E" : C.muted;
  const background = status === "synced" ? C.greenSoft : status === "conflict" || status === "error" ? C.dangerSoft : status === "offline" || status === "unlinked" ? C.amberSoft : C.blueSoft;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}. Toque para atualizar.`} onPress={() => void retry()} style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, backgroundColor: background, alignSelf: "flex-start", maxWidth: "100%" }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color, fontFamily: SANS, fontSize: 11, fontWeight: "800" }}>{label}</Text>
      {error ? <Text accessibilityLabel={error} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} /> : null}
    </Pressable>
  );
}
