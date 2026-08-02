import { pgTable, serial, text, timestamp, real, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const PACKAGE_STATUSES = [
  "created",
  "accepted_china",
  "departed_china",
  "arrived_almaty",
  "departed_almaty",
  "arrived_city",
  "ready_pickup",
  "delivered",
] as const;

export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

export const packagesTable = pgTable("packages", {
  id: serial("id").primaryKey(),
  trackingNumber: text("tracking_number").notNull(),
  description: text("description"),
  weight: real("weight"),
  deliveryCost: real("delivery_cost"),
  status: text("status").notNull().default("created"),
  adminComment: text("admin_comment"),
  archived: boolean("archived").notNull().default(false),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPackageSchema = createInsertSchema(packagesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packagesTable.$inferSelect;
