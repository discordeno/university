import {
  DiscordInteractionTypes,
  DiscordenoInteractionResponse,
  User,
  Interaction,
  GuildMemberWithUser,
  DiscordenoEditWebhookMessage,
  Message
} from "../../deps.ts"

import DDMember from "./DDMember.ts";
import DDGuild from "./DDGuild.ts"
import Client from "../Client.ts";

export class DDBaseInteraction {
  /** The bot client */
  client: Client;
   /** Id of the interaction */
  id: bigint;
  /** Id of the application this interaction is for */
  applicationId: string;
  /** The type of interaction */
  type: DiscordInteractionTypes;
  /** The guild it was sent from */
  guild?: DDGuild;
  /** The Id of the guild it was sent in */
  //@ts-ignore h
  guildId?: string;
  /** The channel it was sent from */
  channelId?: string;
  /** DO NOT USE THIS - Used to get data with the right type once */
  #payload: Interaction;
  /** The member object */
  member?: GuildMemberWithUser
  /** User object for the invoking user, if invoked in a DM */
  user?: User;
  /** A continuation token for responding to the interaction */
  token: string;
  /** Read-only property, always `1` */
  version: 1;
  
  constructor(client: Client, payload: Interaction) {
    this.client=client
    this.id=BigInt(payload.id)
    this.version=1
    this.applicationId=payload.applicationId
    this.type=payload.type
    this.token=payload.token
    this.#payload=payload
    if (payload.member) {this.member= payload.member as GuildMemberWithUser}
    if (payload.guildId) {this.guildId=payload.guildId}
    if (payload.user) {this.user=payload.user as User}
  }

  async send(data: DiscordenoInteractionResponse) {
    return await this.client.helpers.interactions.sendInteractionResponse(this.id,this.token,data)
  }

  async edit(data: DiscordenoEditWebhookMessage) {
    return await this.client.helpers.interactions.editSlashResponse(this.token,data)
  }

}
    
export default DDBaseInteraction
