/** Raiz pública do site (ex.: "/D-Conta"). O app em si fica em "/D-Conta/app". */
export const SITE_ROOT = (process.env.EXPO_BASE_URL ?? "").replace(/\/app$/, "");
export const privacyUrl = () => `${SITE_ROOT}/privacidade.html`;
