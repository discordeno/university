import {
  ActionRoleComponents,
  ButtonComponent,
  MessageComponentTypes,
  SelectMenuComponent,
} from "../../../deps.ts";
import Client from "../../Client.ts";

export class TypeGuards {
  /** The client itself. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /** A type guard function to tell if it is a button component */
  isButton(component: ActionRoleComponents): component is ButtonComponent {
    return component.type === MessageComponentTypes.Button;
  }

  /** A type guard function to tell if it is a button component */
  isSelectMenu(
    component: ActionRoleComponents
  ): component is SelectMenuComponent {
    return component.type === MessageComponentTypes.SelectMenu;
  }
}

export default TypeGuards;
