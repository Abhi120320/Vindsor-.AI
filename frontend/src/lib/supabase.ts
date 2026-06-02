import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConfigured = () => supabase !== null;

export async function syncOrderToSupabase(order: {
  id: string;
  customerId: string;
  vendorId: string;
  items: unknown;
  total: number;
  status: string;
  timestamp: string;
  paymentMethod: string;
}) {
  if (!supabase) return;

  try {
    const { error } = await supabase.from('orders').insert([
      {
        id: order.id,
        customer_id: order.customerId,
        vendor_id: order.vendorId,
        items: order.items,
        total: order.total,
        status: order.status,
        timestamp: order.timestamp,
        payment_method: order.paymentMethod,
      },
    ]);
    if (error && process.env.NODE_ENV !== 'production') {
      console.warn('Supabase order sync skipped:', error.message);
    }
  } catch {
    // Optional analytics sink — ignore when unavailable
  }
}

export async function syncNegotiationToSupabase(neg: {
  id: string;
  productId: string;
  productName: string;
  originalPrice: number;
  customerOffer: number;
  status: string;
  vendorId: string;
  customerId: string;
  timestamp: string;
}) {
  if (!supabase) return;

  try {
    const { error } = await supabase.from('negotiations').insert([
      {
        id: neg.id,
        product_id: neg.productId,
        product_name: neg.productName,
        original_price: neg.originalPrice,
        customer_offer: neg.customerOffer,
        status: neg.status,
        vendor_id: neg.vendorId,
        customer_id: neg.customerId,
        timestamp: neg.timestamp,
      },
    ]);
    if (error && process.env.NODE_ENV !== 'production') {
      console.warn('Supabase negotiation sync skipped:', error.message);
    }
  } catch {
    // Optional analytics sink — ignore when unavailable
  }
}

export async function updateNegotiationInSupabase(
  id: string,
  status: string,
  counterValue?: number
) {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('negotiations')
      .update({ status, vendor_counter: counterValue })
      .eq('id', id);
    if (error && process.env.NODE_ENV !== 'production') {
      console.warn('Supabase negotiation update skipped:', error.message);
    }
  } catch {
    // Optional analytics sink — ignore when unavailable
  }
}

export async function updateStockInSupabase(
  productId: string,
  stock: number,
  pricePerKg: number,
  expiryDaysRemaining: number
) {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('products')
      .update({ stock, price_per_kg: pricePerKg, expiry_days_remaining: expiryDaysRemaining })
      .eq('id', productId);
    if (error && process.env.NODE_ENV !== 'production') {
      console.warn('Supabase stock sync skipped:', error.message);
    }
  } catch {
    // Optional analytics sink — ignore when unavailable
  }
}
