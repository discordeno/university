import {
  Collection,
  CreateChannelInvite,
  endpoints,
  Errors,
  GetInvite,
  InviteMetadata,
  snakelize,
} from "../../../deps.ts";
import Client from "../../Client.ts";

export class InviteHelpers {
  /** The client itself. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /** Creates a new invite for this channel. Requires CREATE_INSTANT_INVITE */
  async createInvite(channelId: bigint, options: CreateChannelInvite = {}) {
    await this.client.requireBotChannelPermissions(channelId, [
      "CREATE_INSTANT_INVITE",
    ]);

    if (options.maxAge && (options.maxAge < 0 || options.maxAge > 604800)) {
      throw new Error(Errors.INVITE_MAX_AGE_INVALID);
    }
    if (options.maxUses && (options.maxUses < 0 || options.maxUses > 100)) {
      throw new Error(Errors.INVITE_MAX_USES_INVALID);
    }

    return (await this.client.rest.post(
      endpoints.CHANNEL_INVITES(channelId),
      snakelize(options),
    )) as InviteMetadata;
  }

  /** Deletes an invite for the given code. Requires `MANAGE_CHANNELS` or `MANAGE_GUILD` permission */
  async deleteInvite(channelId: bigint, inviteCode: string) {
    const channel = await this.client.cache.get("channels", channelId);
    if (channel) {
      const hasPerm = await this.client.botHasChannelPermissions(channel, [
        "MANAGE_CHANNELS",
      ]);

      if (!hasPerm) {
        await this.client.requireBotGuildPermissions(channel.guildId, [
          "MANAGE_GUILD",
        ]);
      }
    }

    return (await this.client.rest.delete(
      endpoints.INVITE(inviteCode),
    )) as InviteMetadata;
  }

  /** Gets the invites for this channel. Requires MANAGE_CHANNEL */
  async getChannelInvites(channelId: bigint) {
    await this.client.requireBotChannelPermissions(channelId, [
      "MANAGE_CHANNELS",
    ]);

    const result = (await this.client.rest.get(
      endpoints.CHANNEL_INVITES(channelId),
    )) as InviteMetadata[];

    return new Collection(result.map((invite) => [invite.code, invite]));
  }

  /** Returns an invite for the given code or throws an error if the invite doesn't exists. */
  async getInvite(inviteCode: string, options?: GetInvite) {
    return (await this.client.rest.get(
      endpoints.INVITE(inviteCode),
      snakelize(options ?? {}),
    )) as InviteMetadata;
  }

  /** Get all the invites for this guild. Requires MANAGE_GUILD permission */
  async getInvites(guildId: bigint) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    const result = (await this.client.rest.get(
      endpoints.GUILD_INVITES(guildId),
    )) as InviteMetadata[];

    return new Collection(result.map((invite) => [invite.code, invite]));
  }
}

export default InviteHelpers;
