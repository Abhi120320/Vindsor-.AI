import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import { prisma } from "../../database/prisma";
import { createNotification } from "../notifications/notifications.service";
import { getSocket } from "../../socket";

const router = Router();

router.post("/", authenticate, authorize("ADMIN", "VENDOR"), async (req, res) => {
  const inventory = await prisma.inventory.create({ data: req.body });
  res.status(201).json({ inventory });
});

router.put("/:id", authenticate, authorize("ADMIN", "VENDOR"), async (req, res) => {
  const id = String(req.params.id);
  const inventory = await prisma.inventory.update({
    where: { id },
    data: req.body,
    include: { vendor: { include: { user: true } } },
  });

  if (inventory.quantity <= inventory.threshold) {
    await createNotification({
      userId: inventory.vendor.user.id,
      title: "Low stock alert",
      message: `Inventory for product ${inventory.productId} is below threshold`,
      type: "INVENTORY",
      room: "vendor-room",
    });
  }

  getSocket().to("vendor-room").emit("inventory-updated", {
    productId: inventory.productId,
    quantity: inventory.quantity,
  });

  res.json({ inventory });
});

router.delete("/:id", authenticate, authorize("ADMIN", "VENDOR"), async (req, res) => {
  await prisma.inventory.delete({ where: { id: String(req.params.id) } });
  res.status(204).send();
});

router.get("/analytics/:vendorId", authenticate, async (req, res) => {
  const vendorId = String(req.params.vendorId);
  const rows = await prisma.inventory.findMany({
    where: { vendorId },
    include: { product: true },
  });

  const lowStock = rows.filter((row) => row.quantity <= row.threshold);
  res.json({
    totalItems: rows.length,
    lowStockCount: lowStock.length,
    lowStockProducts: lowStock.map((row) => row.product.name),
  });
});

export default router;
