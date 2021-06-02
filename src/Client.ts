import {
  BotConfig,
  Collection,
  DiscordGatewayIntents,
  EventEmitter,
  GetGatewayBot,
  getGatewayBot,
} from "../deps.ts";
import CacheManager from "./utils/CacheManager.ts";
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

  constructor(config: Omit<BotConfig, "eventHandlers">) {
    super();

    this.token = `Bot ${config.token}`;

    // SET SOME DEFAULT VALUES
    this.secretKey = "";
    this.botId = 0n;
    this.applicationId = 0n;
    this.maxShards = 0;
    this.lastShardId = 0;
    this.gatewayVersion = 9;
    this.isReady = false;
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
    this.gateway.intents = config.intents.reduce(
      (bits, next) =>
        (bits |= typeof next === "string" ? DiscordGatewayIntents[next] : next),
      0
    );
    this.gateway.compress = config.compress || false;
  }

  /** Begin the bot startup process. Connects to the discord gateway. */
  async connect() {
    // INITIAL API CONNECTION TO GET INFO ABOUT BOTS CONNECTION
    this.gateway.botGatewayData = await getGatewayBot();
    this.gateway.botGatewayData.url += `?v=${this.gateway.version}&encoding=json`
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
          res[key] = this.loopObject(value as Record<string, unknown>, handler, log);
        } else {
          res[key] = handler(value, key);
        }
      }
    }

    return res as T;
  }
}

export default Client;
