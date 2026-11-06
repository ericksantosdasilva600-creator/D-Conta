import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppModal } from "@/components/app-ui";
import { useAppData } from "@/lib/app-data";
import { localAnswer, searchApp } from "@/lib/assistant";
import { askAssistant, type ChatMessage } from "@/lib/assistant-ai";
import { C, SANS } from "@/lib/design";

type Icon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const SUGGESTIONS = ["Quanto gastei este mês?", "Quais tarefas estão pendentes?", "Como importo o extrato do banco?"];
const MAX_QUESTION = 500;
const OFFLINE = "Não consegui responder agora. Tente buscar por outra palavra ou veja Ajuda e feedback.";
const LIMIT = "Você atingiu o limite de perguntas à IA por hoje. As buscas e os resumos do Dá Conta continuam funcionando.";

/** Lupa do Dá Conta: busca nos dados do aparelho e conversa com o mini assistente. */
export function AssistantSearch({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data } = useAppData();
  const [query, setQuery] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const hits = useMemo(() => searchApp(data, query), [data, query]);
  const trimmed = query.trim();

  const ask = async (text: string) => {
    const question = text.trim().slice(0, MAX_QUESTION);
    if (!question || busyRef.current) return;
    setQuery("");
    const history: ChatMessage[] = [...chat, { role: "user", content: question }];
    setChat(history);
    const local = localAnswer(data, question);
    if (local) { setChat([...history, { role: "assistant", content: local }]); return; }
    busyRef.current = true; setBusy(true);
    const result = await askAssistant(history);
    busyRef.current = false; setBusy(false);
    setChat([...history, { role: "assistant", content: result.ok ? result.reply : result.reason === "limit" ? LIMIT : OFFLINE }]);
  };
  const open = (path: string) => { onClose(); router.push(path as never); };

  return (
    <AppModal visible={visible} onClose={onClose} title="Buscar e perguntar" subtitle="Encontre algo no Dá Conta ou tire uma dúvida.">
      <View style={searchBox}>
        <MaterialCommunityIcons name="magnify" size={21} color={C.green} />
        <TextInput autoFocus value={query} onChangeText={setQuery} onSubmitEditing={() => void ask(query)} maxLength={MAX_QUESTION} placeholder="Busque ou pergunte" placeholderTextColor={C.muted} accessibilityLabel="Buscar no Dá Conta ou perguntar ao assistente" returnKeyType="send" blurOnSubmit={false} style={input} />
        {trimmed ? <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Limpar" hitSlop={8}><MaterialCommunityIcons name="close-circle" size={18} color={C.muted} /></Pressable> : null}
      </View>

      {chat.length ? <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
        {chat.slice(-6).map((m, i) => <View key={i} style={m.role === "user" ? userBubble : botBubble}><Text selectable style={m.role === "user" ? userText : botText}>{m.content}</Text></View>)}
        {busy ? <View style={[botBubble, { flexDirection: "row", gap: 8, alignItems: "center" }]}><ActivityIndicator size="small" color={C.green} /><Text style={botText}>Pensando…</Text></View> : null}
      </View> : null}

      {trimmed ? <View style={{ gap: 6 }}>
        <Row icon="creation-outline" title={`Perguntar: ${trimmed}`} detail="Perguntar ao assistente" onPress={() => void ask(query)} />
        {hits.map((h) => <Row key={h.id} icon={h.icon as Icon} title={h.title} detail={`${h.group} · ${h.detail}`} onPress={() => open(h.path)} />)}
      </View> : !chat.length ? <View style={{ gap: 6 }}>
        <Text style={label}>Experimente</Text>
        {SUGGESTIONS.map((s) => <Row key={s} icon="creation-outline" title={s} onPress={() => void ask(s)} />)}
      </View> : null}

      <Text style={note}>A busca e os resumos ficam no seu aparelho. Só as dúvidas que o Dá Conta não resolve sozinho vão para a IA, sem seus dados. Não escreva informações pessoais nas perguntas. A IA pode errar.</Text>
    </AppModal>
  );
}

function Row({ icon, title, detail, onPress }: { icon: Icon; title: string; detail?: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [row, { opacity: pressed ? 0.7 : 1 }]}>
    <MaterialCommunityIcons name={icon} size={20} color={C.green} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text numberOfLines={2} style={rowTitle}>{title}</Text>
      {detail ? <Text numberOfLines={1} style={rowDetail}>{detail}</Text> : null}
    </View>
  </Pressable>;
}

const searchBox = { flexDirection: "row" as const, alignItems: "center" as const, gap: 9, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 13, minHeight: 48, backgroundColor: C.surface };
const input = { flex: 1, minWidth: 0, color: C.ink, fontFamily: SANS, fontSize: 15, paddingVertical: 11, outlineStyle: "none" } as object;
const row = { flexDirection: "row" as const, alignItems: "center" as const, gap: 11, paddingVertical: 10, paddingHorizontal: 11, borderRadius: 12, backgroundColor: C.paper, minHeight: 46 };
const rowTitle = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "600" as const };
const rowDetail = { color: C.muted, fontFamily: SANS, fontSize: 12, marginTop: 1 };
const label = { color: C.muted, fontFamily: SANS, fontSize: 12, fontWeight: "700" as const };
const note = { color: C.muted, fontFamily: SANS, fontSize: 11, lineHeight: 16 };
const userBubble = { alignSelf: "flex-end" as const, maxWidth: "88%" as const, backgroundColor: C.green, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 };
const botBubble = { alignSelf: "flex-start" as const, maxWidth: "92%" as const, backgroundColor: C.greenSoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 };
const userText = { color: "#FFFFFF", fontFamily: SANS, fontSize: 14, lineHeight: 20 };
const botText = { color: C.ink, fontFamily: SANS, fontSize: 14, lineHeight: 20 };
