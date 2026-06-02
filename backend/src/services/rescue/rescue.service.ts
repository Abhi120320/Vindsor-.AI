import { prisma } from "../../database/prisma";
import { createNotification } from "../../modules/notifications/notifications.service";

function daysUntil(date: Date): number {
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
