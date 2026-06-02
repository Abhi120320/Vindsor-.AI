import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import { prisma } from "../../database/prisma";

const router = Router();

router.get("/", authenticate, authorize("ADMIN"), async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { vendor: true, supplier: true },
  });
  res.json({ users });
});

export default router;
