import { useEffect, useState } from "react";
import { Image, Platform, type ImageStyle, type StyleProp } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppData } from "@/lib/app-data";
import { trpc } from "@/lib/trpc";
import { cacheReceipt, getCachedReceiptUri } from "@/lib/receipt-cache";

type CacheState = { key: string; uri: string | null };

export function ReceiptPreviewImage({ receiptId, receiptUri, style }: { receiptId?: string; receiptUri?: string; mimeType?: string; style?: StyleProp<ImageStyle> }) {
  const { accountId, isOnline } = useAppData();
  const key = `${accountId ?? "guest"}:${receiptId ?? "none"}`;
  const [cache, setCache] = useState<CacheState>({ key: "", uri: null });
  const cacheChecked = cache.key === key;
  const cachedUri = cacheChecked ? cache.uri : null;
  const remoteReceipt = trpc.sync.getReceipt.useQuery({ id: receiptId ?? "" }, {
    enabled: Boolean(receiptId && accountId !== null && !receiptUri && cacheChecked && !cachedUri && isOnline !== false),
    retry: false,
  });

  useEffect(() => {
    if (!receiptId || accountId === null || receiptUri) return;
    let active = true;
    void getCachedReceiptUri(accountId, receiptId)
      .then((uri) => { if (active) setCache({ key, uri }); })
      .catch(() => { if (active) setCache({ key, uri: null }); });
    return () => { active = false; };
  }, [accountId, key, receiptId, receiptUri]);

  useEffect(() => {
    if (!remoteReceipt.data || !receiptId || accountId === null || cachedUri) return;
    let active = true;
    void cacheReceipt(accountId, receiptId, remoteReceipt.data.mimeType, remoteReceipt.data.base64)
      .then(() => getCachedReceiptUri(accountId, receiptId))
      .then((uri) => { if (active) setCache({ key, uri: uri ?? `data:${remoteReceipt.data!.mimeType};base64,${remoteReceipt.data!.base64}` }); })
      .catch(() => { if (active) setCache({ key, uri: `data:${remoteReceipt.data!.mimeType};base64,${remoteReceipt.data!.base64}` }); });
    return () => { active = false; };
  }, [accountId, cachedUri, key, receiptId, remoteReceipt.data]);

  useEffect(() => {
    const uri = cache.key === key ? cache.uri : null;
    return () => { if (Platform.OS === "web" && uri?.startsWith("blob:") && typeof URL !== "undefined") URL.revokeObjectURL(uri); };
  }, [cache, key]);

  const source = receiptUri || cachedUri || (remoteReceipt.data ? `data:${remoteReceipt.data.mimeType};base64,${remoteReceipt.data.base64}` : null);
  if (source) return <Image source={{ uri: source }} style={style} accessibilityLabel="Prévia do recibo" />;
  return <MaterialCommunityIcons name="cloud-download-outline" size={28} color="#1769A6" accessibilityLabel={remoteReceipt.isError ? "Recibo indisponível offline" : "Carregando recibo"} />;
}
