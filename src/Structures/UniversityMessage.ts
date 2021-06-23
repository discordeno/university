import {
  Application,
  Attachment,
  bigintToSnowflake,
  Channel,
  CHANNEL_MENTION_REGEX,
  ChannelMention,
  CreateMessage,
  DiscordMessageTypes,
  EditMessage,
  Embed,
  GuildMember,
  iconBigintToHash,
  Message,
  MessageActivity,
  MessageComponents,
  MessageInteraction,
  MessageReference,
  MessageSticker,
  Reaction,
  snowflakeToBigint,
  ThreadMember,
  User,
} from "../../deps.ts";
import Client from "../Client.ts";
import Base from "./Base.ts";
import MessageBitField from "./BitFields/Message.ts";

export class UniversityMessage extends Base {
  /** Id of the guild which the massage has been send in. */
  guildId?: bigint;
  /** id of the channel the message was sent in */
  channelId!: bigint;
  /** If the message is generated by a webhook, this is the webhook's id */
  webhookId?: bigint;
  /** The id of the user who sent this message */
  authorId!: bigint;
  /** If the message is a response to an Interaction, this is the id of the interaction's application */
  applicationId?: bigint;
  /** The message content for this message. Empty string if no content was sent like an attachment only. */
  content!: string;
  /** Ids of users specifically mentioned in the message */
  mentionedUserIds!: bigint[];
  /** Ids of roles specifically mentioned in this message */
  mentionedRoleIds!: bigint[];
  /** Channels specifically mentioned in this message */
  mentionedChannelIds!: bigint[];
  /** When this message was sent */
  timestamp!: number;
  /** When this message was edited (or undefined if never) */
  editedTimestamp?: number;
  /** Holds all the boolean toggles. */
  bitfield: MessageBitField;
  /** Any attached files */
  attachments!: Attachment[];
  /** Any embedded content */
  embeds!: Embed[];
  /** Reactions to the message */
  reactions!: Reaction[];
  /** Type of message */
  type: DiscordMessageTypes;
  /** Used for validating a message was sent */
  nonce?: number | string;
  /** Sent with Rich Presence-related chat embeds */
  activity?: MessageActivity;
  /** Sent with Rich Presence-related chat embeds */
  application?: Partial<Application>;
  /** Data showing the source of a crossposted channel follow add, pin or reply message */
  messageReference?: Omit<MessageReference, "failIfNotExists">;
  /** Message flags combined as a bitfield */
  flags?: number;
  /** The stickers sent with the message (bots currently can only receive messages with stickers, not send) */
  stickers?: MessageSticker[];
  /**
   * The message associated with the `message_reference`
   * Note: This field is only returned for messages with a `type` of `19` (REPLY). If the message is a reply but the `referenced_message` field is not present, the backend did not attempt to fetch the message that was being replied to, so its state is unknown. If the field exists but is null, the referenced message was deleted.
   */
  referencedMessage?: Message;
  /** Sent if the message is a response to an Interaction */
  interaction?: MessageInteraction;
  /** The thread that was started from this message, includes thread member object */
  thread?: Omit<Channel, "member"> & { member: ThreadMember };
  /** The components related to this message */
  components!: MessageComponents;
  /** Whether or not this message was sent by a bot */
  isBot!: boolean;
  /** The username#discrimnator for the user who sent this message */
  tag!: string;

  constructor(client: Client, payload: Message) {
    super(client, payload.id);
    this.bitfield = new MessageBitField(0n);
    this.channelId = snowflakeToBigint(payload.channelId);
    if (payload.guildId) this.guildId = snowflakeToBigint(payload.guildId);
    this.authorId = snowflakeToBigint(payload.author.id);
    this.timestamp = Date.parse(payload.timestamp);
    this.type = payload.type;

    this.update(payload);
  }

  update(payload: Message) {
    this.bitfield.tts = payload.tts;
    this.bitfield.mentionEveryone = payload.mentionEveryone;
    this.bitfield.pinned = payload.pinned;
    this.isBot = payload.author.bot || false;

    this.tag = `${payload.author.username}#${payload.author.discriminator}`;

    this.attachments = payload.attachments;
    this.embeds = payload.embeds;
    this.reactions = payload.reactions || [];
    this.content = payload.content || "";
    this.components = payload.components;
    this.nonce = payload.nonce;
    this.activity = payload.activity;
    this.application = payload.application;
    this.messageReference = payload.messageReference;
    this.flags = payload.flags;
    this.stickers = payload.stickers;
    this.referencedMessage = payload.referencedMessage;

    this.mentionedUserIds = (payload.mentions || []).map((mention) =>
      snowflakeToBigint(mention.id)
    );
    this.mentionedRoleIds = (payload.mentionRoles || []).map((id) =>
      snowflakeToBigint(id)
    );
    this.mentionedChannelIds = [
      // Keep any ids that discord sends
      ...(payload.mentionChannels || []).map((m) => snowflakeToBigint(m.id)),
      // Add any other ids that can be validated in a channel mention format
      ...(payload.content?.match(CHANNEL_MENTION_REGEX) || []).map(
        (text: string) =>
          // converts the <#123> into 123
          snowflakeToBigint(text.substring(2, text.length - 1))
      ),
    ];

    if (payload.editedTimestamp) {
      this.editedTimestamp = Date.parse(payload.editedTimestamp);
    }
    if (payload.webhookId) {
      this.webhookId = snowflakeToBigint(payload.webhookId);
    }
  }

  get author() {
    return {
      id: this.id,
      username: this.tag?.substring(0, this.tag.length - 5),
      discriminator: this.tag?.substring(this.tag.length - 4),
      avatar: this.member?.avatar || null,
      bot: this.member?.bot,
      system: this.member?.system,
      mfaEnabled: this.member?.mfaEnabled,
      locale: this.member?.locale,
      verified: this.member?.verified,
      email: this.member?.email,
      flags: this.member?.flags,
      premiumType: this.member?.premiumType,
      publicFlags: this.member?.publicFlags,
    };
  }

  /** Whether this was a TTS message */
  get tts() {
    return this.bitfield.tts;
  }

  /** The message ping */
  get ping() {
    return Date.now()-this.timestamp
  } 

  /** Whether this message mentions everyone */
  get mentionEveryone() {
    return this.bitfield.mentionEveryone;
  }

  /** Whether this message is pinned */
  get pinned() {
    return this.bitfield.pinned;
  }

  /** The channel where this message was sent. Can be undefined if uncached. */
  get channel() {
    return this.client.channels.get(this.channelId);
  }

  /** The guild of this message. Can be undefined if not in cache or in DM */
  get guild() {
    return this.client.guilds.get(this.guildId!);
  }

  /** The member for the user who sent the message. Can be undefined if not in cache or in dm. */
  get member() {
    return this.guild?.members.get(this.authorId);
  }

  /** The guild member details for this guild and member. Can be undefined if not in cache or in dm. */
  get guildMember() {
    return this.member?.guilds.get(this.guildId!);
  }

  /** The url link to this message */
  get link() {
    return `https://discord.com/channels/${this.guildId || "@me"}/${
      this.channelId
    }/${this.id}`;
  }

  /** The role objects for all the roles that were mentioned in this message */
  get mentionedRoles() {
    return this.mentionedRoleIds?.map((id) => this.guild?.roles.get(id)) || [];
  }

  /** The channel objects for all the channels that were mentioned in this message. */
  get mentionedChannels() {
    return (
      this.mentionedChannelIds
        .map((id) => this.client.channels.get(id)!)
        .filter((c) => c) || []
    );
  }

  /** The member objects for all the members that were mentioned in this message. */
  get mentionedMembers() {
    return this.guild
      ? this.mentionedUserIds
          .map((id) => this.guild!.members.get(id)!)
          .filter((m) => m)
      : [];
  }

  /** Delete the message */
  async delete(reason?: string, delayMilliseconds?: number) {
    return await this.client.deleteMessage(
      this.channelId,
      this.id,
      reason,
      delayMilliseconds
    );
  }

  /** Edit the message */
  async edit(content: string | EditMessage) {
    return await this.client.editMessage(this.channelId, this.id, content);
  }

  /** Pins the message in the channel */
  async pin() {
    return await this.client.pinMessage(this.channelId, this.id);
  }

  /** Add a reaction to the message */
  async addReaction(reaction: string) {
    return await this.client.addReaction(this.channelId, this.id, reaction);
  }

  /** Add multiple reactions to the message without or without order. */
  async addReactions(reactions: string[], ordered?: boolean) {
    return await this.client.addReactions(
      this.channelId,
      this.id,
      reactions,
      ordered
    );
  }

  /** Send a inline reply to this message */
  async reply(content: string | CreateMessage, mentionUser = true) {
    const contentWithMention: CreateMessage =
      typeof content === "string"
        ? {
            content,
            allowedMentions: {
              repliedUser: mentionUser,
            },
            messageReference: {
              messageId: bigintToSnowflake(this.id!),
              failIfNotExists: false,
            },
          }
        : {
            ...content,
            allowedMentions: {
              ...(content.allowedMentions || {}),
              repliedUser: mentionUser,
            },
            messageReference: {
              messageId: bigintToSnowflake(this.id!),
              failIfNotExists:
                content.messageReference?.failIfNotExists === true,
            },
          };

    if (this.guildId) {
      return await this.client.sendMessage(this.channelId!, contentWithMention);
    }
    return await this.client.sendDirectMessage(
      this.authorId!,
      contentWithMention
    );
  }

  /** Send a message to this channel where this message is */
  async send(content: string | CreateMessage) {
    if (this.guildId) {
      return await this.client.sendMessage(this.channelId!, content);
    }
    return await this.client.sendDirectMessage(this.authorId!, content);
  }

  /** Send a message to this channel and then delete it after a bit. By default it will delete after 10 seconds async with no reason provided. */
  async alert(content: string | CreateMessage, timeout = 10, reason?: string) {
    if (this.guildId) {
      return await this.client
        .sendMessage(this.channelId!, content)
        .then((response) => {
          response.delete(reason, timeout * 1000).catch(console.error);
        });
    }

    return await this.client
      .sendDirectMessage(this.authorId!, content)
      .then((response) => {
        response.delete(reason, timeout * 1000).catch(console.error);
      });
  }

  /** Send a inline reply to this message but then delete it after a bit. By default it will delete after 10 seconds with no reason provided.  */
  async alertReply(
    content: string | CreateMessage,
    timeout = 10,
    reason?: string
  ) {
    return await this.reply(content).then((response) =>
      response.delete(reason, timeout * 1000).catch(console.error)
    );
  }

  /** Removes all reactions for all emojis on this message */
  async removeAllReactions() {
    return await this.client.removeAllReactions(this.channelId, this.id);
  }

  /** Removes all reactions for a single emoji on this message */
  async removeReactionEmoji(reaction: string) {
    return await this.client.removeReactionEmoji(
      this.channelId,
      this.id,
      reaction
    );
  }

  /** Removes a reaction from the given user on this message, defaults to bot */
  async removeReaction(reaction: string, userId?: bigint) {
    return await this.client.removeReaction(
      this.channelId,
      this.id,
      reaction,
      userId
    );
  }

  toJSON() {
    const mentions: (User & { member?: Partial<GuildMember> })[] = [];
    for (const member of this.mentionedMembers.values()) {
      for (const m of member.toJSON()) {
        const { user, ...rest } = m;
        mentions.push({ ...rest, ...user });
      }
    }

    const mentionChannels: ChannelMention[] = [];
    for (const channel of this.mentionedChannels.values()) {
      if (!channel.guildId) continue;

      mentionChannels.push({
        id: channel.id.toString(),
        guildId: channel.guildId.toString(),
        type: channel.type,
        name: channel.name!,
      });
    }

    return {
      id: this.id?.toString(),
      channelId: this.channelId?.toString(),
      guildId: this.guildId?.toString(),
      author: {
        id: this.authorId?.toString(),
        username: this.tag?.substring(0, this.tag.length - 5),
        discriminator: this.tag?.substring(this.tag.length - 4),
        avatar: this.member?.avatar
          ? iconBigintToHash(this.member.avatar)
          : undefined,
        bot: this.member?.bot,
        system: this.member?.system,
        mfaEnabled: this.member?.mfaEnabled,
        locale: this.member?.locale,
        verified: this.member?.verified,
        email: this.member?.email,
        flags: this.member?.flags,
        premiumType: this.member?.premiumType,
        publicFlags: this.member?.publicFlags,
      },
      member: this.member,
      content: this.content,
      timestamp: this.timestamp
        ? new Date(this.timestamp).toISOString()
        : undefined,
      editedTimestamp: this.editedTimestamp
        ? new Date(this.editedTimestamp).toISOString()
        : undefined,
      tts: this.tts,
      mentionEveryone: this.mentionEveryone,
      mentions,
      mentionRoles: this.mentionedRoleIds.map((id) => id.toString()),
      mentionChannels,
      attachments: this.attachments,
      embeds: this.embeds,
      reactions: this.reactions,
      nonce: this.nonce,
      pinned: this.pinned,
      webhookId: this.webhookId,
      type: this.type,
      activity: this.activity,
      application: this.application,
      applicationId: this.applicationId,
      messageReference: this.messageReference,
      flags: this.flags,
      stickers: this.stickers,
      referencedMessage: this.referencedMessage,
      interaction: this.interaction,
      thread: this.thread,
      components: this.components,
    } as Message;
  }
}

export default UniversityMessage;
