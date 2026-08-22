import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const javaHomes = [
  "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
  "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
  process.env.JAVA_HOME,
].filter((value) => value && existsSync(value));

const result = spawnSync("./gradlew", ["assembleDebug"], {
  cwd: new URL("../android/", import.meta.url),
  env: {
    ...process.env,
    ...(javaHomes[0] ? { JAVA_HOME: javaHomes[0] } : {}),
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
