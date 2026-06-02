'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Product } from '@/store/useAppStore';
import {
  getEffectivePrice,
  getExpiryLabel,
  getRescueDiscountPercent,
  isRescueActive,
} from '@/lib/product-pricing';

interface RescueProductCardProps {
  product: Product;
  vendorName?: string;
  cartQuantity?: number;
  showBargain?: boolean;
  bargainLocked?: boolean;
  onBargain?: () => void;
  onAdd: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  compact?: boolean;
}

export function RescueProductCard({
  product,
  vendorName,
  cartQuantity,
  showBargain = true,
  bargainLocked = false,
  onBargain,
  onAdd,
  onDecrease,
  onIncrease,
  compact = false,
}: RescueProductCardProps) {
  const effectivePrice = getEffectivePrice(product);
  const isDiscounted = effectivePrice < product.pricePerKg;
  const discountPercent = getRescueDiscountPercent(product);
  const rescue = isRescueActive(product);

  return (
    <div
      className={`bg-white border border-[#E5E2D9] rounded-2xl shadow-sm hover:shadow-md transition flex flex-col ${
        compact ? 'p-3 space-y-2.5' : 'p-4 space-y-3'
      }`}
    >
      <div className={`relative rounded-xl overflow-hidden bg-stone-50 ${compact ? 'h-20' : 'h-28'}`}>
        <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
        <span className="absolute top-1.5 left-1.5 text-xs bg-white/95 px-1.5 py-0.5 rounded font-black shadow-sm">
          {product.emoji}
        </span>
        {isDiscounted && discountPercent > 0 && (
          <span className="absolute bottom-1.5 right-1.5 bg-rose-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md shadow">
            {discountPercent}% OFF
          </span>
        )}
      </div>

      <div className="space-y-1 min-w-0">
        <div className="flex items-start gap-1.5 flex-wrap">
          <h4 className={`font-extrabold text-[#2D332F] truncate ${compact ? 'text-xs' : 'text-sm'}`}>
            {product.name}
          </h4>
          {rescue && (
            <span className="bg-rose-500 text-white text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0">
              RESCUE
            </span>
          )}
        </div>

        {vendorName && (
          <p className="text-[10px] font-semibold text-[#1E6B3F] truncate">Shop: {vendorName}</p>
        )}

        {product.quality && (
          <p className="text-[9px] text-[#626E65]">Quality: {product.quality}</p>
        )}

        {isDiscounted && (
          <p className={`text-[9px] font-bold ${rescue ? 'text-rose-600' : 'text-amber-600'}`}>
            {rescue ? '⏰' : '⏳'} {getExpiryLabel(product)}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between gap-2 pt-1 border-t border-stone-100 mt-auto">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className={`font-extrabold text-[#2D332F] ${compact ? 'text-sm' : 'text-lg'}`}>
              ₹{effectivePrice}
            </span>
            {isDiscounted && (
              <span className="text-[10px] text-stone-400 line-through">₹{product.pricePerKg}</span>
            )}
          </div>
          <span className="text-[9px] text-[#626E65] font-semibold">per {product.unit}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {showBargain && !bargainLocked && onBargain && (
            <button
              type="button"
              onClick={onBargain}
              className="px-2 py-1.5 text-[10px] font-black text-[#1E6B3F] bg-[#EAF5EE] hover:bg-[#1E6B3F]/15 rounded-lg border border-[#1E6B3F]/25 transition cursor-pointer whitespace-nowrap"
            >
              🤝 Bargain
            </button>
          )}
          {bargainLocked && (
            <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-1 rounded border border-emerald-200">
              Deal locked
            </span>
          )}

          {cartQuantity ? (
            <div className="flex items-center bg-[#FAF9F6] rounded-lg p-0.5 border border-[#E5E2D9]">
              <button type="button" onClick={onDecrease} className="p-1 text-stone-600 hover:text-stone-900 cursor-pointer">
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 text-center text-[10px] font-bold">{cartQuantity}</span>
              <button type="button" onClick={onIncrease} className="p-1 text-stone-600 hover:text-stone-900 cursor-pointer">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              disabled={product.stock <= 0}
              className="px-2.5 py-1.5 bg-[#1E6B3F] hover:bg-[#144d2c] disabled:bg-stone-300 text-white rounded-lg text-[10px] font-bold transition cursor-pointer shadow-sm whitespace-nowrap"
            >
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
