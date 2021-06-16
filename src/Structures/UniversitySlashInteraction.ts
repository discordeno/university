import BaseInteraction from "./BaseInteraction.ts"
import {
  Interaction,
  ApplicationCommandInteractionData
} from "../../deps.ts"
import Client from "../Client.ts"

export class UniversitySlashInteraction extends BaseInteraction {
  /** Interaction data */
  data: ApplicationCommandInteractionData
  
  
  constructor(client: Client,payload: Interaction) {
    super(client,payload)
    //@ts-ignore h
    this.data=payload.data
  }
}

export default UniversitySlashInteraction
