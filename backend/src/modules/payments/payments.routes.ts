import crypto from "crypto";
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { prisma } from "../../database/prisma";
import { env } from "../../config/env";
import { razorpay, verifyRazorpaySignature } from "../../services/razorpay/razorpay.service";
import { getSocket } from "../../socket";

const router = Router();

router.post("/create-order", authenticate, async (req, res) => {
  const { orderId, amount } = req.body;
  const receipt = `order_${orderId}`;

  if (!razorpay) {
    const payment = await prisma.payment.upsert({
      where: { orderId },
      create: { orderId, amount, status: "PENDING", razorpayOrderId: receipt },
      update: { amount, status: "PENDING", razorpayOrderId: receipt },
    });
    return res.json({ razorpayOrder: { id: receipt, amount: amount * 100 }, payment });
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt,
  });

  const payment = await prisma.payment.upsert({
    where: { orderId },
    create: { orderId, amount, status: "PENDING", razorpayOrderId: razorpayOrder.id },
    update: { amount, status: "PENDING", razorpayOrderId: razorpayOrder.id },
  });

  res.json({ razorpayOrder, payment });
});

router.post("/verify", authenticate, async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, signature } = req.body;
  const isValid = verifyRazorpaySignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature,
  });

  const payment = await prisma.payment.update({
    where: { orderId },
    data: {
      status: isValid ? "SUCCESS" : "FAILED",
      razorpayOrderId,
      razorpayPaymentId,
    },
  });

  getSocket().to("customer-room").emit(isValid ? "payment-success" : "payment-failed", payment);
  if (isValid) {
    getSocket().to("vendor-room").emit("payment-success", payment);
  }
  res.json({ success: isValid, payment });
});

router.post("/webhook", async (req, res) => {
  const body = JSON.stringify(req.body);
  const signature = req.headers["x-razorpay-signature"] as string | undefined;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET ?? "")
    .update(body)
    .digest("hex");

  if (signature && expected !== signature) {
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  res.json({ ok: true });
});

router.get("/history/:userId", authenticate, async (req, res) => {
  const userId = String(req.params.userId);
  const payments = await prisma.payment.findMany({
    where: {
      order: {
        buyerId: userId,
      },
    },
    include: { order: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ payments });
});

export default router;
