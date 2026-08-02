import { Router, type IRouter, type Request } from "express";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { db, packagesTable, usersTable, packageHistoryTable, notificationsTable } from "@workspace/db";
import {
  CreatePackageBody,
  UpdatePackageBody,
  GetPackageParams,
  UpdatePackageParams,
  DeletePackageParams,
  AddPackageStatusParams,
  AddPackageStatusBody,
  RestorePackageParams,
  ListPackagesQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import multer from "multer";
import * as XLSX from "xlsx";
import type { User } from "@workspace/db";

type AuthedRequest = Request & { user: User };

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const STATUS_LABELS: Record<string, string> = {
  created: "Создана",
  accepted_china: "Принята на китайском складе",
  departed_china: "Выехала с китайского склада",
  arrived_almaty: "Прибыла в Алматы",
  departed_almaty: "Выехала из Алматы",
  arrived_city: "Поступила в город получателя",
  ready_pickup: "Готова к выдаче",
  delivered: "Выдана",
};

async function getPackageWithUser(packageId: number) {
  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(eq(packagesTable.id, packageId));
  if (!pkg) return null;

  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.id, pkg.userId));

  return {
    ...pkg,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
    user: user ? { ...user, createdAt: user.createdAt.toISOString() } : null,
  };
}

// GET /packages
router.get("/packages", requireAuth, async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const queryParsed = ListPackagesQueryParams.safeParse(req.query);

  const archived = req.query.archived === "true" ? true : req.query.archived === "false" ? false : undefined;
  const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const userIdFilter = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;

  // Build conditions
  const conditions: ReturnType<typeof eq>[] = [];

  if (user.role !== "admin") {
    conditions.push(eq(packagesTable.userId, user.id));
  } else if (userIdFilter) {
    conditions.push(eq(packagesTable.userId, userIdFilter));
  }

  if (archived !== undefined) {
    conditions.push(eq(packagesTable.archived, archived));
  }

  if (statusFilter) {
    conditions.push(eq(packagesTable.status, statusFilter));
  }

  let packages = await db
    .select()
    .from(packagesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(packagesTable.updatedAt));

  // Apply search (join with users for admin)
  if (search && user.role === "admin") {
    const allUsers = await db.select().from(usersTable);
    const matchingUserIds = allUsers
      .filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search))
      .map(u => u.id);

    packages = packages.filter(p =>
      p.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      matchingUserIds.includes(p.userId)
    );
  } else if (search) {
    packages = packages.filter(p =>
      p.trackingNumber.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Attach user info
  const userIds = [...new Set(packages.map(p => p.userId))];
  const users = userIds.length > 0 ? await db.select().from(usersTable).where(
    userIds.length === 1 ? eq(usersTable.id, userIds[0]) : or(...userIds.map(id => eq(usersTable.id, id)))
  ) : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  const result = packages.map(p => {
    const u = userMap.get(p.userId);
    return {
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      user: u ? { id: u.id, name: u.name, phone: u.phone, role: u.role, createdAt: u.createdAt.toISOString() } : null,
    };
  });

  res.json(result);
});

// POST /packages
router.post("/packages", requireAuth, async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const parsed = CreatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { trackingNumber, description, weight, deliveryCost, userId } = parsed.data;
  const targetUserId = user.role === "admin" && userId ? userId : user.id;

  const [pkg] = await db
    .insert(packagesTable)
    .values({
      trackingNumber,
      description: description ?? null,
      weight: weight ?? null,
      deliveryCost: deliveryCost ?? null,
      status: "created",
      userId: targetUserId,
    })
    .returning();

  // Add initial history entry
  await db.insert(packageHistoryTable).values({
    packageId: pkg.id,
    status: "created",
    changedBy: user.id,
  });

  const result = await getPackageWithUser(pkg.id);
  res.status(201).json(result);
});

// GET /packages/stats
router.get("/packages/stats", requireAuth, async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Доступ запрещён" });
    return;
  }

  const all = await db.select().from(packagesTable);
  const total = all.length;
  const active = all.filter(p => !p.archived && p.status !== "delivered").length;
  const readyPickup = all.filter(p => p.status === "ready_pickup" && !p.archived).length;
  const archived = all.filter(p => p.archived).length;

  const recentPkgs = await db
    .select()
    .from(packagesTable)
    .orderBy(desc(packagesTable.updatedAt))
    .limit(10);

  const userIds = [...new Set(recentPkgs.map(p => p.userId))];
  const users = userIds.length > 0 ? await db.select().from(usersTable).where(
    userIds.length === 1 ? eq(usersTable.id, userIds[0]) : or(...userIds.map(id => eq(usersTable.id, id)))
  ) : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  const recentChanges = recentPkgs.map(p => {
    const u = userMap.get(p.userId);
    return {
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      user: u ? { id: u.id, name: u.name, phone: u.phone, role: u.role, createdAt: u.createdAt.toISOString() } : null,
    };
  });

  res.json({ total, active, readyPickup, archived, recentChanges });
});

// GET /packages/export
router.get("/packages/export", requireAuth, async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Доступ запрещён" });
    return;
  }

  const packages = await db.select().from(packagesTable).orderBy(desc(packagesTable.createdAt));
  const userIds = [...new Set(packages.map(p => p.userId))];
  const users = userIds.length > 0 ? await db.select().from(usersTable).where(
    userIds.length === 1 ? eq(usersTable.id, userIds[0]) : or(...userIds.map(id => eq(usersTable.id, id)))
  ) : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  const result = packages.map(p => {
    const u = userMap.get(p.userId);
    return {
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      user: u ? { id: u.id, name: u.name, phone: u.phone, role: u.role, createdAt: u.createdAt.toISOString() } : null,
    };
  });

  res.json({ packages: result });
});

// POST /packages/import (multipart)
router.post("/packages/import", requireAuth, upload.single("file"), async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Доступ запрещён" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Файл не загружен" });
    return;
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    let updated = 0;
    let created = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const trackingNumber = String(row["Трек-номер"] || row["trackingNumber"] || "").trim();
        if (!trackingNumber) {
          errors.push(`Пропущена строка без трек-номера`);
          continue;
        }

        const updateData: Record<string, unknown> = {};
        if (row["Статус"] || row["status"]) updateData.status = row["Статус"] || row["status"];
        if (row["Вес"] || row["weight"]) updateData.weight = parseFloat(String(row["Вес"] || row["weight"]));
        if (row["Стоимость"] || row["deliveryCost"]) updateData.deliveryCost = parseFloat(String(row["Стоимость"] || row["deliveryCost"]));
        if (row["Комментарий"] || row["adminComment"]) updateData.adminComment = String(row["Комментарий"] || row["adminComment"]);

        const [existing] = await db.select().from(packagesTable).where(eq(packagesTable.trackingNumber, trackingNumber));

        if (existing) {
          await db.update(packagesTable).set(updateData as Record<string, unknown>).where(eq(packagesTable.id, existing.id));
          updated++;
        } else {
          const description = String(row["Описание"] || row["description"] || "").trim() || null;
          await db.insert(packagesTable).values({
            trackingNumber,
            description,
            weight: updateData.weight as number | null ?? null,
            deliveryCost: updateData.deliveryCost as number | null ?? null,
            status: String(updateData.status || "created"),
            adminComment: updateData.adminComment as string | null ?? null,
            userId: user.id,
          });
          created++;
        }
      } catch (e) {
        errors.push(`Ошибка в строке: ${JSON.stringify(row)}`);
      }
    }

    res.json({ updated, created, errors });
  } catch (e) {
    res.status(400).json({ error: "Не удалось обработать файл Excel" });
  }
});

// GET /packages/:id
router.get("/packages/:id", requireAuth, async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const params = GetPackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(eq(packagesTable.id, params.data.id));

  if (!pkg) {
    res.status(404).json({ error: "Посылка не найдена" });
    return;
  }

  if (user.role !== "admin" && pkg.userId !== user.id) {
    res.status(403).json({ error: "Доступ запрещён" });
    return;
  }

  const [pkgUser] = await db
    .select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.id, pkg.userId));

  const history = await db
    .select()
    .from(packageHistoryTable)
    .where(eq(packageHistoryTable.packageId, pkg.id))
    .orderBy(packageHistoryTable.changedAt);

  res.json({
    ...pkg,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
    user: pkgUser ? { ...pkgUser, createdAt: pkgUser.createdAt.toISOString() } : null,
    history: history.map(h => ({
      ...h,
      changedAt: h.changedAt.toISOString(),
    })),
  });
});

// PATCH /packages/:id
router.patch("/packages/:id", requireAuth, async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const params = UpdatePackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, params.data.id));
  if (!pkg) {
    res.status(404).json({ error: "Посылка не найдена" });
    return;
  }

  if (user.role !== "admin" && pkg.userId !== user.id) {
    res.status(403).json({ error: "Доступ запрещён" });
    return;
  }

  // Clients can only edit description
  const updateData = user.role === "admin"
    ? parsed.data
    : { description: parsed.data.description };

  const [updated] = await db
    .update(packagesTable)
    .set(updateData)
    .where(eq(packagesTable.id, params.data.id))
    .returning();

  const result = await getPackageWithUser(updated.id);
  res.json(result);
});

// DELETE /packages/:id
router.delete("/packages/:id", requireAuth, async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const params = DeletePackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, params.data.id));
  if (!pkg) {
    res.status(404).json({ error: "Посылка не найдена" });
    return;
  }

  // Clients can only delete if status is 'created'
  if (user.role !== "admin") {
    if (pkg.userId !== user.id) {
      res.status(403).json({ error: "Доступ запрещён" });
      return;
    }
    if (pkg.status !== "created") {
      res.status(400).json({ error: "Нельзя удалить посылку после принятия на складе" });
      return;
    }
  }

  await db.delete(packagesTable).where(eq(packagesTable.id, params.data.id));
  res.sendStatus(204);
});

// POST /packages/:id/status
router.post("/packages/:id/status", requireAuth, async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Доступ запрещён" });
    return;
  }

  const params = AddPackageStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AddPackageStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, params.data.id));
  if (!pkg) {
    res.status(404).json({ error: "Посылка не найдена" });
    return;
  }

  const newStatus = parsed.data.status;
  const shouldArchive = newStatus === "delivered";

  // Update package status
  const [updated] = await db
    .update(packagesTable)
    .set({ status: newStatus, archived: shouldArchive, updatedAt: new Date() })
    .where(eq(packagesTable.id, params.data.id))
    .returning();

  // Add history entry
  await db.insert(packageHistoryTable).values({
    packageId: pkg.id,
    status: newStatus,
    changedBy: user.id,
  });

  // Notify the package owner
  const statusLabel = STATUS_LABELS[newStatus] || newStatus;
  await db.insert(notificationsTable).values({
    userId: pkg.userId,
    packageId: pkg.id,
    message: `Статус посылки ${pkg.trackingNumber} изменён: ${statusLabel}`,
    read: false,
  });

  const result = await getPackageWithUser(updated.id);
  res.status(201).json(result);
});

// POST /packages/:id/restore
router.post("/packages/:id/restore", requireAuth, async (req: Request, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Доступ запрещён" });
    return;
  }

  const params = RestorePackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, params.data.id));
  if (!pkg) {
    res.status(404).json({ error: "Посылка не найдена" });
    return;
  }

  const [updated] = await db
    .update(packagesTable)
    .set({ archived: false, status: "ready_pickup", updatedAt: new Date() })
    .where(eq(packagesTable.id, params.data.id))
    .returning();

  const result = await getPackageWithUser(updated.id);
  res.json(result);
});

export default router;
