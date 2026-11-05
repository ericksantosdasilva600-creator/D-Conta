import { sb } from "@/lib/supabase";
import { normalizeEmail, type ProFeatureId } from "@/lib/plans";

/** Guarda o interesse no Pro. Retorna uma mensagem de erro, ou null quando deu certo. */
export async function joinProWaitlist(email: string, benefits: ProFeatureId[]) {
  try {
    const { error } = await sb().from("nyvo_pro_interest").insert({ email: normalizeEmail(email), benefits });
    // 23505: e-mail já na lista. Para a pessoa, o resultado é o mesmo.
    if (error && error.code !== "23505") return "Não deu para salvar agora. Tente de novo em instantes.";
    return null;
  } catch {
    return "Sem conexão. Confira sua internet e tente de novo.";
  }
}
