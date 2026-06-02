import { Router } from "express";
import { prisma } from "../../database/prisma";
import { syncRescueDealsAndNotify } from "../../services/rescue/rescue.service";

const router = Router();

router.get("/vendors", async (_req, res) => {
  const vendors = await prisma.vendor.findMany({
    include: { user: { select: { phone: true, name: true } } },
    orderBy: { rating: "desc" },
  });
  res.json({ vendors });
});

router.get("/suppliers", async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({ orderBy: { rating: "desc" } });
  res.json({ suppliers });
});

router.get("/products", async (_req, res) => {
  await syncRescueDealsAndNotify();
  const products = await prisma.product.findMany({
    include: { vendor: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ products });
});

router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "");
  const [products, vendors, suppliers] = await Promise.all([
    prisma.product.findMany({ where: { name: { contains: q, mode: "insensitive" } } }),
    prisma.vendor.findMany({ where: { businessName: { contains: q, mode: "insensitive" } } }),
    prisma.supplier.findMany({ where: { businessName: { contains: q, mode: "insensitive" } } }),
  ]);

  res.json({ products, vendors, suppliers });
});

export default router;
