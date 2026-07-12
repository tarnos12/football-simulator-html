/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project Pages are served from https://<user>.github.io/<repo>/ , so the base
// must match the repo name for asset URLs to resolve. Overridable via BASE_PATH
// (the deploy workflow can pass "/" for a user/custom-domain site).
const base = process.env.BASE_PATH ?? "/football-simulator-html/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
