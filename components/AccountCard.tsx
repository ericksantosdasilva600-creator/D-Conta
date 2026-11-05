import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal, Card, ChoiceChips, Field, PrimaryButton } from "@/components/app-ui";
import { C, SANS } from "@/lib/design";
import { useSupabaseSync } from "@/lib/supabase-sync";

export function AccountCard() {
  const sync = useSupabaseSync();
  const [mode, setMode] = useState<"Entrar" | "Criar conta">("Entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const run = async (fn: () => Promise<string | null>, ok?: string) => { setWorking(true); setMessage(""); const r = await fn(); setWorking(false); setMessage(r === "CONFIRM" ? "Conta criada! Enviamos um e-mail de confirmação. Toque no link do e-mail e depois entre aqui com seu e-mail e senha." : r ?? ok ?? ""); };

  if (sync.session) {
    const ok = sync.status === "synced";
    return (
      <Card style={{ gap: 11 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
          <View style={iconBox}><MaterialCommunityIcons name="account-circle-outline" size={22} color={C.green} /></View>
          <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={strong}>{sync.email}</Text><Text style={muted}>Seus dados ficam iguais em todos os aparelhos em que você entrar.</Text></View>
        </View>
        <View style={[badge, { backgroundColor: ok ? C.greenSoft : sync.status === "error" ? C.dangerSoft : C.amberSoft }]}>
          <MaterialCommunityIcons name={ok ? "cloud-check-outline" : sync.status === "error" ? "cloud-alert" : "cloud-sync-outline"} size={17} color={ok ? C.greenDark : sync.status === "error" ? C.danger : "#80611E"} />
          <Text style={{ color: ok ? C.greenDark : sync.status === "error" ? C.danger : "#80611E", fontFamily: SANS, fontSize: 12, fontWeight: "700", flex: 1 }}>{sync.label}{ok && sync.lastSync ? ` · ${new Date(sync.lastSync).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</Text>
        </View>
        {sync.error ? <Text accessibilityRole="alert" style={{ color: C.danger, fontFamily: SANS, fontSize: 12 }}>{sync.error}</Text> : null}
        <PrimaryButton title="Sincronizar agora" icon="cloud-sync-outline" onPress={() => void sync.syncNow()} disabled={sync.status === "syncing"} />
        <PrimaryButton title="Sair da conta" tone="light" icon="logout" onPress={() => void sync.signOut()} />
        <Pressable onPress={() => setConfirmDelete(true)} accessibilityRole="button"><Text style={[link, { color: C.danger }]}>Apagar meus dados da nuvem</Text></Pressable>
        <Text style={muted}>Sair não apaga nada deste aparelho. Imagens de recibos ficam só no aparelho em que foram tiradas.</Text>
        <AppModal visible={confirmDelete} title="Apagar dados da nuvem?" subtitle="Os dados deste aparelho continuam aqui." onClose={() => setConfirmDelete(false)} footer={<View style={{ gap: 9 }}><PrimaryButton title="Manter na nuvem" tone="light" onPress={() => setConfirmDelete(false)} /><PrimaryButton title="Apagar da nuvem" tone="ink" icon="delete-outline" onPress={() => { setConfirmDelete(false); void run(sync.deleteCloudData, "Dados da nuvem apagados."); void sync.signOut(); }} /></View>}>
          <Text style={muted}>Os outros aparelhos deixam de receber atualizações. Você pode entrar de novo depois e enviar os dados deste aparelho.</Text>
        </AppModal>
      </Card>
    );
  }

  return (
    <Card style={{ gap: 11 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <View style={iconBox}><MaterialCommunityIcons name="cloud-sync-outline" size={22} color={C.green} /></View>
        <View style={{ flex: 1 }}><Text style={strong}>Conta grátis e sincronização</Text><Text style={muted}>Opcional. Entre para usar os mesmos dados no celular e no notebook. Sem conta, tudo continua funcionando neste aparelho.</Text></View>
      </View>
      <ChoiceChips values={["Entrar", "Criar conta"]} selected={mode} onSelect={(v) => { setMode(v as typeof mode); setMessage(""); }} />
      <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Senha" value={password} onChangeText={setPassword} placeholder={mode === "Criar conta" ? "Pelo menos 6 caracteres" : "Sua senha"} secureTextEntry autoCapitalize="none" autoComplete={mode === "Criar conta" ? "new-password" : "current-password"} onSubmitEditing={() => void run(() => mode === "Entrar" ? sync.signIn(email, password) : sync.signUp(email, password))} />
      <PrimaryButton title={working ? "Aguarde…" : mode} icon={mode === "Entrar" ? "login" : "account-plus-outline"} disabled={working || !email.includes("@") || password.length < 6} onPress={() => void run(() => mode === "Entrar" ? sync.signIn(email, password) : sync.signUp(email, password))} />
      {mode === "Entrar" ? <Pressable onPress={() => email.includes("@") ? void run(() => sync.resetPassword(email), "Enviamos um link para criar uma nova senha. Confira seu e-mail.") : setMessage("Escreva seu e-mail acima e toque de novo.")} accessibilityRole="button"><Text style={link}>Esqueci minha senha</Text></Pressable> : null}
      {message ? <Text accessibilityRole="alert" style={{ color: C.ink, fontFamily: SANS, fontSize: 13, lineHeight: 19 }}>{message}</Text> : null}
    </Card>
  );
}

const iconBox = { width: 40, height: 40, borderRadius: 13, backgroundColor: C.greenSoft, alignItems: "center" as const, justifyContent: "center" as const };
const strong = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const muted = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 };
const link = { color: C.green, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const badge = { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9 };
