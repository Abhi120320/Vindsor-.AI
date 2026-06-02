'use client';

import React from 'react';
import { BarChart3, Bell, Plus, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Order, Product } from '@/store/useAppStore';
import {
  computeFrequentPurchases,
  getLowestPriceDealsForFrequentItems,
} from '@/lib/customer-purchase-analytics';

interface CustomerPurchaseInsightsProps {
  orders: Order[];
  products: Product[];
  customerId?: string;
  onAddToCart: (productId: string) => void;
  compact?: boolean;
}

export function CustomerPurchaseInsights({
  orders,
  products,
  customerId,
  onAddToCart,
  compact = false,
}: CustomerPurchaseInsightsProps) {
  const frequent = computeFrequentPurchases(orders, customerId, products, {
    minOrderCount: 1,
    limit: compact ? 4 : 6,
  });
  const deals = getLowestPriceDealsForFrequentItems(frequent);
  const maxOrders = Math.max(...frequent.map((f) => f.orderCount), 1);

  if (frequent.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E2D9] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-[#1E6B3F]" />
          <h3 className="text-xs font-black text-[#2D332F] uppercase tracking-wider">Your Buying Habits</h3>
        </div>
        <p className="text-[10px] text-[#626E65]">
          Place a few orders and we&apos;ll show which items you buy most — plus alert you when they hit the lowest price.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E2D9] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E2D9] bg-[#FAF9F6] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="w-4 h-4 text-[#1E6B3F] shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-black text-[#2D332F] uppercase tracking-wider truncate">
              Frequently Bought
            </h3>
            <p className="text-[9px] text-[#626E65]">Based on your order history</p>
          </div>
        </div>
        {deals.length > 0 && (
          <span className="shrink-0 flex items-center gap-1 text-[8px] font-black uppercase bg-rose-100 text-rose-700 px-2 py-1 rounded-full animate-pulse">
            <Bell className="w-3 h-3" />
            {deals.length} at lowest price
          </span>
        )}
      </div>

      <div className={`p-4 space-y-3 ${compact ? 'max-h-[220px] overflow-y-auto' : ''}`}>
        {frequent.map((item) => {
          const barWidth = Math.round((item.orderCount / maxOrders) * 100);
          const inStock = item.product && item.product.stock > 0;

          return (
            <div key={item.productId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.product?.emoji && (
                    <span className="text-sm shrink-0">{item.product.emoji}</span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#2D332F] truncate">{item.productName}</p>
                    <p className="text-[9px] text-stone-400">
                      {item.orderCount} order{item.orderCount === 1 ? '' : 's'} · {item.totalQuantity} units
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.isAtLowestPrice && item.effectivePrice != null && (
                    <span className="text-[8px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                      ₹{item.effectivePrice}
                    </span>
                  )}
                  {inStock && item.product && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddToCart(item.product!.id);
                        toast.success(`Added ${item.productName} to cart`);
                      }}
                      className="p-1 rounded-lg bg-[#1E6B3F] text-white hover:bg-[#15502f] transition cursor-pointer"
                      aria-label={`Add ${item.productName} to cart`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="h-2 bg-[#FAF9F6] rounded-full overflow-hidden border border-[#E5E2D9]/60">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.isAtLowestPrice
                      ? 'bg-gradient-to-r from-emerald-500 to-[#1E6B3F]'
                      : 'bg-[#1E6B3F]/70'
                  }`}
                  style={{ width: `${Math.max(barWidth, 8)}%` }}
                />
              </div>

              {item.isAtLowestPrice && item.lowestPrice != null && (
                <p className="text-[9px] font-semibold text-emerald-700 flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  Lowest price live — save {item.savingsPercent}% vs regular ₹{item.product?.pricePerKg}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
