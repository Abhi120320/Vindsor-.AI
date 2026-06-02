import type { Order, Product } from '@/store/useAppStore';
import { getEffectivePrice } from '@/store/useAppStore';

export function computeCustomerImpact(orders: Order[], customerId?: string) {
  const mine = customerId ? orders.filter((o) => o.customerId === customerId) : orders;
  const units = mine.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  );
  const foodWasteKg = units * 0.08;
  const co2Kg = foodWasteKg * 0.7;
  const savedInr = Math.round(mine.length * 12 + units * 2);
  return {
    foodWasteKg: foodWasteKg.toFixed(1),
    co2Kg: co2Kg.toFixed(1),
    savedInr,
  };
}

export function computeLoyaltyCoins(orderCount: number) {
  const coins = orderCount * 50;
  const nextReward = Math.ceil((coins + 1) / 150) * 150;
  const progress = nextReward > 0 ? Math.min(100, Math.round((coins / nextReward) * 100)) : 0;
  return { coins, nextReward, progress };
}

export function getTopProductsForRecommendations(products: Product[], limit = 3) {
  return [...products].filter((p) => p.stock > 0).slice(0, limit);
}

export function getCompanionProducts(products: Product[], cartProductIds: string[], limit = 3) {
  const inCartCategories = new Set(
    products.filter((p) => cartProductIds.includes(p.id)).map((p) => p.category)
  );
  return products
    .filter((p) => p.stock > 0 && !cartProductIds.includes(p.id))
    .sort((a, b) => {
      const aScore = inCartCategories.has(a.category) ? 1 : 0;
      const bScore = inCartCategories.has(b.category) ? 1 : 0;
      return bScore - aScore;
    })
    .slice(0, limit);
}

export function computeExpirySavings(product: Product, quantity: number) {
  const full = product.pricePerKg * quantity;
  const effective = getEffectivePrice(product) * quantity;
  return Math.max(0, full - effective);
}

export function buildOrdersSparkline(orders: Order[], buckets = 10): number[] {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const counts = Array(buckets).fill(0);

  orders.forEach((o) => {
    const age = now - new Date(o.timestamp).getTime();
    if (age < 0 || age > windowMs) return;
    const idx = Math.min(buckets - 1, Math.floor((windowMs - age) / (windowMs / buckets)));
    counts[idx]++;
  });

  return counts;
}

export function sparklinePath(values: number[], width = 500, height = 100): string {
  if (values.every((v) => v === 0)) return '';
  const max = Math.max(...values, 1);
  const step = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = 10 + i * ((width - 20) / Math.max(values.length - 1, 1));
    const y = height - 20 - (v / max) * (height - 40);
    return `${x},${y}`;
  });
  return `M ${points.join(' L ')}`;
}
