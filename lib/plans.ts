/**
 * Planos do Dá Conta. Enquanto PRO_SALES_OPEN for false, nada é cobrado: a tela só apresenta o Pro
 * e recebe interessados. Ligar exige hospedagem comercial, conta de pagamento e, no Android,
 * Google Play Billing. Tudo que já era grátis continua no Free, incluindo conta e backup.
 */
export const PRO_SALES_OPEN = false;

export const PRO_PRICE = { monthly: "R$ 9,90", yearly: "R$ 89,90" };

/** Formas previstas para quando a venda abrir. */
export const PAYMENT_METHODS = ["Pix", "Cartão de crédito"];

export const FREE_FEATURES = [
  "Hoje, finanças, anotações, hábitos, saúde, tarefas e estudos",
  "Gráficos e lembretes",
  "Conta grátis com sincronização entre aparelhos",
  "Backup e restauração dos dados",
];

export const PRO_FEATURES = [
  { id: "relatorios", icon: "file-chart-outline", title: "Relatórios avançados", text: "Análise detalhada do mês, comparação entre períodos e exportação em PDF ou planilha." },
  { id: "indicadores", icon: "bullseye-arrow", title: "Indicadores personalizados", text: "Monte os números que você quer acompanhar em finanças, hábitos e estudos." },
  { id: "personalizacao", icon: "palette-swatch-outline", title: "Personalização avançada", text: "Temas exclusivos e uma tela Hoje com os blocos que você escolher." },
] as const;

export type ProFeatureId = (typeof PRO_FEATURES)[number]["id"];

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  const email = normalizeEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
