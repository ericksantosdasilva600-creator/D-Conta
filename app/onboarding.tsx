import React, { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppData, type Habit, type UserProfile } from "@/lib/app-data";
import { C, SANS, SERIF } from "@/lib/design";
import { createId } from "@/lib/format";
import { BrandMark, Field, PrimaryButton, StorageBanner } from "@/components/app-ui";
import { AccountCard } from "@/components/AccountCard";
import { AGE_RANGES, BR_STATES, COUNTRIES, GENDERS, GOALS, INTERESTS, OCCUPATIONS, SOURCES } from "@/lib/brand";
import { useSupabaseSync } from "@/lib/supabase-sync";
import { privacyUrl } from "@/lib/site";

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
const TOTAL = 4;
const TOP_INTERESTS = 6;

export default function OnboardingScreen() {
  const { data, updateData, loading } = useAppData();
  const cloud = useSupabaseSync();
  const [step, setStep] = useState(1);
  const [p, setP] = useState<UserProfile>({ ...data.profile });
  const [focus, setFocus] = useState<string[]>(["money"]);
  const [habits, setHabits] = useState<string[]>([]);
  const [moreAboutMe, setMoreAboutMe] = useState(false);
  const [allInterests, setAllInterests] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const set = (c: Partial<UserProfile>) => setP((x) => ({ ...x, ...c }));
  const toggle = (list: string[], id: string) => list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const finish = () => {
    const created: Habit[] = SUGGESTED.filter((h) => habits.includes(h.id)).map((h) => ({ id: createId(), name: h.name, weekdays: h.weekdays, reminderTime: h.time, priority: "medium", archived: false, goalLabel: "" }));
    const currency = COUNTRIES.find((c) => c.name === p.country)?.currency;
    updateData((current) => ({ ...current, onboarded: true, focus, profile: { ...p, name: p.name.trim() }, habits: [...current.habits, ...created], ...(currency ? { currency } : {}) }));
    router.replace(focus.length === 1 && focus[0] === "money" ? "/finance" : "/");
  };
  const openPrivacy = () => { if (Platform.OS === "web" && typeof window !== "undefined") window.open(privacyUrl(), "_blank", "noopener"); };

  if (step === 1) return (
    <ScrollView style={{ flex: 1, backgroundColor: C.paper }} contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center" }}>
      <View style={content}>
        <View style={{ alignItems: "flex-start", gap: 22 }}>
          <BrandMark size={54} />
          <View style={{ gap: 10 }}>
            <Text style={eyebrow}>DÁ CONTA · SEU DIA EM ORDEM</Text>
            <Text accessibilityRole="header" style={headline}>Você dá conta.{"\n"}A gente organiza.</Text>
            <Text style={subhead}>Dinheiro, hábitos, estudos e tarefas em um só lugar. Três passos rápidos, sem cadastro obrigatório, e o Dá Conta fica com a sua cara.</Text>
            <View style={badgeRow}>
              <Badge icon="gift-outline" text="100% grátis" />
              <Badge icon="cancel" text="Sem anúncios" />
              <Badge icon="cellphone-lock" text="Funciona sem conta" />
            </View>
          </View>
        </View>
        <View style={{ gap: 13 }}>
          <Feature icon="wallet-outline" title="Finanças" detail="Contas fixas, cartão, metas e plano para sair das dívidas." />
          <Feature icon="heart-pulse" title="Hábitos & Saúde" detail="Rotinas, água, treino, leitura e estudo." />
          <Feature icon="format-list-checks" title="Tarefas e Estudos" detail="Prazos, provas, trabalhos e Pomodoro." />
          <Feature icon="note-text-outline" title="Anotações" detail="Ideias rápidas, ligadas às suas tarefas." />
        </View>
        <View style={howBox}>
          <Text accessibilityRole="header" style={featureTitle}>Como funciona</Text>
          <HowStep n="1" text="Diga seu nome e o que quer organizar." />
          <HowStep n="2" text={'Anote um gasto ("gastei 45 no mercado"), marque um hábito ou crie uma tarefa.'} />
          <HowStep n="3" text="O Dá Conta mostra seu dia, avisa das contas e acompanha seu progresso." />
        </View>
        <View style={{ gap: 12 }}>
          <StorageBanner />
          <PrimaryButton title={loading ? "Preparando…" : "Começar grátis"} onPress={() => setStep(2)} disabled={loading} icon="arrow-right" />
          <Pressable onPress={() => { setShowAccount(true); setStep(TOTAL); }} accessibilityRole="button" style={secondaryBtn}><Text style={secondaryText}>Já tenho conta · Entrar</Text></Pressable>
          <Text style={footnote}>Leva menos de 1 minuto. Tudo pode ser mudado depois.</Text>
          {Platform.OS === "web" ? <Pressable onPress={openPrivacy} accessibilityRole="link"><Text style={[footnote, { textDecorationLine: "underline" }]}>Privacidade e termos de uso</Text></Pressable> : null}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.paper }} contentContainerStyle={{ alignItems: "center" }} keyboardShouldPersistTaps="handled">
      <View style={[content, { flex: undefined, gap: 20 }]}>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={eyebrow}>PASSO {step - 1} DE {TOTAL - 1}</Text>
            {step < TOTAL ? <Pressable onPress={() => setStep(step + 1)} accessibilityRole="button" hitSlop={10}><Text style={skip}>Pular</Text></Pressable> : null}
          </View>
          <View style={track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: TOTAL - 1, now: step - 1 }}><View style={[trackFill, { width: `${((step - 1) / (TOTAL - 1)) * 100}%` }]} /></View>
        </View>

        {step === 2 ? <>
          <Title title="Prazer! Como podemos te chamar?" sub="Só o nome já basta. Ele aparece na saudação da tela inicial." />
          <Field label="Seu nome ou apelido (opcional)" value={p.name} onChangeText={(v) => set({ name: v.slice(0, 40) })} placeholder="Ex.: Erick" autoCapitalize="words" autoComplete="given-name" />
          <Pressable onPress={() => setMoreAboutMe(!moreAboutMe)} accessibilityRole="button" accessibilityState={{ expanded: moreAboutMe }} style={[habitRow, { borderStyle: "dashed" }]}>
            <MaterialCommunityIcons name={moreAboutMe ? "chevron-up" : "chevron-down"} size={20} color={C.green} />
            <View style={{ flex: 1 }}><Text style={featureTitle}>Contar mais sobre mim (opcional)</Text><Text style={featureDetail}>O país define a moeda; ocupação e idade deixam as dicas mais certeiras. Fica guardado só no seu aparelho (ou na sua conta, se criar uma).</Text></View>
          </Pressable>
          {moreAboutMe ? <>
            <Group label="País (define a moeda)"><Chips values={COUNTRIES.map((c) => c.name)} selected={p.country} onSelect={(v) => set({ country: v, state: v === "Brasil" ? p.state : "" })} /></Group>
            {p.country === "Brasil" ? <Group label="Estado"><Chips values={BR_STATES} selected={p.state} onSelect={(v) => set({ state: v })} small /></Group> : null}
            <Group label="O que você faz? (dicas de estudo ou trabalho)"><Chips values={OCCUPATIONS} selected={p.occupation} onSelect={(v) => set({ occupation: v })} /></Group>
            <Group label="Faixa de idade"><Chips values={AGE_RANGES} selected={p.ageRange} onSelect={(v) => set({ ageRange: v })} /></Group>
            <Group label="Sexo"><Chips values={GENDERS} selected={p.gender} onSelect={(v) => set({ gender: v })} /></Group>
          </> : null}
        </> : null}

        {step === 3 ? <>
          <Title title={`${p.name.trim() ? `${p.name.trim().split(" ")[0]}, o` : "O"} que você quer organizar?`} sub="Escolha quantos quiser. A tela inicial muda conforme sua escolha." />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
            {FOCUS.map((f) => { const on = focus.includes(f.id); return <Pressable key={f.id} onPress={() => setFocus(toggle(focus, f.id))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[bigChoice, on ? choiceOn : null]}><MaterialCommunityIcons name={f.icon} size={20} color={on ? C.greenDark : C.muted} /><Text style={[featureTitle, { color: on ? C.greenDark : C.ink }]}>{f.label}</Text></Pressable>; })}
          </View>
          <Group label="Seu principal objetivo agora (opcional)"><Chips values={GOALS} selected={p.goal} onSelect={(v) => set({ goal: v })} /></Group>
          <Group label="Quer começar com algum hábito? (opcional)">
            {SUGGESTED.map((h) => { const on = habits.includes(h.id); return <Pressable key={h.id} onPress={() => setHabits(toggle(habits, h.id))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={habitRow}><MaterialCommunityIcons name={on ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={on ? C.green : C.muted} /><View style={{ flex: 1 }}><Text style={featureTitle}>{h.name}</Text><Text style={featureDetail}>{h.detail}</Text></View></Pressable>; })}
          </Group>
          <Group label="Assuntos que você curte (opcional, para as dicas)">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
              {(allInterests ? INTERESTS : INTERESTS.slice(0, TOP_INTERESTS)).map((it) => { const on = p.interests.includes(it); return <Pressable key={it} onPress={() => set({ interests: toggle(p.interests, it) })} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[chip, on ? choiceOn : null]}><Text style={[chipText, on ? { color: C.greenDark } : null]}>{it}</Text></Pressable>; })}
              {INTERESTS.length > TOP_INTERESTS ? <Pressable onPress={() => setAllInterests(!allInterests)} accessibilityRole="button" style={chip}><Text style={[chipText, { color: C.green }]}>{allInterests ? "Mostrar menos" : `+${INTERESTS.length - TOP_INTERESTS} assuntos`}</Text></Pressable> : null}
            </View>
          </Group>
        </> : null}

        {step === 4 ? <>
          <Title title="Tudo pronto!" sub="O Dá Conta funciona sem conta: seus dados ficam neste aparelho. Para usar no celular e no notebook, ou não perder nada ao trocar de aparelho, crie uma conta grátis — agora ou depois, em Configurações." />
          {cloud.session ? <View style={[habitRow, choiceOn]}><MaterialCommunityIcons name="check-circle" size={22} color={C.green} /><Text style={[featureTitle, { flex: 1 }]}>Conta conectada: {cloud.email}</Text></View>
            : showAccount ? <AccountCard initialMode="Criar conta" />
            : <PrimaryButton title="Criar conta grátis ou entrar" tone="light" icon="account-plus-outline" onPress={() => setShowAccount(true)} />}
          <Group label="Pergunta rápida: como conheceu o Dá Conta? (opcional)">
            <Chips values={SOURCES} selected={p.source} onSelect={(v) => set({ source: v })} />
          </Group>
        </> : null}

        <View style={{ gap: 9 }}>
          {step < TOTAL ? <PrimaryButton title="Continuar" icon="arrow-right" onPress={() => setStep(step + 1)} />
            : <PrimaryButton title={cloud.session ? "Começar a usar" : "Começar a usar sem conta"} icon={cloud.session ? "check" : "arrow-right"} onPress={finish} disabled={loading} />}
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
function Badge({ icon, text }: { icon: Icon; text: string }) {
  return <View style={badge}><MaterialCommunityIcons name={icon} size={14} color={C.greenDark} /><Text style={badgeText}>{text}</Text></View>;
}
function HowStep({ n, text }: { n: string; text: string }) {
  return <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}><View style={howNum}><Text style={howNumText}>{n}</Text></View><Text style={[featureDetail, { flex: 1, fontSize: 13, lineHeight: 19, color: C.ink }]}>{text}</Text></View>;
}

const content = { width: "100%" as const, maxWidth: 520, paddingHorizontal: 24, paddingVertical: 28, flex: 1, justifyContent: "space-between" as const, gap: 22 };
const eyebrow = { color: C.green, fontFamily: SANS, fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.4 };
const skip = { color: C.muted, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const headline = { color: C.ink, fontFamily: SERIF, fontSize: 37, lineHeight: 43, fontWeight: "700" as const, letterSpacing: -0.6 };
const subhead = { color: C.muted, fontFamily: SANS, fontSize: 14, lineHeight: 21, maxWidth: 440 };
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
const howBox = { gap: 10, padding: 16, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line };
const howNum = { width: 22, height: 22, borderRadius: 11, backgroundColor: C.green, alignItems: "center" as const, justifyContent: "center" as const };
const howNumText = { color: "#FFFFFF", fontFamily: SANS, fontSize: 12, fontWeight: "800" as const };
const badgeRow = { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 7, marginTop: 4 };
const badge = { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: C.greenSoft };
const badgeText = { color: C.greenDark, fontFamily: SANS, fontSize: 12, fontWeight: "700" as const };
const secondaryBtn = { alignItems: "center" as const, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface };
const secondaryText = { color: C.greenDark, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
