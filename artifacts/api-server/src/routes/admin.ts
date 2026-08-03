import { Router, type IRouter, type Request } from "express";
import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { ResetClientPasswordBody } from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/admin/clients", requireAdmin, async (_req: Request, res): Promise<void> => {
  const clients = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      phone: usersTable.phone,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.role, "client"))
    .orderBy(asc(usersTable.createdAt));

  res.json(
    clients.map((client) => ({
      ...client,
      createdAt: client.createdAt.toISOString(),
    })),
  );
});

router.post("/admin/clients/:id/password", requireAdmin, async (req: Request, res): Promise<void> => {
  const clientId = Number(req.params.id);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    res.status(400).json({ error: "Некорректный идентификатор клиента" });
    return;
  }

  const parsed = ResetClientPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message || "Некорректный пароль" });
    return;
  }

  const [client] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, clientId));

  if (!client || client.role !== "client") {
    res.status(404).json({ error: "Клиент не найден" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.id, clientId));

  res.json({
    message: "Пароль клиента обновлён",
    password: parsed.data.password,
  });
});

export default router;