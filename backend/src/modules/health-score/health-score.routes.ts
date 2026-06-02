import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { prisma } from "../../database/prisma";
import { getSocket } from "../../socket";

const router = Router();

router.get("/:vendorId", authenticate, async (req, res) => {
  const vendorId = String(req.params.vendorId);
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { products: true, sellerOrders: true },
  });

  if (!vendor) return res.status(404).json({ message: "Vendor not found" });

  const revenue = vendor.sellerOrders.reduce((sum: number, o) => sum + o.totalAmount, 0);
  const profitability = Math.min(100, revenue / 1000);
  const inventoryEfficiency = Math.max(
    0,
    100 - vendor.products.reduce((sum: number, product) => sum + product.stock, 0) / 20
  );
  const customerRating = vendor.rating * 20;
  const score = Math.round(profitability * 0.35 + inventoryEfficiency * 0.35 + customerRating * 0.3);

  const snapshot = await prisma.healthScore.create({
    data: {
      vendorId: vendor.id,
      score,
      profitability,
      inventoryEfficiency,
      customerRating,
    },
  });

  await prisma.vendor.update({ where: { id: vendor.id }, data: { healthScore: score } });
  getSocket().to("vendor-room").emit("health-score-updated", snapshot);
  res.json({ healthScore: snapshot });
});

export default router;
