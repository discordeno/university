import {
  BotConfig,
  Collection,
  DiscordGatewayIntents,
  EventEmitter,
  getGatewayBot,
} from "../deps.ts";

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
  /** The gateway intents used for connecting. */
  intents: number;
  /** The maximum number of shards allowed during this connection. */
  maxShards: number;
  /** The last shard id that will be connected. */
  lastShardId: number;
  /** The gateway version number to be used. */
  gatewayVersion: number;
  /** Whether or not the ready event has been emitted once all shards came online. */
  isReady: boolean;

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
  fetchAllMembersProcessingRequests: Collection<
    string,
    (
      value:
        | Collection<bigint, DiscordenoMember>
        | PromiseLike<Collection<bigint, DiscordenoMember>>
    ) => void
  >;
  executedSlashCommands: Set<string>;
  activeGuildIds: Set<bigint>;
  dispatchedGuildIds: Set<bigint>;
  dispatchedChannelIds: Set<bigint>;

  constructor(config: Omit<BotConfig, "eventHandlers">) {
    super();

    // SET THE CONFIGS PROVIDED
    this.token = `Bot ${config.token}`;
    this.intents = config.intents.reduce(
      (bits, next) =>
        (bits |= typeof next === "string" ? DiscordGatewayIntents[next] : next),
      0
    );

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
  }

  /** Begin the bot startup process. Connects to the discord gateway. */
  async connect() {
    // INITIAL API CONNECTION TO GET INFO ABOUT BOTS CONNECTION
    const data = await getGatewayBot();
    // IF DEFAULTS WERE NOT MODIFED, SET TO RECOMMENDED DISCORD DEFAULTS
    if (!this.maxShards) this.maxShards = data.shards;
    if (!this.lastShardId) this.lastShardId = data.shards - 1;

    this.spawnShards();
  }

  /** The WSS URL that can be used for connecting to the gateway. */
  get wsUrl() {
    return (
      this.proxyWSURL ||
      `wss://gateway.discord.gg/?v=${this.gatewayVersion}&encoding=json`
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
}

export default Client;
