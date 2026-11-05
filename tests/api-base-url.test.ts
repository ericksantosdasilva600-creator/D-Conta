import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "../lib/api-base-url";

describe("resolveApiBaseUrl", () => {
  it("uses the same-origin API on a published site, even if a Preview URL exists at build time", () => {
    expect(resolveApiBaseUrl({
      platform: "web",
      apiBaseUrl: "https://3000-old-preview.us5.manus.computer",
      protocol: "https:",
      hostname: "viajadesp-djjzgjdt.manus.space",
      port: "",
    })).toBe("");
  });

  it("uses the environment-provided API URL on the managed Preview domain", () => {
    expect(resolveApiBaseUrl({
      platform: "web",
      apiBaseUrl: "https://3000-current-preview.us5.manus.computer/",
      protocol: "https:",
      hostname: "8081-current-preview.us5.manus.computer",
      port: "",
    })).toBe("https://3000-current-preview.us5.manus.computer");
  });

  it("derives the API host from the managed Preview when no address was provided", () => {
    expect(resolveApiBaseUrl({
      platform: "web",
      protocol: "https:",
      hostname: "8081-current-preview.us5.manus.computer",
    })).toBe("https://3000-current-preview.us5.manus.computer");
  });

  it("uses local API port 3000 from the Expo Web development server", () => {
    expect(resolveApiBaseUrl({
      platform: "web",
      protocol: "http:",
      hostname: "127.0.0.1",
      port: "8081",
    })).toBe("http://127.0.0.1:3000");
  });

  it("keeps the managed API address in native builds", () => {
    expect(resolveApiBaseUrl({
      platform: "native",
      apiBaseUrl: "https://api.example.test/",
    })).toBe("https://api.example.test");
  });
});
