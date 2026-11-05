import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card, Field, Header, IconButton, Page, PrimaryButton, SectionTitle, Tag } from "@/components/app-ui";
import { C, SANS, SERIF } from "@/lib/design";
import { FREE_FEATURES, PRO_FEATURES, PRO_PRICE, isValidEmail, type ProFeatureId } from "@/lib/plans";
import { joinProWaitlist } from "@/lib/pro-interest";

export function PlansScreen() {
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<ProFeatureId[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [joined, setJoined] = useState(false);

  const toggle = (id: ProFeatureId) => setPicked((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);
  const join = async () => {
    if (!isValidEmail(email)) { setError("Digite um e-mail válido."); return; }
    setError(""); setSaving(true);
    const failure = await joinProWaitlist(email, picked);
    setSaving(false);
    if (failure) setError(failure); else setJoined(true);
  };

  return (
    <Page>
      <Header eyebrow="NYVO · PLANOS" title="Nyvo Pro." subtitle="Mais análise e personalização para quem quer ir além. O Pro ainda não está à venda." right={<IconButton name="arrow-left" label="Voltar" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />} />

      <Card style={{ gap: 10 }}>
        <View style={planHead}><Text style={planName}>Free</Text><Tag label="Seu plano" /></View>
        <Text style={muted}>Tudo o que você usa hoje continua grátis.</Text>
        {FREE_FEATURES.map((item) => <View key={item} style={row}><MaterialCommunityIcons name="check" size={18} color={C.green} /><Text style={body}>{item}</Text></View>)}
      </Card>

      <Card style={{ gap: 14 }}>
        <View style={planHead}><Text style={planName}>Pro</Text><Tag label="Em breve" tone="amber" /></View>
        <Text style={muted}>Preço previsto: {PRO_PRICE.monthly} por mês ou {PRO_PRICE.yearly} por ano. Pode mudar até o lançamento.</Text>
        {PRO_FEATURES.map((item) => <View key={item.id} style={row}>
          <MaterialCommunityIcons name={item.icon} size={22} color={C.green} />
          <View style={{ flex: 1 }}><Text style={strong}>{item.title}</Text><Text style={muted}>{item.text}</Text></View>
        </View>)}
      </Card>

      <SectionTitle title="Avise-me do lançamento" />
      <Card style={{ gap: 12 }}>
        {joined ? <View style={row}><MaterialCommunityIcons name="check-circle-outline" size={22} color={C.green} /><Text style={[body, { flex: 1 }]}>Pronto! Avisaremos você quando o Nyvo Pro abrir.</Text></View> : <>
          <Text style={body}>O que faria você assinar? Marque o que mais interessa.</Text>
          {PRO_FEATURES.map((item) => {
            const on = picked.includes(item.id);
            return <Pressable key={item.id} onPress={() => toggle(item.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={row}>
              <MaterialCommunityIcons name={on ? "checkbox-marked" : "checkbox-blank-outline"} size={24} color={on ? C.green : C.muted} />
              <Text style={body}>{item.title}</Text>
            </Pressable>;
          })}
          <Field label="Seu e-mail" value={email} onChangeText={setEmail} error={error} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" placeholder="voce@email.com" />
          <PrimaryButton title={saving ? "Salvando…" : "Quero ser avisado"} icon="bell-ring-outline" onPress={join} disabled={saving} />
          <Text style={muted}>Sem cobrança. Usamos seu e-mail só para avisar sobre o Nyvo Pro.</Text>
        </>}
      </Card>
    </Page>
  );
}

const planHead = { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } as const;
const planName = { color: C.ink, fontFamily: SERIF, fontSize: 26, fontWeight: "800" } as const;
const row = { flexDirection: "row", alignItems: "flex-start", gap: 10 } as const;
const body = { color: C.ink, fontFamily: SANS, fontSize: 15, lineHeight: 22, flexShrink: 1 } as const;
const strong = { color: C.ink, fontFamily: SANS, fontSize: 15, fontWeight: "700" } as const;
const muted = { color: C.muted, fontFamily: SANS, fontSize: 14, lineHeight: 20 } as const;
