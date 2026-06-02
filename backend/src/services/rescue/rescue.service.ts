import { prisma } from "../../database/prisma";
import { createNotification } from "../../modules/notifications/notifications.service";

function daysUntil(date: Date): number {
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

async function getFrequentBuyerIds(productId: string, minQuantity = 2): Promise<string[]> {
  const items = await prisma.orderItem.findMany({
    where: {
      productId,
      order: {
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
    },
    select: {
      quantity: true,
      order: { select: { buyerId: true } },
    },
  });

  const totals = new Map<string, number>();
  for (const item of items) {
    const buyerId = item.order.buyerId;
    totals.set(buyerId, (totals.get(buyerId) ?? 0) + item.quantity);
  }

  return [...totals.entries()]
    .filter(([, qty]) => qty >= minQuantity)
    .map(([buyerId]) => buyerId);
}

async function notifyFrequentBuyers(
  product: {
    id: string;
    name: string;
    price: number;
    lowestPrice: number;
    expiryDate: Date;
  },
  vendorName: string,
  expiryLabel: string
) {
  const buyerIds = await getFrequentBuyerIds(product.id);
  if (buyerIds.length === 0) return;

  for (const userId of buyerIds) {
    const recent = await prisma.notification.findFirst({
      where: {
        userId,
        type: "PROMOTION",
        message: { contains: product.name },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recent) continue;

    await createNotification({
      userId,
      title: "Your usual item is at lowest price",
      message: `You buy ${product.name} often — it's now ₹${product.lowestPrice} (was ₹${product.price}) at ${vendorName}. ${expiryLabel}`,
      type: "PROMOTION",
      room: "customer-room",
    });
  }
}

export async function syncRescueDealsAndNotify(): Promise<void> {
  const products = await prisma.product.findMany({
    where: {
      expiryDate: { not: null },
      lowestPrice: { not: null },
      stock: { gt: 0 },
    },
    include: { vendor: true },
  });

  if (products.length === 0) return;

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true },
  });

  for (const product of products) {
    if (!product.expiryDate || product.lowestPrice == null) continue;

    const daysLeft = daysUntil(product.expiryDate);
    const threshold = product.rescueThresholdDays ?? 2;
    const rescueActive = daysLeft <= threshold;

    if (!rescueActive || product.rescueNotifiedAt) continue;

    const vendorName = product.vendor?.businessName ?? "Local vendor";
    const expiryLabel =
      daysLeft <= 1 ? "Expires tomorrow!" : `${daysLeft} days remaining`;

    await notifyFrequentBuyers(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        lowestPrice: product.lowestPrice,
        expiryDate: product.expiryDate,
      },
      vendorName,
      expiryLabel
    );

    for (const customer of customers) {
      await createNotification({
        userId: customer.id,
        title: "Rescue deal is live",
        message: `${product.name} at ${vendorName} is now ₹${product.lowestPrice} (was ₹${product.price}). ${expiryLabel}`,
        type: "PROMOTION",
        room: "customer-room",
      });
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { rescueNotifiedAt: new Date() },
    });
  }
}
