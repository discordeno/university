import BaseInteraction from "./BaseInteraction.ts"
import {
  Interaction,
  ApplicationCommandInteractionData
} from "../../deps.ts"
import Client from "../Client.ts"

export class DDSlashInteraction extends BaseInteraction {
  /** Interaction data */
  data: ApplicationCommandInteractionData
  
  //deno-lint-ignore no-explicit-any
  constructor(client: Client,payload: any) {
    super(client,payload)
    this.data=payload.data
  }
}

export default DDSlashInteraction
