import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { prisma } from "../../database/prisma";
import { listNotifications } from "./notifications.service";

const router = Router();

router.get("/", authenticate, async (req: any, res) => {
  const notifications = await listNotifications(req.user.userId);
  res.json({ notifications });
});

router.put("/:id/read", authenticate, async (req: any, res) => {
  const notification = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  res.json({ notification });
});

export default router;
