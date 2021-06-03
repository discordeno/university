import {
  BotConfig,
  Collection,
  DiscordBitwisePermissionFlags,
  DiscordGatewayIntents,
Emoji,
  Errors,
  EventEmitter,
  getGatewayBot,
  Overwrite,
  PermissionStrings,
PresenceUpdate,
} from "../deps.ts";
import DiscordenoChannel from "./Structures/DiscordenoChannel.ts";
import DiscordenoGuild from "./Structures/DiscordenoGuild.ts";
import DiscordenoMember from "./Structures/DiscordenoMember.ts";
import DiscordenoMessage from "./Structures/DiscordenoMessage.ts";
import DiscordenoRole from "./Structures/DiscordenoRole.ts";
import CacheManager from "./utils/CacheManager.ts";
import HelperManager from "./utils/Helpers/HelperManager.ts";
import RestManager from "./utils/RestManager.ts";
import { GatewayManager } from "./ws/GatewayManager.ts";

export class Client extends EventEmitter {
  /** The secret key is used to filter requests if you are using advanced options like proxies for ws/rest. */
  secretKey: string;
  /** The bot's id */
  botId: bigint;
  /** Most like the bot's id but for old bots this can be different. Necessary for slash bots and such.*/
  applicationId: bigint;
  /** If you want to override the ws url, for example to use a proxy ws service. */
  proxyWSURL = "";
  /** The bot's token */
  token: string;

  // CACHE VALUES

  /** All of the guild objects the bot has access to, mapped by their Ids */
  guilds: Collection<bigint, DiscordenoGuild>;
  /** All of the channel objects the bot has access to, mapped by their Ids */
  channels: Collection<bigint, DiscordenoChannel>;
  /** All of the message objects the bot has cached since the bot acquired `READY` state, mapped by their Ids */
  messages: Collection<bigint, DiscordenoMessage>;
  /** All of the member objects that have been cached since the bot acquired `READY` state, mapped by their Ids */
  members: Collection<bigint, DiscordenoMember>;
  /** All of the unavailable guilds, mapped by their Ids (id, timestamp) */
  unavailableGuilds: Collection<bigint, number>;
  /** All of the presence update objects received in PRESENCE_UPDATE gateway event, mapped by their user Id */
  presences: Collection<bigint, PresenceUpdate>;
  /** The fetch member requests through the gateway are cached here until they are completed. */
  fetchAllMembersProcessingRequests: Collection<
    string,
    (
      value:
        | Collection<bigint, DiscordenoMember>
        | PromiseLike<Collection<bigint, DiscordenoMember>>
    ) => void
  >;
  /** The slash commands that were executed atleast once are cached here so they can be responded to using followups next time. */
  executedSlashCommands: Set<string>;
  /** Stores a list of guild ids that are active for the guild sweeper. */
  activeGuildIds: Set<bigint>;
  /** Stores a list of.guild ids that have been removed by the guild sweeper and are waiting for dispatch. */
  dispatchedGuildIds: Set<bigint>;
  /** Stores a list of channel ids that have been removed by the guild sweeper and are waiting for dispatch. */
  dispatchedChannelIds: Set<bigint>;
  /** The manager for editing the cached structures. */
  cache: CacheManager;
  /** The manager for the gateway/sharding. */
  gateway: GatewayManager;
  /** The rest manager for the api. */
  rest: RestManager;
  /** All the helper methods */
  helpers: HelperManager;

  constructor(config: Omit<BotConfig, "eventHandlers">) {
    super();

    this.token = `Bot ${config.token}`;

    // SET SOME DEFAULT VALUES
    this.secretKey = "";
    this.botId = 0n;
    this.applicationId = 0n;
    this.guilds = new Collection([], {
      sweeper: { filter: this.guildSweeper, interval: 3600000 },
    });
    this.channels = new Collection();
    this.messages = new Collection([], {
      sweeper: { filter: this.messageSweeper, interval: 300000 },
    });
    this.members = new Collection([], {
      sweeper: { filter: this.memberSweeper, interval: 300000 },
    });
    this.unavailableGuilds = new Collection();
    this.presences = new Collection([], {
      sweeper: { filter: () => true, interval: 300000 },
    });
    this.fetchAllMembersProcessingRequests = new Collection();
    this.executedSlashCommands = new Set();
    this.activeGuildIds = new Set();
    this.dispatchedGuildIds = new Set();
    this.dispatchedChannelIds = new Set();
    this.cache = new CacheManager(this);
    this.gateway = new GatewayManager(this);
    this.rest = new RestManager(this);
    this.gateway.intents = config.intents.reduce(
      (bits, next) =>
        (bits |= typeof next === "string" ? DiscordGatewayIntents[next] : next),
      0
    );
    this.gateway.compress = config.compress || false;
    this.helpers = new HelperManager(this);
  }

  /** Begin the bot startup process. Connects to the discord gateway. */
  async connect() {
    // INITIAL API CONNECTION TO GET INFO ABOUT BOTS CONNECTION
    this.gateway.botGatewayData = await getGatewayBot();
    this.gateway.botGatewayData.url += `?v=${this.gateway.version}&encoding=json`;
    // IF DEFAULTS WERE NOT MODIFED, SET TO RECOMMENDED DISCORD DEFAULTS
    if (!this.gateway.maxShards)
      this.gateway.maxShards = this.gateway.botGatewayData.shards;
    if (!this.gateway.lastShardId)
      this.gateway.lastShardId = this.gateway.botGatewayData.shards - 1;

    this.gateway.spawnShards();
  }

  /** The WSS URL that can be used for connecting to the gateway. */
  get wsUrl() {
    return (
      this.proxyWSURL ||
      `wss://gateway.discord.gg/?v=${this.gateway.version}&encoding=json`
    );
  }

  get emojis() {
    return new Collection<bigint, Emoji>(
      this.guilds.reduce(
        (a, b) => [...a, ...b.emojis.map((e) => [e.id, e])],
        // deno-lint-ignore no-explicit-any
        [] as any[]
      )
    );
  }

  // METHODS

  messageSweeper(message: DiscordenoMessage) {
    // DM MESSAGES AREN'T NEEDED
    if (!message.guildId) return true;

    // ONLY DELETE MESSAGES OLDER THAN 10 MINUTES
    return Date.now() - message.timestamp > 600000;
  }

  memberSweeper(member: DiscordenoMember) {
    // DON'T SWEEP THE BOT ELSE STRANGE THINGS WILL HAPPEN
    if (member.id === this.botId) return false;

    // ONLY SWEEP MEMBERS WHO WERE NOT ACTIVE THE LAST 30 MINUTES
    return member.cachedAt - Date.now() < 1800000;
  }

  guildSweeper(guild: DiscordenoGuild) {
    // RESET ACTIVITY FOR NEXT INTERVAL
    if (!this.activeGuildIds.delete(guild.id)) return false;

    guild.channels.forEach((channel) => {
      this.channels.delete(channel.id);
      this.dispatchedChannelIds.add(channel.id);
    });

    // THIS IS INACTIVE GUILD. NOT A SIGNLE THING HAS HAPPENED FOR ATLEAST 30 MINUTES.
    // NOT A REACTION, NOT A MESSAGE, NOT ANY EVENT!
    this.dispatchedGuildIds.add(guild.id);

    return true;
  }

  // UTILS
  loopObject<T = Record<string, unknown>>(
    obj: Record<string, unknown>,
    handler: (value: unknown, key: string) => unknown,
    log: string
  ) {
    let res: Record<string, unknown> | unknown[] = {};

    if (Array.isArray(obj)) {
      res = [];

      for (const o of obj) {
        if (typeof o === "object" && !Array.isArray(o) && o !== null) {
          // A nested object
          res.push(this.loopObject(o as Record<string, unknown>, handler, log));
        } else {
          res.push(handler(o, "array"));
        }
      }
    } else {
      for (const [key, value] of Object.entries(obj)) {
        this.emit("DEBUG", "LOOPING", log);

        if (
          typeof value === "object" &&
          !Array.isArray(value) &&
          value !== null &&
          !(value instanceof Blob)
        ) {
          // A nested object
          res[key] = this.loopObject(
            value as Record<string, unknown>,
            handler,
            log
          );
        } else {
          res[key] = handler(value, key);
        }
      }
    }

    return res as T;
  }

  async getCached(
    table: "guilds",
    key: bigint | DiscordenoGuild
  ): Promise<DiscordenoGuild | undefined>;
  async getCached(
    table: "channels",
    key: bigint | DiscordenoChannel
  ): Promise<DiscordenoChannel | undefined>;
  async getCached(
    table: "members",
    key: bigint | DiscordenoMember
  ): Promise<DiscordenoMember | undefined>;
  async getCached(
    table: "guilds" | "channels" | "members",
    key: bigint | DiscordenoGuild | DiscordenoChannel | DiscordenoMember
  ) {
    const cached =
      typeof key === "bigint"
        ? // @ts-ignore TS is wrong here
          await cacheHandlers.get(table, key)
        : key;

    return typeof cached === "bigint" ? undefined : cached;
  }

  /** Calculates the permissions this member has in the given guild */
  async calculateBasePermissions(
    guildOrId: bigint | DiscordenoGuild,
    memberOrId: bigint | DiscordenoMember
  ) {
    const guild = await this.getCached("guilds", guildOrId);
    const member = await this.getCached("members", memberOrId);

    if (!guild || !member) return 8n;

    let permissions = 0n;
    // Calculate the role permissions bits, @everyone role is not in memberRoleIds so we need to pass guildId manualy
    permissions |=
      [...(member.guilds.get(guild.id)?.roles || []), guild.id]
        .map((id) => guild.roles.get(id)?.permissions)
        // Removes any edge case undefined
        .filter((perm) => perm)
        .reduce((bits, perms) => {
          bits! |= perms?.bits!;
          return bits;
        }, 0n) || 0n;

    // If the memberId is equal to the guild ownerId he automatically has every permission so we add ADMINISTRATOR permission
    if (guild.ownerId === member.id) permissions |= 8n;
    // Return the members permission bits as a string
    return permissions;
  }

  /** Calculates the permissions this member has for the given Channel */
  async calculateChannelOverwrites(
    channelOrId: bigint | DiscordenoChannel,
    memberOrId: bigint | DiscordenoMember
  ) {
    const channel = await this.getCached("channels", channelOrId);

    // This is a DM channel so return ADMINISTRATOR permission
    if (!channel?.guildId) return 8n;

    const member = await this.getCached("members", memberOrId);

    if (!channel || !member) return 8n;

    // Get all the role permissions this member already has
    let permissions = await this.calculateBasePermissions(
      channel.guildId,
      member
    );

    // First calculate @everyone overwrites since these have the lowest priority
    const overwriteEveryone = channel.permissionOverwrites?.find(
      (overwrite) => overwrite.id === channel.guildId
    );
    if (overwriteEveryone) {
      // First remove denied permissions since denied < allowed
      permissions &= ~overwriteEveryone.deny;
      permissions |= overwriteEveryone.allow;
    }

    const overwrites = channel.permissionOverwrites;

    // In order to calculate the role permissions correctly we need to temporarily save the allowed and denied permissions
    let allow = 0n;
    let deny = 0n;
    const memberRoles = member.guilds.get(channel.guildId)?.roles || [];
    // Second calculate members role overwrites since these have middle priority
    for (const overwrite of overwrites || []) {
      if (!memberRoles.includes(overwrite.id)) continue;

      deny |= overwrite.deny;
      allow |= overwrite.allow;
    }
    // After role overwrite calculate save allowed permissions first we remove denied permissions since "denied < allowed"
    permissions &= ~deny;
    permissions |= allow;

    // Third calculate member specific overwrites since these have the highest priority
    const overwriteMember = overwrites?.find(
      (overwrite) => overwrite.id === member.id
    );
    if (overwriteMember) {
      permissions &= ~overwriteMember.deny;
      permissions |= overwriteMember.allow;
    }

    return permissions;
  }

  /** Checks if the given permission bits are matching the given permissions. `ADMINISTRATOR` always returns `true` */
  validatePermissions(
    permissionBits: bigint,
    permissions: PermissionStrings[]
  ) {
    if (permissionBits & 8n) return true;

    return permissions.every(
      (permission) =>
        // Check if permission is in permissionBits
        permissionBits & BigInt(DiscordBitwisePermissionFlags[permission])
    );
  }

  /** Checks if the given member has these permissions in the given guild */
  async hasGuildPermissions(
    guild: bigint | DiscordenoGuild,
    member: bigint | DiscordenoMember,
    permissions: PermissionStrings[]
  ) {
    // First we need the role permission bits this member has
    const basePermissions = await this.calculateBasePermissions(guild, member);
    // Second use the validatePermissions function to check if the member has every permission
    return this.validatePermissions(basePermissions, permissions);
  }

  /** Checks if the bot has these permissions in the given guild */
  botHasGuildPermissions(
    guild: bigint | DiscordenoGuild,
    permissions: PermissionStrings[]
  ) {
    // Since Bot is a normal member we can use the hasRolePermissions() function
    return this.hasGuildPermissions(guild, this.botId, permissions);
  }

  /** Checks if the given member has these permissions for the given channel */
  async hasChannelPermissions(
    channel: bigint | DiscordenoChannel,
    member: bigint | DiscordenoMember,
    permissions: PermissionStrings[]
  ) {
    // First we need the overwrite bits this member has
    const channelOverwrites = await this.calculateChannelOverwrites(
      channel,
      member
    );
    // Second use the validatePermissions function to check if the member has every permission
    return this.validatePermissions(channelOverwrites, permissions);
  }

  /** Checks if the bot has these permissions f0r the given channel */
  botHasChannelPermissions(
    channel: bigint | DiscordenoChannel,
    permissions: PermissionStrings[]
  ) {
    // Since Bot is a normal member we can use the hasRolePermissions() function
    return this.hasChannelPermissions(channel, this.botId, permissions);
  }

  /** Returns the permissions that are not in the given permissionBits */
  missingPermissions(permissionBits: bigint, permissions: PermissionStrings[]) {
    if (permissionBits & 8n) return [];

    return permissions.filter(
      (permission) =>
        !(permissionBits & BigInt(DiscordBitwisePermissionFlags[permission]))
    );
  }

  /** Get the missing Guild permissions this member has */
  async getMissingGuildPermissions(
    guild: bigint | DiscordenoGuild,
    member: bigint | DiscordenoMember,
    permissions: PermissionStrings[]
  ) {
    // First we need the role permission bits this member has
    const permissionBits = await this.calculateBasePermissions(guild, member);
    // Second return the members missing permissions
    return this.missingPermissions(permissionBits, permissions);
  }

  /** Get the missing Channel permissions this member has */
  async getMissingChannelPermissions(
    channel: bigint | DiscordenoChannel,
    member: bigint | DiscordenoMember,
    permissions: PermissionStrings[]
  ) {
    // First we need the role permissino bits this member has
    const permissionBits = await this.calculateChannelOverwrites(
      channel,
      member
    );
    // Second returnn the members missing permissions
    return this.missingPermissions(permissionBits, permissions);
  }

  /** Throws an error if this member has not all of the given permissions */
  async requireGuildPermissions(
    guild: bigint | DiscordenoGuild,
    member: bigint | DiscordenoMember,
    permissions: PermissionStrings[]
  ) {
    const missing = await this.getMissingGuildPermissions(
      guild,
      member,
      permissions
    );
    if (missing.length) {
      // If the member is missing a permission throw an Error
      throw new Error(`Missing Permissions: ${missing.join(" & ")}`);
    }
  }

  /** Throws an error if the bot does not have all permissions */
  requireBotGuildPermissions(
    guild: bigint | DiscordenoGuild,
    permissions: PermissionStrings[]
  ) {
    // Since Bot is a normal member we can use the throwOnMissingGuildPermission() function
    return this.requireGuildPermissions(guild, this.botId, permissions);
  }

  /** Throws an error if this member has not all of the given permissions */
  async requireChannelPermissions(
    channel: bigint | DiscordenoChannel,
    member: bigint | DiscordenoMember,
    permissions: PermissionStrings[]
  ) {
    const missing = await this.getMissingChannelPermissions(
      channel,
      member,
      permissions
    );
    if (missing.length) {
      // If the member is missing a permission throw an Error
      throw new Error(`Missing Permissions: ${missing.join(" & ")}`);
    }
  }

  /** Throws an error if the bot has not all of the given channel permissions */
  requireBotChannelPermissions(
    channel: bigint | DiscordenoChannel,
    permissions: PermissionStrings[]
  ) {
    // Since Bot is a normal member we can use the throwOnMissingChannelPermission() function
    return this.requireChannelPermissions(channel, this.botId, permissions);
  }

  /** This function converts a bitwise string to permission strings */
  calculatePermissions(permissionBits: bigint) {
    return Object.keys(DiscordBitwisePermissionFlags).filter((permission) => {
      // Since Object.keys() not only returns the permission names but also the bit values we need to return false if it is a Number
      if (Number(permission)) return false;
      // Check if permissionBits has this permission
      return (
        permissionBits &
        BigInt(DiscordBitwisePermissionFlags[permission as PermissionStrings])
      );
    }) as PermissionStrings[];
  }

  /** This function converts an array of permissions into the bitwise string. */
  calculateBits(permissions: PermissionStrings[]) {
    return permissions
      .reduce((bits, perm) => {
        bits |= BigInt(DiscordBitwisePermissionFlags[perm]);
        return bits;
      }, 0n)
      .toString();
  }

  /** Internal function to check if the bot has the permissions to set these overwrites */
  async requireOverwritePermissions(
    guildOrId: bigint | DiscordenoGuild,
    overwrites: Overwrite[]
  ) {
    let requiredPerms: Set<PermissionStrings> = new Set(["MANAGE_CHANNELS"]);

    overwrites?.forEach((overwrite) => {
      overwrite.allow.forEach(requiredPerms.add, requiredPerms);
      overwrite.deny.forEach(requiredPerms.add, requiredPerms);
    });

    // MANAGE_ROLES permission can only be set by administrators
    if (requiredPerms.has("MANAGE_ROLES")) {
      requiredPerms = new Set<PermissionStrings>(["ADMINISTRATOR"]);
    }

    await this.requireGuildPermissions(guildOrId, this.botId, [
      ...requiredPerms,
    ]);
  }

  /** Gets the highest role from the member in this guild */
  async highestRole(
    guildOrId: bigint | DiscordenoGuild,
    memberOrId: bigint | DiscordenoMember
  ) {
    const guild = await this.getCached("guilds", guildOrId);

    if (!guild) throw new Error(Errors.GUILD_NOT_FOUND);

    // Get the roles from the member
    const memberRoles = (
      await this.getCached("members", memberOrId)
    )?.guilds.get(guild.id)?.roles;
    // This member has no roles so the highest one is the @everyone role
    if (!memberRoles) return guild.roles.get(guild.id)!;

    let memberHighestRole: DiscordenoRole | undefined;

    for (const roleId of memberRoles) {
      const role = guild.roles.get(roleId);
      // Rare edge case handling if undefined
      if (!role) continue;

      // If memberHighestRole is still undefined we want to assign the role,
      // else we want to check if the current role position is higher than the current memberHighestRole
      if (
        !memberHighestRole ||
        memberHighestRole.position < role.position ||
        memberHighestRole.position === role.position
      ) {
        memberHighestRole = role;
      }
    }

    // The member has at least one role so memberHighestRole must exist
    return memberHighestRole!;
  }

  /** Checks if the first role is higher than the second role */
  async higherRolePosition(
    guildOrId: bigint | DiscordenoGuild,
    roleId: bigint,
    otherRoleId: bigint
  ) {
    const guild = await this.getCached("guilds", guildOrId);

    if (!guild) return true;

    const role = guild.roles.get(roleId);
    const otherRole = guild.roles.get(otherRoleId);
    if (!role || !otherRole) throw new Error(Errors.ROLE_NOT_FOUND);

    // Rare edge case handling
    if (role.position === otherRole.position) {
      return role.id < otherRole.id;
    }

    return role.position > otherRole.position;
  }

  /** Checks if the member has a higher position than the given role */
  async isHigherPosition(
    guildOrId: bigint | DiscordenoGuild,
    memberId: bigint,
    compareRoleId: bigint
  ) {
    const guild = await this.getCached("guilds", guildOrId);

    if (!guild || guild.ownerId === memberId) return true;

    const memberHighestRole = await this.highestRole(guild, memberId);
    return this.higherRolePosition(
      guild.id,
      memberHighestRole.id,
      compareRoleId
    );
  }
}

export default Client;
