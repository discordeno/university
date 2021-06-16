import BaseInteraction from "./BaseInteraction.ts";
import { Interaction, SelectMenuData } from "../../deps.ts";
import Client from "../Client.ts";

export class UniversityDropdownInteraction extends BaseInteraction {
  /** Interaction data */
  data: SelectMenuData;

  constructor(client: Client, payload: Interaction) {
    super(client, payload);
    this.data = payload.data as SelectMenuData;
  }
}

export default UniversityDropdownInteraction;
