import BaseInteraction from "./BaseInteraction.ts"
import {
  Interaction,
  ApplicationCommandInteractionData
} from "../../deps.ts"

export class DDSlashInteraction extends BaseInteraction {
  /** Interaction data */
  data: ApplicationCommandInteractionData
  
  constructor(payload: Interaction) {
    super(interaction)
    this.data=this.payload.data
  }
}

export default DDSlashInteraction
