// deno-lint-ignore-file require-await no-explicit-any
import { Collection, PresenceUpdate, TableName } from "../../deps.ts";
import Client from "../Client.ts";
import DDChannel from "../Structures/DDChannel.ts";
import DDGuild from "../Structures/DDGuild.ts";
import DDMember from "../Structures/DDMember.ts";
import DDMessage from "../Structures/DDMessage.ts";

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
    value: DDGuild
  ): Promise<Collection<bigint, DDGuild>>;
  set(
    table: "channels",
    key: bigint,
    value: DDChannel
  ): Promise<Collection<bigint, DDChannel>>;
  set(
    table: "messages",
    key: bigint,
    value: DDMessage
  ): Promise<Collection<bigint, DDMessage>>;
  set(
    table: "members",
    key: bigint,
    value: DDMember
  ): Promise<Collection<bigint, DDMember>>;
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
  async get(table: "guilds", key: bigint): Promise<DDGuild | undefined>;
  async get(table: "channels", key: bigint): Promise<DDChannel | undefined>;
  async get(table: "messages", key: bigint): Promise<DDMessage | undefined>;
  async get(table: "members", key: bigint): Promise<DDMember | undefined>;
  async get(
    table: "presences",
    key: bigint
  ): Promise<PresenceUpdate | undefined>;
  async get(
    table: "unavailableGuilds",
    key: bigint
  ): Promise<number | undefined>;
  async get(
    table: TableName,
    key: bigint
  ): Promise<
    | DDGuild
    | DDChannel
    | DDMessage
    | DDMember
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
      value: DDGuild,
      key: bigint,
      map: Map<bigint, DDGuild>
    ) => unknown
  ): void;
  forEach(
    table: "unavailableGuilds",
    callback: (value: number, key: bigint, map: Map<bigint, number>) => unknown
  ): void;
  forEach(
    table: "channels",
    callback: (
      value: DDChannel,
      key: bigint,
      map: Map<bigint, DDChannel>
    ) => unknown
  ): void;
  forEach(
    table: "messages",
    callback: (
      value: DDMessage,
      key: bigint,
      map: Map<bigint, DDMessage>
    ) => unknown
  ): void;
  forEach(
    table: "members",
    callback: (
      value: DDMember,
      key: bigint,
      map: Map<bigint, DDMember>
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
    callback: (value: DDGuild, key: bigint) => boolean
  ): Promise<Collection<bigint, DDGuild>>;
  filter(
    table: "unavailableGuilds",
    callback: (value: number, key: bigint) => boolean
  ): Promise<Collection<bigint, number>>;
  filter(
    table: "channels",
    callback: (value: DDChannel, key: bigint) => boolean
  ): Promise<Collection<bigint, DDChannel>>;
  filter(
    table: "messages",
    callback: (value: DDMessage, key: bigint) => boolean
  ): Promise<Collection<bigint, DDMessage>>;
  filter(
    table: "members",
    callback: (value: DDMember, key: bigint) => boolean
  ): Promise<Collection<bigint, DDMember>>;
  async filter(
    table: TableName,
    callback: (value: any, key: bigint) => boolean
  ) {
    return this.client[table].filter(callback);
  }
}

export default CacheManager;
