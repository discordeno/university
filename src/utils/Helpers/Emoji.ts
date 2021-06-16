import {
  Collection,
  CreateGuildEmoji,
  Emoji,
  endpoints,
  Errors,
  ModifyGuildEmoji,
  snowflakeToBigint,
  urlToBase64,
} from "../../../deps.ts";
import Client from "../../Client.ts";

export class EmojiHelpers {
  /** The client itself. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /** Create an emoji in the server. Emojis and animated emojis have a maximum file size of 256kb. Attempting to upload an emoji larger than this limit will fail and return 400 Bad Request and an error message, but not a JSON status code. If a URL is provided to the image parameter, Discordeno will automatically convert it to a base64 string internally. */
  async createEmoji(
    guildId: bigint,
    name: string,
    image: string,
    options: CreateGuildEmoji,
  ) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_EMOJIS"]);

    if (image && !image.startsWith("data:image/")) {
      image = await urlToBase64(image);
    }

    const emoji = (await this.client.rest.post(
      endpoints.GUILD_EMOJIS(guildId),
      {
        ...options,
        name,
        image,
      },
    )) as Emoji;

    return {
      ...emoji,
      id: snowflakeToBigint(emoji.id!),
    };
  }

  /** Delete the given emoji. Requires the MANAGE_EMOJIS permission. Returns 204 No Content on success. */
  async deleteEmoji(guildId: bigint, id: bigint, reason?: string) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_EMOJIS"]);

    return await this.client.rest.delete(endpoints.GUILD_EMOJI(guildId, id), {
      reason,
    });
  }

  /** Modify the given emoji. Requires the MANAGE_EMOJIS permission. */
  async editEmoji(guildId: bigint, id: bigint, options: ModifyGuildEmoji) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_EMOJIS"]);

    return (await this.client.rest.patch(
      endpoints.GUILD_EMOJI(guildId, id),
      options,
    )) as Emoji;
  }

  /** Creates a url to the emoji from the Discord CDN. */
  emojiURL(id: bigint, animated = false) {
    return `https://cdn.discordapp.com/emojis/${id}.${
      animated ? "gif" : "png"
    }`;
  }

  /** Returns an emoji for the given guild and emoji Id. */
  async getEmoji(guildId: bigint, emojiId: bigint, addToCache = true) {
    const result = (await this.client.rest.get(
      endpoints.GUILD_EMOJI(guildId, emojiId),
    )) as Emoji;

    if (addToCache) {
      const guild = await this.client.cache.get("guilds", guildId);
      if (!guild) throw new Error(Errors.GUILD_NOT_FOUND);
      guild.emojis.set(emojiId, result);
      await this.client.cache.set("guilds", guildId, guild);
    }

    return result;
  }

  /** Returns a list of emojis for the given guild. */
  async getEmojis(guildId: bigint, addToCache = true) {
    const result = (await this.client.rest.get(
      endpoints.GUILD_EMOJIS(guildId),
    )) as Emoji[];

    if (addToCache) {
      const guild = await this.client.cache.get("guilds", guildId);
      if (!guild) throw new Error(Errors.GUILD_NOT_FOUND);

      result.forEach((emoji) => {
        this.client.emit(
          "DEBUG",
          "loop",
          `Running forEach loop in get_emojis file.`,
        );
        guild.emojis.set(snowflakeToBigint(emoji.id!), emoji);
      });

      await this.client.cache.set("guilds", guildId, guild);
    }

    return new Collection(result.map((e) => [e.id!, e]));
  }
}

export default EmojiHelpers;
