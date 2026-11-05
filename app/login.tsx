import { useState } from "react";
import { Text, View } from "react-native";
import { BrandMark, Card, Page, PrimaryButton } from "@/components/app-ui";
import { C, SANS, SERIF } from "@/lib/design";
import { startOAuthLogin } from "@/constants/oauth";

export default function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    setBusy(true);
    setError(null);
    try {
      await startOAuthLogin();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível iniciar sessão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <View style={{ alignItems: "center", gap: 18, paddingTop: 44, paddingBottom: 12 }}>
        <BrandMark size={76} />
        <View style={{ alignItems: "center", gap: 8 }}>
          <Text style={{ color: C.green, fontFamily: SANS, fontSize: 11, letterSpacing: 2, fontWeight: "800" }}>NYVO · UM SÓ ESPAÇO</Text>
          <Text accessibilityRole="header" style={{ color: C.ink, fontFamily: SERIF, fontSize: 38, lineHeight: 44, fontWeight: "700", textAlign: "center" }}>Sua vida, em fluxo.</Text>
          <Text style={{ color: C.muted, fontFamily: SANS, fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 370 }}>Notas, finanças, hábitos e tarefas — no celular e no computador, com seus dados sincronizados.</Text>
        </View>
      </View>

      <Card style={{ gap: 14, marginTop: 14 }}>
        <Text style={{ color: C.ink, fontFamily: SANS, fontSize: 16, lineHeight: 23, fontWeight: "700" }}>Entre na sua conta Manus</Text>
        <Text style={{ color: C.muted, fontFamily: SANS, fontSize: 13, lineHeight: 19 }}>Use a mesma conta no Nyvo mobile e no site para acessar aos seus dados em qualquer dispositivo.</Text>
        {error ? <Text accessibilityRole="alert" style={{ color: C.danger, fontFamily: SANS, fontSize: 13, lineHeight: 19 }}>{error}</Text> : null}
        <PrimaryButton title={busy ? "Abrindo o acesso seguro…" : "Continuar com Manus"} icon="login-variant" onPress={() => void login()} disabled={busy} />
        <Text style={{ color: C.muted, fontFamily: SANS, fontSize: 11, lineHeight: 17, textAlign: "center" }}>A autenticação é feita pelo Manus. O Nyvo não salva sua senha.</Text>
      </Card>

      <Card style={{ backgroundColor: C.blueSoft, borderColor: "#D8E7F1", gap: 8 }}>
        <Text style={{ color: C.blueDark, fontFamily: SANS, fontSize: 13, fontWeight: "800" }}>Seus dados continuam seus</Text>
        <Text style={{ color: C.ink, fontFamily: SANS, fontSize: 12, lineHeight: 18 }}>Sem internet, você continua usando a cópia local. Se este dispositivo já tiver dados, depois do login você poderá escolher se associa esses dados à conta ou se usas os dados da nuvem.</Text>
        <Text style={{ color: C.muted, fontFamily: SANS, fontSize: 11, lineHeight: 17 }}>Os recibos só são disponibilizados através de pedidos autenticados da sua conta.</Text>
      </Card>
    </Page>
  );
}
