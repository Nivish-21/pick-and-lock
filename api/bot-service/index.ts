import { RoomBotService } from "./service";

const config = {
  host: process.env.SPACETIMEDB_HOST ?? "https://maincloud.spacetimedb.com",
  database: process.env.SPACETIMEDB_DATABASE ?? "pick-and-lock",
  token: process.env.BOT_SPACETIME_TOKEN,
  openAiKey: process.env.OPENAI_API_KEY,
  placesKey: process.env.GOOGLE_PLACES_API_KEY,
};

if (!config.token || !config.openAiKey) {
  throw new Error("BOT_SPACETIME_TOKEN and OPENAI_API_KEY are required");
}

const service = new RoomBotService({
  host: config.host,
  database: config.database,
  token: config.token,
  openAiKey: config.openAiKey,
  placesKey: config.placesKey,
});

const stop = () => {
  service.stop();
  process.exit(0);
};

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
