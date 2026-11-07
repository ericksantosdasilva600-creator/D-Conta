import { configDefaults, defineConfig } from "vitest/config";

// reacut/ é o editor de vídeo ReaCut, com testes próprios (rodam dentro da pasta dele).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "reacut/**"],
  },
});
