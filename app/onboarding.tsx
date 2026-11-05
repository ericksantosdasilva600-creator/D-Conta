import React from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppData } from "@/lib/app-data";
import { C, SANS, SERIF } from "@/lib/design";
import { BrandMark, PrimaryButton, StorageBanner } from "@/components/app-ui";
import { LOCAL_ONLY } from "@/lib/local-mode";

export default function OnboardingScreen() {
  const { updateData, loading } = useAppData();
  const start = () => {
    updateData((current) => ({ ...current, onboarded: true }));
    router.replace("/");
  };

  return (
    <View style={page}>
      <View style={content}>
        <View style={{ alignItems: "flex-start", gap: 22 }}>
          <BrandMark size={54} />
          <View style={{ gap: 10 }}>
            <Text style={eyebrow}>NYVO · UM ESPAÇO PARA O TEU DIA</Text>
            <Text accessibilityRole="header" style={headline}>Teu dia, organizado.{"\n"}Do teu jeito.</Text>
            <Text style={subhead}>Ideias, dinheiro, saúde e tarefas em um só lugar — com uma experiência simples, feita para acompanhar seu ritmo.</Text>
          </View>
        </View>
        <View style={{ gap: 13 }}>
          <Feature icon="note-text-outline" title="Anotações" detail="Salve ideias rápidas e ligue-as a tarefas quando fizer sentido." />
          <Feature icon="wallet-outline" title="Finanças pessoais" detail="Acompanhe seu dinheiro sem perder os registros da viagem." />
          <Feature icon="heart-pulse" title="Hábitos & Saúde" detail="Marque rotinas, hidratação, atividades, leitura e estudo." />
          <Feature icon="format-list-checks" title="Tarefas" detail="Organize prazos, prioridades e o que está no backlog." />
          <View style={privacy}><MaterialCommunityIcons name="lock-outline" size={17} color={C.green} /><Text style={privacyText}>{LOCAL_ONLY ? "Seus registros ficam salvos neste navegador, sem login e sem enviar nada para servidores. Funciona até sem internet." : "Seus registros ficam primeiro neste aparelho. Depois do login e da sua confirmação, sincronizam com a sua conta; sem internet, continuam disponíveis localmente."}</Text></View>
        </View>
        <View style={{ gap: 12 }}>
          <StorageBanner />
          <PrimaryButton title={loading ? "Preparando…" : "Começar"} onPress={start} disabled={loading} icon="arrow-right" />
          <Text style={footnote}>Nesta versão não há integrações de IA enviando seus dados para serviços externos.</Text>
        </View>
      </View>
    </View>
  );
}

function Feature({ icon, title, detail }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; title: string; detail: string }) {
  return <View style={featureRow}><View style={featureIcon}><MaterialCommunityIcons name={icon} size={21} color={C.green} /></View><View style={{ flex: 1, gap: 3 }}><Text style={featureTitle}>{title}</Text><Text style={featureDetail}>{detail}</Text></View></View>;
}

const page = { flex: 1, backgroundColor: C.paper, alignItems: "center" as const, justifyContent: "center" as const };
const content = { width: "100%" as const, maxWidth: 520, paddingHorizontal: 24, paddingVertical: 28, flex: 1, justifyContent: "space-between" as const, gap: 19 };
const eyebrow = { color: C.green, fontFamily: SANS, fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.4 };
const headline = { color: C.ink, fontFamily: SERIF, fontSize: 37, lineHeight: 43, fontWeight: "700" as const, letterSpacing: -0.6 };
const subhead = { color: C.muted, fontFamily: SANS, fontSize: 14, lineHeight: 21, maxWidth: 390 };
const featureRow = { flexDirection: "row" as const, gap: 12, alignItems: "center" as const };
const featureIcon = { width: 41, height: 41, borderRadius: 14, backgroundColor: C.greenSoft, alignItems: "center" as const, justifyContent: "center" as const };
const featureTitle = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const featureDetail = { color: C.muted, fontFamily: SANS, fontSize: 11, lineHeight: 16 };
const privacy = { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 9, borderRadius: 14, padding: 12, backgroundColor: C.greenSoft };
const privacyText = { flex: 1, color: C.greenDark, fontFamily: SANS, fontSize: 11, lineHeight: 16 };
const footnote = { color: C.muted, fontFamily: SANS, fontSize: 11, textAlign: "center" as const, lineHeight: 16 };
