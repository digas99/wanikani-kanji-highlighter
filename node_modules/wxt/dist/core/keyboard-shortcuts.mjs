import readline from "node:readline";
import { wxt } from "./wxt.mjs";
import pc from "picocolors";
export function createKeyboardShortcuts(server) {
  let rl;
  const handleInput = (line) => {
    if (line.trim() === "o") {
      server.restartBrowser();
    }
  };
  return {
    start() {
      rl ??= readline.createInterface({
        input: process.stdin,
        terminal: false
        // Don't intercept ctrl+C, ctrl+Z, etc
      });
      rl.on("line", handleInput);
    },
    stop() {
      rl?.removeListener("line", handleInput);
    },
    printHelp(flags) {
      if (flags.canReopenBrowser) {
        wxt.logger.info(
          `${pc.dim("Press")} ${pc.bold("o + enter")} ${pc.dim("to reopen the browser")}`
        );
      }
    }
  };
}
