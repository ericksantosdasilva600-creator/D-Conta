import React, { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card, Field, PrimaryButton } from "@/components/app-ui";
import { ACTIVE_PALETTE, C, PALETTES, SANS, paletteColors, readThemeChoice, resolvePalette, saveThemeChoice, type Palette } from "@/lib/design";

const SWATCHES = ["#187A61", "#1F6FB2", "#6A4BC4", "#C2416F", "#C8582B", "#3E6B2F", "#34404A", "#0E8C9A", "#D14B4B", "#8A5A2B", "#2E7D32", "#5C6BC0"];

export function AppearanceCard() {
  const saved = readThemeChoice();
  const [selected, setSelected] = useState(ACTIVE_PALETTE.id);
  const [primary, setPrimary] = useState(saved?.primary ?? "#187A61");
  const [secondary, setSecondary] = useState(saved?.secondary ?? "#3478A9");
  const valid = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);
  const preview: Palette = selected === "custom" ? resolvePalette({ palette: "custom", primary: valid(primary) ? primary : "#187A61", secondary: valid(secondary) ? secondary : undefined }) : resolvePalette({ palette: selected });
  const colors = paletteColors(preview);
  const changed = selected !== ACTIVE_PALETTE.id || (selected === "custom" && (primary.toUpperCase() !== ACTIVE_PALETTE.primary || secondary.toUpperCase() !== ACTIVE_PALETTE.secondary));
  if (Platform.OS !== "web") return <Card><Text style={muted}>A troca de cores chega ao app instalado na próxima versão. No site, já está disponível.</Text></Card>;

  return (
    <Card style={{ gap: 12 }}>
      <Text style={strong}>Paleta de cores</Text>
      <Text style={muted}>Escolha as cores do Nyvo. Vale para este aparelho.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
        {[...PALETTES, { id: "custom", name: "Personalizada", primary: valid(primary) ? primary : "#187A61", secondary: valid(secondary) ? secondary : "#3478A9", paper: "#FFFFFF" }].map((p) => {
          const on = selected === p.id;
          return <Pressable key={p.id} onPress={() => setSelected(p.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`Paleta ${p.name}`} style={[option, on ? { borderColor: C.ink, borderWidth: 2 } : null]}>
            <View style={{ flexDirection: "row" }}><View style={[dot, { backgroundColor: p.primary }]} /><View style={[dot, { backgroundColor: p.secondary, marginLeft: -6 }]} /></View>
            <Text style={optionText}>{p.name}</Text>
            {on ? <MaterialCommunityIcons name="check-circle" size={16} color={C.ink} /> : null}
          </Pressable>;
        })}
      </View>
      {selected === "custom" ? <View style={{ gap: 10 }}>
        <Text style={label}>Cor principal</Text>
        <SwatchRow value={primary} onPick={setPrimary} />
        <Field label="Código da cor principal" value={primary} onChangeText={(v) => setPrimary(v.startsWith("#") ? v.slice(0, 7) : `#${v.slice(0, 6)}`)} placeholder="#187A61" autoCapitalize="characters" error={valid(primary) ? undefined : "Use o formato #RRGGBB."} />
        <Text style={label}>Cor de apoio (finanças e destaques)</Text>
        <SwatchRow value={secondary} onPick={setSecondary} />
        <Field label="Código da cor de apoio" value={secondary} onChangeText={(v) => setSecondary(v.startsWith("#") ? v.slice(0, 7) : `#${v.slice(0, 6)}`)} placeholder="#3478A9" autoCapitalize="characters" error={valid(secondary) ? undefined : "Use o formato #RRGGBB."} />
      </View> : null}
      <View style={[previewBox, { backgroundColor: colors.paper }]}>
        <View style={[previewHero, { backgroundColor: colors.greenDark }]}><Text style={{ color: "#FFFFFF", fontFamily: SANS, fontWeight: "800", fontSize: 13 }}>Prévia com valores de exemplo · R$ 2.450,00</Text></View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={[previewBtn, { backgroundColor: colors.green }]}><Text style={previewBtnText}>Botão</Text></View>
          <View style={[previewChip, { backgroundColor: colors.greenSoft, borderColor: colors.green }]}><Text style={{ color: colors.greenDark, fontFamily: SANS, fontWeight: "700", fontSize: 12 }}>Selecionado</Text></View>
          <View style={[previewChip, { backgroundColor: colors.blueSoft, borderColor: colors.blue }]}><Text style={{ color: colors.blueDark, fontFamily: SANS, fontWeight: "700", fontSize: 12 }}>Finanças</Text></View>
        </View>
      </View>
      <PrimaryButton title={changed ? "Aplicar cores" : "Cores em uso"} icon="palette-outline" disabled={!changed || (selected === "custom" && (!valid(primary) || !valid(secondary)))} onPress={() => saveThemeChoice(selected === "custom" ? { palette: "custom", primary, secondary } : { palette: selected })} />
      <Text style={muted}>O Nyvo recarrega para aplicar. Seus dados não são alterados.</Text>
    </Card>
  );
}

function SwatchRow({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{SWATCHES.map((c) => <Pressable key={c} onPress={() => onPick(c)} accessibilityRole="button" accessibilityLabel={`Cor ${c}`} style={[swatch, { backgroundColor: c }, value.toUpperCase() === c ? { borderColor: C.ink, borderWidth: 3 } : null]} />)}</View>;
}

const strong = { color: C.ink, fontFamily: SANS, fontSize: 14, fontWeight: "700" as const };
const label = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const muted = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 };
const option = { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 13, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface };
const optionText = { color: C.ink, fontFamily: SANS, fontSize: 12, fontWeight: "700" as const };
const dot = { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#FFFFFF" };
const swatch = { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" };
const previewBox = { borderRadius: 16, padding: 12, gap: 10, borderWidth: 1, borderColor: C.line };
const previewHero = { borderRadius: 13, padding: 14 };
const previewBtn = { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9 };
const previewBtnText = { color: "#FFFFFF", fontFamily: SANS, fontWeight: "800" as const, fontSize: 12 };
const previewChip = { borderRadius: 11, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1.5 };
