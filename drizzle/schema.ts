import { customType, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

const mediumBlob = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "mediumblob" });

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Cloud-synced application snapshot; one row is owned by each authenticated user. */
export const nyvoUserState = mysqlTable("nyvo_user_state", {
  userId: int("userId").notNull().primaryKey().references(() => users.id, { onDelete: "cascade" }),
  schemaVersion: int("schemaVersion").notNull(),
  revision: int("revision").notNull().default(0),
  payload: json("payload").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Binary receipt storage. The API always scopes access by both receipt id and owner. */
export const nyvoReceipts = mysqlTable("nyvo_receipts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  mimeType: varchar("mimeType", { length: 32 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  bytes: mediumBlob("bytes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
