import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // Next.js keeps JSX as-is ("preserve"); tests compile it with React's automatic runtime.
  esbuild: { jsx: "automatic" },
  test: { environment: "node", include: ["src/**/*.test.ts", "src/**/*.test.tsx"] },
});
