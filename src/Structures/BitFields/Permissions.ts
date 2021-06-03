import {
  DiscordBitwisePermissionFlags,
  PermissionStrings,
} from "../../../deps.ts";
import Bitfield from "./Bitfield.ts";

export class Permissions extends Bitfield {
  constructor(bits: bigint) {
    super(bits);
  }

  /** Checks if ALL the permissions are allowed. */
  allows(permissions: PermissionStrings[]) {
    // ADMINS ALWAYS HAVE ALL PERMS!
    if (super.has(BigInt(DiscordBitwisePermissionFlags.ADMINISTRATOR))) {
      return true;
    }

    return permissions.every((permission) =>
      super.has(BigInt(DiscordBitwisePermissionFlags[permission]))
    );
  }

  /** Checks if any of the permissions are denied. */
  denies(permissions: PermissionStrings[]) {
    return !this.allows(permissions);
  }

  /** Checks which of the permissions are missing. */
  missing(permissions: PermissionStrings[]) {
    return permissions.filter((permission) => this.allows([permission]));
  }
}

export default Permissions;
