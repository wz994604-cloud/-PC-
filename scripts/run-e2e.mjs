import { spawn } from "node:child_process";
import chromium from "@sparticuz/chromium";

const executablePath = await chromium.executablePath();
const child = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, PLAYWRIGHT_EXECUTABLE_PATH: executablePath },
});
child.on("exit", (code) => process.exit(code ?? 1));
