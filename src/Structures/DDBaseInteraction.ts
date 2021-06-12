import {
  DiscordInteractionTypes,
  DiscordInteractionResponseTypes,
  User,
  Interaction,
  GuildMemberWithUser,
  Message
} from "../../deps.ts"

import DDMember from "./DDMember.ts";
import DDGuild from "./DDGuild.ts"
import Client from "../Client.ts";
import Base from "./Base.ts";

export class DDBaseInteraction extends Base {
   /** Id of the interaction */
  interactionId: string;
  /** Id of the application this interaction is for */
  applicationId: string;
  /** The type of interaction */
  type: DiscordInteractionTypes;
  /** The guild it was sent from */
  guild?: DDGuild;
  /** The Id of the guild it was sent in */
  guildId: string;
  /** The channel it was sent from */
  channelId?: string;
  /** The member object */
  member?: GuildMemberWithUser
  /** User object for the invoking user, if invoked in a DM */
  user?: User;
  /** A continuation token for responding to the interaction */
  token: string;
  /** Read-only property, always `1` */
  version: 1;
  /** For the message the button was attached to */
  message?: Message;
  
  constructor(client: Client, payload: Interaction) {
    super(client,payload.id)
    this.interactionId=payload.id
    this.version=1
    this.applicationId=payload.applicationId
    this.type=payload.type
    this.token=payload.token
    if (payload.member) this.member= payload.member as GuildMemberWithUser
    if (payload.guild) this.guildId=payload.guildId
    if (payload.user) this.user=payload.user as User
    console.log("it worked ig")
  }

}
    
export default DDBaseInteraction
