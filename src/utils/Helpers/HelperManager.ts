import { endpoints } from "../../../deps.ts";
import Client from "../../Client.ts";
import ChannelHelpers from "./channels/ChannelHelpers.ts";

export class HelperManager {
  /** The client itself. */
  client: Client;
  /** The channel helpers */
  channels: ChannelHelpers;

  constructor(client: Client) {
    this.client = client;
    this.channels = new ChannelHelpers(client);
  }

  /** Get the bots Gateway metadata that can help during the operation of large or sharded bots. */
  async getGatewayBot() {
    return await this.client.rest.get(endpoints.GATEWAY_BOT);
  }
}

export default HelperManager;
