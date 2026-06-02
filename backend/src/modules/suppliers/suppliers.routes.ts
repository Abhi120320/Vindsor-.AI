import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { prisma } from "../../database/prisma";

const router = Router();

router.get("/", authenticate, async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({ include: { user: true } });
  res.json({ suppliers });
});

export default router;
