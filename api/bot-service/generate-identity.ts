import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { DbConnection } from "../../client/src/module_bindings";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "../../.env");

const host =
  process.env.SPACETIMEDB_HOST ?? "https://maincloud.spacetimedb.com";
const database = process.env.SPACETIMEDB_DATABASE ?? "pick-and-lock";

function upsertEnvVar(path: string, key: string, value: string): void {
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const next = pattern.test(existing)
    ? existing.replace(pattern, line)
    : `${existing.replace(/\n?$/, "\n")}${line}\n`;
  writeFileSync(path, next);
}

const connection = DbConnection.builder()
  .withUri(host)
  .withDatabaseName(database)
  .onConnect((_connection, identity, token) => {
    upsertEnvVar(envPath, "BOT_SPACETIME_TOKEN", token);
    console.log(`Bot identity: ${identity.toHexString()}`);
    console.log(
      `BOT_SPACETIME_TOKEN written to ${envPath} (not printed here).`,
    );
    console.log(
      "Next: rebuild and republish the server module with BOT_IDENTITY set to the identity above.",
    );
    connection.disconnect();
    process.exit(0);
  })
  .onConnectError((_context, error) => {
    console.error(
      "Could not connect to generate a bot identity:",
      error.message,
    );
    process.exit(1);
  })
  .build();
