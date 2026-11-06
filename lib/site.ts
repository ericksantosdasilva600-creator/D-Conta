/** Raiz pública do site (ex.: "/daconta"). O app em si fica em "/daconta/app". */
export const SITE_ROOT = (process.env.EXPO_BASE_URL ?? "").replace(/\/app$/, "");
export const privacyUrl = () => `${SITE_ROOT}/privacidade.html`;
