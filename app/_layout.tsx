import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppDataProvider } from "@/lib/app-data";
import { AuthProvider, useAuthContext } from "@/hooks/auth-context";
import { CloudSyncProvider } from "@/lib/cloud-sync";
import { LoadingState } from "@/components/app-ui";
import { LOCAL_ONLY } from "@/lib/local-mode";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;
  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  useEffect(() => { initManusRuntime(); }, []);
  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return { ...metrics, insets: { ...metrics.insets, top: Math.max(metrics.insets.top, 16), bottom: Math.max(metrics.insets.bottom, 12) } };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider><AuthenticatedApp /></AuthProvider>
    </GestureHandlerRootView>
  );

  if (Platform.OS === "web") {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>{content}</SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }
  return <ThemeProvider><SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider></ThemeProvider>;
}

function AuthenticatedApp() {
  const auth = useAuthContext();
  const pathname = usePathname();
  const accountId = auth.user?.id ?? null;
  if (LOCAL_ONLY) {
    if (pathname === "/login" || pathname === "/oauth/callback") return <Redirect href="/(tabs)" />;
    return <AccountProviders key="local" accountId={null} />;
  }
  if (auth.loading) return <LoadingState />;
  if (!auth.user && pathname !== "/login" && pathname !== "/oauth/callback") return <Redirect href="/login" />;
  if (auth.user && pathname === "/login") return <Redirect href="/(tabs)" />;

  return <AccountProviders key={auth.user ? `user-${auth.user.id}` : "guest"} accountId={accountId} />;
}

function AccountProviders({ accountId }: { accountId: number | null }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }));
  const [trpcClient] = useState(() => createTRPCClient());
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppDataProvider accountId={accountId}>
          <CloudSyncProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="login" options={{ presentation: "fullScreenModal" }} />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="oauth/callback" options={{ presentation: "fullScreenModal" }} />
            </Stack>
            <StatusBar style="auto" />
          </CloudSyncProvider>
        </AppDataProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
