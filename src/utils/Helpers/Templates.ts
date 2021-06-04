import {
  Collection,
  CreateGuildFromTemplate,
  endpoints,
  Guild,
  ModifyGuildTemplate,
  snakelize,
  Template,
  urlToBase64,
} from "../../../deps.ts";
import Client from "../../Client.ts";
import DDGuild from "../../Structures/DDGuild.ts";

export class TemplateHelpers {
  /** The client itself. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Create a new guild based on a template
   * NOTE: This endpoint can be used only by bots in less than 10 guilds.
   */
  async createGuildFromTemplate(
    templateCode: string,
    data: CreateGuildFromTemplate
  ) {
    if ((await this.client.cache.size("guilds")) >= 10) {
      throw new Error(
        "This function can only be used by bots in less than 10 guilds."
      );
    }

    if (data.icon) {
      data.icon = await urlToBase64(data.icon);
    }

    const createdGuild = (await this.client.rest.post(
      endpoints.GUILD_TEMPLATE(templateCode),
      data
    )) as Guild;

    return new DDGuild(
      this.client,
      createdGuild,
      Number(
        (
          BigInt(createdGuild.id) >>
          22n % BigInt(this.client.gateway.botGatewayData.shards)
        ).toString()
      )
    );
  }

  /**
   * Creates a template for the guild.
   * Requires the `MANAGE_GUILD` permission.
   * name of the template (1-100 characters).
   * description for the template (0-120 characters
   */
  async createGuildTemplate(guildId: bigint, data: Template) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    if (data.name.length < 1 || data.name.length > 100) {
      throw new Error("The name can only be in between 1-100 characters.");
    }

    if (data.description?.length && data.description.length > 120) {
      throw new Error(
        "The description can only be in between 0-120 characters."
      );
    }

    return (await this.client.rest.post(
      endpoints.GUILD_TEMPLATES(guildId),
      snakelize(data)
    )) as Template;
  }

  /**
   * Deletes a template from a guild.
   * Requires the `MANAGE_GUILD` permission.
   */
  async deleteGuildTemplate(guildId: bigint, templateCode: string) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    return await this.client.rest.delete(
      `${endpoints.GUILD_TEMPLATES(guildId)}/${templateCode}`
    );
  }

  /**
   * Edit a template's metadata.
   * Requires the `MANAGE_GUILD` permission.
   */
  async editGuildTemplate(
    guildId: bigint,
    templateCode: string,
    data: ModifyGuildTemplate
  ) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    if (data.name?.length && (data.name.length < 1 || data.name.length > 100)) {
      throw new Error("The name can only be in between 1-100 characters.");
    }

    if (data.description?.length && data.description.length > 120) {
      throw new Error(
        "The description can only be in between 0-120 characters."
      );
    }

    return (await this.client.rest.patch(
      `${endpoints.GUILD_TEMPLATES(guildId)}/${templateCode}`,
      data
    )) as Template;
  }

  /**
   * Returns an array of templates.
   * Requires the `MANAGE_GUILD` permission.
   */
  async getGuildTemplates(guildId: bigint) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    const templates = (await this.client.rest.get(
      endpoints.GUILD_TEMPLATES(guildId)
    )) as Template[];

    return new Collection(
      templates.map((template) => [template.code, template])
    );
  }

  /** Returns the guild template if it exists */
  async getTemplate(templateCode: string) {
    return await this.client.rest.get(endpoints.GUILD_TEMPLATE(templateCode));
  }

  /**
   * Syncs the template to the guild's current state.
   * Requires the `MANAGE_GUILD` permission.
   */
  async syncGuildTemplate(guildId: bigint, templateCode: string) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    return (await this.client.rest.put(
      `${endpoints.GUILD_TEMPLATES(guildId)}/${templateCode}`
    )) as Template;
  }
}

export default TemplateHelpers;
