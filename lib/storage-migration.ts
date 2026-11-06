/**
 * Troca de nome Nyvo → Dá Conta: as chaves salvas no aparelho passaram de "nyvo.*" para "daconta.*".
 * Copia cada chave antiga para a nova (só se a nova ainda não existir) e mantém a antiga como cópia de segurança.
 * No site roda na hora (localStorage é síncrono); no celular, `migrateNativeStorageKeys` roda antes de carregar os dados.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const OLD = "nyvo.";
const NEW = "daconta.";
const renamed = (key: string) => NEW + key.slice(OLD.length);

function migrateWebStorage(store: Storage | undefined) {
  if (!store) return;
  try {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key?.startsWith(OLD) && store.getItem(renamed(key)) === null) {
        const value = store.getItem(key);
        if (value !== null) store.setItem(renamed(key), value);
      }
    }
  } catch { /* armazenamento bloqueado: segue sem migrar */ }
}

if (typeof window !== "undefined") {
  try { migrateWebStorage(window.localStorage); } catch { /* ignora */ }
  try { migrateWebStorage(window.sessionStorage); } catch { /* ignora */ }
}

let nativeDone: Promise<void> | null = null;
export function migrateNativeStorageKeys(): Promise<void> {
  nativeDone ??= (async () => {
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(OLD));
      if (!keys.length) return;
      const existing = new Set(await AsyncStorage.getAllKeys());
      const pairs = await AsyncStorage.multiGet(keys);
      const toSet = pairs.filter(([k, v]) => v !== null && !existing.has(renamed(k))).map(([k, v]) => [renamed(k), v as string] as [string, string]);
      if (toSet.length) await AsyncStorage.multiSet(toSet);
    } catch { /* segue sem migrar */ }
  })();
  return nativeDone;
}
