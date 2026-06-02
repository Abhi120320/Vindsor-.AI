import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { prisma } from "../../database/prisma";

const router = Router();

router.get("/", authenticate, async (_req, res) => {
  const vendors = await prisma.vendor.findMany({ include: { user: true } });
  res.json({ vendors });
});

export default router;
