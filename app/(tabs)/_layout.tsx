import { Redirect, Tabs, router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { BrandMark, Card, Header, LoadingState, Page, PrimaryButton } from "@/components/app-ui";
import { CloudSyncBadge } from "@/lib/cloud-sync";
import { useAppData } from "@/lib/app-data";
import { C, SANS } from "@/lib/design";
import { QuickAddModal } from "@/components/QuickAdd";
import { AppTour } from "@/components/AppTour";
import { useReminderScheduler, useWebDarkMode } from "@/lib/web-effects";
import { refreshLocalNotifications } from "@/lib/local-notifications";
import { ToastHost, toast } from "@/lib/toast";

const NAV_ITEMS = [
  { path: "/", label: "Hoje", icon: "white-balance-sunny" },
  { path: "/finance", label: "Finanças", icon: "wallet-outline" },
  { path: "/notes", label: "Anotações", icon: "note-text-outline" },
  { path: "/habits", label: "Hábitos & Saúde", icon: "heart-pulse" },
  { path: "/tasks", label: "Tarefas", icon: "checkbox-marked-circle-outline" },
  { path: "/insights", label: "Gráficos", icon: "chart-box-outline" },
  { path: "/reminders", label: "Lembretes", icon: "bell-outline" },
  { path: "/plans", label: "Nyvo Pro", icon: "star-four-points-outline" },
  { path: "/support", label: "Ajuda e feedback", icon: "lifebuoy" },
  { path: "/settings", label: "Configurações", icon: "cog-outline" },
] as const;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const { data, loading, storageReady, storageError, retryStorage, updateData } = useAppData();
  const bottomPadding = Platform.OS === "web" ? 11 : Math.max(insets.bottom, 8);
  const desktop = Platform.OS === "web" && width >= 1024;
  const [quickOpen, setQuickOpen] = useState(false);
  useWebDarkMode(data.darkMode);
  useReminderScheduler(data, (title, body) => toast(`${title} · ${body}`, "bell-ring-outline", 6000));
  useEffect(() => {
    if (Platform.OS === "web" || loading) return;
    const id = setTimeout(() => { void refreshLocalNotifications(data); }, 1500);
    return () => clearTimeout(id);
  }, [data, loading]);
  if (loading) return <LoadingState />;
  if (!storageReady) return <StorageRecoveryScreen message={storageError} onRetry={retryStorage} />;
  if (!data.onboarded) return <Redirect href="/onboarding" />;

  const tabs = <Tabs screenOptions={{
    tabBarActiveTintColor: C.green,
    tabBarInactiveTintColor: C.muted,
    headerShown: false,
    tabBarButton: HapticTab,
    tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: 1 },
    tabBarStyle: desktop ? { display: "none" } : { paddingTop: 7, paddingBottom: bottomPadding, height: 57 + bottomPadding, backgroundColor: C.paper, borderTopColor: C.line, borderTopWidth: 1 },
  }}>
    <Tabs.Screen name="index" options={{ title: "Hoje", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="white-balance-sunny" size={size} color={color} /> }} />
    <Tabs.Screen name="finance" options={{ title: "Finanças", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="wallet-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="notes" options={{ title: "Notas", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="note-text-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="habits" options={{ title: "Hábitos", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="heart-pulse" size={size} color={color} /> }} />
    <Tabs.Screen name="tasks" options={{ title: "Tarefas", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="settings" options={{ href: null }} />
    <Tabs.Screen name="reminders" options={{ href: null }} />
    <Tabs.Screen name="plans" options={{ href: null }} />
    <Tabs.Screen name="support" options={{ href: null }} />
    <Tabs.Screen name="insights" options={{ href: null }} />
  </Tabs>;

  // O botão de registro rápido é financeiro: só aparece onde faz sentido (Hoje e Finanças).
  const showFab = pathname === "/" || pathname === "/finance";
  const overlay = <>
    {showFab ? <Pressable onPress={() => setQuickOpen(true)} accessibilityRole="button" accessibilityLabel="Registrar gasto ou receita" style={({ pressed }) => [fabStyle, { bottom: desktop ? 28 : 57 + bottomPadding + 14, opacity: pressed ? 0.85 : 1 }]}>
      <MaterialCommunityIcons name="cash-plus" size={26} color="#FFFFFF" />
    </Pressable> : null}
    <AppTour />
    <QuickAddModal visible={quickOpen} onClose={() => setQuickOpen(false)} onSaved={(message) => toast(message)} />
    <ToastHost bottom={desktop ? 100 : 57 + bottomPadding + 84} />
  </>;

  if (!desktop) return <View style={{ flex: 1 }}>{tabs}{overlay}</View>;
  return <View style={{ flex: 1, flexDirection: "row", backgroundColor: C.paper }}>
    <View style={desktopSidebar}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 8, paddingBottom: 26 }}>
        <BrandMark size={42} />
        <View><Text style={brandName}>Nyvo</Text><Text style={brandSub}>Seu espaço pessoal</Text></View>
      </View>
      <View style={{ gap: 5 }}>
        {NAV_ITEMS.map((item) => {
          const active = item.path === "/" ? pathname === "/" : pathname === item.path || pathname.startsWith(`${item.path}/`);
          return <Pressable key={item.path} accessibilityRole="link" accessibilityState={{ selected: active }} accessibilityLabel={item.label} aria-current={active ? "page" : undefined} onPress={() => router.push(item.path as never)} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [navItem, active ? navItemActive : hovered ? navItemHover : null, { opacity: pressed ? 0.75 : 1 }]}>
            <View pointerEvents="none" style={{ flexDirection: "row", alignItems: "center", gap: 11, flex: 1 }}>
              <MaterialCommunityIcons name={item.icon as ComponentProps<typeof MaterialCommunityIcons>["name"]} size={19} color={active ? C.greenDark : C.muted} />
              <Text selectable={false} style={[navLabel, active ? navLabelActive : null]}>{item.label}</Text>
            </View>
          </Pressable>;
        })}
      </View>
      <View style={{ marginTop: "auto", paddingTop: 22, gap: 9 }}>
        <Pressable onPress={() => updateData((c) => ({ ...c, darkMode: !c.darkMode }))} accessibilityRole="switch" accessibilityState={{ checked: data.darkMode }} accessibilityLabel="Modo escuro" style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [navItem, hovered ? navItemHover : null]}>
          <View pointerEvents="none" style={{ flexDirection: "row", alignItems: "center", gap: 11, flex: 1 }}>
            <MaterialCommunityIcons name={data.darkMode ? "weather-sunny" : "weather-night"} size={19} color={C.muted} />
            <Text selectable={false} style={navLabel}>{data.darkMode ? "Modo claro" : "Modo escuro"}</Text>
          </View>
        </Pressable>
        <CloudSyncBadge /><Text style={brandSub}>Seus dados, só seus.</Text></View>
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>{tabs}{overlay}</View>
  </View>;
}

function StorageRecoveryScreen({ message, onRetry }: { message: string | null; onRetry: () => Promise<void> }) {
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try { await onRetry(); } finally { setRetrying(false); }
  };
  return (
    <Page>
      <Header eyebrow="NYVO · RECUPERAÇÃO" title="Estamos protegendo seus dados." subtitle="A migração não foi aplicada." />
      <Card style={{ gap: 12 }}>
        <Text style={{ color: C.ink, fontFamily: SANS, fontSize: 13, lineHeight: 20 }}>{message ?? "Não foi possível ler os dados deste aparelho."}</Text>
        <Text style={{ color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 18 }}>A cópia original permanece intacta. A aplicação não vai substituir seus registros por uma estrutura vazia. Tente novamente; se o problema continuar, não apague os dados locais.</Text>
        <PrimaryButton title={retrying ? "Verificando os dados…" : "Tentar novamente"} icon="refresh" onPress={() => void retry()} disabled={retrying} />
      </Card>
    </Page>
  );
}

const desktopSidebar = { width: 248, paddingHorizontal: 18, paddingTop: 28, paddingBottom: 22, backgroundColor: C.surface, borderRightWidth: 1, borderRightColor: C.line };
const brandName = { color: C.ink, fontFamily: SANS, fontSize: 20, fontWeight: "800" as const, letterSpacing: -0.4 };
const brandSub = { color: C.muted, fontFamily: SANS, fontSize: 11 };
const navItem = { minHeight: 45, width: "100%" as const, cursor: "pointer" as const, flexDirection: "row" as const, alignItems: "center" as const, gap: 11, borderRadius: 13, paddingHorizontal: 12 };
const navItemActive = { backgroundColor: C.greenSoft };
const navItemHover = { backgroundColor: C.paper };
const navLabel = { color: C.muted, fontFamily: SANS, fontSize: 13, fontWeight: "600" as const };
const navLabelActive = { color: C.greenDark, fontWeight: "800" as const };
const fabStyle = { position: "absolute" as const, right: 18, width: 58, height: 58, borderRadius: 29, backgroundColor: C.green, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 };
