import {
  AuditLog,
  Ban,
  Collection,
  CreateGuild,
  DiscordImageFormat,
  DiscordImageSize,
  endpoints,
  Errors,
  formatImageURL,
  GetGuildAuditLog,
  GetGuildPruneCountQuery,
  GetGuildWidgetImageQuery,
  Guild,
  GuildPreview,
  GuildWidget,
  GuildWidgetDetails,
  iconBigintToHash,
  InviteMetadata,
  ModifyGuild,
  ModifyGuildWelcomeScreen,
  snakelize,
  snowflakeToBigint,
  urlToBase64,
  VoiceRegion,
  WelcomeScreen,
} from "../../../deps.ts";
import Client from "../../Client.ts";
import UniversityGuild from "../../Structures/UniversityGuild.ts";

export class GuildHelpers {
  /** The client itself. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /** Create a new guild. Returns a guild object on success. Fires a Guild Create Gateway event. This endpoint can be used only by bots in less than 10 guilds. */
  async createGuild(options: CreateGuild) {
    const result = (await this.client.rest.post(
      endpoints.GUILDS,
      snakelize(options),
    )) as Guild;

    const guild = new UniversityGuild(this.client, result, 0);
    // MANUALLY CACHE THE GUILD
    await this.client.cache.set("guilds", guild.id, guild);
    // MANUALLY CACHE THE BOT
    await this.client.helpers.members.getMember(guild.id, this.client.botId);

    return guild;
  }

  /** Delete a guild permanently. User must be owner. Returns 204 No Content on success. Fires a Guild Delete Gateway event. */
  async deleteGuild(guildId: bigint) {
    return await this.client.rest.delete(endpoints.GUILDS_BASE(guildId));
  }

  /** Modify a guilds settings. Requires the MANAGE_GUILD permission. */
  async editGuild(guildId: bigint, options: ModifyGuild) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    if (options.icon && !options.icon.startsWith("data:image/")) {
      options.icon = await urlToBase64(options.icon);
    }

    if (options.banner && !options.banner.startsWith("data:image/")) {
      options.banner = await urlToBase64(options.banner);
    }

    if (options.splash && !options.splash.startsWith("data:image/")) {
      options.splash = await urlToBase64(options.splash);
    }

    const result = (await this.client.rest.patch(
      endpoints.GUILDS_BASE(guildId),
      snakelize(options),
    )) as Guild;

    const cached = await this.client.cache.get("guilds", guildId);
    return new UniversityGuild(
      this.client,
      result,
      cached?.shardId ||
        Number(
          (
            BigInt(result.id) >>
            22n % BigInt(this.client.gateway.botGatewayData.shards)
          ).toString(),
        ),
    );
  }

  async editWelcomeScreen(guildId: bigint, options: ModifyGuildWelcomeScreen) {
    return (await this.client.rest.patch(
      endpoints.GUILD_WELCOME_SCREEN(guildId),
      snakelize(options),
    )) as WelcomeScreen;
  }

  /** Modify a guild widget object for the guild. Requires the MANAGE_GUILD permission. */
  async editWidget(
    guildId: bigint,
    enabled: boolean,
    channelId?: string | null,
  ) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    return (await this.client.rest.patch(endpoints.GUILD_WIDGET(guildId), {
      enabled,
      channel_id: channelId,
    })) as GuildWidget;
  }

  /** Returns the audit logs for the guild. Requires VIEW AUDIT LOGS permission */
  async getAuditLogs(guildId: bigint, options?: GetGuildAuditLog) {
    await this.client.requireBotGuildPermissions(guildId, ["VIEW_AUDIT_LOG"]);

    return (await this.client.rest.get(
      endpoints.GUILD_AUDIT_LOGS(guildId),
      snakelize({
        ...options,
        limit: options?.limit && options.limit >= 1 && options.limit <= 100
          ? options.limit
          : 50,
      }),
    )) as AuditLog;
  }

  /** Returns an array of voice regions that can be used when creating servers. */
  async getAvailableVoiceRegions() {
    return (await this.client.rest.get(endpoints.VOICE_REGIONS)) as VoiceRegion;
  }

  /** Returns a ban object for the given user or a 404 not found if the ban cannot be found. Requires the BAN_MEMBERS permission. */
  async getBan(guildId: bigint, memberId: bigint) {
    await this.client.requireBotGuildPermissions(guildId, ["BAN_MEMBERS"]);

    return (await this.client.rest.get(
      endpoints.GUILD_BAN(guildId, memberId),
    )) as Ban;
  }

  /** Returns a list of ban objects for the users banned from this guild. Requires the BAN_MEMBERS permission. */
  async getBans(guildId: bigint) {
    await this.client.requireBotGuildPermissions(guildId, ["BAN_MEMBERS"]);

    const results = (await this.client.rest.get(
      endpoints.GUILD_BANS(guildId),
    )) as Ban[];

    return new Collection<bigint, Ban>(
      results.map((res) => [snowflakeToBigint(res.user.id), res]),
    );
  }

  /**
   * ⚠️ **If you need this, you are probably doing something wrong. Always use cache.guilds.get()
   *
   * Advanced Devs:
   * This function fetches a guild's data. This is not the same data as a GUILD_CREATE.
   * So it does not cache the guild, you must do it manually.
   * */
  async getGuild(
    guildId: bigint,
    options: { counts?: boolean; addToCache?: boolean } = {
      counts: true,
      addToCache: true,
    },
  ) {
    const result = (await this.client.rest.get(endpoints.GUILDS_BASE(guildId), {
      with_counts: options.counts,
    })) as Guild;

    const guild = new UniversityGuild(
      this.client,
      result,
      Number(
        (BigInt(guildId) >> 22n) %
          BigInt(this.client.gateway.botGatewayData.shards),
      ),
    );

    if (options.addToCache) {
      await this.client.cache.set("guilds", guild.id, guild);
    }

    return guild;
  }

  /** Returns the guild preview object for the given id. If the bot is not in the guild, then the guild must be Discoverable. */
  async getGuildPreview(guildId: bigint) {
    return (await this.client.rest.get(
      endpoints.GUILD_PREVIEW(guildId),
    )) as GuildPreview;
  }

  /** Check how many members would be removed from the server in a prune operation. Requires the KICK_MEMBERS permission */
  async getPruneCount(guildId: bigint, options?: GetGuildPruneCountQuery) {
    if (options?.days && options.days < 1) {
      throw new Error(Errors.PRUNE_MIN_DAYS);
    }
    if (options?.days && options.days > 30) {
      throw new Error(Errors.PRUNE_MAX_DAYS);
    }

    await this.client.requireBotGuildPermissions(guildId, ["KICK_MEMBERS"]);

    const result = await this.client.rest.get(
      endpoints.GUILD_PRUNE(guildId),
      snakelize(options ?? {}),
    );

    return result.pruned as number;
  }

  /** Returns the code and uses of the vanity url for this server if it is enabled else `code` will be null. Requires the `MANAGE_GUILD` permission. */
  async getVanityURL(guildId: bigint) {
    return (await this.client.rest.get(endpoints.GUILD_VANITY_URL(guildId))) as
      | (Partial<InviteMetadata> & Pick<InviteMetadata, "uses" | "code">)
      | {
        code: null;
      };
  }

  /** Returns a list of voice region objects for the guild. Unlike the similar /voice route, this returns VIP servers when the guild is VIP-enabled. */
  async getVoiceRegions(guildId: bigint) {
    const result = (await this.client.rest.get(
      endpoints.GUILD_REGIONS(guildId),
    )) as VoiceRegion[];

    return new Collection<string, VoiceRegion>(
      result.map((region) => [region.id, region]),
    );
  }

  async getWelcomeScreen(guildId: bigint) {
    return (await this.client.rest.get(
      endpoints.GUILD_WELCOME_SCREEN(guildId),
    )) as WelcomeScreen;
  }

  /** Returns the widget for the guild. */
  async getWidget(guildId: bigint, options?: { force: boolean }) {
    if (!options?.force) {
      const guild = await this.client.cache.get("guilds", guildId);
      if (!guild) throw new Error(Errors.GUILD_NOT_FOUND);
      if (!guild?.widgetEnabled) {
        throw new Error(Errors.GUILD_WIDGET_NOT_ENABLED);
      }
    }

    return (await this.client.rest.get(
      `${endpoints.GUILD_WIDGET(guildId)}.json`,
    )) as GuildWidgetDetails;
  }

  /** Returns the widget image URL for the guild. */
  async getWidgetImageURL(
    guildId: bigint,
    options?: GetGuildWidgetImageQuery & { force?: boolean },
  ) {
    if (!options?.force) {
      const guild = await this.client.cache.get("guilds", guildId);
      if (!guild) throw new Error(Errors.GUILD_NOT_FOUND);
      if (!guild.widgetEnabled) {
        throw new Error(Errors.GUILD_WIDGET_NOT_ENABLED);
      }
    }

    return `${endpoints.GUILD_WIDGET(guildId)}.png?style=${options?.style ??
      "shield"}`;
  }

  /** Returns the guild widget object. Requires the MANAGE_GUILD permission. */
  async getWidgetSettings(guildId: bigint) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    return (await this.client.rest.get(
      endpoints.GUILD_WIDGET(guildId),
    )) as GuildWidget;
  }

  /** The full URL of the banner from Discords CDN. Undefined if no banner is set. */
  guildBannerURL(
    id: bigint,
    options: {
      banner?: string | bigint;
      size?: DiscordImageSize;
      format?: DiscordImageFormat;
      animated?: boolean;
    },
  ) {
    return options.banner
      ? formatImageURL(
        endpoints.GUILD_BANNER(
          id,
          typeof options.banner === "string"
            ? options.banner
            : iconBigintToHash(options.banner, options.animated ?? true),
        ),
        options.size || 128,
        options.format,
      )
      : undefined;
  }

  /** The full URL of the icon from Discords CDN. Undefined when no icon is set. */
  guildIconURL(
    id: bigint,
    options: {
      icon?: string | bigint;
      size?: DiscordImageSize;
      format?: DiscordImageFormat;
      animated?: boolean;
    },
  ) {
    return options.icon
      ? formatImageURL(
        endpoints.GUILD_ICON(
          id,
          typeof options.icon === "string"
            ? options.icon
            : iconBigintToHash(options.icon, options.animated ?? true),
        ),
        options.size || 128,
        options.format,
      )
      : undefined;
  }

  /** The full URL of the splash from Discords CDN. Undefined if no splash is set. */
  guildSplashURL(
    id: bigint,
    options: {
      splash?: string | bigint;
      size?: DiscordImageSize;
      format?: DiscordImageFormat;
      animated?: boolean;
    },
  ) {
    return options.splash
      ? formatImageURL(
        endpoints.GUILD_SPLASH(
          id,
          typeof options.splash === "string"
            ? options.splash
            : iconBigintToHash(options.splash, options.animated ?? true),
        ),
        options.size || 128,
        options.format,
      )
      : undefined;
  }

  /** Leave a guild */
  async leaveGuild(guildId: bigint) {
    return await this.client.rest.delete(endpoints.GUILD_LEAVE(guildId));
  }
}

export default GuildHelpers;
