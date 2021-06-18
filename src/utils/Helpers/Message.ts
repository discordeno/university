import {
  Collection,
  CreateMessage,
  delay,
  DiscordAllowedMentionsTypes,
  DiscordChannelTypes,
  EditMessage,
  endpoints,
  Errors,
  GetMessagesAfter,
  GetMessagesAround,
  GetMessagesBefore,
  GetMessagesLimit,
  GetReactions,
  Message,
  PermissionStrings,
  snakelize,
  User,
  validateComponents,
  validateLength,
} from "../../../deps.ts";
import Client from "../../Client.ts";
import UniversityMessage from "../../Structures/UniversityMessage.ts";

export class MessageHelpers {
  /** The client itself. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /** Create a reaction for the message. Reaction takes the form of **name:id** for custom guild emoji, or Unicode characters. Requires READ_MESSAGE_HISTORY and ADD_REACTIONS */
  async addReaction(channelId: bigint, messageId: bigint, reaction: string) {
    await this.client.requireBotChannelPermissions(channelId, [
      "ADD_REACTIONS",
      "READ_MESSAGE_HISTORY",
    ]);

    if (reaction.startsWith("<:")) {
      reaction = reaction.substring(2, reaction.length - 1);
    } else if (reaction.startsWith("<a:")) {
      reaction = reaction.substring(3, reaction.length - 1);
    }

    return await this.client.rest.put(
      endpoints.CHANNEL_MESSAGE_REACTION_ME(channelId, messageId, reaction)
    );
  }

  /** Adds multiple reactions to a message. If `ordered` is true(default is false), it will add the reactions one at a time in the order provided. Note: Reaction takes the form of **name:id** for custom guild emoji, or Unicode characters. Requires READ_MESSAGE_HISTORY and ADD_REACTIONS */
  async addReactions(
    channelId: bigint,
    messageId: bigint,
    reactions: string[],
    ordered = false
  ) {
    if (!ordered) {
      await Promise.all(
        reactions.map((reaction) =>
          this.addReaction(channelId, messageId, reaction)
        )
      );
    } else {
      for (const reaction of reactions) {
        this.client.emit(
          "DEBUG",
          "loop",
          "Running for of loop in addReactions function."
        );
        await this.addReaction(channelId, messageId, reaction);
      }
    }
  }

  /** Delete a message with the channel id and message id only. */
  async deleteMessage(
    channelId: bigint,
    messageId: bigint,
    reason?: string,
    delayMilliseconds = 0
  ) {
    const message = await this.client.cache.get("messages", messageId);

    if (message && message.authorId !== this.client.botId) {
      await this.client.requireBotChannelPermissions(message.channelId, [
        "MANAGE_MESSAGES",
      ]);
    }

    if (delayMilliseconds) await delay(delayMilliseconds);

    return await this.client.rest.delete(
      endpoints.CHANNEL_MESSAGE(channelId, messageId),
      { reason }
    );
  }

  /** Delete messages from the channel. 2-100. Requires the MANAGE_MESSAGES permission */
  async deleteMessages(channelId: bigint, ids: bigint[], reason?: string) {
    await this.client.requireBotChannelPermissions(channelId, [
      "MANAGE_MESSAGES",
    ]);

    if (ids.length < 2) {
      throw new Error(Errors.DELETE_MESSAGES_MIN);
    }

    if (ids.length > 100) {
      console.warn(
        `This endpoint only accepts a maximum of 100 messages. Deleting the first 100 message ids provided.`
      );
    }

    return await this.client.rest.post(
      endpoints.CHANNEL_BULK_DELETE(channelId),
      {
        messages: ids.splice(0, 100),
        reason,
      }
    );
  }

  /** Edit the message. */
  async editMessage(
    channelId: bigint,
    messageId: bigint,
    content: string | EditMessage
  ) {
    const message = await this.client.cache.get("messages", messageId);

    if (message) {
      if (message.authorId !== this.client.botId) {
        throw new Error(
          "You can only edit a message that was sent by the bot."
        );
      }
      const requiredPerms: PermissionStrings[] = ["SEND_MESSAGES"];

      await this.client.requireBotChannelPermissions(
        message.channelId,
        requiredPerms
      );
    }

    if (typeof content === "string") content = { content };

    if (content.components?.length) {
      validateComponents(content.components);
    }

    if (content.content && content.content.length > 2000) {
      throw new Error(Errors.MESSAGE_MAX_LENGTH);
    }

    const result = (await this.client.rest.patch(
      endpoints.CHANNEL_MESSAGE(channelId, messageId),
      snakelize(content)
    )) as Message;

    return new UniversityMessage(this.client, result);
  }

  /** Fetch a single message from the server. Requires VIEW_CHANNEL and READ_MESSAGE_HISTORY */
  async getMessage(channelId: bigint, id: bigint) {
    if (await this.client.cache.has("channels", channelId)) {
      await this.client.requireBotChannelPermissions(channelId, [
        "VIEW_CHANNEL",
        "READ_MESSAGE_HISTORY",
      ]);
    }

    const result = (await this.client.rest.get(
      endpoints.CHANNEL_MESSAGE(channelId, id)
    )) as Message;

    return new UniversityMessage(this.client, result);
  }

  /** Fetches between 2-100 messages. Requires VIEW_CHANNEL and READ_MESSAGE_HISTORY */
  async getMessages(
    channelId: bigint,
    options?:
      | GetMessagesAfter
      | GetMessagesBefore
      | GetMessagesAround
      | GetMessagesLimit
  ) {
    await this.client.requireBotChannelPermissions(channelId, [
      "VIEW_CHANNEL",
      "READ_MESSAGE_HISTORY",
    ]);

    if (options?.limit && (options.limit < 0 || options.limit > 100)) {
      throw new Error(Errors.INVALID_GET_MESSAGES_LIMIT);
    }

    const result = (await this.client.rest.get(
      endpoints.CHANNEL_MESSAGES(channelId),
      options
    )) as Message[];

    return await Promise.all(
      result.map((res) => new UniversityMessage(this.client, res))
    );
  }

  /** Get a list of users that reacted with this emoji. */
  async getReactions(
    channelId: bigint,
    messageId: bigint,
    reaction: string,
    options?: GetReactions
  ) {
    const users = (await this.client.rest.get(
      endpoints.CHANNEL_MESSAGE_REACTION(channelId, messageId, reaction),
      options
    )) as User[];

    return new Collection(users.map((user) => [user.id, user]));
  }

  /** Pin a message in a channel. Requires MANAGE_MESSAGES. Max pins allowed in a channel = 50. */
  async pin(channelId: bigint, messageId: bigint) {
    await this.client.requireBotChannelPermissions(channelId, [
      "MANAGE_MESSAGES",
    ]);

    return await this.client.rest.put(
      endpoints.CHANNEL_PIN(channelId, messageId)
    );
  }

  /** Crosspost a message in a News Channel to following channels. */
  async publishMessage(channelId: bigint, messageId: bigint) {
    const data = (await this.client.rest.post(
      endpoints.CHANNEL_MESSAGE_CROSSPOST(channelId, messageId)
    )) as Message;

    return new UniversityMessage(this.client, data);
  }

  /** Removes all reactions for all emojis on this message. */
  async removeAllReactions(channelId: bigint, messageId: bigint) {
    await this.client.requireBotChannelPermissions(channelId, [
      "MANAGE_MESSAGES",
    ]);

    return await this.client.rest.delete(
      endpoints.CHANNEL_MESSAGE_REACTIONS(channelId, messageId)
    );
  }

  /** Removes a reaction from the given user on this message, defaults to bot. Reaction takes the form of **name:id** for custom guild emoji, or Unicode characters. */
  async removeReaction(
    channelId: bigint,
    messageId: bigint,
    reaction: string,
    options?: { userId?: bigint }
  ) {
    if (options?.userId) {
      await this.client.requireBotChannelPermissions(channelId, [
        "MANAGE_MESSAGES",
      ]);
    }

    if (reaction.startsWith("<:")) {
      reaction = reaction.substring(2, reaction.length - 1);
    } else if (reaction.startsWith("<a:")) {
      reaction = reaction.substring(3, reaction.length - 1);
    }

    return await this.client.rest.delete(
      options?.userId
        ? endpoints.CHANNEL_MESSAGE_REACTION_USER(
            channelId,
            messageId,
            reaction,
            options.userId
          )
        : endpoints.CHANNEL_MESSAGE_REACTION_ME(channelId, messageId, reaction)
    );
  }

  /** Removes all reactions for a single emoji on this message. Reaction takes the form of **name:id** for custom guild emoji, or Unicode characters. */
  async removeReactionEmoji(
    channelId: bigint,
    messageId: bigint,
    reaction: string
  ) {
    await this.client.requireBotChannelPermissions(channelId, [
      "MANAGE_MESSAGES",
    ]);

    if (reaction.startsWith("<:")) {
      reaction = reaction.substring(2, reaction.length - 1);
    } else if (reaction.startsWith("<a:")) {
      reaction = reaction.substring(3, reaction.length - 1);
    }

    return await this.client.rest.delete(
      endpoints.CHANNEL_MESSAGE_REACTION(channelId, messageId, reaction)
    );
  }

  /** Send a message to the channel. Requires SEND_MESSAGES permission. */
  async sendMessage(channelId: bigint, content: string | CreateMessage) {
    if (typeof content === "string") content = { content };

    const channel = await this.client.cache.get("channels", channelId);
    if (channel) {
      if (
        ![
          DiscordChannelTypes.DM,
          DiscordChannelTypes.GuildNews,
          DiscordChannelTypes.GuildText,
          DiscordChannelTypes.GuildPublicThread,
          DiscordChannelTypes.GuildPivateThread,
          DiscordChannelTypes.GuildNewsThread,
        ].includes(channel.type)
      ) {
        throw new Error(Errors.CHANNEL_NOT_TEXT_BASED);
      }

      const requiredPerms: Set<PermissionStrings> = new Set([
        "SEND_MESSAGES",
        "VIEW_CHANNEL",
      ]);

      if (content.tts) requiredPerms.add("SEND_TTS_MESSAGES");
      if (content.embed || content.embeds) requiredPerms.add("EMBED_LINKS");
      if (
        content.messageReference?.messageId ||
        content.allowedMentions?.repliedUser
      ) {
        requiredPerms.add("READ_MESSAGE_HISTORY");
      }

      await this.client.requireBotChannelPermissions(channelId, [
        ...requiredPerms,
      ]);
    }

    // Use ... for content length due to unicode characters and js .length handling
    if (content.content && !validateLength(content.content, { max: 2000 })) {
      throw new Error(Errors.MESSAGE_MAX_LENGTH);
    }

    if (content.components?.length) {
      validateComponents(content.components);
    }

    if (content.allowedMentions) {
      if (content.allowedMentions.users?.length) {
        if (
          content.allowedMentions.parse?.includes(
            DiscordAllowedMentionsTypes.UserMentions
          )
        ) {
          content.allowedMentions.parse = content.allowedMentions.parse.filter(
            (p) => p !== "users"
          );
        }

        if (content.allowedMentions.users.length > 100) {
          content.allowedMentions.users = content.allowedMentions.users.slice(
            0,
            100
          );
        }
      }

      if (content.allowedMentions.roles?.length) {
        if (
          content.allowedMentions.parse?.includes(
            DiscordAllowedMentionsTypes.RoleMentions
          )
        ) {
          content.allowedMentions.parse = content.allowedMentions.parse.filter(
            (p) => p !== "roles"
          );
        }

        if (content.allowedMentions.roles.length > 100) {
          content.allowedMentions.roles = content.allowedMentions.roles.slice(
            0,
            100
          );
        }
      }
    }

    const result = (await this.client.rest.post(
      endpoints.CHANNEL_MESSAGES(channelId),
      snakelize({
        ...content,
        ...(content.messageReference?.messageId
          ? {
              messageReference: {
                ...content.messageReference,
                failIfNotExists:
                  content.messageReference.failIfNotExists === true,
              },
            }
          : {}),
      })
    )) as Message;

    return new UniversityMessage(this.client, result);
  }

  /** Unpin a message in a channel. Requires MANAGE_MESSAGES. */
  async unpin(channelId: bigint, messageId: bigint): Promise<undefined> {
    await this.client.requireBotChannelPermissions(channelId, [
      "MANAGE_MESSAGES",
    ]);

    return await this.client.rest.delete(
      endpoints.CHANNEL_PIN(channelId, messageId)
    );
  }
}

export default MessageHelpers;
