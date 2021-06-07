# university
The class based version of discordeno

```ts
// deps.ts
export * from "https://raw.githubusercontent.com/discordeno/university/main/mod.ts";

// mod.ts
import { Client } from "./deps.ts";

const bot = new Client({
  token: Deno.env.get("DISCORD_TOKEN"),
  intents: [
    "Guilds",
    "GuildMessages",
  ],
});

bot.on("ready", () => {
  console.log("It's alive!");
});

bot.connect();
```
