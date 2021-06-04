import { endpoints, Integration } from "../../../deps.ts";
import Client from "../../Client.ts";

export class IntegrationHelpers {
  /** The client itself. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /** Delete the attached integration object for the guild with this id. Requires MANAGE_GUILD permission. */
  async deleteIntegration(guildId: bigint, id: bigint) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    return await this.client.rest.delete(
      endpoints.GUILD_INTEGRATION(guildId, id)
    );
  }

  /** Returns a list of integrations for the guild. Requires the MANAGE_GUILD permission. */
  async getIntegrations(guildId: bigint) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    return (await this.client.rest.get(
      endpoints.GUILD_INTEGRATIONS(guildId)
    )) as Integration;
  }
}

export default IntegrationHelpers;
