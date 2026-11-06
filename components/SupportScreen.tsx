import React, { useState } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card, ChoiceChips, Field, Header, IconButton, Page, PrimaryButton, SectionTitle } from "@/components/app-ui";
import { useAppData } from "@/lib/app-data";
import { AGE_RANGES, BRAND, BR_STATES, COUNTRIES, GENDERS, GOALS, INTERESTS, OCCUPATIONS, SOURCES } from "@/lib/brand";
import { FAQ } from "@/lib/help";
import { privacyUrl } from "@/lib/site";
import { C, SANS, SERIF } from "@/lib/design";

const openMail = (subject: string, body: string) => {
  const url = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  void Linking.openURL(url).catch(() => undefined);
};
const deviceInfo = () => Platform.OS === "web" && typeof navigator !== "undefined" ? `${navigator.userAgent.slice(0, 140)}` : Platform.OS;

export function SupportScreen() {
  const { data, updateData } = useAppData();
  const [open, setOpen] = useState<number | null>(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState("Sugestão");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [shareProfile, setShareProfile] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const profile = data.profile;
  const setProfile = (changes: Partial<typeof profile>) => updateData((c) => ({ ...c, profile: { ...c.profile, ...changes } }));
  const profileText = () => [`Sexo: ${profile.gender || "não informado"}`, `Local: ${[profile.state, profile.country].filter(Boolean).join(", ") || "não informado"}`, `Conheceu por: ${profile.source || "não informado"}`, `Ocupação: ${profile.occupation || "não informada"}`, `Faixa de idade: ${profile.ageRange || "não informada"}`, `Objetivo: ${profile.goal || "não informado"}`, `Interesses: ${profile.interests.join(", ") || "não informados"}`].join("\n");

  const sendSupport = () => {
    if (!message.trim()) { setNotice("Escreva sua dúvida ou o problema."); return; }
    openMail(`[Dá Conta · Suporte] ${subject.trim() || "Preciso de ajuda"}`, `${message.trim()}\n\n---\nVersão ${BRAND.version} · ${deviceInfo()}`);
    setNotice("Abrimos o seu app de e-mail com a mensagem pronta. É só tocar em Enviar.");
  };
  const sendFeedback = () => {
    if (!rating && !feedback.trim()) { setNotice("Dê uma nota ou escreva um comentário."); return; }
    openMail(`[Dá Conta · Feedback] ${kind}${rating ? ` · ${rating}/5` : ""}`, `Tipo: ${kind}\nNota: ${rating ? `${rating} de 5` : "sem nota"}\n\n${feedback.trim()}${shareProfile ? `\n\n--- Perfil (para entender quem usa o Dá Conta)\n${profileText()}` : ""}\n\n---\nVersão ${BRAND.version}`);
    setNotice("Obrigado! Abrimos o seu e-mail com o feedback pronto. Toque em Enviar.");
  };
  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(BRAND.supportEmail); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setNotice(`Copie o endereço: ${BRAND.supportEmail}`); }
  };

  return (
    <Page>
      <Header eyebrow="DÁ CONTA · AJUDA" title="Ajuda e feedback." subtitle="Tire dúvidas, fale com a gente e conte o que achou." right={<IconButton name="arrow-left" label="Voltar" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />} />

      <Card style={{ gap: 10 }}>
        <View style={row}><View style={iconBox}><MaterialCommunityIcons name="map-marker-path" size={20} color={C.green} /></View><View style={{ flex: 1 }}><Text style={strong}>Tour pelo Dá Conta</Text><Text style={muted}>Um passo a passo de 1 minuto pelas principais telas, com opção de dados de exemplo.</Text></View></View>
        <PrimaryButton title="Ver o tour" icon="play-circle-outline" onPress={() => { updateData((c) => ({ ...c, tourDone: false })); router.replace("/"); }} />
      </Card>

      <View style={{ gap: 10 }}>
        <SectionTitle title="Perguntas frequentes" />
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          {FAQ.map((f, i) => <Pressable key={f.q} onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }} style={[faqRow, i === FAQ.length - 1 ? { borderBottomWidth: 0 } : null]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Text style={[strong, { flex: 1 }]}>{f.q}</Text><MaterialCommunityIcons name={open === i ? "chevron-up" : "chevron-down"} size={20} color={C.muted} /></View>
            {open === i ? <Text style={[muted, { fontSize: 13, lineHeight: 19 }]}>{f.a}</Text> : null}
          </Pressable>)}
        </Card>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle title="Falar com o suporte" />
        <Card style={{ gap: 10 }}>
          <Field label="Assunto" value={subject} onChangeText={setSubject} placeholder="Ex.: Não consigo importar o extrato" />
          <Field label="Mensagem" value={message} onChangeText={setMessage} multiline placeholder="Conte o que aconteceu e o que você esperava." style={{ minHeight: 100 }} />
          <PrimaryButton title="Enviar por e-mail" icon="email-outline" onPress={sendSupport} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}><Text selectable style={[muted, { color: C.ink }]}>{BRAND.supportEmail}</Text>{Platform.OS === "web" ? <Pressable onPress={() => void copyEmail()} accessibilityRole="button"><Text style={link}>{copied ? "Copiado" : "Copiar e-mail"}</Text></Pressable> : null}</View>
        </Card>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle title="Feedback" />
        <Card style={{ gap: 12 }}>
          <Text style={strong}>Que nota você dá para o Dá Conta?</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>{[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setRating(n)} accessibilityRole="button" accessibilityLabel={`Nota ${n} de 5`} hitSlop={4}><MaterialCommunityIcons name={n <= rating ? "star" : "star-outline"} size={34} color={n <= rating ? C.amber : C.muted} /></Pressable>)}</View>
          <ChoiceChips values={["Sugestão", "Problema", "Elogio", "Outro"]} selected={kind} onSelect={setKind} />
          <Field label="Comentário" value={feedback} onChangeText={setFeedback} multiline placeholder="O que você mais usa? O que falta? O que podia ser mais fácil?" style={{ minHeight: 90 }} />
          <Pressable onPress={() => setShareProfile((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: shareProfile }} style={{ flexDirection: "row", gap: 9, alignItems: "flex-start" }}>
            <MaterialCommunityIcons name={shareProfile ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={shareProfile ? C.green : C.muted} />
            <Text style={[muted, { flex: 1 }]}>Opcional: anexar meu perfil ao e-mail (sexo, país e estado, faixa de idade, ocupação, objetivo, interesses e como conheceu). Serve só para entender quem usa o Dá Conta. Seu nome e seus dados de finanças, hábitos e tarefas nunca são enviados. Você vê tudo no e-mail antes de enviar.</Text>
          </Pressable>
          <PrimaryButton title="Enviar feedback" icon="send-outline" onPress={sendFeedback} />
        </Card>
      </View>
      {notice ? <Card style={{ backgroundColor: C.greenSoft, borderColor: "transparent" }}><Text style={{ color: C.greenDark, fontFamily: SANS, fontSize: 13, lineHeight: 19 }}>{notice}</Text></Card> : null}

      <View style={{ gap: 10 }}>
        <SectionTitle title="Seu perfil" />
        <Card style={{ gap: 12 }}>
          <Text style={muted}>Opcional. Usamos para personalizar o Dá Conta e as dicas. Se você tiver conta, fica salvo junto com seus dados.</Text>
          <Field label="Seu nome" value={profile.name} onChangeText={(v) => setProfile({ name: v.slice(0, 40) })} placeholder="Como quer ser chamado" />
          <Text style={label}>Sexo</Text>
          <ChoiceChips values={GENDERS} selected={profile.gender} onSelect={(v) => setProfile({ gender: profile.gender === v ? "" : v })} />
          <Text style={label}>País</Text>
          <ChoiceChips values={COUNTRIES.map((c) => c.name)} selected={profile.country} onSelect={(v) => setProfile({ country: profile.country === v ? "" : v })} />
          {profile.country === "Brasil" ? <><Text style={label}>Estado</Text><ChoiceChips values={BR_STATES} selected={profile.state} onSelect={(v) => setProfile({ state: profile.state === v ? "" : v })} /></> : null}
          <Text style={label}>Como conheceu o Dá Conta</Text>
          <ChoiceChips values={SOURCES} selected={profile.source} onSelect={(v) => setProfile({ source: profile.source === v ? "" : v })} horizontal={false} />
          <Text style={label}>O que você faz?</Text>
          <ChoiceChips values={OCCUPATIONS} selected={profile.occupation} onSelect={(v) => setProfile({ occupation: profile.occupation === v ? "" : v })} horizontal={false} />
          <Text style={label}>Faixa de idade</Text>
          <ChoiceChips values={AGE_RANGES} selected={profile.ageRange} onSelect={(v) => setProfile({ ageRange: profile.ageRange === v ? "" : v })} />
          <Text style={label}>Principal objetivo agora</Text>
          <ChoiceChips values={GOALS} selected={profile.goal} onSelect={(v) => setProfile({ goal: profile.goal === v ? "" : v })} horizontal={false} />
          <Text style={label}>Assuntos de interesse</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{INTERESTS.map((it) => { const on = profile.interests.includes(it); return <Pressable key={it} onPress={() => setProfile({ interests: on ? profile.interests.filter((x) => x !== it) : [...profile.interests, it] })} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[chip, on ? chipOn : null]}><Text style={[chipText, on ? { color: C.greenDark } : null]}>{it}</Text></Pressable>; })}</View>
        </Card>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle title="Sobre o Dá Conta" />
        <Card style={{ gap: 14 }}>
          <Text style={{ color: C.ink, fontFamily: SERIF, fontSize: 22, fontWeight: "700" }}>{BRAND.tagline}</Text>
          <View style={{ gap: 4 }}><Text style={eyebrow}>MISSÃO</Text><Text style={bodyText}>{BRAND.mission}</Text></View>
          <View style={{ gap: 4 }}><Text style={eyebrow}>VISÃO</Text><Text style={bodyText}>{BRAND.vision}</Text></View>
          <View style={{ gap: 8 }}><Text style={eyebrow}>VALORES</Text>{BRAND.values.map((v) => <View key={v.title} style={{ flexDirection: "row", gap: 9 }}><MaterialCommunityIcons name="check-circle-outline" size={18} color={C.green} /><Text style={[bodyText, { flex: 1 }]}><Text style={{ fontWeight: "700" }}>{v.title}.</Text> {v.text}</Text></View>)}</View>
          <Text style={muted}>Versão {BRAND.version}{Platform.OS === "web" ? " · " : ""}</Text>
          {Platform.OS === "web" ? <Pressable onPress={() => void Linking.openURL(privacyUrl())} accessibilityRole="link"><Text style={link}>Política de privacidade e termos de uso</Text></Pressable> : null}
        </Card>
      </View>
    </Page>
  );
}

const row = { flexDirection: "row" as const, alignItems: "center" as const, gap: 11 };
const iconBox = { width: 40, height: 40, borderRadius: 13, backgroundColor: C.greenSoft, alignItems: "center" as const, justifyContent: "center" as const };
const strong = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const label = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const muted = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 };
const bodyText = { color: C.ink, fontFamily: SANS, fontSize: 14, lineHeight: 21 };
const eyebrow = { color: C.green, fontFamily: SANS, fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.2 };
const link = { color: C.green, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const faqRow = { gap: 8, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.line };
const chip = { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface };
const chipOn = { borderColor: C.green, backgroundColor: C.greenSoft };
const chipText = { color: C.muted, fontFamily: SANS, fontSize: 12, fontWeight: "700" as const };
