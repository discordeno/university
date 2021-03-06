import BaseInteraction from "./BaseInteraction.ts";
import { Interaction, SelectMenuData, Message } from "../../deps.ts";
import Client from "../Client.ts";
import UniversityMessage from "./UniversityMessage.ts";

export class UniversityDropdownInteraction extends BaseInteraction {
  /** Interaction data */
  data: SelectMenuData;
  /**  The message the button was attached to */
  message: UniversityMessage;

  constructor(client: Client, payload: Interaction) {
    super(client, payload);
    this.data = payload.data as SelectMenuData;
    this.message = new UniversityMessage(client, payload.message as Message);
  }
}

export default UniversityDropdownInteraction;
