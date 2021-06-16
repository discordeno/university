import {
  calculateBits,
  Collection,
  CreateGuildRole,
  endpoints,
  Errors,
  Role,
} from "../../../deps.ts";
import Client from "../../Client.ts";
import UniversityRole from "../../Structures/UniversityRole.ts";

export class RoleHelpers {
  /** The client itself. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /** Add a role to the member */
  async aUniversityRole(
    guildId: bigint,
    memberId: bigint,
    roleId: bigint,
    reason?: string,
  ) {
    const isHigherRolePosition = await this.client.isHigherPosition(
      guildId,
      this.client.botId,
      roleId,
    );
    if (!isHigherRolePosition) {
      throw new Error(Errors.BOTS_HIGHEST_ROLE_TOO_LOW);
    }

    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_ROLES"]);

    return await this.client.rest.put(
      endpoints.GUILD_MEMBER_ROLE(guildId, memberId, roleId),
      { reason },
    );
  }

  /** Create a new role for the guild. Requires the MANAGE_ROLES permission. */
  async createRole(guildId: bigint, options: CreateGuildRole, reason?: string) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_ROLES"]);

    const result = (await this.client.rest.post(
      endpoints.GUILD_ROLES(guildId),
      {
        ...options,
        permissions: calculateBits(options?.permissions || []),
        reason,
      },
    )) as Role;

    const role = new UniversityRole(this.client, result, guildId);
    const guild = await this.client.cache.get("guilds", guildId);
    if (guild) {
      guild.roles.set(role.id, role);

      await this.client.cache.set("guilds", guildId, guild);
    }

    return role;
  }

  /** Delete a guild role. Requires the MANAGE_ROLES permission. */
  async deleteRole(guildId: bigint, id: bigint) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_ROLES"]);

    return await this.client.rest.delete(endpoints.GUILD_ROLE(guildId, id));
  }

  /** Edit a guild role. Requires the MANAGE_ROLES permission. */
  async editRole(guildId: bigint, id: bigint, options: CreateGuildRole) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_ROLES"]);

    const result = (await this.client.rest.patch(
      endpoints.GUILD_ROLE(guildId, id),
      {
        ...options,
        permissions: options.permissions
          ? calculateBits(options.permissions)
          : undefined,
      },
    )) as Role;

    return new UniversityRole(this.client, result, guildId);
  }

  /** Returns a list of role objects for the guild.
   *
   * ⚠️ **If you need this, you are probably doing something wrong. This is not intended for use. Your roles will be cached in your guild.**
   */
  async getRoles(guildId: bigint, addToCache = true) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_ROLES"]);

    const result = (await this.client.rest.get(
      endpoints.GUILD_ROLES(guildId),
    )) as Role[];

    const roleStructures = result.map(
      (role) => new UniversityRole(this.client, role, guildId),
    );

    const roles = new Collection(roleStructures.map((role) => [role.id, role]));

    if (addToCache) {
      const guild = await this.client.cache.get("guilds", guildId);
      if (guild) {
        guild.roles = roles;
        await this.client.cache.set("guilds", guild.id, guild);
      }
    }

    return roleStructures;
  }

  /** Remove a role from the member */
  async removeRole(
    guildId: bigint,
    memberId: bigint,
    roleId: bigint,
    reason?: string,
  ) {
    const isHigherRolePosition = await this.client.isHigherPosition(
      guildId,
      this.client.botId,
      roleId,
    );
    if (!isHigherRolePosition) {
      throw new Error(Errors.BOTS_HIGHEST_ROLE_TOO_LOW);
    }

    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_ROLES"]);

    return await this.client.rest.delete(
      endpoints.GUILD_MEMBER_ROLE(guildId, memberId, roleId),
      { reason },
    );
  }
}

export default RoleHelpers;
