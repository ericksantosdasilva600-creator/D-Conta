import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { AppModal, PrimaryButton } from "@/components/app-ui";
import { normalizeStoredData, useAppData, type AppData } from "@/lib/app-data";
import { C, SANS } from "@/lib/design";
import { sb, siteUrl } from "@/lib/supabase";

export type CloudStatus = "signed_out" | "checking" | "synced" | "syncing" | "offline" | "error" | "choose" | "conflict";
type Meta = { userId: string; revision: number; lastHash: string };
type Remote = { data: unknown; revision: number } | null;
type Ctx = {
  session: Session | null; email: string; status: CloudStatus; label: string; error: string; lastSync: string;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  deleteCloudData: () => Promise<string | null>;
};
const CloudCtx = createContext<Ctx | null>(null);
const META_KEY = "nyvo.cloud.meta";

/** Remove imagens de recibo (ficam só no aparelho) para o pacote da nuvem ficar leve. */
export function cloudPayload(data: AppData) {
  return { ...data, transactions: data.transactions.map(({ receiptPendingBase64: _b, ...t }) => ({ ...t, receiptUri: t.receiptUri.startsWith("data:") || t.receiptUri.startsWith("file:") || t.receiptUri.startsWith("blob:") ? "" : t.receiptUri })) };
}
export function hashOf(value: unknown) {
  const s = JSON.stringify(value);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${s.length}:${h >>> 0}`;
}
const hasContent = (d: AppData) => d.transactions.length + d.notes.length + d.tasks.length + d.habits.length + d.recurringBills.length + d.goals.length + d.debts.length + d.studyItems.length > 0;
const friendly = (msg: string) => {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail: abra a mensagem que enviamos e toque no link.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Este e-mail já tem conta. Use Entrar.";
  if (m.includes("password") && m.includes("6")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas. Espere alguns minutos e tente de novo.";
  if (m.includes("fetch") || m.includes("network")) return "Sem internet. Seus dados continuam salvos neste aparelho.";
  return msg;
};

export function SupabaseSyncProvider({ children }: { children: React.ReactNode }) {
  const app = useAppData();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<CloudStatus>("checking");
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState("");
  const [pendingRemote, setPendingRemote] = useState<Remote>(null);
  const meta = useRef<Meta | null>(null);
  const busy = useRef(false);
  const dataRef = useRef(app.data);
  dataRef.current = app.data;

  const saveMeta = async (m: Meta | null) => { meta.current = m; try { if (m) await AsyncStorage.setItem(META_KEY, JSON.stringify(m)); else await AsyncStorage.removeItem(META_KEY); } catch { /* opcional */ } };

  useEffect(() => {
    void AsyncStorage.getItem(META_KEY).then((raw) => { try { meta.current = raw ? JSON.parse(raw) as Meta : null; } catch { meta.current = null; } });
    void sb().auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setStatus("signed_out"); });
    const { data: sub } = sb().auth.onAuthStateChange((_event, s) => { setSession(s); if (!s) setStatus("signed_out"); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const applyRemote = useCallback(async (remote: { data: unknown; revision: number }, uid: string) => {
    const local = dataRef.current;
    const incoming = normalizeStoredData(remote.data);
    const receipts = new Map(local.transactions.map((t) => [t.id, t.receiptUri]));
    const merged: AppData = { ...incoming, onboarded: true, tourDone: incoming.tourDone || local.tourDone, transactions: incoming.transactions.map((t) => !t.receiptUri && receipts.get(t.id) ? { ...t, receiptUri: receipts.get(t.id) as string } : t) };
    app.updateData(() => merged);
    await saveMeta({ userId: uid, revision: remote.revision, lastHash: hashOf(cloudPayload(merged)) });
    setStatus("synced"); setLastSync(new Date().toISOString()); setError("");
  }, [app]);

  const push = useCallback(async (uid: string, expected: number) => {
    const payload = cloudPayload(dataRef.current);
    const { data, error: err } = await sb().rpc("nyvo_push", { new_data: payload, expected_revision: expected });
    if (err) throw err;
    const rev = Number(data);
    if (rev === -1) return false;
    await saveMeta({ userId: uid, revision: rev, lastHash: hashOf(payload) });
    setStatus("synced"); setLastSync(new Date().toISOString()); setError("");
    return true;
  }, []);

  const pull = useCallback(async () => {
    if (!session || busy.current || !app.storageReady) return;
    busy.current = true; setStatus((s) => s === "choose" || s === "conflict" ? s : "syncing");
    try {
      const uid = session.user.id;
      const { data, error: err } = await sb().from("nyvo_state").select("data, revision").eq("user_id", uid).maybeSingle();
      if (err) throw err;
      const remote = data as Remote;
      const m = meta.current?.userId === uid ? meta.current : null;
      const localHash = hashOf(cloudPayload(dataRef.current));
      if (!remote) {
        if (!(await push(uid, 0))) { busy.current = false; return void (await pull()); }
      } else if (!m) {
        const remoteHash = hashOf(cloudPayload(normalizeStoredData(remote.data)));
        if (hasContent(dataRef.current) && localHash !== remoteHash) { setPendingRemote(remote); setStatus("choose"); }
        else await applyRemote(remote, uid);
      } else if (remote.revision === m.revision) {
        if (localHash !== m.lastHash) { if (!(await push(uid, m.revision))) { setPendingRemote(null); } }
        else { setStatus("synced"); setLastSync(new Date().toISOString()); }
      } else if (localHash === m.lastHash) {
        await applyRemote(remote, uid);
      } else {
        setPendingRemote(remote); setStatus("conflict");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg.toLowerCase().includes("fetch") ? "offline" : "error"); setError(friendly(msg));
    } finally { busy.current = false; }
  }, [session, app.storageReady, push, applyRemote]);

  // Ao entrar ou ao abrir o app: busca a nuvem.
  useEffect(() => { if (session && app.storageReady) void pull(); }, [session, app.storageReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ao mudar algo: envia depois de 1,5 s.
  useEffect(() => {
    if (!session || status === "choose" || status === "conflict" || !app.storageReady) return;
    const m = meta.current;
    if (!m || m.userId !== session.user.id) return;
    if (hashOf(cloudPayload(app.data)) === m.lastHash) return;
    const id = setTimeout(() => {
      if (busy.current) return;
      busy.current = true; setStatus("syncing");
      push(session.user.id, m.revision).then((ok) => { busy.current = false; if (!ok) void pull(); }).catch((e) => { busy.current = false; const msg = e instanceof Error ? e.message : String(e); setStatus(msg.toLowerCase().includes("fetch") ? "offline" : "error"); setError(friendly(msg)); });
    }, 1500);
    return () => clearTimeout(id);
  }, [app.data, session, status, app.storageReady, push, pull]);

  // Ao voltar para o app e a cada 60 s: confere se outro aparelho mudou algo.
  useEffect(() => {
    if (!session) return;
    const tick = () => { if (status !== "choose" && status !== "conflict") void pull(); };
    const id = setInterval(tick, 60000);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") tick(); });
    const onVis = () => { if (typeof document !== "undefined" && document.visibilityState === "visible") tick(); };
    if (Platform.OS === "web" && typeof document !== "undefined") document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); sub.remove(); if (Platform.OS === "web" && typeof document !== "undefined") document.removeEventListener("visibilitychange", onVis); };
  }, [session, status, pull]);

  const resolve = async (choice: "cloud" | "device") => {
    if (!session || !pendingRemote) return;
    const uid = session.user.id;
    try {
      if (choice === "cloud") await applyRemote(pendingRemote, uid);
      else { if (!(await push(uid, pendingRemote.revision))) await pull(); }
      setPendingRemote(null);
    } catch (e) { setStatus("error"); setError(friendly(e instanceof Error ? e.message : String(e))); }
  };

  const value = useMemo<Ctx>(() => ({
    session, email: session?.user.email ?? "", status, error, lastSync,
    label: status === "synced" ? "Sincronizado" : status === "syncing" || status === "checking" ? "Sincronizando…" : status === "offline" ? "Sem internet · salvo no aparelho" : status === "error" ? "Erro ao sincronizar" : status === "choose" || status === "conflict" ? "Escolha qual versão usar" : "Salvo neste aparelho",
    signIn: async (email, password) => { const { error: e } = await sb().auth.signInWithPassword({ email: email.trim(), password }); return e ? friendly(e.message) : null; },
    signUp: async (email, password) => { const { data, error: e } = await sb().auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: siteUrl() } }); if (e) return friendly(e.message); return data.session ? null : "CONFIRM"; },
    resetPassword: async (email) => { const { error: e } = await sb().auth.resetPasswordForEmail(email.trim(), { redirectTo: siteUrl() }); return e ? friendly(e.message) : null; },
    signOut: async () => { await sb().auth.signOut(); await saveMeta(null); setStatus("signed_out"); },
    syncNow: pull,
    deleteCloudData: async () => { if (!session) return null; const { error: e } = await sb().from("nyvo_state").delete().eq("user_id", session.user.id); if (e) return friendly(e.message); await saveMeta(null); return null; },
  }), [session, status, error, lastSync, pull]);

  return (
    <CloudCtx.Provider value={value}>
      {children}
      <AppModal visible={status === "choose" || status === "conflict"} title={status === "conflict" ? "Mudanças em dois aparelhos" : "Já existem dados na sua conta"} subtitle={status === "conflict" ? "Você alterou o Nyvo aqui e em outro aparelho ao mesmo tempo." : "Este aparelho também tem dados. Qual versão você quer manter?"} onClose={() => undefined} footer={<View style={{ gap: 9 }}>
        <PrimaryButton title="Usar os dados da conta" icon="cloud-download-outline" onPress={() => void resolve("cloud")} />
        <PrimaryButton title="Usar os dados deste aparelho" tone="light" icon="cellphone-arrow-down" onPress={() => void resolve("device")} />
      </View>}>
        <Text style={{ color: C.muted, fontFamily: SANS, fontSize: 13, lineHeight: 19 }}>A versão escolhida vai para todos os seus aparelhos. Se quiser guardar a outra, antes use Configurações › Copiar backup.</Text>
      </AppModal>
    </CloudCtx.Provider>
  );
}

export function useSupabaseSync() {
  const v = useContext(CloudCtx);
  if (!v) throw new Error("useSupabaseSync precisa do SupabaseSyncProvider.");
  return v;
}
export function useOptionalSupabaseSync() { return useContext(CloudCtx); }
