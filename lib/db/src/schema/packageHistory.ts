import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { packagesTable } from "./packages";
import { usersTable } from "./users";

export const packageHistoryTable = pgTable("package_history", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id")
    .notNull()
    .references(() => packagesTable.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  changedBy: integer("changed_by").references(() => usersTable.id, { onDelete: "set null" }),
});

export const insertPackageHistorySchema = createInsertSchema(packageHistoryTable).omit({
  id: true,
  changedAt: true,
});
export type InsertPackageHistory = z.infer<typeof insertPackageHistorySchema>;
export type PackageHistory = typeof packageHistoryTable.$inferSelect;
