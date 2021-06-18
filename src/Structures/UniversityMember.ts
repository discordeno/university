import {
  Collection,
  CreateGuildBan,
  CreateMessage,
  DiscordImageFormat,
  DiscordImageSize,
  DiscordPremiumTypes,
  DiscordUserFlags,
  GuildMember,
  GuildMemberWithUser,
  iconBigintToHash,
  iconHashToBigInt,
  ModifyGuildMember,
  snowflakeToBigint,
} from "../../deps.ts";
import Client from "../Client.ts";
import Base from "./Base.ts";
import MemberBitField from "./BitFields/Member.ts";

export class UniversityMember extends Base {
  /** The username of the member */
  username!: string;
  /** The user's 4-digit discord-tag */
  discriminator!: string;
  /** The users avatar hash */
  avatar: bigint;
  /** The guild related data mapped by guild id */
  guilds: Collection<
    bigint,
    Omit<GuildMember, "joinedAt" | "premiumSince" | "roles"> & {
      joinedAt?: number;
      premiumSince?: number;
      roles: bigint[];
    }
  >;
  /** Holds all the boolean toggles. */
  bitfield: MemberBitField;

  /** The user's chosen language option */
  locale?: string;
  /** The user's email */
  email?: string;
  /** The flags on a user's account */
  flags?: DiscordUserFlags;
  premiumType?: DiscordPremiumTypes;
  publicFlags?: DiscordUserFlags;
  cachedAt: number;

  constructor(client: Client, payload: GuildMemberWithUser, guildId: bigint) {
    super(client, payload.user.id);

    this.bitfield = new MemberBitField(0n);
    this.guilds = new Collection();
    this.avatar = 0n;
    this.cachedAt = Date.now();

    this.update(payload, guildId);
  }

  update(payload: GuildMemberWithUser, guildId: bigint) {
    this.username = payload.user.username;
    this.discriminator = payload.user.discriminator;
    if (payload.user.email) this.email = payload.user.email;
    this.locale = payload.user.locale;
    this.flags = payload.user.flags;
    this.premiumType = payload.user.premiumType;
    this.publicFlags = payload.user.publicFlags;

    const transformed = payload.user.avatar
      ? iconHashToBigInt(payload.user.avatar)
      : undefined;
    this.avatar = transformed?.bigint || 0n;

    this.bitfield.animatedAvatar = transformed?.animated || false;
    this.bitfield.bot = payload.user.bot || false;
    this.bitfield.mfaEnabled = payload.user.mfaEnabled || false;
    this.bitfield.system = payload.user.system || false;
    this.bitfield.verified = payload.user.verified || false;

    // Update guild related items
    this.guilds.set(guildId, {
      nick: payload.nick,
      roles: payload.roles.map((id) => snowflakeToBigint(id)),
      joinedAt: payload.joinedAt ? Date.parse(payload.joinedAt) : undefined,
      premiumSince: payload.premiumSince
        ? Date.parse(payload.premiumSince)
        : undefined,
      deaf: payload.deaf,
      mute: payload.mute,
    });
  }

  /** The avatar url using the default format and size. */
  get avatarURL() {
    return this.client.avatarURL(
      this.id,
      this.discriminator,
      this.avatar,
      this.animatedAvatar
    );
  }

  /** The mention string for this member */
  get mention() {
    return `<@!${this.id}>`;
  }

  /** The username#discriminator tag for this member */
  get tag() {
    return `${this.username!}#${this.discriminator!}`;
  }

  /** Whether the user belongs to an OAuth2 application */
  get bot() {
    return this.bitfield.bot;
  }

  /** Whether the user is an Official Discord System user (part of the urgent message system) */
  get system() {
    return this.bitfield.system;
  }

  /** Whether the user has two factor enabled on their account */
  get mfaEnabled() {
    return this.bitfield.mfaEnabled;
  }

  /** Whether the email on this account has been verified */
  get verified() {
    return this.bitfield.verified;
  }

  /** Whether the users avatar is animated. */
  get animatedAvatar() {
    return this.bitfield.animatedAvatar;
  }

  /** Returns the avatar url for this member and can be dynamically modified with a size or format */
  makeAvatarURL(options: {
    size?: DiscordImageSize;
    format?: DiscordImageFormat;
  }) {
    return this.client.avatarURL(
      this.id,
      this.discriminator,
      this.avatar!,
      this.animatedAvatar,
      options?.size,
      options?.format
    );
  }

  /** Returns the guild for this guildId */
  guild(guildId: bigint) {
    return this.client.guilds.get(guildId);
  }

  /** Get the nickname or the username if no nickname */
  name(guildId: bigint) {
    return this.guildMember(guildId)?.nick || this.username;
  }

  /** Get the guild member object for the specified guild */
  guildMember(guildId: bigint) {
    return this.guilds?.get(guildId);
  }

  /** Send a direct message to the user is possible */
  async sendDM(content: string | CreateMessage) {
    return await this.client.sendDirectMessage(this.id, content);
  }

  /** Kick the member from a guild */
  async kick(guildId: bigint, reason?: string) {
    return await this.client.kick(guildId, this.id, reason);
  }

  /** Edit the member in a guild */
  async edit(guildId: bigint, options: ModifyGuildMember) {
    return await this.client.editMember(guildId, this.id, options);
  }

  /** Ban a member in a guild */
  async ban(guildId: bigint, options: CreateGuildBan) {
    return await this.client.banMember(guildId, this.id, options);
  }

  /** Add a role to the member */
  async addRole(guildId: bigint, roleId: bigint, reason?: string) {
    return await this.client.addRole(guildId, this.id, roleId, reason);
  }

  /** Remove a role from the member */
  async removeRole(guildId: bigint, roleId: bigint, reason?: string) {
    return await this.client.removeRole(guildId, this.id, roleId, reason);
  }

  toJSON() {
    return (this.guilds?.map((g) => ({
      user: {
        id: this.id?.toString(),
        username: this.username,
        discriminator: this.discriminator?.toString(),
        avatar: this.avatar ? iconBigintToHash(this.avatar) : null,
        bot: this.bot,
        system: this.system,
        mfaEnabled: this.mfaEnabled,
        locale: this.locale,
        verified: this.verified,
        email: this.email,
        flags: this.flags,
        premiumType: this.premiumType,
        publicFlags: this.publicFlags,
      },
      nick: g.nick,
      roles: g.roles.map((id) => id.toString()),
      joinedAt: g.joinedAt ? new Date(g.joinedAt).toISOString() : undefined,
      premiumSince: g.premiumSince,
      deaf: g.deaf,
      mute: g.mute,
      pending: g.pending,
    })) || []) as (GuildMemberWithUser & { guildId: string })[];
  }
}

export default UniversityMember;
