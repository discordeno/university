import BaseInteraction from "./BaseInteraction.ts"
import {
  Interaction,
  ApplicationCommandInteractionData
} from "../../deps.ts"
import Client from "../Client.ts"

export class DDSlashInteraction extends BaseInteraction {
  /** Interaction data */
  data: ApplicationCommandInteractionData
  
  constructor(client: Client,payload: Interaction) {
    super(client,payload)
    this.data=this.payload.data
  }
}

export default DDSlashInteraction
