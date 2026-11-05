export type ApiRuntimePlatform = "web" | "native";

export type ApiRuntimeLocation = {
  platform: ApiRuntimePlatform;
  apiBaseUrl?: string;
  protocol?: string;
  hostname?: string;
  port?: string;
};

/**
 * Use the managed API address only in its Preview/local runtimes. A published
 * website serves its API on the same origin and must not retain a temporary host.
 */
export function resolveApiBaseUrl({ platform, apiBaseUrl = "", protocol = "", hostname = "", port = "" }: ApiRuntimeLocation): string {
  const configured = apiBaseUrl.replace(/\/+$/, "");
  if (platform === "native") return configured;

  const managedPreview = hostname.endsWith(".manus.computer");
  const localDevelopment = (hostname === "localhost" || hostname === "127.0.0.1") && port === "8081";
  if (!managedPreview && !localDevelopment) return "";
  if (configured) return configured;

  if (managedPreview) {
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) return `${protocol}//${apiHostname}`;
  }
  return hostname ? `${protocol}//${hostname}:3000` : "";
}
