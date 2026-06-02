import type { Product } from '@/store/useAppStore';

export function getExpiryDaysRemaining(product: Product): number {
  if (product.expiryDate) {
    const diff = new Date(product.expiryDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  return product.expiryDaysRemaining;
}

export function isRescueActive(product: Product): boolean {
  if (product.lowestPrice == null || product.lowestPrice >= product.pricePerKg) {
    return false;
  }
  const daysLeft = getExpiryDaysRemaining(product);
  const threshold = product.rescueThresholdDays ?? 2;
  return daysLeft <= threshold;
}

export function getEffectivePrice(product: Product): number {
  if (isRescueActive(product) && product.lowestPrice != null) {
    return Math.round(product.lowestPrice);
  }

  const daysLeft = getExpiryDaysRemaining(product);
  if (daysLeft <= 1) return Math.round(product.pricePerKg * 0.7);
  if (daysLeft <= 2) return Math.round(product.pricePerKg * 0.8);
  if (daysLeft <= 3) return Math.round(product.pricePerKg * 0.9);
  return product.pricePerKg;
}

export function getRescueDiscountPercent(product: Product): number {
  const effective = getEffectivePrice(product);
  if (effective >= product.pricePerKg) return 0;
  return Math.round(((product.pricePerKg - effective) / product.pricePerKg) * 100);
}

export function getExpiryLabel(product: Product): string {
  const daysLeft = getExpiryDaysRemaining(product);
  if (daysLeft <= 1) return 'Expires tomorrow';
  if (daysLeft <= 3) return `${daysLeft} days remaining`;
  return `${daysLeft} days left`;
}

export function isNearExpiry(product: Product): boolean {
  return getExpiryDaysRemaining(product) <= (product.rescueThresholdDays ?? 2) + 1;
}
