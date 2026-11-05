import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, type ViewStyle } from "react-native";

const native = Platform.OS !== "web";
let reduceMotion = false;
void AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduceMotion = v; }).catch(() => undefined);
if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
  try { reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* ignora */ }
}

/** Barra de progresso que desliza até o novo valor (ex.: hábitos de hoje). */
export function AnimatedProgress({ value, max, height = 8, color, track }: { value: number; max: number; height?: number; color: string; track: string }) {
  const pct = max ? Math.min(1, value / max) : 0;
  const [anim] = useState(() => new Animated.Value(pct));
  useEffect(() => {
    if (reduceMotion) { anim.setValue(pct); return; }
    Animated.timing(anim, { toValue: pct, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, anim]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <Animated.View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: value, text: `${Math.round(pct * 100)}%` }} style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }}>
      <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: color, width }} />
    </Animated.View>
  );
}

/** Dá um "pulinho" no conteúdo quando `active` passa a ser verdadeiro (ex.: marcar hábito). */
export function Pop({ active, children, style }: { active: boolean; children: React.ReactNode; style?: ViewStyle }) {
  const [scale] = useState(() => new Animated.Value(1));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!active || reduceMotion) return;
    scale.setValue(0.6);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: native }).start();
  }, [active, scale]);
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

/** Entra subindo levemente e com fade (usado no toast). */
export function SlideIn({ children, style, from = 16 }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; from?: number }) {
  const [v] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(v, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
