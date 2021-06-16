import {
  Collection,
  CreateWebhook,
  DiscordAllowedMentionsTypes,
  EditWebhookMessage,
  endpoints,
  Errors,
  ExecuteWebhook,
  Message,
  ModifyWebhook,
  snakelize,
  urlToBase64,
  validateComponents,
  validateLength,
  Webhook,
} from "../../../deps.ts";
import Client from "../../Client.ts";
import UniversityMessage from "../../Structures/UniversityMessage.ts";

export class WebhookHelpers {
  /** The client itself */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Create a new webhook. Requires the MANAGE_WEBHOOKS permission. Returns a webhook object on success. Webhook names follow our naming restrictions that can be found in our Usernames and Nicknames documentation, with the following additional stipulations:
   *
   * Webhook names cannot be: 'clyde'
   */
  async createWebhook(channelId: bigint, options: CreateWebhook) {
    await this.client.requireBotChannelPermissions(channelId, [
      "MANAGE_WEBHOOKS",
    ]);

    if (
      // Specific usernames that discord does not allow
      options.name === "clyde" ||
      !validateLength(options.name, { min: 2, max: 32 })
    ) {
      throw new Error(Errors.INVALID_WEBHOOK_NAME);
    }

    return (await this.client.rest.post(endpoints.CHANNEL_WEBHOOKS(channelId), {
      ...options,
      avatar: options.avatar ? await urlToBase64(options.avatar) : undefined,
    })) as Webhook;
  }

  /** Delete a webhook permanently. Requires the `MANAGE_WEBHOOKS` permission. Returns a undefined on success */
  async deleteWebhook(channelId: bigint, webhookId: bigint) {
    await this.client.requireBotChannelPermissions(channelId, [
      "MANAGE_WEBHOOKS",
    ]);

    return await this.client.rest.delete(endpoints.WEBHOOK_ID(webhookId));
  }

  async deleteWebhookMessage(
    webhookId: bigint,
    webhookToken: string,
    messageId: bigint
  ) {
    return await this.client.rest.delete(
      endpoints.WEBHOOK_MESSAGE(webhookId, webhookToken, messageId)
    );
  }

  /** Delete a webhook permanently. Returns a undefined on success */
  async deleteWebhookWithToken(webhookId: bigint, webhookToken: string) {
    return await this.client.rest.delete(
      endpoints.WEBHOOK(webhookId, webhookToken)
    );
  }

  /** Edit a webhook. Requires the `MANAGE_WEBHOOKS` permission. Returns the updated webhook object on success. */
  async editWebhook(
    channelId: bigint,
    webhookId: bigint,
    options: ModifyWebhook
  ) {
    await this.client.requireBotChannelPermissions(channelId, [
      "MANAGE_WEBHOOKS",
    ]);

    return (await this.client.rest.patch(endpoints.WEBHOOK_ID(webhookId), {
      ...options,
      channel_id: options.channelId,
    })) as Webhook;
  }

  async editWebhookMessage(
    webhookId: bigint,
    webhookToken: string,
    options: EditWebhookMessage & { messageId?: bigint }
  ) {
    if (options.content && options.content.length > 2000) {
      throw Error(Errors.MESSAGE_MAX_LENGTH);
    }

    if (options.embeds && options.embeds.length > 10) {
      options.embeds.splice(10);
    }

    if (options.allowedMentions) {
      if (options.allowedMentions.users?.length) {
        if (
          options.allowedMentions.parse?.includes(
            DiscordAllowedMentionsTypes.UserMentions
          )
        ) {
          options.allowedMentions.parse = options.allowedMentions.parse.filter(
            (p) => p !== "users"
          );
        }

        if (options.allowedMentions.users.length > 100) {
          options.allowedMentions.users = options.allowedMentions.users.slice(
            0,
            100
          );
        }
      }

      if (options.allowedMentions.roles?.length) {
        if (
          options.allowedMentions.parse?.includes(
            DiscordAllowedMentionsTypes.RoleMentions
          )
        ) {
          options.allowedMentions.parse = options.allowedMentions.parse.filter(
            (p) => p !== "roles"
          );
        }

        if (options.allowedMentions.roles.length > 100) {
          options.allowedMentions.roles = options.allowedMentions.roles.slice(
            0,
            100
          );
        }
      }
    }

    if (options.components?.length) {
      validateComponents(options.components);
    }

    const result = (await this.client.rest.patch(
      options.messageId
        ? endpoints.WEBHOOK_MESSAGE(webhookId, webhookToken, options.messageId)
        : endpoints.WEBHOOK_MESSAGE_ORIGINAL(webhookId, webhookToken),
      snakelize(options)
    )) as Message;

    return new UniversityMessage(this.client, result);
  }

  /** Edit a webhook. Returns the updated webhook object on success. */
  async editWebhookWithToken(
    webhookId: bigint,
    webhookToken: string,
    options: Omit<ModifyWebhook, "channelId">
  ) {
    return (await this.client.rest.patch(
      endpoints.WEBHOOK(webhookId, webhookToken),
      snakelize(options)
    )) as Webhook;
  }

  /** Returns the new webhook object for the given id. */
  async getWebhook(webhookId: bigint) {
    return (await this.client.rest.get(
      endpoints.WEBHOOK_ID(webhookId)
    )) as Webhook;
  }

  /** Returns a previousy-sent webhook message from the same token. Returns a message object on success. */
  async getWebhookMessage(
    webhookId: bigint,
    webhookToken: string,
    messageId: bigint
  ) {
    const result = (await this.client.rest.get(
      endpoints.WEBHOOK_MESSAGE(webhookId, webhookToken, messageId)
    )) as Message;

    return new UniversityMessage(this.client, result);
  }

  /** Returns the new webhook object for the given id, this call does not require authentication and returns no user in the webhook object. */
  async getWebhookWithToken(webhookId: bigint, token: string) {
    return (await this.client.rest.get(
      endpoints.WEBHOOK(webhookId, token)
    )) as Webhook;
  }

  /** Returns a list of guild webhooks objects. Requires the MANAGE_WEBHOOKs permission. */
  async getWebhooks(guildId: bigint) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_WEBHOOKS"]);

    const result = (await this.client.rest.get(
      endpoints.GUILD_WEBHOOKS(guildId)
    )) as Webhook[];

    return new Collection(result.map((webhook) => [webhook.id, webhook]));
  }

  /** Send a webhook with webhook Id and webhook token */
  async sendWebhook(
    webhookId: bigint,
    webhookToken: string,
    options: ExecuteWebhook
  ) {
    if (!options.content && !options.file && !options.embeds) {
      throw new Error(Errors.INVALID_WEBHOOK_OPTIONS);
    }

    if (options.content && options.content.length > 2000) {
      throw Error(Errors.MESSAGE_MAX_LENGTH);
    }

    if (options.embeds && options.embeds.length > 10) {
      options.embeds.splice(10);
    }

    if (options.allowedMentions) {
      if (options.allowedMentions.users?.length) {
        if (
          options.allowedMentions.parse?.includes(
            DiscordAllowedMentionsTypes.UserMentions
          )
        ) {
          options.allowedMentions.parse = options.allowedMentions.parse.filter(
            (p) => p !== "users"
          );
        }

        if (options.allowedMentions.users.length > 100) {
          options.allowedMentions.users = options.allowedMentions.users.slice(
            0,
            100
          );
        }
      }

      if (options.allowedMentions.roles?.length) {
        if (
          options.allowedMentions.parse?.includes(
            DiscordAllowedMentionsTypes.RoleMentions
          )
        ) {
          options.allowedMentions.parse = options.allowedMentions.parse.filter(
            (p) => p !== "roles"
          );
        }

        if (options.allowedMentions.roles.length > 100) {
          options.allowedMentions.roles = options.allowedMentions.roles.slice(
            0,
            100
          );
        }
      }
    }

    const result = (await this.client.rest.post(
      `${endpoints.WEBHOOK(webhookId, webhookToken)}?wait=${
        options.wait ?? false
      }${options.threadId ? `&thread_id=${options.threadId}` : ""}`,
      snakelize(options)
    )) as Message;
    if (!options.wait) return;

    return new UniversityMessage(this.client, result);
  }
}

export default WebhookHelpers;
