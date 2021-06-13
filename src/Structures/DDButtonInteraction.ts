import BaseInteraction from "./BaseInteraction.ts"
import {
  Interaction,
  ButtonData
} from "../../deps.ts"
import Client from "../Client.ts"

export class DDButtonInteraction extends BaseInteraction {
  /** Interaction data */
  data: ButtonData
  
  constructor(client: Client, payload: Interaction) {
    super(client, interaction)
    this.data=this.payload.data
  }
}

export default DDButtonInteraction
