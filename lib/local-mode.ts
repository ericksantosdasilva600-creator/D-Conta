/**
 * Modo local: a aplicação funciona sem login nem servidor.
 * Os dados ficam guardados apenas neste navegador/dispositivo.
 * Ativado no build com EXPO_PUBLIC_NYVO_LOCAL_ONLY=1.
 */
export const LOCAL_ONLY = process.env.EXPO_PUBLIC_NYVO_LOCAL_ONLY === "1";
