import {
  DiscordInteractionTypes,
  DiscordInteractionResponsesTypes,
  User,
  Interaction
} from "../../deps.ts"

import DDMember from "./DDMember.ts";
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
  guildId?: string;
  /** The channel it was sent from */
  channelId?: string;
  /** Guild member data for the invoking user, including permissions */
  member?: DDMember;
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
    this.update(payload)
  }

  update(payload: Interaction) {
    this.id=payload.id
    this.applicationId=payload.applicationId
    console.log(payload.token)
  }

}
    
