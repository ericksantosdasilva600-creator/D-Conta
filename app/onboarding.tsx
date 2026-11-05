import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppData, type Habit, type UserProfile } from "@/lib/app-data";
import { C, SANS, SERIF } from "@/lib/design";
import { createId } from "@/lib/format";
import { BrandMark, Field, PrimaryButton, StorageBanner } from "@/components/app-ui";
import { AccountCard } from "@/components/AccountCard";
import { AGE_RANGES, BR_STATES, COUNTRIES, GENDERS, GOALS, INTERESTS, OCCUPATIONS, SOURCES } from "@/lib/brand";
import { useSupabaseSync } from "@/lib/supabase-sync";

type Icon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const FOCUS: { id: string; label: string; icon: Icon }[] = [
  { id: "money", label: "Dinheiro", icon: "wallet-outline" },
  { id: "study", label: "Estudos", icon: "school-outline" },
  { id: "habits", label: "Hábitos e saúde", icon: "heart-pulse" },
  { id: "tasks", label: "Tarefas", icon: "format-list-checks" },
];
const SUGGESTED: { id: string; name: string; weekdays: number[]; time: string; detail: string }[] = [
  { id: "water", name: "Beber 2 litros de água", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "09:00", detail: "Todos os dias" },
  { id: "read", name: "Ler 10 páginas", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "21:00", detail: "Todos os dias, 21h" },
  { id: "gym", name: "Academia", weekdays: [1, 2, 3, 4, 5], time: "18:00", detail: "Seg a sex, 18h" },
  { id: "study", name: "Estudar 30 minutos", weekdays: [1, 2, 3, 4, 5], time: "20:00", detail: "Seg a sex, 20h" },
  { id: "money", name: "Anotar os gastos do dia", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "22:00", detail: "Todos os dias, 22h" },
];
const TOTAL = 5;

export default function OnboardingScreen() {
  const { data, updateData, loading } = useAppData();
  const cloud = useSupabaseSync();
  const [step, setStep] = useState(1);
  const [p, setP] = useState<UserProfile>({ ...data.profile });
  const [focus, setFocus] = useState<string[]>(["money"]);
  const [habits, setHabits] = useState<string[]>(["water", "money"]);
  const set = (c: Partial<UserProfile>) => setP((x) => ({ ...x, ...c }));
  const toggle = (list: string[], id: string) => list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const finish = () => {
    const created: Habit[] = SUGGESTED.filter((h) => habits.includes(h.id)).map((h) => ({ id: createId(), name: h.name, weekdays: h.weekdays, reminderTime: h.time, priority: "medium", archived: false, goalLabel: "" }));
    const currency = COUNTRIES.find((c) => c.name === p.country)?.currency;
    updateData((current) => ({ ...current, onboarded: true, focus, profile: { ...p, name: p.name.trim() }, habits: [...current.habits, ...created], ...(currency ? { currency } : {}) }));
    router.replace(focus.length === 1 && focus[0] === "money" ? "/finance" : "/");
  };

  if (step === 1) return (
    <View style={page}>
      <View style={content}>
        <View style={{ alignItems: "flex-start", gap: 22 }}>
          <BrandMark size={54} />
          <View style={{ gap: 10 }}>
            <Text style={eyebrow}>NYVO · UM ESPAÇO PARA O SEU DIA</Text>
            <Text accessibilityRole="header" style={headline}>Seu dia, organizado.{"\n"}Do seu jeito.</Text>
            <Text style={subhead}>Dinheiro, hábitos, estudos e tarefas em um só lugar. Responda 4 perguntas rápidas e o Nyvo fica com a sua cara.</Text>
          </View>
        </View>
        <View style={{ gap: 13 }}>
          <Feature icon="wallet-outline" title="Finanças" detail="Contas fixas, cartão, metas e plano para sair das dívidas." />
          <Feature icon="heart-pulse" title="Hábitos & Saúde" detail="Rotinas, água, treino, leitura e estudo." />
          <Feature icon="format-list-checks" title="Tarefas e Estudos" detail="Prazos, provas, trabalhos e Pomodoro." />
          <Feature icon="note-text-outline" title="Anotações" detail="Ideias rápidas, ligadas às suas tarefas." />
        </View>
        <View style={{ gap: 12 }}>
          <StorageBanner />
          <PrimaryButton title={loading ? "Preparando…" : "Começar"} onPress={() => setStep(2)} disabled={loading} icon="arrow-right" />
          <Text style={footnote}>Leva menos de 1 minuto. Tudo pode ser mudado depois.</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.paper }} contentContainerStyle={{ alignItems: "center" }} keyboardShouldPersistTaps="handled">
      <View style={[content, { flex: undefined, gap: 20 }]}>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={eyebrow}>PASSO {step - 1} DE {TOTAL - 1}</Text>
            {step < TOTAL ? <Pressable onPress={() => setStep(step + 1)} accessibilityRole="button" hitSlop={10}><Text style={skip}>Pular</Text></Pressable> : null}
          </View>
          <View style={track}><View style={[trackFill, { width: `${((step - 1) / (TOTAL - 1)) * 100}%` }]} /></View>
        </View>

        {step === 2 ? <>
          <Title title="Prazer! Como podemos te chamar?" sub="Usamos para personalizar as telas e as dicas. Nada disso é obrigatório." />
          <Field label="Seu nome" value={p.name} onChangeText={(v) => set({ name: v.slice(0, 40) })} placeholder="Ex.: Erick" autoCapitalize="words" autoComplete="given-name" />
          <Group label="Sexo"><Chips values={GENDERS} selected={p.gender} onSelect={(v) => set({ gender: v })} /></Group>
          <Group label="Faixa de idade"><Chips values={AGE_RANGES} selected={p.ageRange} onSelect={(v) => set({ ageRange: v })} /></Group>
          <Group label="País"><Chips values={COUNTRIES.map((c) => c.name)} selected={p.country} onSelect={(v) => set({ country: v, state: v === "Brasil" ? p.state : "" })} /></Group>
          {p.country === "Brasil" ? <Group label="Estado"><Chips values={BR_STATES} selected={p.state} onSelect={(v) => set({ state: v })} small /></Group> : null}
          <Group label="O que você faz?"><Chips values={OCCUPATIONS} selected={p.occupation} onSelect={(v) => set({ occupation: v })} /></Group>
        </> : null}

        {step === 3 ? <>
          <Title title={`${p.name.trim() ? `${p.name.trim().split(" ")[0]}, o` : "O"} que você quer organizar?`} sub="Escolha quantos quiser. A tela inicial muda conforme sua escolha." />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
            {FOCUS.map((f) => { const on = focus.includes(f.id); return <Pressable key={f.id} onPress={() => setFocus(toggle(focus, f.id))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[bigChoice, on ? choiceOn : null]}><MaterialCommunityIcons name={f.icon} size={20} color={on ? C.greenDark : C.muted} /><Text style={[featureTitle, { color: on ? C.greenDark : C.ink }]}>{f.label}</Text></Pressable>; })}
          </View>
          <Group label="Seu principal objetivo agora"><Chips values={GOALS} selected={p.goal} onSelect={(v) => set({ goal: v })} /></Group>
          <Group label="Assuntos que você curte">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{INTERESTS.map((it) => { const on = p.interests.includes(it); return <Pressable key={it} onPress={() => set({ interests: toggle(p.interests, it) })} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[chip, on ? choiceOn : null]}><Text style={[chipText, on ? { color: C.greenDark } : null]}>{it}</Text></Pressable>; })}</View>
          </Group>
          <Group label="Hábitos para começar (opcional)">
            {SUGGESTED.map((h) => { const on = habits.includes(h.id); return <Pressable key={h.id} onPress={() => setHabits(toggle(habits, h.id))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={habitRow}><MaterialCommunityIcons name={on ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={on ? C.green : C.muted} /><View style={{ flex: 1 }}><Text style={featureTitle}>{h.name}</Text><Text style={featureDetail}>{h.detail}</Text></View></Pressable>; })}
          </Group>
        </> : null}

        {step === 4 ? <>
          <Title title="Como você conheceu o Nyvo?" sub="Isso nos ajuda a chegar em mais pessoas como você." />
          <View style={{ gap: 8 }}>{SOURCES.map((s) => { const on = p.source === s; return <Pressable key={s} onPress={() => set({ source: on ? "" : s })} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[habitRow, on ? choiceOn : null]}><MaterialCommunityIcons name={on ? "radiobox-marked" : "radiobox-blank"} size={22} color={on ? C.green : C.muted} /><Text style={[featureTitle, { flex: 1 }]}>{s}</Text></Pressable>; })}</View>
        </> : null}

        {step === 5 ? <>
          <Title title="Salve seus dados" sub="Crie uma conta grátis para não perder nada se trocar de celular, limpar o navegador ou usar no notebook." />
          {cloud.session ? <View style={[habitRow, choiceOn]}><MaterialCommunityIcons name="check-circle" size={22} color={C.green} /><Text style={[featureTitle, { flex: 1 }]}>Conta conectada: {cloud.email}</Text></View> : null}
          <AccountCard initialMode="Criar conta" />
          {!cloud.session ? <View style={warn}><MaterialCommunityIcons name="alert-outline" size={18} color="#80611E" /><Text style={warnText}>Sem conta, seus dados ficam só neste aparelho. Dá para criar a conta depois em Configurações.</Text></View> : null}
        </> : null}

        <View style={{ gap: 9 }}>
          {step < TOTAL ? <PrimaryButton title="Continuar" icon="arrow-right" onPress={() => setStep(step + 1)} />
            : <PrimaryButton title={cloud.session ? "Começar a usar" : "Continuar sem conta"} tone={cloud.session ? "green" : "light"} icon={cloud.session ? "check" : "arrow-right"} onPress={finish} disabled={loading} />}
          <Pressable onPress={() => setStep(step - 1)} accessibilityRole="button"><Text style={[footnote, { color: C.green, fontWeight: "700" }]}>Voltar</Text></Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function Title({ title, sub }: { title: string; sub: string }) {
  return <View style={{ gap: 7 }}><Text accessibilityRole="header" style={[headline, { fontSize: 28, lineHeight: 34 }]}>{title}</Text><Text style={subhead}>{sub}</Text></View>;
}
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 8 }}><Text style={featureTitle}>{label}</Text>{children}</View>;
}
function Chips({ values, selected, onSelect, small }: { values: string[]; selected: string; onSelect: (v: string) => void; small?: boolean }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: small ? 6 : 7 }}>{values.map((v) => { const on = selected === v; return <Pressable key={v} onPress={() => onSelect(on ? "" : v)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[chip, small ? { paddingHorizontal: 10, minWidth: 46, alignItems: "center" } : null, on ? choiceOn : null]}><Text style={[chipText, on ? { color: C.greenDark } : null]}>{v}</Text></Pressable>; })}</View>;
}
function Feature({ icon, title, detail }: { icon: Icon; title: string; detail: string }) {
  return <View style={featureRow}><View style={featureIcon}><MaterialCommunityIcons name={icon} size={21} color={C.green} /></View><View style={{ flex: 1, gap: 3 }}><Text style={featureTitle}>{title}</Text><Text style={featureDetail}>{detail}</Text></View></View>;
}

const page = { flex: 1, backgroundColor: C.paper, alignItems: "center" as const, justifyContent: "center" as const };
const content = { width: "100%" as const, maxWidth: 520, paddingHorizontal: 24, paddingVertical: 28, flex: 1, justifyContent: "space-between" as const, gap: 19 };
const eyebrow = { color: C.green, fontFamily: SANS, fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.4 };
const skip = { color: C.muted, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const headline = { color: C.ink, fontFamily: SERIF, fontSize: 37, lineHeight: 43, fontWeight: "700" as const, letterSpacing: -0.6 };
const subhead = { color: C.muted, fontFamily: SANS, fontSize: 14, lineHeight: 21, maxWidth: 420 };
const featureRow = { flexDirection: "row" as const, gap: 12, alignItems: "center" as const };
const featureIcon = { width: 41, height: 41, borderRadius: 14, backgroundColor: C.greenSoft, alignItems: "center" as const, justifyContent: "center" as const };
const featureTitle = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const featureDetail = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 };
const footnote = { color: C.muted, fontFamily: SANS, fontSize: 12, textAlign: "center" as const, lineHeight: 17 };
const track = { height: 6, borderRadius: 3, backgroundColor: C.line, overflow: "hidden" as const };
const trackFill = { height: 6, borderRadius: 3, backgroundColor: C.green };
const bigChoice = { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface };
const chip = { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface };
const chipText = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "600" as const };
const choiceOn = { borderColor: C.green, backgroundColor: C.greenSoft };
const habitRow = { flexDirection: "row" as const, alignItems: "center" as const, gap: 11, padding: 12, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line };
const warn = { flexDirection: "row" as const, gap: 9, alignItems: "flex-start" as const, backgroundColor: C.amberSoft, borderRadius: 13, padding: 12 };
const warnText = { flex: 1, color: "#80611E", fontFamily: SANS, fontSize: 12, lineHeight: 17 };
