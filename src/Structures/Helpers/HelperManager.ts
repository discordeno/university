import Client from "../../Client.ts";
import ChannelHelpers from "./ChannelHelpers.ts";

export class HelperManager {
  /** The client itself. */
  client: Client;
  /** The channel helpers */
  channels: ChannelHelpers;
  
  constructor(client: Client) {
    this.client = client;
    this.channels = new ChannelHelpers(client);
  }
}

export default HelperManager;
