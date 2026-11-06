import React from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C, PRIORITY_COLORS, PRIORITY_LABELS, SANS, SERIF } from "@/lib/design";
import type { Priority } from "@/lib/app-data";
import { useAppData } from "@/lib/app-data";

export function Page({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const { width } = useWindowDimensions();
  const maxWidth = Platform.OS === "web" && width >= 1024 ? Math.min(1040, width - 300) : 560;
  const inner = <View style={[styles.content, { maxWidth }]}>{children}</View>;
  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scrollContent, { paddingBottom: 132 }]}>{inner}</ScrollView> : inner}
    </SafeAreaView>
  );
}

export function Header({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow.toLocaleUpperCase("pt-BR")}</Text>}
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <View accessibilityLabel="Dá Conta" style={[styles.brandMark, { width: size, height: size, borderRadius: size * 0.34 }]}>
      <Image source={require("../assets/images/brand-mark.png")} style={{ width: size, height: size, borderRadius: size * 0.34 }} resizeMode="contain" accessibilityLabel="Símbolo Dá Conta: quatro pilares ligados" />
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? <Pressable onPress={onAction} accessibilityRole="button" style={styles.smallLink}><Text style={styles.smallLinkText}>{action}</Text></Pressable> : null}
    </View>
  );
}

// No site, deixa o "afundar" do botão suave; no celular o toque já é instantâneo.
const PRESS_TRANSITION = (Platform.OS === "web" ? { transitionProperty: "transform, opacity", transitionDuration: "120ms" } : {}) as object;

export function PrimaryButton({ title, onPress, icon, disabled = false, tone = "green", accessibilityLabel }: { title: string; onPress: () => void; icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; disabled?: boolean; tone?: "green" | "ink" | "light"; accessibilityLabel?: string }) {
  const backgroundColor = tone === "green" ? C.green : tone === "ink" ? C.ink : C.greenSoft;
  const color = tone === "light" ? C.greenDark : "#FFFFFF";
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} style={({ pressed }) => [styles.primaryButton, PRESS_TRANSITION, { backgroundColor, opacity: disabled ? 0.5 : pressed ? 0.88 : 1, transform: [{ scale: pressed && !disabled ? 0.97 : 1 }] }]}>
      {icon ? <MaterialCommunityIcons name={icon} size={19} color={color} /> : null}
      <Text style={[styles.primaryButtonText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ name, onPress, label, tone = "default" }: { name: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; onPress: () => void; label: string; tone?: "default" | "danger" | "soft" }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [styles.iconButton, tone === "danger" ? { backgroundColor: C.dangerSoft } : tone === "soft" ? { backgroundColor: C.greenSoft } : null, { opacity: pressed ? 0.7 : 1 }]}>
      <MaterialCommunityIcons name={name} size={19} color={tone === "danger" ? C.danger : C.greenDark} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.ComponentProps<typeof View>["style"] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Tag({ label, tone = "green", icon }: { label: string; tone?: "green" | "coral" | "amber" | "muted" | "blue"; icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }) {
  const palette = tone === "coral" ? [C.coralSoft, C.danger] : tone === "amber" ? [C.amberSoft, "#80611E"] : tone === "blue" ? [C.blueSoft, C.blue] : tone === "muted" ? ["#F0EFEA", C.muted] : [C.greenSoft, C.greenDark];
  return <View style={[styles.tag, { backgroundColor: palette[0] }]}>{icon ? <MaterialCommunityIcons name={icon} size={13} color={palette[1]} /> : null}<Text style={[styles.tagText, { color: palette[1] }]}>{label}</Text></View>;
}

export function PriorityTag({ priority }: { priority: Priority }) {
  const colors = PRIORITY_COLORS[priority];
  return <View style={[styles.tag, { backgroundColor: colors.bg }]}><Text style={[styles.tagText, { color: colors.text }]}>{PRIORITY_LABELS[priority]}</Text></View>;
}

export function PriorityPicker({ value, onChange }: { value: Priority; onChange: (priority: Priority) => void }) {
  const choices: Priority[] = ["low", "medium", "high"];
  return (
    <View style={styles.choiceRow}>
      {choices.map((priority) => {
        const selected = priority === value;
        const colors = PRIORITY_COLORS[priority];
        return <Pressable key={priority} onPress={() => onChange(priority)} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={[styles.choiceChip, selected ? { borderColor: colors.text, backgroundColor: colors.bg } : null]}><Text style={[styles.choiceText, selected ? { color: colors.text, fontWeight: "700" } : null]}>{PRIORITY_LABELS[priority]}</Text></Pressable>;
      })}
    </View>
  );
}

export function Field({ label, error, multiline, style, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={C.muted}
        multiline={multiline}
        style={[styles.input, multiline ? { minHeight: 86, textAlignVertical: "top", paddingTop: 13 } : null, error ? { borderColor: C.danger } : null, style]}
      />
      {error ? <Text style={styles.fieldError} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

export function ChoiceChips({ values, selected, onSelect, horizontal = true }: { values: string[]; selected: string; onSelect: (value: string) => void; horizontal?: boolean }) {
  return (
    <View style={[styles.choiceRow, !horizontal ? { flexWrap: "wrap" } : null]}>
      {values.map((value) => <Pressable key={value} onPress={() => onSelect(value)} accessibilityRole="radio" accessibilityState={{ checked: selected === value }} style={[styles.choiceChip, selected === value ? styles.choiceChipSelected : null]}><Text style={[styles.choiceText, selected === value ? styles.choiceTextSelected : null]}>{value}</Text></Pressable>)}
    </View>
  );
}

export function AppModal({ visible, title, subtitle, onClose, children, footer, maxWidth = 520 }: { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; maxWidth?: number }) {
  const { data } = useAppData();
  return (
    <Modal visible={visible} transparent animationType={data.reduceMotion ? "none" : "slide"} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar janela" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalKeyboard}>
          <View style={[styles.modalSheet, { maxWidth }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text accessibilityRole="header" style={styles.modalTitle}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <IconButton name="close" label="Fechar" onPress={onClose} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18, paddingBottom: 16 }}>{children}</ScrollView>
            {footer ? <View style={styles.modalFooter}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function OfflineBanner() {
  const { isOnline } = useAppData();
  if (isOnline !== false) return null;
  return <View accessibilityRole="alert" style={styles.offlineBanner}><MaterialCommunityIcons name="wifi-off" size={17} color="#80611E" /><Text style={styles.offlineText}>Sem internet — você continua usando o Dá Conta normalmente; tudo fica salvo neste aparelho.</Text></View>;
}

export function StorageBanner() {
  const { storageError, retryStorage } = useAppData();
  if (!storageError) return null;
  return <View accessibilityRole="alert" style={styles.storageBanner}><View style={{ flex: 1, gap: 5 }}><Text style={styles.storageTitle}>Atenção ao armazenamento</Text><Text style={styles.storageText}>{storageError}</Text></View><Pressable onPress={() => void retryStorage()} accessibilityRole="button" style={styles.retryButton}><Text style={styles.retryText}>Tentar</Text></Pressable></View>;
}

export function LoadingState({ label = "Preparando seus dados…" }: { label?: string }) {
  return <View style={styles.loading}><ActivityIndicator size="small" color={C.green} /><Text style={styles.subtitle}>{label}</Text></View>;
}

export function EmptyState({ icon, title, description, action }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; title: string; description: string; action?: React.ReactNode }) {
  return <View style={styles.emptyState}><View style={styles.emptyIcon}><MaterialCommunityIcons name={icon} size={26} color={C.green} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{description}</Text>{action}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper },
  scrollContent: { flexGrow: 1, alignItems: "center" },
  content: { width: "100%", maxWidth: 560, paddingHorizontal: 22, paddingTop: 17, paddingBottom: 30, gap: 22 },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  eyebrow: { fontFamily: SANS, color: C.green, fontWeight: "800", fontSize: 11, letterSpacing: 1.45, marginBottom: 6 },
  title: { color: C.ink, fontFamily: SERIF, fontSize: 31, lineHeight: 37, fontWeight: "700", letterSpacing: -0.65 },
  subtitle: { color: C.muted, fontFamily: SANS, fontSize: 14, lineHeight: 20, marginTop: 4 },
  brandMark: { backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center" },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionTitle: { color: C.ink, fontFamily: SANS, fontWeight: "700", fontSize: 18, letterSpacing: -0.3 },
  smallLink: { paddingVertical: 5, paddingHorizontal: 3 },
  smallLinkText: { color: C.green, fontFamily: SANS, fontWeight: "700", fontSize: 13 },
  primaryButton: { minHeight: 50, borderRadius: 16, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  primaryButtonText: { fontFamily: SANS, fontSize: 15, fontWeight: "700" },
  iconButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.surface, borderRadius: 22, padding: 17, borderColor: C.line, borderWidth: 1, gap: 12 },
  tag: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  tagText: { fontFamily: SANS, fontSize: 11, fontWeight: "700" },
  choiceRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  choiceChip: { paddingHorizontal: 13, minHeight: 38, borderRadius: 20, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
  choiceChipSelected: { backgroundColor: C.greenSoft, borderColor: C.green },
  choiceText: { fontFamily: SANS, color: C.muted, fontSize: 13, fontWeight: "600" },
  choiceTextSelected: { color: C.greenDark, fontWeight: "700" },
  fieldLabel: { color: C.ink, fontFamily: SANS, fontWeight: "700", fontSize: 13 },
  input: { minHeight: 48, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, borderColor: C.line, backgroundColor: "#FCFBF8", color: C.ink, fontFamily: SANS, fontSize: 15 },
  fieldError: { color: C.danger, fontFamily: SANS, fontSize: 12, marginTop: -3 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", alignItems: "center", backgroundColor: "rgba(21,34,28,0.42)" },
  modalKeyboard: { width: "100%", alignItems: "center", justifyContent: "flex-end", flex: 1 },
  modalSheet: { width: "100%", maxHeight: "92%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: C.paper, paddingTop: 10, paddingHorizontal: 21, paddingBottom: Platform.OS === "web" ? 22 : 30, gap: 15 },
  modalHandle: { width: 40, height: 4, borderRadius: 10, backgroundColor: "#D8D4C9", alignSelf: "center", marginBottom: 2 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 5 },
  modalTitle: { color: C.ink, fontFamily: SERIF, fontSize: 25, lineHeight: 31, fontWeight: "700" },
  modalFooter: { paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line },
  offlineBanner: { flexDirection: "row", gap: 9, alignItems: "center", backgroundColor: C.amberSoft, paddingHorizontal: 13, paddingVertical: 12, borderRadius: 14 },
  offlineText: { flex: 1, fontFamily: SANS, fontSize: 12, lineHeight: 17, color: "#80611E", fontWeight: "600" },
  storageBanner: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: C.dangerSoft, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14 },
  storageTitle: { color: C.danger, fontFamily: SANS, fontSize: 13, fontWeight: "800" },
  storageText: { color: C.ink, fontFamily: SANS, fontSize: 12, lineHeight: 17 },
  retryButton: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "#FFFFFF", borderRadius: 12 },
  retryText: { color: C.danger, fontFamily: SANS, fontSize: 12, fontWeight: "800" },
  loading: { minHeight: 190, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 30, gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  emptyTitle: { color: C.ink, fontFamily: SERIF, fontSize: 22, fontWeight: "700", textAlign: "center" },
  emptyText: { color: C.muted, fontFamily: SANS, fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 310 },
}) as unknown as Record<string, any>;
