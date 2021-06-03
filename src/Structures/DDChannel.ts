import {
  DiscordChannelTypes,
  DiscordOverwrite,
  DiscordVideoQualityModes,
  ThreadMetadata,
  ThreadMember,
  Channel,
  snowflakeToBigint,
  Collection,
  CreateMessage,
  Overwrite,
  PermissionStrings,
  ModifyChannel,
} from "../../deps.ts";
import Client from "../Client.ts";
import Base from "./Base.ts";

export class DDChannel extends Base {
  /** The type of channel */
  type!: DiscordChannelTypes;
  /** Sorting position of the channel */
  position?: number;
  /** Explicit permission overwrites for members and roles */
  permissionOverwrites!: (Omit<DiscordOverwrite, "id" | "allow" | "deny"> & {
    id: bigint;
    allow: bigint;
    deny: bigint;
  })[];
  /** The name of the channel (2-100 characters) */
  name?: string;
  /** The channel topic (0-1024 characters) */
  topic?: string | null;
  /** Whether the channel is nsfw */
  nsfw?: boolean;
  /** The id of the guild */
  guildId: bigint;
  /** The id of the last message sent in this channel (may not point to an existing or valid message) */
  lastMessageId?: bigint;
  /** id of the DM creator */
  ownerId?: bigint;
  /** Application id of the group DM creator if it is bot-created */
  applicationId?: bigint;
  /** Id of the parent category for a channel (each parent category can contain up to 50 channels) */
  parentId?: bigint;
  /** The bitrate (in bits) of the voice channel */
  bitrate?: number;
  /** The user limit of the voice channel */
  userLimit?: number;
  /** Amount of seconds a user has to wait before sending another message (0-21600); bots, as well as users with the permission `manage_messages` or `manage_channel`, are unaffected */
  rateLimitPerUser?: number;
  /** Icon hash */
  icon?: string | null;
  /** When the last pinned message was pinned. This may be null in events such as GUILD_CREATE when a message is not pinned. */
  lastPinTimestamp?: string | null;
  /** Voice region id for the voice channel, automatic when set to null */
  rtcRegion?: string | null;
  /** The camera video quality mode of the voice channel, 1 when not present */
  videoQualityMode?: DiscordVideoQualityModes;
  // TODO(threads): consider a ThreadChannel object
  /** An approximate count of messages in a thread, stops counting at 50 */
  messageCount?: number;
  /** An approximate count of users in a thread, stops counting at 50 */
  memberCount?: number;
  /** Thread-specifig fields not needed by other channels */
  threadMetadata?: ThreadMetadata;
  /** Thread member object for the current user, if they have joined the thread, only included on certain API endpoints */
  member?: ThreadMember;

  constructor(client: Client, payload: Channel, guildId = "") {
    super(client, payload.id);

    this.guildId = snowflakeToBigint(guildId || payload.guildId || "");
    this.ownerId = payload.ownerId
      ? snowflakeToBigint(payload.ownerId)
      : undefined;
    this.applicationId = payload.applicationId
      ? snowflakeToBigint(payload.applicationId)
      : undefined;

    this.update(payload);
  }

  update(payload: Channel) {
    this.lastMessageId = payload.lastMessageId
      ? snowflakeToBigint(payload.lastMessageId)
      : undefined;
    this.parentId = payload.parentId
      ? snowflakeToBigint(payload.parentId)
      : undefined;

    this.permissionOverwrites = (payload.permissionOverwrites || []).map(
      (o) => ({
        ...o,
        id: snowflakeToBigint(o.id),
        allow: snowflakeToBigint(o.allow),
        deny: snowflakeToBigint(o.deny),
      })
    );

    this.type = payload.type;
    this.position = payload.position;
    this.name = payload.name;
    this.topic = payload.topic;
    this.nsfw = payload.nsfw;
    this.bitrate = payload.bitrate;
    this.userLimit = payload.userLimit;
    this.rateLimitPerUser = payload.rateLimitPerUser;
    this.icon = payload.icon;
    this.lastPinTimestamp = payload.lastPinTimestamp;
    this.rtcRegion = payload.rtcRegion;
    this.videoQualityMode = payload.videoQualityMode;
    this.messageCount = payload.messageCount;
    this.memberCount = payload.memberCount;
    this.threadMetadata = payload.threadMetadata;
    this.member = payload.member;
  }

  /** Gets the guild object for this channel */
  get guild() {
    return this.client.guilds.get(this.guildId!);
  }

  /** Gets the messages from cache that were sent in this channel */
  get messages() {
    return this.client.messages.filter((m) => m.channelId === this.id);
  }

  /** The mention of the channel */
  get mention() {
    return `<#${this.id}>`;
  }

  /** Gets the voice states for this channel */
  get voiceStates() {
    return this.guild?.voiceStates.filter(
      (voiceState) => voiceState.channelId === this.id
    );
  }

  /** Gets the connected members for this channel undefined if member is not cached */
  get connectedMembers() {
    const voiceStates = this.voiceStates;
    if (!voiceStates) return undefined;

    return new Collection(
      voiceStates.map((vs) => [
        vs.memberId,
        this.client.members.get(vs.memberId),
      ])
    );
  }

  /** Send a message to the channel. Requires SEND_MESSAGES permission. */
  async send(content: string | CreateMessage) {
    return await this.client.sendMessage(this.id, content);
  }

  /** Disconnect a member from a voice channel. Requires MOVE_MEMBERS permission. */
  async disconnect(memberId: bigint) {
    return await this.client.disconnectMember(this.guildId!, memberId);
  }

  /** Delete the channel */
  async delete(reason?: string) {
    return await this.client.deleteChannel(this.id, reason);
  }

  /** Edit a channel Overwrite */
  async editOverwrite(overwriteId: bigint, options: Omit<Overwrite, "id">) {
    return await this.client.editChannelOverwrite(
      this.guildId!,
      this.id,
      overwriteId,
      options
    );
  }

  /** Delete a channel Overwrite */
  async deleteOverwrite(id: bigint) {
    return await this.client.deleteChannelOverwrite(this.guildId!, this.id, id);
  }

  /** Checks if a channel overwrite for a user id or a role id has permission in this channel */
  hasPermission(
    overwrites: (Omit<DiscordOverwrite, "id" | "allow" | "deny"> & {
      id: bigint;
      allow: bigint;
      deny: bigint;
    })[],
    permissions: PermissionStrings[]
  ) {
    return this.client.channelOverwriteHasPermission(
      this.guildId!,
      this.id,
      overwrites,
      permissions
    );
  }

  /** Edit the channel */
  async edit(options: ModifyChannel, reason?: string) {
    return await this.client.editChannel(this.id, options, reason);
  }

  /** Create a new channel with the same properties */
  async clone(reason?: string) {
    return await this.client.cloneChannel(this.id, reason);
  }

  toJSON() {
    return {
      id: this.id?.toString(),
      type: this.type,
      guildId: this.guildId?.toString(),
      position: this.position,
      permissionOverwrites: this.permissionOverwrites?.map((o) => ({
        ...o,
        id: o.id.toString(),
        allow: o.allow.toString(),
        deny: o.deny.toString(),
      })),
      name: this.name,
      topic: this.topic,
      nsfw: this.nsfw,
      lastMessageId: this.lastMessageId?.toString(),
      bitrate: this.bitrate,
      userLimit: this.userLimit,
      rateLimitPerUser: this.rateLimitPerUser,
      recipients: [],
      icon: this.icon,
      ownerId: this.ownerId,
      applicationId: this.applicationId,
      parentId: this.parentId,
      lastPinTimestamp: this.lastPinTimestamp
        ? new Date(this.lastPinTimestamp).toISOString()
        : undefined,
      rtcRegion: this.rtcRegion,
      videoQualityMode: this.videoQualityMode,
      messageCount: this.messageCount,
      memberCount: this.memberCount,
      threadMetadata: this.threadMetadata,
      member: this.member,
    } as Channel;
  }
}

export default DDChannel;
