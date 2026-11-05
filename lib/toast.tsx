import React, { useEffect, useSyncExternalStore } from "react";
import { Platform, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C, SANS } from "@/lib/design";
import { SlideIn } from "@/components/motion";

type Icon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type ToastState = { id: number; message: string; icon: Icon; ms: number } | null;

let current: ToastState = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Mostra uma confirmação curta na parte de baixo da tela (ex.: "Gasto salvo."). */
export function toast(message: string, icon: Icon = "check-circle", ms = 2600) {
  current = { id: Date.now(), message, icon, ms };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { current = null; emit(); }, ms);
  emit();
}

function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
const snapshot = () => current;

/** Coloque uma vez no layout; mostra o toast atual acima da barra de navegação. */
export function ToastHost({ bottom }: { bottom: number }) {
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    if (!state || Platform.OS === "web") return;
    void import("expo-haptics").then((h) => h.notificationAsync(h.NotificationFeedbackType.Success)).catch(() => undefined);
  }, [state]);
  if (!state) return null;
  return (
    <View pointerEvents="none" style={[wrap, { bottom }]}>
      <SlideIn key={state.id} style={box}>
        <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={row}>
          <MaterialCommunityIcons name={state.icon} size={18} color="#FFFFFF" />
          <Text style={text}>{state.message}</Text>
        </View>
      </SlideIn>
    </View>
  );
}

const wrap = { position: "absolute" as const, left: 20, right: 20, alignItems: "center" as const, zIndex: 50 };
const row = { flexDirection: "row" as const, alignItems: "center" as const, gap: 9 };
const box = { width: "100%" as const, maxWidth: 520, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 15, backgroundColor: C.ink, flexDirection: "row" as const, alignItems: "center" as const, gap: 9, zIndex: 50, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 };
const text = { flex: 1, color: "#FFFFFF", fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
