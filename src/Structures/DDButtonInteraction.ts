import BaseInteraction from "./BaseInteraction.ts"
import {
  Interaction,
  ButtonData
} from "../../deps.ts"
import Client from "../Client.ts"

export class DDButtonInteraction extends BaseInteraction {
  /** Interaction data */
  data: ButtonData
  
  constructor(client: Client, payload: Omit<Interaction,"member">) {
    super(client, payload)
    this.data=payload.data
  }
}

export default DDButtonInteraction
