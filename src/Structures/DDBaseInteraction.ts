import {
  DiscordInteractionTypes,
  DiscordInteractionResponsesTypes,
  User,
  Interaction
} from "../../deps.ts"

import DDMember from "./DDMember.ts";
import DDGuild from "./DDGuild.ts"
import Client from "../Client.ts";
import Base from "./Base.ts";

export class DDBaseInteraction extends Base {
   /** Id of the interaction */
  id: string;
  /** Id of the application this interaction is for */
  applicationId: string;
  /** The type of interaction */
  type: DiscordInteractionTypes;
  /** The guild it was sent from */
  guild?: DDGuild;
  /** The channel it was sent from */
  channelId?: string;
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
    this.update(client,payload)
  }

  update(client: Client, payload: Interaction) {
    this.id=payload.id
    this.applicationId=payload.applicationId
    this.guildId=payload.guild_id
    this.applicationId=payload.application_id
    this.type=payload.type
    this.guildId=payload.guild_id
    this.user=payload?.user as User
    console.log("it worked ig")
  }

}
    
export default DDBaseInteraction
