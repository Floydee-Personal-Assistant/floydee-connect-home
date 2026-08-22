import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist/client",
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        prototype: fileURLToPath(new URL("./prototype.html", import.meta.url)),
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
  plugins: [react()],
});
