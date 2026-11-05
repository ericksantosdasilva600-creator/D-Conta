import { describe, expect, it } from "vitest";
import { FREE_FEATURES, PRO_SALES_OPEN, isValidEmail, normalizeEmail } from "../lib/plans";

describe("planos", () => {
  it("mantém a venda desligada", () => { expect(PRO_SALES_OPEN).toBe(false); });
  it("mantém conta e backup no Free", () => {
    expect(FREE_FEATURES.join(" ")).toContain("sincronização");
    expect(FREE_FEATURES.join(" ")).toContain("Backup");
  });
  it("normaliza e valida e-mails", () => {
    expect(normalizeEmail("  Ana@Mail.COM ")).toBe("ana@mail.com");
    expect(isValidEmail("ana@mail.com")).toBe(true);
    expect(isValidEmail("ana@mail")).toBe(false);
    expect(isValidEmail("ana mail@x.com")).toBe(false);
  });
});
