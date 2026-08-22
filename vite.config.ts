import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist/client",
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
  plugins: [react()],
});
