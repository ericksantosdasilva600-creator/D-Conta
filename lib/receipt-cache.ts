import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const DB_NAME = "nyvo-private-receipts-v1";
const STORE_NAME = "receipts";
type ReceiptEntry = { key: string; mimeType: string; blob: Blob };

function cacheKey(userId: number | string, receiptId: string) {
  return `${String(userId)}:${receiptId}`;
}

function openReceiptDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("O armazenamento offline de recibos não está disponível neste navegador."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir a cache offline de recibos."));
  });
}

function nativeReceiptPath(userId: number | string, receiptId: string, mimeType: string) {
  const root = FileSystem.documentDirectory;
  if (!root) throw new Error("O armazenamento local de recibos não está disponível neste aparelho.");
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `${root}nyvo-receipts/${String(userId)}-${receiptId}.${extension}`;
}

export async function hasCachedReceipt(userId: number | string, receiptId: string) {
  if (Platform.OS === "web") {
    const db = await openReceiptDb();
    try {
      const entry = await new Promise<ReceiptEntry | undefined>((resolve, reject) => {
        const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(cacheKey(userId, receiptId));
        request.onsuccess = () => resolve(request.result as ReceiptEntry | undefined);
        request.onerror = () => reject(request.error ?? new Error("Não foi possível consultar a cache de recibos."));
      });
      return Boolean(entry?.blob);
    } finally {
      db.close();
    }
  }
  const root = FileSystem.documentDirectory;
  if (!root) return false;
  const prefix = `${root}nyvo-receipts/${String(userId)}-${receiptId}.`;
  for (const extension of ["jpg", "png", "webp"]) {
    const info = await FileSystem.getInfoAsync(`${prefix}${extension}`);
    if (info.exists) return true;
  }
  return false;
}

export async function cacheReceipt(userId: number | string, receiptId: string, mimeType: string, base64: string) {
  if (Platform.OS === "web") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    const db = await openReceiptDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).put({ key: cacheKey(userId, receiptId), mimeType, blob } satisfies ReceiptEntry);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Não foi possível salvar o recibo para utilização offline."));
        transaction.onabort = () => reject(transaction.error ?? new Error("A cache offline do recibo foi interrompida."));
      });
    } finally {
      db.close();
    }
    return;
  }

  const destination = nativeReceiptPath(userId, receiptId, mimeType);
  const directory = destination.slice(0, destination.lastIndexOf("/") + 1);
  const directoryInfo = await FileSystem.getInfoAsync(directory);
  if (!directoryInfo.exists) await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
}

export async function getCachedReceiptUri(userId: number | string, receiptId: string): Promise<string | null> {
  if (Platform.OS === "web") {
    const db = await openReceiptDb();
    try {
      const entry = await new Promise<ReceiptEntry | undefined>((resolve, reject) => {
        const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(cacheKey(userId, receiptId));
        request.onsuccess = () => resolve(request.result as ReceiptEntry | undefined);
        request.onerror = () => reject(request.error ?? new Error("Não foi possível ler a cache offline do recibo."));
      });
      return entry?.blob ? URL.createObjectURL(entry.blob) : null;
    } finally {
      db.close();
    }
  }
  const root = FileSystem.documentDirectory;
  if (!root) return null;
  for (const extension of ["jpg", "png", "webp"]) {
    const uri = `${root}nyvo-receipts/${String(userId)}-${receiptId}.${extension}`;
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) return uri;
  }
  return null;
}

export async function deleteCachedReceipt(userId: number | string, receiptId: string) {
  if (Platform.OS === "web") {
    const db = await openReceiptDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).delete(cacheKey(userId, receiptId));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Não foi possível remover a cache local do recibo."));
        transaction.onabort = () => reject(transaction.error ?? new Error("A remoção da cache local do recibo foi interrompida."));
      });
    } finally {
      db.close();
    }
    return;
  }
  const root = FileSystem.documentDirectory;
  if (!root) return;
  for (const extension of ["jpg", "png", "webp"]) {
    const uri = `${root}nyvo-receipts/${String(userId)}-${receiptId}.${extension}`;
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
