import {
  BeginGuildPrune,
  bigintToSnowflake,
  Channel,
  Collection,
  CreateGuildBan,
  CreateMessage,
  DiscordGatewayIntents,
  DiscordGatewayOpcodes,
  DiscordImageFormat,
  DiscordImageSize,
  endpoints,
  Errors,
  formatImageURL,
  GuildMemberWithUser,
  iconBigintToHash,
  ListGuildMembers,
  ModifyGuildMember,
  PermissionStrings,
  RequestGuildMembers,
  SearchGuildMembers,
  snakelize,
} from "../../../deps.ts";
import Client from "../../Client.ts";
import UniversityChannel from "../../Structures/UniversityChannel.ts";
import UniversityMember from "../../Structures/UniversityMember.ts";

export class MemberHelpers {
  /** The client itself. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /** The users custom avatar or the default avatar if you don't have a member object. */
  avatarURL(
    userId: bigint,
    discriminator: number,
    options: {
      avatar?: string | bigint;
      size?: DiscordImageSize;
      format?: DiscordImageFormat;
      animated?: boolean;
    }
  ) {
    return options.avatar
      ? formatImageURL(
          endpoints.USER_AVATAR(
            userId,
            typeof options.avatar === "string"
              ? options.avatar
              : iconBigintToHash(options.avatar, options.animated ?? true)
          ),
          options.size || 128,
          options.format
        )
      : endpoints.USER_DEFAULT_AVATAR(Number(discriminator) % 5);
  }

  /** Ban a user from the guild and optionally delete previous messages sent by the user. Requires the BAN_MEMBERS permission. */
  async ban(guildId: bigint, id: bigint, options: CreateGuildBan) {
    await this.client.requireBotGuildPermissions(guildId, ["BAN_MEMBERS"]);

    return await this.client.rest.put(
      endpoints.GUILD_BAN(guildId, id),
      snakelize(options)
    );
  }

  /** Kicks a member from a voice channel */
  async disconnectMember(guildId: bigint, memberId: bigint) {
    return await this.editMember(guildId, memberId, { channelId: null });
  }

  /** Edit the nickname of the bot in this guild */
  async editBotNickname(guildId: bigint, nickname: string | null) {
    await this.client.requireBotGuildPermissions(guildId, ["CHANGE_NICKNAME"]);

    const response = (await this.client.rest.patch(
      endpoints.USER_NICK(guildId),
      {
        nick: nickname,
      }
    )) as { nick: string };

    return response.nick;
  }

  /** Edit the member */
  async editMember(
    guildId: bigint,
    memberId: bigint,
    options: ModifyGuildMember
  ) {
    const requiredPerms: Set<PermissionStrings> = new Set();

    if (options.nick) {
      if (options.nick.length > 32) {
        throw new Error(Errors.NICKNAMES_MAX_LENGTH);
      }
      requiredPerms.add("MANAGE_NICKNAMES");
    }

    if (options.roles) requiredPerms.add("MANAGE_ROLES");

    if (
      options.mute !== undefined ||
      options.deaf !== undefined ||
      options.channelId !== undefined
    ) {
      const memberVoiceState = (
        await this.client.cache.get("guilds", guildId)
      )?.voiceStates.get(memberId);

      if (!memberVoiceState?.channelId) {
        throw new Error(Errors.MEMBER_NOT_IN_VOICE_CHANNEL);
      }

      if (options.mute !== undefined) {
        requiredPerms.add("MUTE_MEMBERS");
      }

      if (options.deaf !== undefined) {
        requiredPerms.add("DEAFEN_MEMBERS");
      }

      if (options.channelId) {
        const requiredVoicePerms: Set<PermissionStrings> = new Set([
          "CONNECT",
          "MOVE_MEMBERS",
        ]);
        if (memberVoiceState) {
          await this.client.requireBotChannelPermissions(
            memberVoiceState?.channelId,
            [...requiredVoicePerms]
          );
        }
        await this.client.requireBotChannelPermissions(options.channelId, [
          ...requiredVoicePerms,
        ]);
      }
    }

    await this.client.requireBotGuildPermissions(guildId, [...requiredPerms]);

    const result = (await this.client.rest.patch(
      endpoints.GUILD_MEMBER(guildId, memberId),
      snakelize({
        ...options,
        channelId: options.channelId
          ? bigintToSnowflake(options.channelId)
          : undefined,
      }) as ModifyGuildMember
    )) as GuildMemberWithUser;

    return new UniversityMember(this.client, result, guildId);
  }

  /**
   * ⚠️ BEGINNER DEVS!! YOU SHOULD ALMOST NEVER NEED THIS AND YOU CAN GET FROM this.client.members.get()
   *
   * ADVANCED:
   * Highly recommended to use this function to fetch members instead of getMember from REST.
   * REST: 50/s global(across all shards) rate limit with ALL requests this included
   * GW(this function): 120/m(PER shard) rate limit. Meaning if you have 8 shards your limit is now 960/m.
   */
  fetchMembers(
    guildId: bigint,
    shardId: number,
    options?: Omit<RequestGuildMembers, "guildId">
  ) {
    // You can request 1 member without the intent
    if (
      (!options?.limit || options.limit > 1) &&
      !(this.client.gateway.intents & DiscordGatewayIntents.GuildMembers)
    ) {
      throw new Error(Errors.MISSING_INTENT_GUILD_MEMBERS);
    }

    if (options?.userIds?.length) {
      options.limit = options.userIds.length;
    }

    return new Promise((resolve) => {
      const nonce = `${guildId}-${Date.now()}`;
      this.client.fetchAllMembersProcessingRequests.set(nonce, resolve);

      this.client.gateway.get(shardId)?.sendShardMessage({
        op: DiscordGatewayOpcodes.RequestGuildMembers,
        d: {
          guild_id: guildId,
          // If a query is provided use it, OR if a limit is NOT provided use ""
          query: options?.query || (options?.limit ? undefined : ""),
          limit: options?.limit || 0,
          presences: options?.presences || false,
          user_ids: options?.userIds,
          nonce,
        },
      });
    }) as Promise<Collection<bigint, UniversityMember>>;
  }

  /** Returns a guild member object for the specified user.
   *
   * ⚠️ **ADVANCED USE ONLY: Your members will be cached in your guild most likely. Only use this when you are absolutely sure the member is not cached.**
   */
  async getMember(guildId: bigint, id: bigint, options?: { force?: boolean }) {
    const guild = await this.client.cache.get("guilds", guildId);
    if (!guild && !options?.force) return;

    const data = (await this.client.rest.get(
      endpoints.GUILD_MEMBER(guildId, id)
    )) as GuildMemberWithUser;

    const discordenoMember = new UniversityMember(this.client, data, guildId);
    await this.client.cache.set(
      "members",
      discordenoMember.id,
      discordenoMember
    );

    return discordenoMember;
  }

  /**
   * ⚠️ BEGINNER DEVS!! YOU SHOULD ALMOST NEVER NEED THIS AND YOU CAN GET FROM this.client.members.get()
   *
   * ADVANCED:
   * Highly recommended to **NOT** use this function to get members instead use fetchMembers().
   * REST(this function): 50/s global(across all shards) rate limit with ALL requests this included
   * GW(fetchMembers): 120/m(PER shard) rate limit. Meaning if you have 8 shards your limit is 960/m.
   */
  async getMembers(
    guildId: bigint,
    options?: ListGuildMembers & { addToCache?: boolean }
  ) {
    if (!(this.client.gateway.intents && DiscordGatewayIntents.GuildMembers)) {
      throw new Error(Errors.MISSING_INTENT_GUILD_MEMBERS);
    }

    const guild = await this.client.cache.get("guilds", guildId);
    if (!guild) throw new Error(Errors.GUILD_NOT_FOUND);

    const members = new Collection<bigint, UniversityMember>();

    let membersLeft = options?.limit ?? guild.memberCount;
    let loops = 1;
    while (
      (options?.limit ?? guild.memberCount) > members.size &&
      membersLeft > 0
    ) {
      this.client.emit(
        "DEBUG",
        "loop",
        "Running while loop in getMembers function."
      );

      if (options?.limit && options.limit > 1000) {
        console.log(
          `Paginating get members from REST. #${loops} / ${Math.ceil(
            (options?.limit ?? 1) / 1000
          )}`
        );
      }

      const result = (await this.client.rest.get(
        `${endpoints.GUILD_MEMBERS(guildId)}?limit=${
          membersLeft > 1000 ? 1000 : membersLeft
        }${options?.after ? `&after=${options.after}` : ""}`
      )) as GuildMemberWithUser[];

      const discordenoMembers = await Promise.all(
        result.map(async (member) => {
          const discordenoMember = new UniversityMember(
            this.client,
            member,
            guildId
          );

          if (options?.addToCache !== false) {
            await this.client.cache.set(
              "members",
              discordenoMember.id,
              discordenoMember
            );
          }

          return discordenoMember;
        })
      );

      if (!discordenoMembers.length) break;

      discordenoMembers.forEach((member) => {
        this.client.emit(
          "DEBUG",
          "loop",
          `Running forEach loop in get_members file.`
        );
        members.set(member.id, member);
      });

      options = {
        limit: options?.limit,
        after: bigintToSnowflake(
          discordenoMembers[discordenoMembers.length - 1].id
        ),
      };

      membersLeft -= 1000;

      loops++;
    }

    return members;
  }

  /** Kick a member from the server */
  async kick(guildId: bigint, memberId: bigint, reason?: string) {
    const botsHighestRole = await this.client.highestRole(
      guildId,
      this.client.botId
    );
    const membersHighestRole = await this.client.highestRole(guildId, memberId);
    if (
      botsHighestRole &&
      membersHighestRole &&
      botsHighestRole.position <= membersHighestRole.position
    ) {
      throw new Error(Errors.BOTS_HIGHEST_ROLE_TOO_LOW);
    }

    await this.client.requireBotGuildPermissions(guildId, ["KICK_MEMBERS"]);

    return await this.client.rest.delete(
      endpoints.GUILD_MEMBER(guildId, memberId),
      { reason }
    );
  }

  /**
   * Move a member from a voice channel to another.
   * @param guildId the id of the guild which the channel exists in
   * @param memberId the id of the member to move.
   * @param channelId id of channel to move user to (if they are connected to voice)
   */
  async moveMember(guildId: bigint, memberId: bigint, channelId: bigint) {
    return await this.editMember(guildId, memberId, { channelId });
  }

  /**
   * Begin a prune operation. Requires the KICK_MEMBERS permission. Returns an object with one 'pruned' key indicating the number of members that were removed in the prune operation. For large guilds it's recommended to set the computePruneCount option to false, forcing 'pruned' to null. Fires multiple Guild Member Remove Gateway events.
   *
   * By default, prune will not remove users with roles. You can optionally include specific roles in your prune by providing the roles (resolved to include_roles internally) parameter. Any inactive user that has a subset of the provided role(s) will be included in the prune and users with additional roles will not.
   */
  async pruneMembers(guildId: bigint, options: BeginGuildPrune) {
    if (options.days && options.days < 1)
      throw new Error(Errors.PRUNE_MIN_DAYS);
    if (options.days && options.days > 30)
      throw new Error(Errors.PRUNE_MAX_DAYS);

    await this.client.requireBotGuildPermissions(guildId, ["KICK_MEMBERS"]);

    const result = (await this.client.rest.post(
      endpoints.GUILD_PRUNE(guildId),
      snakelize(options)
    )) as { pruned: number };

    return result.pruned;
  }

  /**
   * ⚠️ BEGINNER DEVS!! YOU SHOULD ALMOST NEVER NEED THIS AND YOU CAN GET FROM this.client.members.filter()
   * @param query Query string to match username(s) and nickname(s) against
   */
  async searchMembers(
    guildId: bigint,
    query: string,
    options?: Omit<SearchGuildMembers, "query"> & { cache?: boolean }
  ) {
    if (options?.limit) {
      if (options.limit < 1)
        throw new Error(Errors.MEMBER_SEARCH_LIMIT_TOO_LOW);
      if (options.limit > 1000) {
        throw new Error(Errors.MEMBER_SEARCH_LIMIT_TOO_HIGH);
      }
    }

    const result = (await this.client.rest.get(
      endpoints.GUILD_MEMBERS_SEARCH(guildId),
      {
        ...options,
        query,
      }
    )) as GuildMemberWithUser[];

    const members = await Promise.all(
      result.map(async (member) => {
        const discordenoMember = new UniversityMember(
          this.client,
          member,
          guildId
        );
        if (options?.cache) {
          await this.client.cache.set(
            "members",
            discordenoMember.id,
            discordenoMember
          );
        }

        return discordenoMember;
      })
    );

    return new Collection<bigint, UniversityMember>(
      members.map((member) => [member.id, member])
    );
  }

  /** Send a message to a users DM. Note: this takes 2 API calls. 1 is to fetch the users dm channel. 2 is to send a message to that channel. */
  async sendDirectMessage(memberId: bigint, content: string | CreateMessage) {
    let dmChannel = await this.client.cache.get("channels", memberId);
    if (!dmChannel) {
      // If not available in cache create a new one.
      const dmChannelData = (await this.client.rest.post(endpoints.USER_DM, {
        recipient_id: memberId,
      })) as Channel;
      const discordenoChannel = new UniversityChannel(
        this.client,
        dmChannelData
      );
      // Recreate the channel and add it under the users id
      await this.client.cache.set("channels", memberId, discordenoChannel);
      dmChannel = discordenoChannel;
    }

    // If it does exist try sending a message to this user
    return await this.client.helpers.messages.sendMessage(
      dmChannel.id,
      content
    );
  }

  /** Remove the ban for a user. Requires BAN_MEMBERS permission */
  async unban(guildId: bigint, id: bigint) {
    await this.client.requireBotGuildPermissions(guildId, ["BAN_MEMBERS"]);

    return await this.client.rest.delete(endpoints.GUILD_BAN(guildId, id));
  }
}

export default MemberHelpers;
