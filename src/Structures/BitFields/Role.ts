import Bitfield from "./Bitfield.ts";

export const roleToggles = {
  /** If this role is showed seperately in the user listing */
  hoist: 1n,
  /** Whether this role is managed by an integration */
  managed: 2n,
  /** Whether this role is mentionable */
  mentionable: 4n,
  /** If this role is the nitro boost role. */
  isNitroBoostRole: 8n,
};

export class RoleBitField extends Bitfield {
  constructor(bits: bigint) {
    super(bits);
  }

  /** Whether or not this role is hoisted. */
  get hoist() {
    return this.has(roleToggles.hoist);
  }

  /** Whether or not the role is managed by everyone. */
  get managed() {
    return this.has(roleToggles.managed);
  }

  /** Change whether or not the role is mentionable. */
  get mentionable() {
    return this.has(roleToggles.mentionable);
  }

  /** Whether or not the role is the nitro booster role in this server. */
  get isNitroBoost() {
    return this.has(roleToggles.isNitroBoostRole);
  }
}

export default RoleBitField;
