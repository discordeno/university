// deno-lint-ignore-file require-await no-explicit-any
import { Collection, TableName } from "../../deps.ts";
import Client from "../Client.ts";

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
    value: DiscordenoGuild
  ): Promise<Collection<bigint, DiscordenoGuild>>;
  set(
    table: "channels",
    key: bigint,
    value: DiscordenoChannel
  ): Promise<Collection<bigint, DiscordenoChannel>>;
  set(
    table: "messages",
    key: bigint,
    value: DiscordenoMessage
  ): Promise<Collection<bigint, DiscordenoMessage>>;
  set(
    table: "members",
    key: bigint,
    value: DiscordenoMember
  ): Promise<Collection<bigint, DiscordenoMember>>;
  set(
    table: "presences",
    key: bigint,
    value: PresenceUpdate
  ): Promise<Collection<bigint, PresenceUpdate>>;
  set(
    table: "unavailableGuilds",
    key: bigint,
    value: number
  ): Promise<Collection<bigint, number>>;
  async set(table: TableName, key: bigint, value: any) {
    return this.client[table].set(key, value);
  }

  /** Get the value from the client using its key */
  get(table: "guilds", key: bigint): Promise<DiscordenoGuild | undefined>;
  get(table: "channels", key: bigint): Promise<DiscordenoChannel | undefined>;
  get(table: "messages", key: bigint): Promise<DiscordenoMessage | undefined>;
  get(table: "members", key: bigint): Promise<DiscordenoMember | undefined>;
  get(table: "presences", key: bigint): Promise<PresenceUpdate | undefined>;
  get(table: "unavailableGuilds", key: bigint): Promise<number | undefined>;
  async get(table: TableName, key: bigint) {
    return this.client[table].get(key);
  }

  /** Run a function on all items in this client */
  forEach(
    table: "guilds",
    callback: (
      value: DiscordenoGuild,
      key: bigint,
      map: Map<bigint, DiscordenoGuild>
    ) => unknown
  ): void;
  forEach(
    table: "unavailableGuilds",
    callback: (value: number, key: bigint, map: Map<bigint, number>) => unknown
  ): void;
  forEach(
    table: "channels",
    callback: (
      value: DiscordenoChannel,
      key: bigint,
      map: Map<bigint, DiscordenoChannel>
    ) => unknown
  ): void;
  forEach(
    table: "messages",
    callback: (
      value: DiscordenoMessage,
      key: bigint,
      map: Map<bigint, DiscordenoMessage>
    ) => unknown
  ): void;
  forEach(
    table: "members",
    callback: (
      value: DiscordenoMember,
      key: bigint,
      map: Map<bigint, DiscordenoMember>
    ) => unknown
  ): void;
  forEach(
    table: TableName,
    callback: (value: any, key: bigint, map: Map<bigint, any>) => unknown
  ) {
    return this.client[table].forEach(callback);
  }

  /** Allows you to filter our all items in this client. */
  filter(
    table: "guilds",
    callback: (value: DiscordenoGuild, key: bigint) => boolean
  ): Promise<Collection<bigint, DiscordenoGuild>>;
  filter(
    table: "unavailableGuilds",
    callback: (value: number, key: bigint) => boolean
  ): Promise<Collection<bigint, number>>;
  filter(
    table: "channels",
    callback: (value: DiscordenoChannel, key: bigint) => boolean
  ): Promise<Collection<bigint, DiscordenoChannel>>;
  filter(
    table: "messages",
    callback: (value: DiscordenoMessage, key: bigint) => boolean
  ): Promise<Collection<bigint, DiscordenoMessage>>;
  filter(
    table: "members",
    callback: (value: DiscordenoMember, key: bigint) => boolean
  ): Promise<Collection<bigint, DiscordenoMember>>;
  async filter(
    table: TableName,
    callback: (value: any, key: bigint) => boolean
  ) {
    return this.client[table].filter(callback);
  }
}

export default CacheManager;
