import BaseInteraction from "./BaseInteraction.ts"
import {
  Interaction,
  DiscordMessageComponentTypes
} from "../../deps.ts"
interface ButtonData {
  customId: string,
  componentType: DiscordMessageComponentTypes.Button
}
import Client from "../Client.ts"

export class DDButtonInteraction extends BaseInteraction {
  /** Interaction data */
  data: ButtonData
  
  constructor(client: Client, payload: Interaction) {
    super(client, payload)
    //@ts-ignore h
    this.data=payload.data
  }
}

export default DDButtonInteraction
