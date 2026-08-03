import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import packagesRouter from "./packages";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(packagesRouter);
router.use(notificationsRouter);
router.use(adminRouter);

export default router;
