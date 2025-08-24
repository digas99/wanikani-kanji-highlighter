import cli from "./commands.mjs";
import { version } from "../version.mjs";
import { isAliasedCommand } from "./cli-utils.mjs";
cli.parse(process.argv, { run: false });
if (!isAliasedCommand(cli.matchedCommand)) {
  cli.help();
  cli.version(version);
  cli.parse(process.argv, { run: false });
}
await cli.runMatchedCommand();
