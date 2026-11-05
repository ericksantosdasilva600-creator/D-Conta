import React, { useMemo, useState } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { AppModal, ChoiceChips, Field, PrimaryButton, PriorityPicker, Tag } from "@/components/app-ui";
import { ReceiptPreviewImage } from "@/components/ReceiptPreviewImage";
import { DatePickerField } from "@/components/DatePickerField";
import { useAppData, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type FinanceScope, type Priority, type Transaction, type TransactionKind } from "@/lib/app-data";
import { C, SANS } from "@/lib/design";
import { createId, isValidDateKey, localDateKey, parseAmount } from "@/lib/format";

async function keepReceipt(uri: string, base64?: string | null) {
  if (Platform.OS === "web") return base64 ? `data:image/jpeg;base64,${base64}` : uri;
  const root = FileSystem.documentDirectory;
  if (!root) return uri;
  const destination = `${root}receipt-${createId()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

export function TransactionForm({ visible, initial, defaultScope = "personal", onClose, onSave }: { visible: boolean; initial?: Transaction | null; defaultScope?: FinanceScope; onClose: () => void; onSave: (transaction: Transaction, categoryToAdd?: { kind: TransactionKind; name: string }) => void }) {
  const { data } = useAppData();
  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? "expense");
  const [scope, setScope] = useState<FinanceScope>(initial?.scope ?? defaultScope);
  const [amount, setAmount] = useState(initial ? String(initial.amount).replace(".", ",") : "");
  const [merchant, setMerchant] = useState(initial?.merchant ?? "");
  const [category, setCategory] = useState(initial?.category ?? EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(initial?.date ?? localDateKey());
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [paid, setPaid] = useState(initial?.paid ?? true);
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [receiptUri, setReceiptUri] = useState(initial?.receiptUri ?? "");
  const [receiptId, setReceiptId] = useState(initial?.receiptId);
  const [receiptPendingBase64, setReceiptPendingBase64] = useState(initial?.receiptPendingBase64);
  const [receiptMimeType, setReceiptMimeType] = useState(initial?.receiptMimeType ?? (initial?.receiptId ? "image/jpeg" : undefined));
  const [cameraMessage, setCameraMessage] = useState("");
  const [error, setError] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const clearReceipt = () => { setReceiptUri(""); setReceiptId(undefined); setReceiptPendingBase64(undefined); setReceiptMimeType(undefined); };


  const categories = useMemo(() => {
    const choices = kind === "expense"
      ? [...EXPENSE_CATEGORIES, ...data.customExpenseCategories]
      : [...INCOME_CATEGORIES, ...data.customIncomeCategories];
    return initial?.kind === kind && initial.category && !choices.includes(initial.category) ? [...choices, initial.category] : choices;
  }, [kind, data.customExpenseCategories, data.customIncomeCategories, initial]);

  const quickOptions = useMemo(() => {
    const options = kind === "income"
      ? ["Salário", "Bonificação", "Reembolsos", "Adiantamentos"]
      : ["Restaurante", "Supermercado", "Hotel", "Táxi", "Museu"];
    const typed = merchant.trim().toLocaleLowerCase("pt-BR");
    return options.filter((option) => !typed || option.toLocaleLowerCase("pt-BR").includes(typed));
  }, [kind, merchant]);

  const chooseQuickOption = (value: string) => {
    setMerchant(value);
    const inferredCategory = kind === "income" ? value : ({
      Restaurante: "Alimentação",
      Supermercado: "Alimentação",
      Hotel: "Hospedagem",
      Táxi: "Transporte",
      Museu: "Atividades",
    }[value] ?? "");
    const matchingCategory = categories.find((item) => item.toLocaleLowerCase("pt-BR") === inferredCategory.toLocaleLowerCase("pt-BR"));
    if (matchingCategory) setCategory(matchingCategory);
  };

  const changeKind = (next: TransactionKind) => {
    setKind(next);
    const nextCategories = next === "expense" ? [...EXPENSE_CATEGORIES, ...data.customExpenseCategories] : [...INCOME_CATEGORIES, ...data.customIncomeCategories];
    setCategory(nextCategories[0]);
    if (next === "income") { setPaid(true); setDueDate(""); }
  };

  const choosePhoto = async (source: "camera" | "library") => {
    setCameraMessage("");
    try {
      if (source === "camera" && Platform.OS !== "web") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setCameraMessage("A câmera está sem autorização. Você pode continuar sem recibo, escolher uma imagem ou permitir o acesso nas configurações do aparelho.");
          return;
        }
      }
      if (source === "library" && Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted && permission.accessPrivileges !== "limited") {
          setCameraMessage("O acesso às fotos foi recusado. Você pode continuar sem recibo ou alterar a permissão nas configurações do aparelho.");
          return;
        }
      }
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const targetWidth = Math.min(asset.width || 1600, 1600);
        let processed = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: targetWidth } }], { compress: 0.68, format: ImageManipulator.SaveFormat.JPEG, base64: true });
        const byteLength = (value: string) => Math.floor(value.length * 3 / 4) - (value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0);
        if (!processed.base64 || byteLength(processed.base64) > 1.5 * 1024 * 1024) {
          processed = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: Math.min(targetWidth, 1200) } }], { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG, base64: true });
        }
        if (!processed.base64 || byteLength(processed.base64) > 1.5 * 1024 * 1024) throw new Error("A imagem excede o limite de 1,5 MB após compressão.");
        setReceiptUri(await keepReceipt(processed.uri, processed.base64));
        setReceiptId(undefined);
        setReceiptPendingBase64(processed.base64);
        setReceiptMimeType("image/jpeg");
      }
    } catch {
      setCameraMessage("Não foi possível preparar o recibo. Tente outra imagem; o limite é 1,5 MB após compressão.");
    }
  };

  const submit = () => {
    const numericAmount = parseAmount(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) { setError("Informe um valor superior a zero."); return; }
    if (!merchant.trim()) { setError(kind === "expense" ? "Informe onde foi feita a despesa." : "Informe a origem da receita."); return; }
    if (!isValidDateKey(date)) { setError("Escolha uma data para o movimento."); return; }
    if (kind === "expense" && dueDate && !isValidDateKey(dueDate)) { setError("Escolha uma data de vencimento válida."); return; }
    const normalizedName = newCategory.trim();
    const categoryToAdd = addingCategory && normalizedName ? { kind, name: normalizedName } : undefined;
    const transaction: Transaction = {
      id: initial?.id ?? createId(), kind, amount: numericAmount, merchant: merchant.trim(),
      category: categoryToAdd?.name ?? category, date, dueDate: kind === "expense" ? dueDate : "",
      paid: kind === "expense" ? paid : true, priority, notes: notes.trim(), receiptUri, scope,
      ...(receiptId ? { receiptId } : {}),
      ...(receiptPendingBase64 ? { receiptPendingBase64 } : {}),
      ...(receiptMimeType ? { receiptMimeType } : {}),
    };
    onSave(transaction, categoryToAdd);
    onClose();
  };

  return (
    <AppModal visible={visible} title={initial ? "Editar movimento" : "Novo movimento"} subtitle="Registre agora. Você pode revisar os detalhes depois." onClose={onClose} footer={<PrimaryButton title={initial ? "Salvar alterações" : "Salvar movimento"} icon="check" onPress={submit} />}>
      <View style={{ gap: 8 }}>
        <Text style={labelStyle}>Tipo de movimento</Text>
        <ChoiceChips values={["Despesa", "Receita"]} selected={kind === "expense" ? "Despesa" : "Receita"} onSelect={(value) => changeKind(value === "Despesa" ? "expense" : "income")} />
      </View>
      <View style={{ gap: 7 }}>
        <Text style={labelStyle}>Grupo do movimento</Text>
        <ChoiceChips values={["Pessoal", "Viagem"]} selected={scope === "personal" ? "Pessoal" : "Viagem"} onSelect={(value) => setScope(value === "Viagem" ? "trip" : "personal")} />
        {scope === "trip" ? <Text style={helperStyle}>Este movimento fica em “{data.tripName}”, separado das tuas finanças pessoais.</Text> : null}
      </View>
      <View style={{ gap: 9 }}>
        <Text style={labelStyle}>{kind === "expense" ? "Escolha o tipo de despesa" : "Escolha o tipo de receita"}</Text>
        <ChoiceChips values={categories} selected={category} onSelect={(value) => { setCategory(value); setAddingCategory(false); }} horizontal={false} />
        {addingCategory ? <View style={{ gap: 9 }}><Field label="Nome da nova categoria" value={newCategory} onChangeText={setNewCategory} placeholder="Ex.: Seguro de viagem" /><Pressable accessibilityRole="button" onPress={() => { if (newCategory.trim()) setCategory(newCategory.trim()); }}><Text style={linkStyle}>Usar esta categoria neste movimento</Text></Pressable></View> : <Pressable accessibilityRole="button" onPress={() => { setAddingCategory(true); setNewCategory(""); }} style={inlineAction}><MaterialCommunityIcons name="plus-circle-outline" size={19} color={C.green} /><Text style={linkStyle}>Criar uma categoria</Text></Pressable>}
      </View>
      <Field label="Valor" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" error={error && (!Number.isFinite(parseAmount(amount)) || parseAmount(amount) <= 0) ? error : undefined} />
      <Field label={kind === "expense" ? "Estabelecimento" : "Origem da receita"} value={merchant} onChangeText={setMerchant} placeholder={kind === "expense" ? "Ex.: Café da Praça" : "Ex.: Reembolso do hotel"} />
      {quickOptions.length ? <View style={{ gap: 7 }}><Text style={helperStyle}>Sugestões rápidas · toque para preencher</Text><ChoiceChips values={quickOptions} selected={merchant} onSelect={chooseQuickOption} horizontal={false} /></View> : null}
      <DatePickerField label="Data do movimento" value={date} onChange={setDate} placeholder="Toque para escolher uma data" />
      {kind === "expense" ? <>
        <DatePickerField label="Vencimento (opcional)" value={dueDate} onChange={setDueDate} placeholder="Sem vencimento — toque para adicionar" clearable />
        <View style={{ gap: 8 }}><Text style={labelStyle}>Estado do pagamento</Text><ChoiceChips values={["Pago", "Pendente"]} selected={paid ? "Pago" : "Pendente"} onSelect={(value) => setPaid(value === "Pago")} /></View>
      </> : null}
      <View style={{ gap: 8 }}><Text style={labelStyle}>Prioridade</Text><PriorityPicker value={priority} onChange={setPriority} /></View>
      <View style={{ gap: 10 }}>
        <Text style={labelStyle}>Recibo (opcional)</Text>
        {(receiptUri || receiptId) ? <View style={receiptPreview}><ReceiptPreviewImage receiptId={receiptId} receiptUri={receiptUri} mimeType={receiptMimeType} style={receiptImage} /><View style={{ flex: 1, gap: 4 }}><Tag label={receiptId ? "Recibo sincronizado" : "Recibo neste aparelho"} tone={receiptId ? "blue" : "green"} /><Pressable accessibilityRole="button" onPress={() => void choosePhoto("library")}><Text style={linkStyle}>Substituir imagem</Text></Pressable><Pressable accessibilityRole="button" onPress={clearReceipt}><Text style={linkStyle}>Remover imagem</Text></Pressable></View></View> : <View style={{ flexDirection: "row", gap: 9 }}><Pressable accessibilityRole="button" onPress={() => void choosePhoto("camera")} style={captureButton}><MaterialCommunityIcons name="camera-outline" size={18} color={C.greenDark} /><Text style={captureText}>Câmera</Text></Pressable><Pressable accessibilityRole="button" onPress={() => void choosePhoto("library")} style={captureButton}><MaterialCommunityIcons name="image-multiple-outline" size={18} color={C.greenDark} /><Text style={captureText}>Galeria</Text></Pressable></View>}
        {cameraMessage ? <View style={permissionNotice}><Text style={noticeText}>{cameraMessage}</Text>{Platform.OS !== "web" ? <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}><Text style={linkStyle}>Abrir configurações</Text></Pressable> : null}</View> : null}
      </View>
      <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline placeholder="Um detalhe que você queira lembrar…" />
      {error && !error.includes("valor") ? <Text accessibilityRole="alert" style={{ color: C.danger, fontFamily: SANS, fontSize: 12 }}>{error}</Text> : null}
      <Text style={helperStyle}>Os dados são salvos neste aparelho. O lembrete de vencimento exige permissão para notificações.</Text>
    </AppModal>
  );
}

const labelStyle = { color: C.ink, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const linkStyle = { color: C.green, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const helperStyle = { color: C.muted, fontFamily: SANS, fontSize: 12, lineHeight: 17 };
const inlineAction = { minHeight: 38, flexDirection: "row" as const, alignItems: "center" as const, gap: 7 };
const captureButton = { flex: 1, minHeight: 46, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, backgroundColor: C.greenSoft, borderRadius: 14 };
const captureText = { color: C.greenDark, fontFamily: SANS, fontSize: 13, fontWeight: "700" as const };
const receiptPreview = { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, backgroundColor: C.surface, borderRadius: 15, padding: 10, borderColor: C.line, borderWidth: 1 };
const receiptImage = { width: 66, height: 66, borderRadius: 11, backgroundColor: C.line };
const permissionNotice = { backgroundColor: C.amberSoft, padding: 12, borderRadius: 13, gap: 8 };
const noticeText = { color: "#80611E", fontFamily: SANS, fontSize: 12, lineHeight: 17 };
