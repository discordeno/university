import BaseInteraction from "./BaseInteraction.ts"
import {
  Interaction,
  ButtonData
} from "../../deps.ts"

export class DDButtonInteraction extends BaseInteraction {
  /** Interaction data */
  data: ButtonData
  
  constructor(payload: Interaction) {
    super(interaction)
    this.data=this.payload.data
  }
}

export default DDButtonInteraction
