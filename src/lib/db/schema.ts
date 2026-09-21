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
export const mediaKindEnum = pgEnum("media_kind", ["image", "video"]);

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
  materialOnSite: boolean("material_on_site").notNull().default(true),
  materialMissingNote: text("material_missing_note"),
  hasExtraPaidWork: boolean("has_extra_paid_work").notNull().default(false),
  extraPaidWorkNote: text("extra_paid_work_note"),
  hasProblems: boolean("has_problems").notNull().default(false),
  problemsNote: text("problems_note"),
  needsOrder: boolean("needs_order").notNull().default(false),
  orderNote: text("order_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const entryImages = pgTable("entry_images", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id")
    .references(() => entries.id)
    .notNull(),
  // We don't store the raw file here — just the key/path used to fetch
  // it from Cloudflare R2 and generate a short-lived signed URL on demand.
  // Despite the table name, a row can be a photo or a video — kind says
  // which, so the admin gallery knows whether to render an <img> or a
  // <video>. Renaming the table wasn't worth the migration churn.
  storageKey: text("storage_key").notNull(),
  kind: mediaKindEnum("kind").notNull().default("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// The admin can configure any number of independent reminders (e.g. a
// morning one and an evening one, each with its own wording) rather than
// one hardcoded daily notification — each row here is one of those.
export const notificationSchedules = pgTable("notification_schedules", {
  id: serial("id").primaryKey(),
  // What the push notification actually says — admin-editable, not a
  // hardcoded string in the app's code.
  message: text("message").notNull(),
  notificationTime: time("notification_time").notNull().default("16:00:00"),
  // Which days of the week this reminder goes out, as JS Date.getDay()
  // values (0=Sunday..6=Saturday) — lets the admin skip weekends, or
  // include a half-day Saturday, etc. Defaults to every day.
  notifyDays: integer("notify_days")
    .array()
    .notNull()
    .default([0, 1, 2, 3, 4, 5, 6]),
  // Tracks the last date THIS schedule actually sent, so a cron job that
  // runs every few minutes doesn't send the same day's reminder twice if
  // its run happens to land on the target time more than once — and so
  // multiple schedules don't interfere with each other's send history.
  lastNotifiedDate: date("last_notified_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// One row per browser/device a worker has enabled notifications on — a
// worker using two phones gets two rows, both should receive the push.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
