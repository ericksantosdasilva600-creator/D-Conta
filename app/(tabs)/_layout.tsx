import { Redirect, Tabs, router, usePathname } from "expo-router";
import { useState } from "react";
import type { ComponentProps } from "react";
import { Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { BrandMark, Card, Header, LoadingState, Page, PrimaryButton } from "@/components/app-ui";
import { CloudSyncBadge } from "@/lib/cloud-sync";
import { useAppData } from "@/lib/app-data";
import { C, SANS } from "@/lib/design";

const NAV_ITEMS = [
  { path: "/", label: "Resumo", icon: "view-dashboard-outline" },
  { path: "/finance", label: "Finanças", icon: "wallet-outline" },
  { path: "/notes", label: "Anotações", icon: "note-text-outline" },
  { path: "/habits", label: "Hábitos & Saúde", icon: "heart-pulse" },
  { path: "/tasks", label: "Tarefas", icon: "checkbox-marked-circle-outline" },
  { path: "/settings", label: "Configurações", icon: "cog-outline" },
] as const;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const { data, loading, storageReady, storageError, retryStorage } = useAppData();
  const bottomPadding = Platform.OS === "web" ? 11 : Math.max(insets.bottom, 8);
  const desktop = Platform.OS === "web" && width >= 1024;
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
    <Tabs.Screen name="index" options={{ title: "Resumo", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="finance" options={{ title: "Finanças", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="wallet-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="notes" options={{ title: "Notas", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="note-text-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="habits" options={{ title: "Hábitos", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="heart-pulse" size={size} color={color} /> }} />
    <Tabs.Screen name="tasks" options={{ title: "Tarefas", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="settings" options={{ href: null }} />
  </Tabs>;

  if (!desktop) return tabs;
  return <View style={{ flex: 1, flexDirection: "row", backgroundColor: C.paper }}>
    <View style={desktopSidebar}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 8, paddingBottom: 26 }}>
        <BrandMark size={42} />
        <View><Text style={brandName}>Nyvo</Text><Text style={brandSub}>Seu espaço pessoal</Text></View>
      </View>
      <View style={{ gap: 5 }}>
        {NAV_ITEMS.map((item) => {
          const active = item.path === "/" ? pathname === "/" : pathname === item.path || pathname.startsWith(`${item.path}/`);
          return <Pressable key={item.path} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={item.label} onPress={() => router.push(item.path as never)} style={({ pressed }) => [navItem, active ? navItemActive : null, { opacity: pressed ? 0.75 : 1 }]}>
            <MaterialCommunityIcons name={item.icon as ComponentProps<typeof MaterialCommunityIcons>["name"]} size={19} color={active ? C.greenDark : C.muted} />
            <Text style={[navLabel, active ? navLabelActive : null]}>{item.label}</Text>
          </Pressable>;
        })}
      </View>
      <View style={{ marginTop: "auto", paddingTop: 22, gap: 9 }}><CloudSyncBadge /><Text style={brandSub}>Seus dados, só seus.</Text></View>
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>{tabs}</View>
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
const navItem = { minHeight: 45, flexDirection: "row" as const, alignItems: "center" as const, gap: 11, borderRadius: 13, paddingHorizontal: 12 };
const navItemActive = { backgroundColor: C.greenSoft };
const navLabel = { color: C.muted, fontFamily: SANS, fontSize: 13, fontWeight: "600" as const };
const navLabelActive = { color: C.greenDark, fontWeight: "800" as const };
