import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  date,
  pgEnum,
  integer,
  time,
} from "drizzle-orm/pg-core";

// pgEnum defines a fixed set of allowed string values at the database level —
// Postgres itself will reject any row that tries to use a value outside this list.
export const userRoleEnum = pgEnum("user_role", ["admin", "worker"]);
export const userStatusEnum = pgEnum("user_status", [
  "invited",
  "active",
  "inactive",
]);

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("worker"),
  status: userStatusEnum("status").notNull().default("invited"),
  // A worker is usually tied to one site; admins leave this null.
  siteId: integer("site_id").references(() => sites.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  siteId: integer("site_id")
    .references(() => sites.id)
    .notNull(),
  entryDate: date("entry_date").notNull(),
  description: text("description").notNull(),
  materialOnSite: boolean("material_on_site").notNull().default(false),
  hasExtraPaidWork: boolean("has_extra_paid_work").notNull().default(false),
  hasProblems: boolean("has_problems").notNull().default(false),
  needsOrder: boolean("needs_order").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const entryImages = pgTable("entry_images", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id")
    .references(() => entries.id)
    .notNull(),
  // We don't store the raw image here — just the key/path used to fetch
  // it from Cloudflare R2 and generate a short-lived signed URL on demand.
  storageKey: text("storage_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Single-row table holding app-wide settings, e.g. the daily notification time.
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  notificationTime: time("notification_time").notNull().default("16:00:00"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
