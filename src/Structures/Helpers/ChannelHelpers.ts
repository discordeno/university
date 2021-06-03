import Client from "../../Client.ts";
import ThreadHelpers from "./ThreadHelpers.ts";

export class ChannelHelpers {
  /** The client itself. */
  client: Client;
  /** The channel helpers */
  threads: ThreadHelpers;

  constructor(client: Client) {
    this.client = client;
    this.threads = new ThreadHelpers(client);
  }
}

export default ChannelHelpers;
