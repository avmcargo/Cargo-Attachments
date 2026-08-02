import { Router, type IRouter, type Request } from "express";
import { eq, desc } from "drizzle-orm";
import { db, notificationsTable, packagesTable, usersTable } from "@workspace/db";
import { MarkNotificationReadParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { User } from "@workspace/db";

type AuthedRequest = Request & { user: User };

const router: IRouter = Router();

// GET /notifications
router.get("/notifications", requireAuth, async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  // Attach package info
  const packageIds = notifications
    .map(n => n.packageId)
    .filter((id): id is number => id !== null);

  const packages = packageIds.length > 0
    ? await db.select().from(packagesTable).where(
        packageIds.length === 1
          ? eq(packagesTable.id, packageIds[0])
          : eq(packagesTable.id, packageIds[0]) // fallback; will be overridden by loop
      )
    : [];

  // Fetch all relevant packages
  const allPkgs = packageIds.length > 0
    ? await Promise.all(packageIds.map(id =>
        db.select().from(packagesTable).where(eq(packagesTable.id, id)).then(r => r[0])
      ))
    : [];
  const pkgMap = new Map(allPkgs.filter(Boolean).map(p => [p!.id, p!]));

  const userIds = [...new Set(allPkgs.filter(Boolean).map(p => p!.userId))];
  const users = userIds.length > 0
    ? await Promise.all(userIds.map(id =>
        db.select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, role: usersTable.role, createdAt: usersTable.createdAt })
          .from(usersTable)
          .where(eq(usersTable.id, id))
          .then(r => r[0])
      ))
    : [];
  const userMap = new Map(users.filter(Boolean).map(u => [u!.id, u!]));

  const result = notifications.map(n => {
    const pkg = n.packageId ? pkgMap.get(n.packageId) : null;
    const pkgUser = pkg ? userMap.get(pkg.userId) : null;
    return {
      ...n,
      createdAt: n.createdAt.toISOString(),
      package: pkg ? {
        ...pkg,
        createdAt: pkg.createdAt.toISOString(),
        updatedAt: pkg.updatedAt.toISOString(),
        user: pkgUser ? { ...pkgUser, createdAt: pkgUser.createdAt.toISOString() } : null,
      } : null,
    };
  });

  res.json(result);
});

// PATCH /notifications/:id/read
router.patch("/notifications/:id/read", requireAuth, async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [notification] = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.id, params.data.id));

  if (!notification || notification.userId !== user.id) {
    res.status(404).json({ error: "Уведомление не найдено" });
    return;
  }

  const [updated] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.id, params.data.id))
    .returning();

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// POST /notifications/read-all
router.post("/notifications/read-all", requireAuth, async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.userId, user.id));

  res.json({ message: "Все уведомления отмечены как прочитанные" });
});

export default router;
