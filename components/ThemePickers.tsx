import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ChoiceChips } from "@/components/app-ui";
import { C, SANS } from "@/lib/design";
import { playSound } from "@/lib/sound-player";
import { ALL_ICONS, SOUNDS, soundFor, suggestIcons, type SoundId } from "@/lib/themes";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function IconOption({ name, on, onPress }: { name: string; on: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Ícone ${name}`} style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: on ? C.greenSoft : "transparent", borderWidth: 1.5, borderColor: on ? C.green : C.line }}>
    <MaterialCommunityIcons name={name as IconName} size={22} color={on ? C.green : C.ink} />
  </Pressable>;
}

/** Ícones sugeridos pelo que a pessoa escreveu, com a lista completa a um toque. */
export function IconPicker({ text, value, onChange }: { text: string; value: string; onChange: (icon: string) => void }) {
  const [all, setAll] = useState(false);
  const suggested = suggestIcons(text);
  const shown = all ? ALL_ICONS : [...new Set([...suggested, ...(value ? [value] : [])])];
  const active = value || suggested[0] || "";
  return <View style={{ gap: 7 }}>
    <Text style={label}>Ícone</Text>
    {shown.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{shown.map((name) => <IconOption key={name} name={name} on={name === active} onPress={() => onChange(name)} />)}</View> : <Text style={hint}>Escreva o nome para ver sugestões.</Text>}
    <Pressable onPress={() => setAll(!all)} accessibilityRole="button" hitSlop={6}><Text style={link}>{all ? "Mostrar só as sugestões" : "Ver todos os ícones"}</Text></Pressable>
  </View>;
}

/** Som do aviso. "Automático" segue o texto; tocar em um som mostra como ele fica. */
export function SoundPicker({ text, value, onChange }: { text: string; value: string; onChange: (sound: string) => void }) {
  const names = ["Automático", ...SOUNDS.map((s) => s.label)];
  const selected = SOUNDS.find((s) => s.id === value)?.label ?? "Automático";
  const auto = SOUNDS.find((s) => s.id === soundFor("", text))?.label;
  return <View style={{ gap: 7 }}>
    <Text style={label}>Som do aviso</Text>
    <ChoiceChips values={names} selected={selected} onSelect={(name) => {
      const sound = SOUNDS.find((s) => s.label === name)?.id ?? "";
      onChange(sound);
      void playSound(soundFor(sound, text) as SoundId);
    }} horizontal={false} />
    {selected === "Automático" ? <Text style={hint}>Neste aviso: {auto}.</Text> : null}
  </View>;
}

const label = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const hint = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 };
const link = { color: C.green, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
