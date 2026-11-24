import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vitest 5 (Vite 8 / oxc) n'utilise plus l'option `esbuild` : sans ceci le
  // JSX est laissé tel quel (tsconfig `jsx: preserve`) et les tests .tsx échouent.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    reporters: "default",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
