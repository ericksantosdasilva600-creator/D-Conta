import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { createId } from "@/lib/format";
import type { Habit } from "@/lib/app-data";
import { GOALS, OCCUPATIONS } from "@/lib/brand";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppData } from "@/lib/app-data";
import { C, SANS, SERIF } from "@/lib/design";
import { BrandMark, PrimaryButton, StorageBanner } from "@/components/app-ui";
import { LOCAL_ONLY } from "@/lib/local-mode";

const FOCUS = [
  { id: "money", label: "Dinheiro", icon: "wallet-outline" },
  { id: "study", label: "Estudos", icon: "school-outline" },
  { id: "habits", label: "Hábitos e saúde", icon: "heart-pulse" },
  { id: "tasks", label: "Tarefas", icon: "format-list-checks" },
] as const;
const SUGGESTED: { id: string; name: string; weekdays: number[]; time: string; detail: string }[] = [
  { id: "water", name: "Beber 2 litros de água", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "09:00", detail: "Todos os dias" },
  { id: "read", name: "Ler 10 páginas", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "21:00", detail: "Todos os dias, 21h" },
  { id: "gym", name: "Academia", weekdays: [1, 2, 3, 4, 5], time: "18:00", detail: "Seg a sex, 18h" },
  { id: "study", name: "Estudar 30 minutos", weekdays: [1, 2, 3, 4, 5], time: "20:00", detail: "Seg a sex, 20h" },
  { id: "money", name: "Anotar os gastos do dia", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "22:00", detail: "Todos os dias, 22h" },
];

export default function OnboardingScreen() {
  const { updateData, loading } = useAppData();
  const [step, setStep] = useState(1);
  const [focus, setFocus] = useState<string[]>(["money"]);
  const [habits, setHabits] = useState<string[]>(["water", "money"]);
  const [occupation, setOccupation] = useState("");
  const [goal, setGoal] = useState("");
  const toggle = (list: string[], id: string) => list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  const start = () => {
    const created: Habit[] = SUGGESTED.filter((h) => habits.includes(h.id)).map((h) => ({ id: createId(), name: h.name, weekdays: h.weekdays, reminderTime: h.time, priority: "medium", archived: false, goalLabel: "" }));
    updateData((current) => ({ ...current, onboarded: true, focus, habits: [...current.habits, ...created], profile: { ...current.profile, occupation, goal } }));
    router.replace(focus.length === 1 && focus[0] === "money" ? "/finance" : "/");
  };

  if (step === 2) return (
    <ScrollView style={{ flex: 1, backgroundColor: C.paper }} contentContainerStyle={{ alignItems: "center" }}>
      <View style={[content, { flex: undefined, gap: 22 }]}>
        <View style={{ gap: 8 }}>
          <Text style={eyebrow}>NYVO · PASSO 2 DE 2</Text>
          <Text accessibilityRole="header" style={[headline, { fontSize: 30, lineHeight: 36 }]}>O que você quer organizar primeiro?</Text>
          <Text style={subhead}>Pode escolher mais de um. Dá para mudar tudo depois.</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
          {FOCUS.map((f) => { const on = focus.includes(f.id); return <Pressable key={f.id} onPress={() => setFocus(toggle(focus, f.id))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[choice, on ? choiceOn : null]}><MaterialCommunityIcons name={f.icon} size={20} color={on ? C.greenDark : C.muted} /><Text style={[featureTitle, { color: on ? C.greenDark : C.ink }]}>{f.label}</Text></Pressable>; })}
        </View>
        <View style={{ gap: 9 }}>
          <Text style={featureTitle}>Hábitos para começar (opcional)</Text>
          {SUGGESTED.map((h) => { const on = habits.includes(h.id); return <Pressable key={h.id} onPress={() => setHabits(toggle(habits, h.id))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={habitRow}><MaterialCommunityIcons name={on ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={on ? C.green : C.muted} /><View style={{ flex: 1 }}><Text style={featureTitle}>{h.name}</Text><Text style={featureDetail}>{h.detail}</Text></View></Pressable>; })}
        </View>
        <View style={{ gap: 9 }}>
          <Text style={featureTitle}>Sobre você (opcional, para personalizar as dicas)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{OCCUPATIONS.slice(0, 7).map((o) => <Pressable key={o} onPress={() => setOccupation(occupation === o ? "" : o)} accessibilityRole="radio" accessibilityState={{ checked: occupation === o }} style={[smallChoice, occupation === o ? choiceOn : null]}><Text style={[featureDetail, { fontWeight: "700", color: occupation === o ? C.greenDark : C.ink }]}>{o}</Text></Pressable>)}</View>
          <Text style={featureDetail}>Seu principal objetivo agora</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{GOALS.map((g) => <Pressable key={g} onPress={() => setGoal(goal === g ? "" : g)} accessibilityRole="radio" accessibilityState={{ checked: goal === g }} style={[smallChoice, goal === g ? choiceOn : null]}><Text style={[featureDetail, { fontWeight: "700", color: goal === g ? C.greenDark : C.ink }]}>{g}</Text></Pressable>)}</View>
        </View>
        <PrimaryButton title="Começar a usar" onPress={start} icon="arrow-right" disabled={loading} />
        <Pressable onPress={() => setStep(1)} accessibilityRole="button"><Text style={[footnote, { color: C.green, fontWeight: "700" }]}>Voltar</Text></Pressable>
      </View>
    </ScrollView>
  );

  return (
    <View style={page}>
      <View style={content}>
        <View style={{ alignItems: "flex-start", gap: 22 }}>
          <BrandMark size={54} />
          <View style={{ gap: 10 }}>
            <Text style={eyebrow}>NYVO · UM ESPAÇO PARA O SEU DIA</Text>
            <Text accessibilityRole="header" style={headline}>Seu dia, organizado.{"\n"}Do seu jeito.</Text>
            <Text style={subhead}>Ideias, dinheiro, saúde e tarefas em um só lugar — com uma experiência simples, feita para acompanhar seu ritmo.</Text>
          </View>
        </View>
        <View style={{ gap: 13 }}>
          <Feature icon="note-text-outline" title="Anotações" detail="Salve ideias rápidas e ligue-as a tarefas quando fizer sentido." />
          <Feature icon="wallet-outline" title="Finanças pessoais" detail="Contas fixas, cartão de crédito, metas e dívidas sob controle." />
          <Feature icon="heart-pulse" title="Hábitos & Saúde" detail="Marque rotinas, hidratação, atividades, leitura e estudo." />
          <Feature icon="format-list-checks" title="Tarefas" detail="Prazos, provas, trabalhos e o que precisa ser feito hoje." />
          <View style={privacy}><MaterialCommunityIcons name="lock-outline" size={17} color={C.green} /><Text style={privacyText}>{LOCAL_ONLY ? "Seus registros ficam salvos neste navegador, sem login e sem enviar nada para servidores. Funciona até sem internet." : "Seus registros ficam primeiro neste aparelho. Depois do login e da sua confirmação, sincronizam com a sua conta; sem internet, continuam disponíveis localmente."}</Text></View>
        </View>
        <View style={{ gap: 12 }}>
          <StorageBanner />
          <PrimaryButton title={loading ? "Preparando…" : "Começar"} onPress={() => setStep(2)} disabled={loading} icon="arrow-right" />
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
const choice = { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface };
const choiceOn = { borderColor: C.green, backgroundColor: C.greenSoft };
const habitRow = { flexDirection: "row" as const, alignItems: "center" as const, gap: 11, padding: 12, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line };
const smallChoice = { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface };
