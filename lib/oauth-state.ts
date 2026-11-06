import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const NATIVE_OAUTH_NONCE_KEY = "daconta.oauth.native-nonce";

export type OAuthState = { redirectUri: string; nonce: string };

export async function createOAuthNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function storeNativeOAuthNonce(nonce: string): Promise<void> {
  if (Platform.OS !== "web") await SecureStore.setItemAsync(NATIVE_OAUTH_NONCE_KEY, nonce);
}

export async function consumeNativeOAuthNonce(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const nonce = await SecureStore.getItemAsync(NATIVE_OAUTH_NONCE_KEY);
  await SecureStore.deleteItemAsync(NATIVE_OAUTH_NONCE_KEY);
  return nonce;
}

export function decodeOAuthState(state: string): OAuthState | null {
  try {
    const BufferImpl = (globalThis as Record<string, any>).Buffer;
    const decoded = typeof globalThis.atob === "function"
      ? globalThis.atob(state)
      : BufferImpl?.from(state, "base64").toString("utf-8");
    if (typeof decoded !== "string") return null;
    const value = JSON.parse(decoded) as Partial<OAuthState>;
    if (typeof value.redirectUri !== "string" || typeof value.nonce !== "string") return null;
    return { redirectUri: value.redirectUri, nonce: value.nonce };
  } catch {
    return null;
  }
}
