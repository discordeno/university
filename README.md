# university

<img align="right" src="https://raw.githubusercontent.com/discordeno/guide/main/src/.vuepress/public/logo.png" height="150px">

Class based version of [discordeno](https://github.com/discordeno/discordeno)

University follows [Semantic Versioning](https://semver.org/)

[![Discord](https://img.shields.io/discord/785384884197392384?color=7289da&logo=discord&logoColor=dark)](https://discord.com/invite/deno)
![Lint](https://github.com/discordeno/university/workflows/Lint/badge.svg)
![Test](https://github.com/discordeno/university/workflows/Test/badge.svg)

## Getting Started

### Minimial Example

Here is how you can start working with university:

```ts
// deps.ts
export * from "https://raw.githubusercontent.com/discordeno/university/main/mod.ts";

// mod.ts
import { Client } from "./deps.ts";

const bot = new Client({
  token: Deno.env.get("DISCORD_TOKEN"),
  intents: ["Guilds", "GuildMessages"],
});

bot.on("ready", () => {
  console.log("It's alive!");
});

bot.connect();
```

## Links

- [Discord](https://discord.com/invite/deno)
- [Raw](https://github.com/discordeno/university/raw/main/mod.ts)

## Contributing

We appreciate your help! Before contributing, please read the
[Contributing Guide](https://github.com/discordeno/university/blob/main/.github/CONTRIBUTING.md).
