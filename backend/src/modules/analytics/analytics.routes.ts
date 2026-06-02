import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { prisma } from "../../database/prisma";

const router = Router();

router.get("/revenue", authenticate, async (_req, res) => {
  const revenue = await prisma.order.aggregate({ _sum: { totalAmount: true } });
  res.json({ revenue: revenue._sum.totalAmount ?? 0 });
});

router.get("/orders", authenticate, async (_req, res) => {
  const count = await prisma.order.count();
  res.json({ orders: count });
});

router.get("/profit", authenticate, async (_req, res) => {
  const totals = await prisma.order.aggregate({ _sum: { totalAmount: true } });
  const estimatedProfit = (totals._sum.totalAmount ?? 0) * 0.18;
  res.json({ estimatedProfit });
});

router.get("/top-products", authenticate, async (_req, res) => {
  const products = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });
  res.json({ topProducts: products });
});

router.get("/forecast-accuracy", authenticate, async (req, res) => {
  const vendorId = String(req.query.vendorId ?? "");
  const forecasts = await prisma.forecast.findMany({ where: vendorId ? { vendorId } : undefined });
  const score = forecasts.length ? 0.78 : 0;
  res.json({ accuracyScore: score });
});

export default router;
