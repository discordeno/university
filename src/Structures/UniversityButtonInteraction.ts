import BaseInteraction from "./BaseInteraction.ts";
import { ButtonData, Interaction, Message } from "../../deps.ts";
import UniversityMessage from "./UniversityMessage.ts"

import Client from "../Client.ts";

export class UniversityButtonInteraction extends BaseInteraction {
  /** Interaction data */
  data: ButtonData;
  /**  The message the button was attached to */
  message: UniversityMessage

  constructor(client: Client, payload: Interaction) {
    super(client, payload);
    this.data = payload.data as ButtonData;
    this.message=new UniversityMessage(client,payload.message as Message)
  }
}

export default UniversityButtonInteraction;
