import BaseInteraction from "./BaseInteraction.ts";
import { ButtonData, Interaction } from "../../deps.ts";

import Client from "../Client.ts";

export class DDButtonInteraction extends BaseInteraction {
  /** Interaction data */
  data: ButtonData;

  constructor(client: Client, payload: Interaction) {
    super(client, payload);
    this.data = payload.data as ButtonData;
  }
}

export default DDButtonInteraction;
