import type { Order, Product } from '@/store/useAppStore';
import {
  getEffectivePrice,
  getRescueDiscountPercent,
  isRescueActive,
} from '@/lib/product-pricing';

export interface FrequentPurchase {
  productId: string;
  productName: string;
  orderCount: number;
  totalQuantity: number;
  lastOrderedAt: string;
  product: Product | null;
  isAtLowestPrice: boolean;
  effectivePrice: number | null;
  lowestPrice: number | null;
  savingsPercent: number;
}

export function isAtLowestPrice(product: Product): boolean {
  if (product.lowestPrice == null || product.stock <= 0) return false;
  return isRescueActive(product) && getEffectivePrice(product) <= product.lowestPrice;
}

export function computeFrequentPurchases(
  orders: Order[],
  customerId: string | undefined,
  products: Product[],
  options?: { minOrderCount?: number; limit?: number }
): FrequentPurchase[] {
  if (!customerId) return [];

  const minOrderCount = options?.minOrderCount ?? 1;
  const limit = options?.limit ?? 6;

  const stats = new Map<
    string,
    { productName: string; orderCount: number; totalQuantity: number; lastOrderedAt: string }
  >();

  for (const order of orders) {
    if (order.customerId !== customerId) continue;
    if (order.status === 'rejected' || order.status === 'cancelled') continue;

    const seenInOrder = new Set<string>();
    for (const item of order.items) {
      const key = item.productId || item.productName.toLowerCase();
      const existing = stats.get(key) ?? {
        productName: item.productName,
        orderCount: 0,
        totalQuantity: 0,
        lastOrderedAt: order.timestamp,
      };

      existing.totalQuantity += item.quantity;
      if (!seenInOrder.has(key)) {
        existing.orderCount += 1;
        seenInOrder.add(key);
      }
      if (order.timestamp > existing.lastOrderedAt) {
        existing.lastOrderedAt = order.timestamp;
      }
      stats.set(key, existing);
    }
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  const productByName = new Map(products.map((p) => [p.name.toLowerCase(), p]));

  return [...stats.entries()]
    .filter(([, s]) => s.orderCount >= minOrderCount)
    .sort((a, b) => {
      if (b[1].orderCount !== a[1].orderCount) return b[1].orderCount - a[1].orderCount;
      return b[1].totalQuantity - a[1].totalQuantity;
    })
    .slice(0, limit)
    .map(([key, s]) => {
      const product =
        productById.get(key) ??
        productByName.get(s.productName.toLowerCase()) ??
        productByName.get(key) ??
        null;

      const atLowest = product ? isAtLowestPrice(product) : false;

      return {
        productId: product?.id ?? key,
        productName: product?.name ?? s.productName,
        orderCount: s.orderCount,
        totalQuantity: s.totalQuantity,
        lastOrderedAt: s.lastOrderedAt,
        product,
        isAtLowestPrice: atLowest,
        effectivePrice: product ? getEffectivePrice(product) : null,
        lowestPrice: product?.lowestPrice ?? null,
        savingsPercent: product && atLowest ? getRescueDiscountPercent(product) : 0,
      };
    });
}

export function getLowestPriceDealsForFrequentItems(
  frequent: FrequentPurchase[]
): FrequentPurchase[] {
  return frequent.filter((f) => f.isAtLowestPrice && f.product);
}
