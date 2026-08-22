import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.floydee.connect",
  appName: "Floydee Connect",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SystemBars: {
      insetsHandling: "css",
      style: "LIGHT",
      hidden: false,
    },
  },
};

export default config;
