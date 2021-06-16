import BaseInteraction from "./BaseInteraction.ts";
import { ApplicationCommandInteractionData, Interaction } from "../../deps.ts";
import Client from "../Client.ts";

export class UniversitySlashInteraction extends BaseInteraction {
  /** Interaction data */
  data: ApplicationCommandInteractionData;

  constructor(client: Client, payload: Interaction) {
    super(client, payload);
    this.data = payload.data as ApplicationCommandInteractionData;
  }
}

export default UniversitySlashInteraction;
