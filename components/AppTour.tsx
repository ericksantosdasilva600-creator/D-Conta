import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PrimaryButton } from "@/components/app-ui";
import { useAppData } from "@/lib/app-data";
import { C, SANS, SERIF } from "@/lib/design";
import { addDemoData, hasDemoData } from "@/lib/demo-data";

type Icon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const STEPS: { icon: Icon; title: string; text: string; tip?: string }[] = [
  { icon: "white-balance-sunny", title: "Hoje", text: "Sua tela inicial. Mostra o saldo do mês, as contas que vencem, os hábitos e as tarefas do dia.", tip: "Toque em Pagar e a conta já vai para os seus gastos." },
  { icon: "lightning-bolt-outline", title: "Anote escrevendo", text: "Escreva como fala: “gastei 45 no mercado” ou “recebi 2000 de salário”. O Nyvo entende o valor e a categoria.", tip: "O botão + verde aparece em todas as telas." },
  { icon: "wallet-outline", title: "Finanças", text: "Movimentos, contas fixas, cartão de crédito com fatura e parcelas, metas, plano de dívidas, resumo do mês e importação do extrato do banco." },
  { icon: "heart-pulse", title: "Hábitos & Saúde", text: "Marque seus hábitos, registre água, treino, leitura e estudo. Uma pausa não apaga sua sequência." },
  { icon: "school-outline", title: "Tarefas e Estudos", text: "Organize tarefas com prazo, cadastre provas e trabalhos e use o cronômetro Pomodoro para focar." },
  { icon: "chart-box-outline", title: "Gráficos", text: "Veja para onde vai o dinheiro, como andam seus hábitos e quantas tarefas você concluiu." },
  { icon: "bell-outline", title: "Lembretes do seu jeito", text: "Avisos numa data, todo dia, em dias da semana, todo mês ou a cada X minutos ou horas. Toque no sino da tela Hoje." },
  { icon: "palette-outline", title: "Deixe com a sua cara", text: "Em Configurações › Aparência você escolhe as cores. Em Ajuda e feedback você fala com a gente." },
];

export function AppTour() {
  const { data, updateData } = useAppData();
  const [i, setI] = useState(0);
  const [withDemo, setWithDemo] = useState(!data.transactions.length);
  if (!data.onboarded || data.tourDone) return null;
  const last = i === STEPS.length - 1;
  const step = STEPS[i];
  const finish = (demo: boolean) => { updateData((c) => ({ ...(demo && !hasDemoData(c) ? addDemoData(c) : c), tourDone: true })); setI(0); };
  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => finish(false)}>
      <View style={backdrop}>
        <View style={sheet}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={eyebrow}>TOUR · {i + 1} DE {STEPS.length}</Text>
            <Pressable onPress={() => finish(false)} accessibilityRole="button" accessibilityLabel="Pular o tour" hitSlop={10}><Text style={skip}>Pular</Text></Pressable>
          </View>
          <View style={iconWrap}><MaterialCommunityIcons name={step.icon} size={34} color={C.green} /></View>
          <Text accessibilityRole="header" style={title}>{step.title}</Text>
          <Text style={body}>{step.text}</Text>
          {step.tip ? <View style={tipBox}><MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={C.greenDark} /><Text style={tipText}>{step.tip}</Text></View> : null}
          <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>{STEPS.map((_, k) => <View key={k} style={[dot, k === i ? { backgroundColor: C.green, width: 18 } : null]} />)}</View>
          {last && !hasDemoData(data) ? <Pressable onPress={() => setWithDemo((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: withDemo }} style={demoRow}>
            <MaterialCommunityIcons name={withDemo ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={withDemo ? C.green : C.muted} />
            <View style={{ flex: 1 }}><Text style={demoTitle}>Explorar com dados de exemplo</Text><Text style={demoText}>Preenche o Nyvo com um mês fictício para você ver tudo funcionando. Dá para remover com um toque em Configurações.</Text></View>
          </Pressable> : null}
          <View style={{ flexDirection: "row", gap: 9 }}>
            {i > 0 ? <View style={{ flex: 1 }}><PrimaryButton title="Voltar" tone="light" onPress={() => setI(i - 1)} /></View> : null}
            <View style={{ flex: 2 }}><PrimaryButton title={last ? "Começar a usar" : "Próximo"} icon={last ? "check" : "arrow-right"} onPress={() => last ? finish(withDemo) : setI(i + 1)} /></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const backdrop = { flex: 1, backgroundColor: "rgba(20,28,25,0.55)", alignItems: "center" as const, justifyContent: "center" as const, padding: 18 };
const sheet = { width: "100%" as const, maxWidth: 440, backgroundColor: C.paper, borderRadius: 26, padding: 22, gap: 14 };
const eyebrow = { color: C.green, fontFamily: SANS, fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.3 };
const skip = { color: C.muted, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const iconWrap = { width: 68, height: 68, borderRadius: 22, backgroundColor: C.greenSoft, alignItems: "center" as const, justifyContent: "center" as const };
const title = { color: C.ink, fontFamily: SERIF, fontSize: 28, fontWeight: "700" as const };
const body = { color: C.ink, fontFamily: SANS, fontSize: 15, lineHeight: 22 };
const tipBox = { flexDirection: "row" as const, gap: 8, alignItems: "flex-start" as const, backgroundColor: C.greenSoft, borderRadius: 13, padding: 11 };
const tipText = { flex: 1, color: C.greenDark, fontFamily: SANS, fontSize: 13, lineHeight: 18 };
const dot = { width: 7, height: 7, borderRadius: 4, backgroundColor: C.line };
const demoRow = { flexDirection: "row" as const, gap: 10, alignItems: "flex-start" as const, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12 };
const demoTitle = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const demoText = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 };
