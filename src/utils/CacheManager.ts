// deno-lint-ignore-file require-await no-explicit-any
import { Collection, PresenceUpdate, TableName } from "../../deps.ts";
import Client from "../Client.ts";
import UniversityChannel from "../Structures/UniversityChannel.ts";
import UniversityGuild from "../Structures/UniversityGuild.ts";
import UniversityMember from "../Structures/UniversityMember.ts";
import UniversityMessage from "../Structures/UniversityMessage.ts";

export class CacheManager {
  /** The client for whome this is managing. */
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /** Deletes all items from the client */
  async clear(table: TableName) {
    return this.client[table].clear();
  }

  /** Deletes 1 item from client using the key */
  async delete(table: TableName, key: bigint) {
    return this.client[table].delete(key);
  }
  /** Check if something exists in client with a key */
  async has(table: TableName, key: bigint) {
    return this.client[table].has(key);
  }

  /** Get the number of key-value pairs */
  async size(table: TableName) {
    return this.client[table].size;
  }

  /** Add a key value pair to the client */
  set(
    table: "guilds",
    key: bigint,
    value: UniversityGuild,
  ): Promise<Collection<bigint, UniversityGuild>>;
  set(
    table: "channels",
    key: bigint,
    value: UniversityChannel,
  ): Promise<Collection<bigint, UniversityChannel>>;
  set(
    table: "messages",
    key: bigint,
    value: UniversityMessage,
  ): Promise<Collection<bigint, UniversityMessage>>;
  set(
    table: "members",
    key: bigint,
    value: UniversityMember,
  ): Promise<Collection<bigint, UniversityMember>>;
  set(
    table: "presences",
    key: bigint,
    value: PresenceUpdate,
  ): Promise<Collection<bigint, PresenceUpdate>>;
  set(
    table: "unavailableGuilds",
    key: bigint,
    value: number,
  ): Promise<Collection<bigint, number>>;
  async set(table: TableName, key: bigint, value: any) {
    return this.client[table].set(key, value);
  }

  /** Get the value from the client using its key */
  async get(table: "guilds", key: bigint): Promise<UniversityGuild | undefined>;
  async get(
    table: "channels",
    key: bigint,
  ): Promise<UniversityChannel | undefined>;
  async get(
    table: "messages",
    key: bigint,
  ): Promise<UniversityMessage | undefined>;
  async get(
    table: "members",
    key: bigint,
  ): Promise<UniversityMember | undefined>;
  async get(
    table: "presences",
    key: bigint,
  ): Promise<PresenceUpdate | undefined>;
  async get(
    table: "unavailableGuilds",
    key: bigint,
  ): Promise<number | undefined>;
  async get(
    table: TableName,
    key: bigint,
  ): Promise<
    | UniversityGuild
    | UniversityChannel
    | UniversityMessage
    | UniversityMember
    | PresenceUpdate
    | number
    | undefined
  > {
    return this.client[table].get(key);
  }

  /** Run a function on all items in this client */
  forEach(
    table: "guilds",
    callback: (
      value: UniversityGuild,
      key: bigint,
      map: Map<bigint, UniversityGuild>,
    ) => unknown,
  ): void;
  forEach(
    table: "unavailableGuilds",
    callback: (value: number, key: bigint, map: Map<bigint, number>) => unknown,
  ): void;
  forEach(
    table: "channels",
    callback: (
      value: UniversityChannel,
      key: bigint,
      map: Map<bigint, UniversityChannel>,
    ) => unknown,
  ): void;
  forEach(
    table: "messages",
    callback: (
      value: UniversityMessage,
      key: bigint,
      map: Map<bigint, UniversityMessage>,
    ) => unknown,
  ): void;
  forEach(
    table: "members",
    callback: (
      value: UniversityMember,
      key: bigint,
      map: Map<bigint, UniversityMember>,
    ) => unknown,
  ): void;
  forEach(
    table: TableName,
    callback: (value: any, key: bigint, map: Map<bigint, any>) => unknown,
  ) {
    return this.client[table].forEach(callback);
  }

  /** Allows you to filter our all items in this client. */
  filter(
    table: "guilds",
    callback: (value: UniversityGuild, key: bigint) => boolean,
  ): Promise<Collection<bigint, UniversityGuild>>;
  filter(
    table: "unavailableGuilds",
    callback: (value: number, key: bigint) => boolean,
  ): Promise<Collection<bigint, number>>;
  filter(
    table: "channels",
    callback: (value: UniversityChannel, key: bigint) => boolean,
  ): Promise<Collection<bigint, UniversityChannel>>;
  filter(
    table: "messages",
    callback: (value: UniversityMessage, key: bigint) => boolean,
  ): Promise<Collection<bigint, UniversityMessage>>;
  filter(
    table: "members",
    callback: (value: UniversityMember, key: bigint) => boolean,
  ): Promise<Collection<bigint, UniversityMember>>;
  async filter(
    table: TableName,
    callback: (value: any, key: bigint) => boolean,
  ) {
    return this.client[table].filter(callback);
  }
}

export default CacheManager;
