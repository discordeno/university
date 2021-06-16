import {
  Collection,
  DiscoveryCategory,
  endpoints,
  ModifyGuildDiscoveryMetadata,
  snakelize,
  ValidateDiscoverySearchTerm,
} from "../../../deps.ts";
import Client from "../../Client.ts";

export class DiscoveryHelpers {
  /** The client itself. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /** Add a discovery subcategory to the guild. Requires the `MANAGE_GUILD` permission. */
  async addDiscoverySubcategory(guildId: bigint, categoryId: number) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    return await this.client.rest.post(
      endpoints.DISCOVERY_SUBCATEGORY(guildId, categoryId),
    );
  }

  /** Modify the discovery metadata for the guild. Requires the MANAGE_GUILD permission. Returns the updated discovery metadata object on success. */
  async editDiscovery(guildId: bigint, data: ModifyGuildDiscoveryMetadata) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    return await this.client.rest.patch(
      endpoints.DISCOVERY_METADATA(guildId),
      snakelize(data),
    );
  }

  /** Returns the discovery metadata object for the guild. Requires the `MANAGE_GUILD` permission. */
  async getDiscovery(guildId: bigint) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    return await this.client.rest.get(endpoints.DISCOVERY_METADATA(guildId));
  }

  /** Returns a Collection (mapped by Id of the discovery category object) of discovery category objects that can be used when editing guilds */
  async getDiscoveryCategories() {
    const result = (await this.client.rest.get(
      endpoints.DISCOVERY_CATEGORIES,
    )) as DiscoveryCategory[];

    return new Collection<number, DiscoveryCategory>(
      result.map((category) => [category.id, category]),
    );
  }

  /** Removes a discovery subcategory from the guild. Requires the MANAGE_GUILD permission. Returns a 204 No Content on success. */
  async removeDiscoverySubcategory(guildId: bigint, categoryId: number) {
    await this.client.requireBotGuildPermissions(guildId, ["MANAGE_GUILD"]);

    return await this.client.rest.delete(
      endpoints.DISCOVERY_SUBCATEGORY(guildId, categoryId),
    );
  }

  async validDiscoveryTerm(term: string) {
    const result = (await this.client.rest.get(endpoints.DISCOVERY_VALID_TERM, {
      term,
    })) as ValidateDiscoverySearchTerm;

    return result.valid;
  }
}

export default DiscoveryHelpers;
