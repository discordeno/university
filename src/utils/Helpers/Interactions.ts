import {
  ApplicationCommand,
  ApplicationCommandPermissions,
  Collection,
  CreateGlobalApplicationCommand,
  DiscordAllowedMentionsTypes,
  DiscordenoEditWebhookMessage,
  DiscordenoInteractionResponse,
  EditGlobalApplicationCommand,
  endpoints,
  Errors,
  GuildApplicationCommandPermissions,
  Message,
  snakelize,
  snowflakeToBigint,
  validateComponents,
  validateSlashCommands,
  verify,
} from "../../../deps.ts";
import Client from "../../Client.ts";
import UniversityMessage from "../../Structures/UniversityMessage.ts";

export class InteractionHelpers {
  /** The client itself. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /** Batch edits permissions for all commands in a guild. Takes an array of partial GuildApplicationCommandPermissions objects including `id` and `permissions`. */
  async batchEditSlashCommandPermissions(
    guildId: bigint,
    options: { id: string; permissions: ApplicationCommandPermissions[] }[]
  ) {
    return await this.client.rest.put(
      endpoints.COMMANDS_PERMISSIONS(this.client.applicationId, guildId),
      snakelize(options)
    );
  }

  /**
   * There are two kinds of Slash Commands: global commands and guild commands. Global commands are available for every guild that adds your app; guild commands are specific to the guild you specify when making them. Command names are unique per application within each scope (global and guild). That means:
   *
   * - Your app **cannot** have two global commands with the same name
   * - Your app **cannot** have two guild commands within the same name **on the same guild**
   * - Your app **can** have a global and guild command with the same name
   * - Multiple apps **can** have commands with the same names
   *
   * Global commands are cached for **1 hour**. That means that new global commands will fan out slowly across all guilds, and will be guaranteed to be updated in an hour.
   * Guild commands update **instantly**. We recommend you use guild commands for quick testing, and global commands when they're ready for public use.
   */
  async createSlashCommand(
    options: CreateGlobalApplicationCommand,
    guildId?: bigint
  ) {
    [options] = validateSlashCommands(
      [options],
      true
    ) as CreateGlobalApplicationCommand[];

    return (await this.client.rest.post(
      guildId
        ? endpoints.COMMANDS_GUILD(this.client.applicationId, guildId)
        : endpoints.COMMANDS(this.client.applicationId),
      snakelize(options)
    )) as ApplicationCommand;
  }

  /** Deletes a slash command. */
  async deleteSlashCommand(id: bigint, guildId?: bigint) {
    return await this.client.rest.delete(
      guildId
        ? endpoints.COMMANDS_GUILD_ID(this.client.applicationId, guildId, id)
        : endpoints.COMMANDS_ID(this.client.applicationId, id)
    );
  }

  /** To delete your response to a slash command. If a message id is not provided, it will default to deleting the original response. */
  async deleteSlashResponse(token: string, messageId?: bigint) {
    return await this.client.rest.delete(
      messageId
        ? endpoints.INTERACTION_ID_TOKEN_MESSAGE_ID(
            this.client.applicationId,
            token,
            messageId
          )
        : endpoints.INTERACTION_ORIGINAL_ID_TOKEN(
            this.client.applicationId,
            token
          )
    );
  }

  /** Edits command permissions for a specific command for your application in a guild. */
  async editSlashCommandPermissions(
    guildId: bigint,
    commandId: bigint,
    options: ApplicationCommandPermissions[]
  ) {
    return await this.client.rest.put(
      endpoints.COMMANDS_PERMISSION(
        this.client.applicationId,
        guildId,
        commandId
      ),
      {
        permissions: snakelize(options),
      }
    );
  }

  /** To edit your response to a slash command. If a messageId is not provided it will default to editing the original response. */
  async editSlashResponse(
    token: string,
    options: DiscordenoEditWebhookMessage
  ) {
    if (options.content && options.content.length > 2000) {
      throw Error(Errors.MESSAGE_MAX_LENGTH);
    }

    if (options.components?.length) {
      validateComponents(options.components);
    }

    if (options.embeds && options.embeds.length > 10) {
      options.embeds.splice(10);
    }

    if (options.allowedMentions) {
      if (options.allowedMentions.users?.length) {
        if (
          options.allowedMentions.parse?.includes(
            DiscordAllowedMentionsTypes.UserMentions
          )
        ) {
          options.allowedMentions.parse = options.allowedMentions.parse.filter(
            (p) => p !== "users"
          );
        }

        if (options.allowedMentions.users.length > 100) {
          options.allowedMentions.users = options.allowedMentions.users.slice(
            0,
            100
          );
        }
      }

      if (options.allowedMentions.roles?.length) {
        if (
          options.allowedMentions.parse?.includes(
            DiscordAllowedMentionsTypes.RoleMentions
          )
        ) {
          options.allowedMentions.parse = options.allowedMentions.parse.filter(
            (p) => p !== "roles"
          );
        }

        if (options.allowedMentions.roles.length > 100) {
          options.allowedMentions.roles = options.allowedMentions.roles.slice(
            0,
            100
          );
        }
      }
    }

    const result = await this.client.rest.patch(
      options.messageId
        ? endpoints.WEBHOOK_MESSAGE(
            this.client.applicationId,
            token,
            options.messageId
          )
        : endpoints.INTERACTION_ORIGINAL_ID_TOKEN(
            this.client.applicationId,
            token
          ),
      snakelize(options)
    );

    // If the original message was edited, this will not return a message
    if (!options.messageId) return result as undefined;

    return new UniversityMessage(this.client, result);
  }

  /** Fetchs the global command for the given Id. If a guildId is provided, the guild command will be fetched. */
  async getSlashCommand(commandId: bigint, guildId?: bigint) {
    const result = (await this.client.rest.get(
      guildId
        ? endpoints.COMMANDS_GUILD_ID(
            this.client.applicationId,
            guildId,
            commandId
          )
        : endpoints.COMMANDS_ID(this.client.applicationId, commandId)
    )) as ApplicationCommand;

    return {
      ...result,
      id: snowflakeToBigint(result.id),
      applicationId: snowflakeToBigint(result.applicationId),
    };
  }

  /** Fetches command permissions for a specific command for your application in a guild. Returns a GuildApplicationCommandPermissions object. */
  async getSlashCommandPermission(guildId: bigint, commandId: bigint) {
    return (await this.client.rest.get(
      endpoints.COMMANDS_PERMISSION(
        this.client.applicationId,
        guildId,
        commandId
      )
    )) as GuildApplicationCommandPermissions;
  }

  /** Fetches command permissions for all commands for your application in a guild. Returns an array of GuildApplicationCommandPermissions objects. */
  async getSlashCommandPermissions(guildId: bigint) {
    return (await this.client.rest.get(
      endpoints.COMMANDS_PERMISSIONS(this.client.applicationId, guildId)
    )) as GuildApplicationCommandPermissions[];
  }

  /** Fetch all of the global commands for your application. */
  async getSlashCommands(guildId?: bigint) {
    const result = (await this.client.rest.get(
      guildId
        ? endpoints.COMMANDS_GUILD(this.client.applicationId, guildId)
        : endpoints.COMMANDS(this.client.applicationId)
    )) as ApplicationCommand[];

    return new Collection(
      result.map((command) => [
        command.name,
        {
          ...command,
          id: snowflakeToBigint(command.id),
          applicationId: snowflakeToBigint(command.applicationId),
        },
      ])
    );
  }

  /**
   * Edit an existing slash command. If this command did not exist, it will create it.
   */
  async upsertSlashCommand(
    commandId: bigint,
    options: EditGlobalApplicationCommand,
    guildId?: bigint
  ) {
    [options] = validateSlashCommands([options]);

    return (await this.client.rest.patch(
      guildId
        ? endpoints.COMMANDS_GUILD_ID(
            this.client.applicationId,
            guildId,
            commandId
          )
        : endpoints.COMMANDS_ID(this.client.applicationId, commandId),
      options
    )) as ApplicationCommand;
  }

  /**
   * Bulk edit existing slash commands. If a command does not exist, it will create it.
   *
   * **NOTE:** Any slash commands that are not specified in this function will be **deleted**. If you don't provide the commandId and rename your command, the command gets a new Id.
   */
  async upsertSlashCommands(
    options: EditGlobalApplicationCommand[],
    guildId?: bigint
  ) {
    options = validateSlashCommands(options);

    return (await this.client.rest.put(
      guildId
        ? endpoints.COMMANDS_GUILD(this.client.applicationId, guildId)
        : endpoints.COMMANDS(this.client.applicationId),
      options
    )) as ApplicationCommand[];
  }

  /** Returns the initial Interactio response. Functions the same as Get Webhook Message */
  async getOriginalInteractionResponse(token: string) {
    const result = (await this.client.rest.get(
      endpoints.INTERACTION_ORIGINAL_ID_TOKEN(this.client.applicationId, token)
    )) as Message;

    return new UniversityMessage(this.client, result);
  }

  /**
   * Send a response to a users slash command. The command data will have the id and token necessary to respond.
   * Interaction `tokens` are valid for **15 minutes** and can be used to send followup messages.
   *
   * NOTE: By default we will suppress mentions. To enable mentions, just pass any mentions object.
   */
  async sendInteractionResponse(
    id: bigint,
    token: string,
    options: DiscordenoInteractionResponse
  ) {
    // TODO: add more options validations
    if (options.data?.components) validateComponents(options.data?.components);
    // If its already been executed, we need to send a followup response
    if (this.client.executedSlashCommands.has(token)) {
      return await this.client.rest.post(
        endpoints.WEBHOOK(this.client.applicationId, token),
        snakelize(options)
      );
    }

    // Expire in 15 minutes
    this.client.executedSlashCommands.add(token);
    setTimeout(() => {
      this.client.emit(
        "DEBUG",
        "loop",
        `Running setTimeout in send_interaction_response file.`
      );
      this.client.executedSlashCommands.delete(token);
    }, 900000);

    // If the user wants this as a private message mark it ephemeral
    if (options.private) {
      options.data = { ...options.data, flags: 64 };
    }

    // If no mentions are provided, force disable mentions
    if (!options.data?.allowedMentions) {
      options.data = { ...options.data, allowedMentions: { parse: [] } };
    }

    return await this.client.rest.post(
      endpoints.INTERACTION_ID_TOKEN(id, token),
      snakelize(options)
    );
  }

  verifySignature({
    publicKey,
    signature,
    timestamp,
    body,
  }: VerifySignatureOptions): {
    isValid: boolean;
    body: string;
  } {
    const isValid = verify(
      this.hexToUint8Array(publicKey),
      this.hexToUint8Array(signature),
      new TextEncoder().encode(timestamp + body)
    );

    return { isValid, body };
  }

  /** Converts a hexadecimal string to Uint8Array. */
  hexToUint8Array(hex: string) {
    return new Uint8Array(
      hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16))
    );
  }
}

export default InteractionHelpers;

export interface VerifySignatureOptions {
  publicKey: string;
  signature: string;
  timestamp: string;
  body: string;
}
