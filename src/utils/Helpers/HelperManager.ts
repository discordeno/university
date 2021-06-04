import {
  DiscordGatewayOpcodes,
  endpoints,
  Errors,
  snakelize,
  StatusUpdate,
  urlToBase64,
  User,
} from "../../../deps.ts";
import Client from "../../Client.ts";
import ChannelHelpers from "./channels/ChannelHelpers.ts";

export class HelperManager {
  /** The client itself. */
  client: Client;
  /** The channel helpers */
  channels: ChannelHelpers;

  constructor(client: Client) {
    this.client = client;
    this.channels = new ChannelHelpers(client);
  }

  /** Get the bots Gateway metadata that can help during the operation of large or sharded bots. */
  async getGatewayBot() {
    return await this.client.rest.get(endpoints.GATEWAY_BOT);
  }

  /** Modifies the bot's username or avatar.
   * NOTE: username: if changed may cause the bot's discriminator to be randomized.
   */
  async editBotProfile(options: { username?: string; botAvatarURL?: string }) {
    // Nothing was edited
    if (!options.username && !options.botAvatarURL) return;
    // Check username requirements if username was provided
    if (options.username) {
      if (options.username.length > 32) {
        throw new Error(Errors.USERNAME_MAX_LENGTH);
      }
      if (options.username.length < 2) {
        throw new Error(Errors.USERNAME_MIN_LENGTH);
      }
      if (
        ["@", "#", ":", "```"].some((char) => options.username!.includes(char))
      ) {
        throw new Error(Errors.USERNAME_INVALID_CHARACTER);
      }
      if (["discordtag", "everyone", "here"].includes(options.username)) {
        throw new Error(Errors.USERNAME_INVALID_USERNAME);
      }
    }

    const avatar = options?.botAvatarURL
      ? await urlToBase64(options?.botAvatarURL)
      : undefined;

    return (await this.client.rest.patch(endpoints.USER_BOT, {
      username: options.username?.trim(),
      avatar,
    })) as User;
  }

  editBotStatus(data: Omit<StatusUpdate, "afk" | "since">) {
    this.client.gateway.forEach((shard) => {
      this.client.emit(
        "DEBUG",
        "loop",
        `Running forEach loop in editBotStatus function.`
      );

      shard.sendShardMessage({
        op: DiscordGatewayOpcodes.StatusUpdate,
        d: {
          since: null,
          afk: false,
          ...snakelize<Omit<StatusUpdate, "afk" | "since">>(data),
        },
      });
    });
  }

  /** This function will return the raw user payload in the rare cases you need to fetch a user directly from the API. */
  async getUser(userId: bigint) {
    return (await this.client.rest.get(endpoints.USER(userId))) as User;
  }
}

export default HelperManager;
