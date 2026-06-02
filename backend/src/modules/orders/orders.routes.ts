import { OrderStatus } from "@prisma/client";
import { Request, Response, Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import { prisma } from "../../database/prisma";
import { createNotification } from "../notifications/notifications.service";
import { getSocket } from "../../socket";

const router = Router();

router.post("/", authenticate, authorize("CUSTOMER", "ADMIN"), async (req, res) => {
  const order = await prisma.order.create({
    data: {
      buyerId: req.body.buyerId,
      sellerId: req.body.sellerId,
      totalAmount: req.body.totalAmount,
      status: "PENDING",
      items: {
        create: req.body.items,
      },
    },
  });

  getSocket().to("vendor-room").emit("new-order", order);
  res.status(201).json({ order });
});

const updateStatus = (status: OrderStatus) => async (req: Request, res: Response) => {
  const order = await prisma.order.update({
    where: { id: String(req.params.id) },
    data: { status },
    include: {
      seller: { include: { user: true } },
      items: { include: { product: true } },
    },
  });

  const roomMap: Record<OrderStatus, string> = {
    PENDING: "new-order",
    ACCEPTED: "order-accepted",
    PROCESSING: "order-accepted",
    SHIPPED: "order-shipped",
    DELIVERED: "order-delivered",
    CANCELLED: "order-delivered",
    REJECTED: "order-delivered",
  };

  getSocket().to("customer-room").emit(roomMap[status], order);
  getSocket().to("vendor-room").emit(roomMap[status], order);

  await createNotification({
    userId: order.seller.user.id,
    title: "Order update",
    message: `Order ${order.id} is now ${status}`,
    type: "ORDER",
    room: "vendor-room",
  });

  res.json({ order });
};

router.put("/:id/accept", authenticate, authorize("VENDOR", "ADMIN"), updateStatus("ACCEPTED"));
router.put("/:id/reject", authenticate, authorize("VENDOR", "ADMIN"), updateStatus("REJECTED"));
router.put("/:id/process", authenticate, authorize("VENDOR", "ADMIN"), updateStatus("PROCESSING"));
router.put("/:id/cancel", authenticate, authorize("CUSTOMER", "ADMIN"), updateStatus("CANCELLED"));
router.put("/:id/track", authenticate, authorize("VENDOR", "ADMIN"), updateStatus("SHIPPED"));
router.put("/:id/deliver", authenticate, authorize("VENDOR", "ADMIN"), updateStatus("DELIVERED"));
router.get("/history/:userId", authenticate, async (req, res) => {
  const userId = String(req.params.userId);
  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    include: { items: { include: { product: true } }, payment: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
});

router.get("/vendor/:vendorId", authenticate, async (req, res) => {
  const vendorId = String(req.params.vendorId);
  const orders = await prisma.order.findMany({
    where: { sellerId: vendorId },
    include: { items: { include: { product: true } }, payment: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
});

export default router;
