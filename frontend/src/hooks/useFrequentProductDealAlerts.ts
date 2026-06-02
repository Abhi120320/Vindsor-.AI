'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';
import {
  computeFrequentPurchases,
  getLowestPriceDealsForFrequentItems,
} from '@/lib/customer-purchase-analytics';

const STORAGE_KEY = 'vendsor-frequent-deal-alerts-v1';

function loadSentAlerts(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function saveSentAlert(productId: string) {
  const prev = loadSentAlerts();
  prev[productId] = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
}

function shouldNotify(productId: string): boolean {
  const sent = loadSentAlerts()[productId];
  if (!sent) return true;
  const dayMs = 24 * 60 * 60 * 1000;
  return Date.now() - new Date(sent).getTime() > dayMs;
}

export function useFrequentProductDealAlerts() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const orders = useAppStore((s) => s.orders);
  const products = useAppStore((s) => s.products);
  const catalogLoaded = useAppStore((s) => s.catalogLoaded);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'customer' || !catalogLoaded) return;

    const frequent = computeFrequentPurchases(orders, currentUser.id, products, {
      minOrderCount: 2,
    });
    const deals = getLowestPriceDealsForFrequentItems(frequent);

    for (const deal of deals) {
      if (!deal.product) continue;
      const alertKey = `${deal.product.id}-${deal.product.lowestPrice}`;
      if (notifiedRef.current.has(alertKey)) continue;
      if (!shouldNotify(deal.product.id)) continue;

      notifiedRef.current.add(alertKey);
      saveSentAlert(deal.product.id);

      toast(
        `🔥 Your usual ${deal.productName} is at lowest price — ₹${deal.effectivePrice} (${deal.savingsPercent}% off)!`,
        {
          duration: 8000,
          icon: '🛒',
        }
      );
    }
  }, [isAuthenticated, currentUser?.id, currentUser?.role, orders, products, catalogLoaded]);
}
