import "react-native-url-polyfill/auto";
import { SITE_ROOT } from "./site";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

/** Chave publicável: pode ficar no app. A segurança vem das regras (RLS) do banco. */
export const SUPABASE_URL = "https://bxwcqljlbrwpasfkmdhc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_PNm5tQk2MxZ41kqnucHhjQ_mN-yjQGn";

let client: SupabaseClient | null = null;

/** Cria o cliente só no navegador/aparelho (nunca durante a geração estática do site). */
export function sb() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: Platform.OS === "web" },
    });
  }
  return client;
}

export function siteUrl() {
  if (Platform.OS === "web" && typeof window !== "undefined") return `${window.location.origin}${SITE_ROOT}/`;
  return "https://ericksantosdasilva600-creator.github.io/nyvo/";
}
