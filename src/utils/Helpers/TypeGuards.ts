import { ButtonData } from "https://deno.land/x/discordeno@11.0.0-rc.5/src/types/messages/components/button_data.ts";
import {
  ComponentInteraction,
  DiscordInteractionTypes,
  Interaction,
  MessageComponentTypes,
  SelectMenuData,
  SlashCommandInteraction,
} from "../../../deps.ts";
import Client from "../../Client.ts";

export class TypeGuardHelpers {
  /** The client itself. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /** A type guard function to tell if it is a message component interaction or not. */
  isComponent(interaction: Interaction): interaction is ComponentInteraction {
    return interaction.type === DiscordInteractionTypes.MessageComponent;
  }

  /** A type guard function to tell if the interaction is a slash command or not. */
  isSlashCommand(
    interaction: Interaction
  ): interaction is SlashCommandInteraction {
    return interaction.type === DiscordInteractionTypes.ApplicationCommand;
  }

  /** A type guard function to tell if it is a button component */
  isButton(data: ButtonData | SelectMenuData): data is ButtonData {
    return data.componentType === MessageComponentTypes.Button;
  }

  /** A type guard function to tell if it is a button component */
  isSelectMenu(data: ButtonData | SelectMenuData): data is SelectMenuData {
    return data.componentType === MessageComponentTypes.SelectMenu;
  }
}

export default TypeGuardHelpers;
