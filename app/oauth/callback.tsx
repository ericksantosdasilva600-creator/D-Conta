import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useAuthContext } from "@/hooks/auth-context";
import { decodeOAuthState, consumeNativeOAuthNonce } from "@/lib/oauth-state";
import { getRedirectUri } from "@/constants/oauth";
import { Card, Page, PrimaryButton } from "@/components/app-ui";
import { C, SANS, SERIF } from "@/lib/design";

type CallbackParams = { code?: string; state?: string; error?: string };

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<CallbackParams>();
  const auth = useAuthContext();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    let active = true;

    const complete = async () => {
      try {
        if (params.error) throw new Error("O acesso foi cancelado ou recusado.");

        if (Platform.OS === "web" && !params.code && !params.state) {
          const webUser = await Api.getMe();
          if (!webUser) throw new Error("Não foi possível confirmar a sessão. Verifique os cookies e tente novamente.");
          const userInfo: Auth.User = { ...webUser, lastSignedIn: new Date(webUser.lastSignedIn) };
          await Auth.setUserInfo(userInfo);
          await auth.refresh();
        } else {
          let code = params.code ?? null;
          let state = params.state ?? null;
          if (!code || !state) {
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
              const parsedUrl = new URL(initialUrl);
              code = parsedUrl.searchParams.get("code");
              state = parsedUrl.searchParams.get("state");
            }
          }
          if (!code || !state) throw new Error("A resposta de autenticação está incompleta. Inicie sessão novamente.");

          if (Platform.OS !== "web") {
            const stateData = decodeOAuthState(state);
            const storedNonce = await consumeNativeOAuthNonce();
            if (!stateData || !storedNonce || stateData.nonce !== storedNonce || stateData.redirectUri !== getRedirectUri()) {
              throw new Error("A validação de segurança falhou. Inicie sessão novamente.");
            }
          }

          const result = await Api.exchangeOAuthCode(code, state);
          if (!result.sessionToken) throw new Error("O Manus não devolveu uma sessão válida.");
          await Auth.setSessionToken(result.sessionToken);
          if (result.user) {
            const userInfo: Auth.User = { ...result.user, lastSignedIn: new Date(result.user.lastSignedIn || Date.now()) };
            await Auth.setUserInfo(userInfo);
          }
          const confirmed = await Api.getMe();
          if (!confirmed) throw new Error("A sessão foi criada, mas não foi possível confirmá-la.");
          await Auth.setUserInfo({ ...confirmed, lastSignedIn: new Date(confirmed.lastSignedIn) });
          await auth.refresh();
        }

        if (active) {
          setStatus("success");
          setTimeout(() => router.replace("/(tabs)"), 450);
        }
      } catch (caught) {
        if (!active) return;
        setStatus("error");
        setErrorMessage(caught instanceof Error ? caught.message : "Não foi possível concluir a autenticação.");
      }
    };

    void complete();
    return () => { active = false; };
  }, [params.code, params.state, params.error, auth, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}>
      <Page>
        <View style={{ paddingTop: 50 }}>
          <Text style={{ color: C.green, fontFamily: SANS, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 }}>NYVO · ACESSO SEGURO</Text>
        </View>
        <Card style={{ alignItems: "center", paddingVertical: 30, gap: 16 }}>
          {status === "processing" ? <><ActivityIndicator size="large" color={C.green} /><Text style={{ color: C.ink, fontFamily: SERIF, fontSize: 22, fontWeight: "700" }}>Validando sua sessão…</Text></> : null}
          {status === "success" ? <Text style={{ color: C.greenDark, fontFamily: SERIF, fontSize: 22, fontWeight: "700", textAlign: "center" }}>Sessão iniciada. Abrindo o Nyvo…</Text> : null}
          {status === "error" ? <>
            <Text style={{ color: C.danger, fontFamily: SERIF, fontSize: 22, fontWeight: "700", textAlign: "center" }}>Não foi possível iniciar sessão</Text>
            <Text accessibilityRole="alert" style={{ color: C.muted, fontFamily: SANS, fontSize: 13, lineHeight: 19, textAlign: "center" }}>{errorMessage}</Text>
            <PrimaryButton title="Voltar ao login" icon="arrow-left" onPress={() => router.replace("/login")} />
          </> : null}
        </Card>
      </Page>
    </SafeAreaView>
  );
}
