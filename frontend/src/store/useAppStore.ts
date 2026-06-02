import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  syncOrderToSupabase,
  syncNegotiationToSupabase,
  updateNegotiationInSupabase,
  updateStockInSupabase,
} from '@/lib/supabase';
import { apiFetch, setAccessToken } from '@/lib/api/client';
import {
  mapBackendOrder,
  mapBackendProduct,
  mapBackendUser,
  mapBackendVendor,
  toBackendRole,
  type BackendProduct,
  type BackendUser,
  type BackendVendor,
} from '@/lib/api/mappers';
import {
  getEffectivePrice,
  getExpiryDaysRemaining,
  getExpiryLabel,
  getRescueDiscountPercent,
  isNearExpiry,
  isRescueActive,
} from '@/lib/product-pricing';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  parsedList?: any[];
}

export interface UserPreferences {
  likes: string[];
  dislikes: string[];
  dietType: 'veg' | 'non-veg' | 'vegan' | null;
  budget: number | null;
  chatHistory: ChatMessage[];
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'customer' | 'vendor' | 'admin';
  orderCount: number;
  preferences: UserPreferences;
}

export interface Product {
  id: string;
  name: string;
  category: 'Vegetables' | 'Fruits' | 'Dairy' | 'Spices' | 'Oils' | 'Breads' | 'Dal & Rice';
  vendorId: string;
  pricePerKg: number;
  unit: string;
  stock: number;
  isOrganic: boolean;
  harvestDate: string;
  organicCertification: string;
  expiryDaysRemaining: number;
  expiryDate: string;
  quality: string;
  lowestPrice: number | null;
  rescueThresholdDays: number;
  costPrice: number;
  emoji: string;
  photoUrl: string;
}

export interface Vendor {
  id: string;
  name: string;
  rating: number;
  deliveryTime: string;
  address: string;
  phone: string;
  heroPhotoUrl: string;
  galleryPhotos: string[];
  isVerified: boolean;
  isSuspended: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  negotiatedPrice?: number;
  isNegotiated: boolean;
}

export interface BargainMessage {
  id: string;
  role: 'customer' | 'vendor' | 'system';
  content: string;
  amount?: number;
  timestamp: string;
}

export interface Negotiation {
  id: string;
  productId: string;
  productName: string;
  originalPrice: number;
  customerOffer: number;
  vendorCounter?: number;
  status: 'pending' | 'accepted' | 'countered' | 'rejected';
  vendorId: string;
  customerId: string;
  timestamp: string;
  messages?: BargainMessage[];
}

export interface Order {
  id: string;
  customerId: string;
  vendorId: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    unit: string;
  }[];
  total: number;
  status: 'pending' | 'accepted' | 'preparing' | 'dispatched' | 'delivered' | 'rejected' | 'cancelled';
  timestamp: string;
  paymentMethod: 'Razorpay' | 'PhonePe';
}

export interface Dispute {
  id: string;
  customerName: string;
  vendorName: string;
  orderAmount: number;
  issue: string;
  status: 'Open' | 'Resolved' | 'Escalated';
  timestamp: string;
}

export interface AppState {
  currentUser: User | null;
  isAuthenticated: boolean;
  products: Product[];
  vendors: Vendor[];
  cartItems: CartItem[];
  negotiations: Negotiation[];
  orders: Order[];
  disputes: Dispute[];
  activeVendorId: string | null;
  catalogLoaded: boolean;

  hydrateCatalog: () => Promise<void>;
  refreshUserOrders: () => Promise<void>;
  sendOtp: (phone: string) => Promise<{ debugOtp?: string }>;
  verifyOtpLogin: (phone: string, otp: string) => Promise<boolean>;
  passwordLogin: (phone: string, password: string, role: 'customer' | 'vendor') => Promise<boolean>;
  registerAccount: (
    name: string,
    phone: string,
    password: string,
    role: 'customer' | 'vendor'
  ) => Promise<boolean>;
  adminLogin: (phone: string, password: string) => Promise<boolean>;

  // Auth actions (legacy sync wrappers — prefer async methods above)
  login: (phone: string, otp: string) => boolean;
  signup: (name: string, phone: string, password: string, role: 'customer' | 'vendor') => void;
  logout: () => void;
  setRole: (role: 'customer' | 'vendor' | 'admin') => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  addChatMessage: (role: 'user' | 'assistant', content: string, parsedList?: any[]) => void;
  clearChatHistory: () => void;

  // Vendor actions
  updateVendorPhoto: (vendorId: string, base64: string) => void;
  addGalleryPhoto: (vendorId: string, base64: string) => void;
  updateStock: (vendorId: string, productId: string, updates: { stock: number; pricePerKg: number; expiryDaysRemaining: number }) => void;
  addProduct: (
    vendorId: string,
    input: {
      name: string;
      category: Product['category'];
      pricePerKg: number;
      stock: number;
      unit?: string;
      isOrganic?: boolean;
      expiryDaysRemaining?: number;
      expiryDate?: string;
      quality?: string;
      lowestPrice?: number;
      rescueThresholdDays?: number;
      photoUrl?: string;
    }
  ) => Promise<Product>;
  updateProductPhoto: (productId: string, base64: string) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  syncOrderAction: (
    orderId: string,
    action: 'accept' | 'reject' | 'preparing' | 'dispatched' | 'delivered'
  ) => Promise<boolean>;

  // Cart actions
  addToCart: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  applyNegotiatedPrice: (productId: string, negotiatedPrice: number) => void;
  clearCart: () => void;
  setCartFromMealItems: (items: { productId: string; quantity: number }[]) => number;
  addVoiceOrderToCart: (items: { productId: string; quantity: number }[]) => number;
  cartTotal: () => number;

  // Negotiations actions
  createNegotiation: (productId: string, customerOffer: number) => { success: boolean; message: string };
  respondToNegotiation: (id: string, action: 'accepted' | 'countered' | 'rejected', counterValue?: number) => void;
  acceptVendorCounter: (id: string) => { success: boolean; message: string };
  sendRevisedOffer: (id: string, customerOffer: number) => { success: boolean; message: string };

  // Order actions
  placeOrder: (paymentMethod: 'Razorpay' | 'PhonePe') => Promise<{ success: boolean; orderId: string; reward?: string }>;

  // Admin actions
  toggleVerifyVendor: (vendorId: string) => void;
  toggleSuspendVendor: (vendorId: string) => void;
  resolveDispute: (disputeId: string) => void;
  escalateDispute: (disputeId: string) => void;

  // Utility selectors / helper actions
  setActiveVendorId: (vendorId: string | null) => void;
}

// Re-export pricing helpers used across customer/vendor UI
export {
  getEffectivePrice,
  getExpiryDaysRemaining,
  getExpiryLabel,
  getRescueDiscountPercent,
  isNearExpiry,
  isRescueActive,
} from '@/lib/product-pricing';
export function getDaysSinceHarvest(product: Product): number {
  if (!product.harvestDate) return 0;
  const harvest = new Date(product.harvestDate).getTime();
  const now = Date.now();
  const diffTime = Math.abs(now - harvest);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Helper to calculate past date string — kept for expiry utilities if needed elsewhere

const defaultPreferences: UserPreferences = {
  likes: [],
  dislikes: [],
  dietType: null,
  budget: null,
  chatHistory: []
};


export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      products: [],
      vendors: [],
      cartItems: [],
      negotiations: [],
      orders: [],
      disputes: [],
      activeVendorId: null,
      catalogLoaded: false,

      hydrateCatalog: async () => {
        try {
          const [vendorRes, productRes] = await Promise.all([
            apiFetch<{ vendors: BackendVendor[] }>('/marketplace/vendors'),
            apiFetch<{ products: BackendProduct[] }>('/marketplace/products'),
          ]);
          const vendors = vendorRes.vendors.map(mapBackendVendor);
          const products = productRes.products
            .map(mapBackendProduct)
            .filter((p): p is Product => p !== null);
          set({ vendors, products, catalogLoaded: true });
        } catch {
          set({ catalogLoaded: true });
        }
      },

      refreshUserOrders: async () => {
        const user = get().currentUser;
        if (!user) return;
        const vendor = get().vendors.find((v) => v.phone === user.phone);
        try {
          const requests: Promise<{ orders: Parameters<typeof mapBackendOrder>[0][] }>[] = [
            apiFetch(`/orders/history/${user.id}`, { auth: true }),
          ];
          if (vendor) {
            requests.push(apiFetch(`/orders/vendor/${vendor.id}`, { auth: true }));
          }
          const results = await Promise.allSettled(requests);
          const mapped = results.flatMap((r) =>
            r.status === 'fulfilled' ? r.value.orders.map(mapBackendOrder) : []
          );
          const byId = new Map<string, Order>();
          mapped.forEach((o) => byId.set(o.id, o));
          set({ orders: [...byId.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp)) });
        } catch {
          /* keep local orders */
        }
      },

      sendOtp: async (phone) => {
        const res = await apiFetch<{ message: string; debugOtp?: string }>('/auth/send-otp', {
          method: 'POST',
          body: JSON.stringify({ phone }),
        });
        return { debugOtp: res.debugOtp };
      },

      verifyOtpLogin: async (phone, otp) => {
        const res = await apiFetch<{ user: BackendUser; accessToken: string }>('/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ phone, otp }),
        });
        setAccessToken(res.accessToken);
        const orderCount = get().orders.filter((o) => o.customerId === res.user.id).length;
        set({
          currentUser: mapBackendUser(res.user, orderCount),
          isAuthenticated: true,
        });
        await get().hydrateCatalog();
        await get().refreshUserOrders();
        return true;
      },

      passwordLogin: async (phone, password, role) => {
        const res = await apiFetch<{ user: BackendUser; accessToken: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ phone, password }),
        });
        const mappedUser = mapBackendUser(res.user);
        if (mappedUser.role === 'admin') {
          throw new Error('Admin accounts must use the admin portal');
        }
        if (mappedUser.role !== role) {
          throw new Error(
            `This number is registered as a ${mappedUser.role === 'vendor' ? 'Vendor' : 'Customer'}. Select the correct role above.`
          );
        }
        setAccessToken(res.accessToken);
        const orderCount = get().orders.filter((o) => o.customerId === res.user.id).length;
        set({
          currentUser: mappedUser,
          isAuthenticated: true,
        });
        await get().hydrateCatalog();
        await get().refreshUserOrders();
        return true;
      },

      registerAccount: async (name, phone, password, role) => {
        await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, phone, password, role: toBackendRole(role) }),
        });
        return get().passwordLogin(phone, password, role);
      },

      adminLogin: async (phone, password) => {
        const res = await apiFetch<{ user: BackendUser; accessToken: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ phone, password }),
        });
        if (res.user.role !== 'ADMIN') throw new Error('Not an admin account');
        setAccessToken(res.accessToken);
        set({
          currentUser: mapBackendUser(res.user),
          isAuthenticated: true,
        });
        await get().hydrateCatalog();
        return true;
      },

      login: () => false,

      signup: (name, phone, password, role) => {
        void get().registerAccount(name, phone, password, role);
      },

      logout: () => {
        setAccessToken(null);
        set({ currentUser: null, isAuthenticated: false, cartItems: [], activeVendorId: null });
      },

      setRole: (role) => {
        const user = get().currentUser;
        if (user) {
          set({ currentUser: { ...user, role } });
        }
      },

      updatePreferences: (updates) => {
        const user = get().currentUser;
        if (!user) return;
        const newPrefs = { ...user.preferences, ...updates };
        set({ currentUser: { ...user, preferences: newPrefs } });
      },

      addChatMessage: (role, content, parsedList) => {
        const user = get().currentUser;
        if (!user) return;
        const newMsg: ChatMessage = {
          role,
          content,
          parsedList: parsedList?.length
            ? parsedList.map((item) => ({ ...item }))
            : undefined,
        };
        const newHistory = [...user.preferences.chatHistory, newMsg];
        const newPrefs = { ...user.preferences, chatHistory: newHistory };
        set({ currentUser: { ...user, preferences: newPrefs } });
      },

      clearChatHistory: () => {
        const user = get().currentUser;
        if (!user) return;
        const newPrefs = { ...user.preferences, chatHistory: [] };
        set({ currentUser: { ...user, preferences: newPrefs } });
      },

      // Vendor updates
      updateVendorPhoto: (vendorId, base64) => {
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === vendorId ? { ...v, heroPhotoUrl: base64 } : v
          )
        }));
      },

      addGalleryPhoto: (vendorId, base64) => {
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === vendorId
              ? { ...v, galleryPhotos: [...v.galleryPhotos, base64] }
              : v
          )
        }));
      },

      updateStock: (vendorId, productId, updates) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId && p.vendorId === vendorId
              ? {
                  ...p,
                  stock: updates.stock,
                  pricePerKg: updates.pricePerKg,
                  expiryDaysRemaining: updates.expiryDaysRemaining,
                }
              : p
          ),
        }));
        updateStockInSupabase(productId, updates.stock, updates.pricePerKg, updates.expiryDaysRemaining);
        void apiFetch(`/products/${productId}`, {
          method: 'PUT',
          auth: true,
          body: JSON.stringify({ stock: updates.stock, price: updates.pricePerKg }),
        }).catch(() => undefined);
      },

      addProduct: async (vendorId, input) => {
        const trimmedName = input.name.trim();
        if (!trimmedName) throw new Error('Product name is required');

        const displayName =
          input.isOrganic && !trimmedName.toLowerCase().includes('organic')
            ? `Organic ${trimmedName}`
            : trimmedName;

        const expiryDate =
          input.expiryDate ??
          new Date(Date.now() + (input.expiryDaysRemaining ?? 5) * 86400000).toISOString();

        const res = await apiFetch<{ product: BackendProduct }>('/products', {
          method: 'POST',
          auth: true,
          body: JSON.stringify({
            vendorId,
            name: displayName,
            description: `${displayName} — ${input.quality ?? 'Standard'} quality, fresh from local vendor`,
            category: input.category,
            price: input.pricePerKg,
            stock: input.stock,
            imageUrl: input.photoUrl || undefined,
            quality: input.quality ?? 'Standard',
            expiryDate,
            lowestPrice: input.lowestPrice ?? undefined,
            rescueThresholdDays: input.rescueThresholdDays ?? 2,
          }),
        });

        const mapped = mapBackendProduct(res.product);
        if (!mapped) throw new Error('Failed to add product');

        const product: Product = {
          ...mapped,
          vendorId,
          unit: input.unit ?? mapped.unit,
          isOrganic: input.isOrganic ?? mapped.isOrganic,
          costPrice: Math.round(input.pricePerKg * 0.72),
          photoUrl: input.photoUrl ?? mapped.photoUrl,
          quality: input.quality ?? mapped.quality,
          lowestPrice: input.lowestPrice ?? mapped.lowestPrice,
          rescueThresholdDays: input.rescueThresholdDays ?? mapped.rescueThresholdDays,
          expiryDate: mapped.expiryDate || expiryDate.slice(0, 10),
        };

        set({ products: [...get().products, product] });
        return product;
      },

      updateProductPhoto: (productId, base64) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId ? { ...p, photoUrl: base64 } : p
          )
        }));
      },

      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status } : o
          )
        }));
      },

      syncOrderAction: async (orderId, action) => {
        const endpointByAction = {
          accept: `/orders/${orderId}/accept`,
          reject: `/orders/${orderId}/reject`,
          preparing: `/orders/${orderId}/process`,
          dispatched: `/orders/${orderId}/track`,
          delivered: `/orders/${orderId}/deliver`,
        } as const;

        const statusByAction: Record<typeof action, Order['status']> = {
          accept: 'accepted',
          reject: 'rejected',
          preparing: 'preparing',
          dispatched: 'dispatched',
          delivered: 'delivered',
        };

        try {
          const res = await apiFetch<{ order: Parameters<typeof mapBackendOrder>[0] }>(
            endpointByAction[action],
            { method: 'PUT', auth: true }
          );
          const mapped = mapBackendOrder(res.order);
          set((state) => ({
            orders: state.orders.map((o) => (o.id === orderId ? mapped : o)),
          }));
          return true;
        } catch {
          set((state) => ({
            orders: state.orders.map((o) =>
              o.id === orderId ? { ...o, status: statusByAction[action] } : o
            ),
          }));
          return false;
        }
      },

      // Cart management
      addToCart: (productId, quantity) => {
        const product = get().products.find((p) => p.id === productId);
        if (!product) return;

        const effectivePrice = getEffectivePrice(product);
        const activeVendorId = get().activeVendorId;

        let cartItems = [...get().cartItems];
        if (activeVendorId !== product.vendorId) {
          cartItems = [];
        }

        const existing = cartItems.find((item) => item.productId === productId);
        if (existing) {
          existing.quantity += quantity;
        } else {
          cartItems.push({
            productId,
            quantity,
            unitPrice: effectivePrice,
            isNegotiated: false
          });
        }

        set({ cartItems, activeVendorId: product.vendorId });
      },

      removeFromCart: (productId) => {
        const cartItems = get().cartItems.filter((item) => item.productId !== productId);
        set({
          cartItems,
          activeVendorId: cartItems.length === 0 ? null : get().activeVendorId
        });
      },

      updateCartQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        set((state) => ({
          cartItems: state.cartItems.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          )
        }));
      },

      applyNegotiatedPrice: (productId, negotiatedPrice) => {
        set((state) => ({
          cartItems: state.cartItems.map((item) =>
            item.productId === productId
              ? { ...item, negotiatedPrice, isNegotiated: true }
              : item
          )
        }));
      },

      clearCart: () => {
        set({ cartItems: [], activeVendorId: null });
      },

      setCartFromMealItems: (items) => {
        const cartItems: CartItem[] = [];

        for (const { productId, quantity } of items) {
          const product = get().products.find((p) => p.id === productId);
          if (!product || product.stock <= 0) continue;

          const qty = Math.min(quantity, product.stock);
          if (qty <= 0) continue;

          cartItems.push({
            productId,
            quantity: qty,
            unitPrice: getEffectivePrice(product),
            isNegotiated: false,
          });
        }

        const firstProduct = cartItems.length
          ? get().products.find((p) => p.id === cartItems[0].productId)
          : null;

        set({
          cartItems,
          activeVendorId: firstProduct?.vendorId ?? null,
        });

        return cartItems.length;
      },

      addVoiceOrderToCart: (items) => {
        const cartItems = [...get().cartItems];

        for (const { productId, quantity } of items) {
          const product = get().products.find((p) => p.id === productId);
          if (!product || product.stock <= 0) continue;

          const qty = Math.min(Math.max(quantity, 0.1), product.stock);
          const existing = cartItems.find((item) => item.productId === productId);

          if (existing) {
            existing.quantity = Math.min(existing.quantity + qty, product.stock);
          } else {
            cartItems.push({
              productId,
              quantity: qty,
              unitPrice: getEffectivePrice(product),
              isNegotiated: false,
            });
          }
        }

        const dominantVendorId =
          cartItems.length > 0
            ? get().products.find((p) => p.id === cartItems[0].productId)?.vendorId ?? get().activeVendorId
            : get().activeVendorId;

        set({ cartItems, activeVendorId: dominantVendorId });
        return items.length;
      },

      cartTotal: () => {
        return get().cartItems.reduce((sum, item) => {
          const price = item.isNegotiated && item.negotiatedPrice !== undefined ? item.negotiatedPrice : item.unitPrice;
          return sum + price * item.quantity;
        }, 0);
      },

      // Negotiations
      createNegotiation: (productId, customerOffer) => {
        const product = get().products.find((p) => p.id === productId);
        if (!product) return { success: false, message: 'Product not found' };

        const originalPrice = getEffectivePrice(product);
        const minAcceptable = Math.round(originalPrice * 0.7);
        const maxAcceptable = Math.round(originalPrice * 0.9);

        if (customerOffer < minAcceptable || customerOffer > maxAcceptable) {
          return {
            success: false,
            message: `Offer must be between ₹${minAcceptable} (70%) and ₹${maxAcceptable} (90%) of listed price (₹${originalPrice})`
          };
        }

        const user = get().currentUser;
        const now = new Date().toISOString();
        const messages: BargainMessage[] = [
          {
            id: 'm_' + Math.random().toString(36).slice(2, 9),
            role: 'system',
            content: `Bargain started for ${product.name} (listed at ₹${originalPrice})`,
            timestamp: now,
          },
          {
            id: 'm_' + Math.random().toString(36).slice(2, 9),
            role: 'customer',
            content: `I'd like to buy at ₹${customerOffer}. Can you accept?`,
            amount: customerOffer,
            timestamp: now,
          },
        ];

        const newNeg: Negotiation = {
          id: 'n_' + Math.random().toString(36).substr(2, 9),
          productId,
          productName: product.name,
          originalPrice,
          customerOffer,
          status: 'pending',
          vendorId: product.vendorId,
          customerId: user?.id || 'anonymous',
          timestamp: now,
          messages,
        };

        set((state) => ({
          negotiations: [newNeg, ...state.negotiations]
        }));

        // Supabase async log negotiation creation
        syncNegotiationToSupabase(newNeg);

        return { success: true, message: 'Negotiation offer sent to vendor!' };
      },

      respondToNegotiation: (id, action, counterValue) => {
        const neg = get().negotiations.find((n) => n.id === id);
        if (!neg) return;

        let status: Negotiation['status'] = 'rejected';
        if (action === 'accepted') status = 'accepted';
        else if (action === 'countered') status = 'countered';

        const now = new Date().toISOString();
        const vendorMessage: BargainMessage =
          action === 'accepted'
            ? {
                id: 'm_' + Math.random().toString(36).slice(2, 9),
                role: 'vendor',
                content: `Deal! I accept your offer of ₹${neg.customerOffer}.`,
                amount: neg.customerOffer,
                timestamp: now,
              }
            : action === 'countered'
              ? {
                  id: 'm_' + Math.random().toString(36).slice(2, 9),
                  role: 'vendor',
                  content: `I can't do ₹${neg.customerOffer}, but I can offer ₹${counterValue}.`,
                  amount: counterValue,
                  timestamp: now,
                }
              : {
                  id: 'm_' + Math.random().toString(36).slice(2, 9),
                  role: 'vendor',
                  content: `Sorry, I can't accept ₹${neg.customerOffer} right now.`,
                  timestamp: now,
                };

        set((state) => ({
          negotiations: state.negotiations.map((n) =>
            n.id === id
              ? {
                  ...n,
                  status,
                  vendorCounter: action === 'countered' ? counterValue : n.vendorCounter,
                  messages: [...(n.messages ?? []), vendorMessage],
                }
              : n
          )
        }));

        // If vendor accepts, apply the price to the customer's cart
        if (action === 'accepted') {
          get().applyNegotiatedPrice(neg.productId, neg.customerOffer);
        }

        // Supabase update negotiation record
        updateNegotiationInSupabase(id, status, action === 'countered' ? counterValue : undefined);
      },

      acceptVendorCounter: (id) => {
        const neg = get().negotiations.find((n) => n.id === id);
        if (!neg || neg.status !== 'countered' || neg.vendorCounter == null) {
          return { success: false, message: 'No counter offer to accept' };
        }

        const now = new Date().toISOString();
        set((state) => ({
          negotiations: state.negotiations.map((n) =>
            n.id === id
              ? {
                  ...n,
                  status: 'accepted' as const,
                  messages: [
                    ...(n.messages ?? []),
                    {
                      id: 'm_' + Math.random().toString(36).slice(2, 9),
                      role: 'customer' as const,
                      content: `Accepted! ₹${neg.vendorCounter} works for me.`,
                      amount: neg.vendorCounter,
                      timestamp: now,
                    },
                    {
                      id: 'm_' + Math.random().toString(36).slice(2, 9),
                      role: 'system' as const,
                      content: 'Bargain closed — price locked for your cart.',
                      timestamp: now,
                    },
                  ],
                }
              : n
          ),
        }));

        get().applyNegotiatedPrice(neg.productId, neg.vendorCounter);
        updateNegotiationInSupabase(id, 'accepted', neg.vendorCounter);
        return { success: true, message: 'Counter offer accepted!' };
      },

      sendRevisedOffer: (id, customerOffer) => {
        const neg = get().negotiations.find((n) => n.id === id);
        if (!neg) return { success: false, message: 'Bargain not found' };
        if (neg.status !== 'countered' && neg.status !== 'rejected') {
          return { success: false, message: 'You can only revise after a vendor response' };
        }

        const minAcceptable = Math.round(neg.originalPrice * 0.7);
        const maxAcceptable = Math.round(neg.originalPrice * 0.9);
        if (customerOffer < minAcceptable || customerOffer > maxAcceptable) {
          return {
            success: false,
            message: `Offer must be between ₹${minAcceptable} and ₹${maxAcceptable}`,
          };
        }

        const now = new Date().toISOString();
        set((state) => ({
          negotiations: state.negotiations.map((n) =>
            n.id === id
              ? {
                  ...n,
                  customerOffer,
                  vendorCounter: undefined,
                  status: 'pending' as const,
                  timestamp: now,
                  messages: [
                    ...(n.messages ?? []),
                    {
                      id: 'm_' + Math.random().toString(36).slice(2, 9),
                      role: 'customer' as const,
                      content: `How about ₹${customerOffer} instead?`,
                      amount: customerOffer,
                      timestamp: now,
                    },
                  ],
                }
              : n
          ),
        }));

        updateNegotiationInSupabase(id, 'pending');
        return { success: true, message: 'Revised offer sent!' };
      },

      // Place Order
      placeOrder: async (paymentMethod) => {
        const cartItems = get().cartItems;
        const activeVendorId = get().activeVendorId;
        const user = get().currentUser;

        if (cartItems.length === 0 || !activeVendorId || !user) {
          return { success: false, orderId: '' };
        }

        const items = cartItems.map((c) => {
          const product = get().products.find((p) => p.id === c.productId)!;
          return {
            productId: c.productId,
            productName: product.name,
            quantity: c.quantity,
            price:
              c.isNegotiated && c.negotiatedPrice !== undefined
                ? c.negotiatedPrice
                : c.unitPrice,
            unit: product.unit,
            unitPrice:
              c.isNegotiated && c.negotiatedPrice !== undefined
                ? c.negotiatedPrice
                : c.unitPrice,
          };
        });

        const total = get().cartTotal();
        const nextOrderCount = user.orderCount + 1;

        let orderId = `O-${Math.floor(100000 + Math.random() * 900000)}`;

        try {
          const created = await apiFetch<{ order: { id: string; totalAmount: number; createdAt: string } }>(
            '/orders',
            {
              method: 'POST',
              auth: true,
              body: JSON.stringify({
                buyerId: user.id,
                sellerId: activeVendorId,
                totalAmount: total,
                items: items.map((i) => ({
                  productId: i.productId,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                })),
              }),
            }
          );
          orderId = created.order.id;
        } catch {
          /* fallback to local-only order if API unavailable */
        }

        const newOrder: Order = {
          id: orderId,
          customerId: user.id,
          vendorId: activeVendorId,
          items,
          total,
          status: 'pending',
          timestamp: new Date().toISOString(),
          paymentMethod,
        };

        let reward: string | undefined;
        if (nextOrderCount === 3) reward = 'Free delivery unlocked!';
        else if (nextOrderCount % 5 === 0) reward = '₹30 cashback earned!';
        else if (nextOrderCount === 7) reward = '5% discount applied to next orders!';

        set((state) => ({
          currentUser: { ...user, orderCount: nextOrderCount },
          orders: [newOrder, ...state.orders],
          products: state.products.map((p) => {
            const bought = cartItems.find((item) => item.productId === p.id);
            if (bought) return { ...p, stock: Math.max(0, p.stock - bought.quantity) };
            return p;
          }),
        }));

        get().clearCart();
        syncOrderToSupabase(newOrder);
        void get().hydrateCatalog();

        return { success: true, orderId: newOrder.id, reward };
      },

      // Admin actions
      toggleVerifyVendor: (vendorId) => {
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === vendorId ? { ...v, isVerified: !v.isVerified } : v
          )
        }));
      },

      toggleSuspendVendor: (vendorId) => {
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === vendorId ? { ...v, isSuspended: !v.isSuspended } : v
          )
        }));
      },

      resolveDispute: (disputeId) => {
        set((state) => ({
          disputes: state.disputes.map((d) =>
            d.id === disputeId ? { ...d, status: 'Resolved' } : d
          )
        }));
      },

      escalateDispute: (disputeId) => {
        set((state) => ({
          disputes: state.disputes.map((d) =>
            d.id === disputeId ? { ...d, status: 'Escalated' } : d
          )
        }));
      },

      setActiveVendorId: (vendorId) => {
        set({ activeVendorId: vendorId });
      }
    }),
    {
      name: 'vendsor-ai-store-v1',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        cartItems: state.cartItems,
        negotiations: state.negotiations,
        orders: state.orders,
        activeVendorId: state.activeVendorId,
      }),
    }
  )
);

// Slicing utilities for AI / voice parser
function normalizeVoiceTranscript(transcript: string): string {
  return transcript
    .toLowerCase()
    .replace(/[₹]/g, '')
    .replace(/आधा/g, 'half')
    .replace(/किलो/g, 'kilo')
    .replace(/टमाटर|tamatar/g, 'tomato')
    .replace(/प्याज|pyaaz/g, 'onion')
    .replace(/आलू/g, 'potato')
    .replace(/पालक/g, 'spinach')
    .replace(/दूध|doodh/g, 'milk')
    .replace(/पनीर/g, 'paneer')
    .replace(/चावल/g, 'rice')
    .replace(/दाल/g, 'dal')
    .replace(/सेब/g, 'apple')
    .replace(/केला/g, 'banana')
    .replace(/ब्रेड/g, 'bread')
    .replace(/घी/g, 'ghee')
    .replace(/please|add|order|want|need|give me|mujhe|chahiye|dedo|le lo/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findProductForVoiceKeyword(keyword: string, products: Product[]): Product | null {
  const inStock = products.filter((p) => p.stock > 0);
  const cleaned = keyword.toLowerCase().trim();
  if (!cleaned) return null;

  const itemMap: Record<string, string> = {
    aloo: 'potato',
    potato: 'potato',
    pyaz: 'onion',
    onion: 'onion',
    tamatar: 'tomato',
    tomato: 'tomato',
    palak: 'spinach',
    spinach: 'spinach',
    milk: 'milk',
    doodh: 'milk',
    paneer: 'paneer',
    ghee: 'ghee',
    bread: 'bread',
    atta: 'bread',
    rice: 'rice',
    chawal: 'rice',
    basmati: 'rice',
    dal: 'dal',
    toor: 'dal',
    apple: 'apple',
    banana: 'banana',
    mango: 'mango',
    cauliflower: 'cauliflower',
    yogurt: 'yogurt',
    dahi: 'yogurt',
    turmeric: 'turmeric',
    haldi: 'turmeric',
    mustard: 'mustard',
    oil: 'oil',
    coconut: 'coconut',
  };

  const mapped = itemMap[cleaned] ?? cleaned;
  const exact = inStock.find((p) => p.name.toLowerCase().includes(mapped));
  if (exact) return exact;

  const words = cleaned.split(/\s+/).filter((w) => w.length > 2);
  let best: Product | null = null;
  let bestScore = 0;
  for (const product of inStock) {
    const productName = product.name.toLowerCase();
    const score = words.reduce(
      (sum, word) => sum + (productName.includes(word) || productName.includes(itemMap[word] ?? word) ? 1 : 0),
      productName.includes(mapped) ? 2 : 0
    );
    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }
  return bestScore > 0 ? best : null;
}

function mergeVoiceItems(
  target: { productId: string; quantity: number }[],
  productId: string,
  quantity: number
) {
  const existing = target.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    target.push({ productId, quantity });
  }
}

export function parseVoiceCommand(transcript: string, products: Product[]): { productId: string; quantity: number }[] {
  const result: { productId: string; quantity: number }[] = [];
  const normalized = normalizeVoiceTranscript(transcript);
  if (!normalized) return result;

  const segments = normalized.split(/\s*,\s*|\s+and\s+|\s+aur\s+|\s+plus\s+|\s+then\s+|\s+also\s+/);

  const wordNumbers: Record<string, number> = {
    ek: 1, one: 1, do: 2, two: 2, teen: 3, three: 3, char: 4, four: 4, paanch: 5, five: 5,
  };

  const tryAdd = (keyword: string, quantity: number) => {
    const product = findProductForVoiceKeyword(keyword, products);
    if (product && quantity > 0) {
      mergeVoiceItems(result, product.id, quantity);
    }
  };

  for (const segment of segments.length ? segments : [normalized]) {
    const text = segment.trim();
    if (!text) continue;

    const patterns: Array<{ regex: RegExp; qtyIndex: number; itemIndex: number }> = [
      { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg|kilogram|litre|l)\s+([a-z\u0900-\u097f]+)/g, qtyIndex: 1, itemIndex: 2 },
      { regex: /([a-z\u0900-\u097f]+)\s+(\d+(?:\.\d+)?)\s*(?:kilo|kg|kilogram|litre|l)/g, qtyIndex: 2, itemIndex: 1 },
      { regex: /(half|aadha)\s*(?:kilo|kg|kilogram|litre|l)\s+([a-z\u0900-\u097f]+)/g, qtyIndex: 0, itemIndex: 2 },
      { regex: /(\d+(?:\.\d+)?)\s*(?:g|gram|grams|gm|ml)\s+([a-z\u0900-\u097f]+)/g, qtyIndex: 1, itemIndex: 2 },
      { regex: /(ek|do|teen|char|one|two|three|four|paanch|five)\s*(?:kilo|kg|kilogram|litre|l)?\s+([a-z\u0900-\u097f]+)/g, qtyIndex: 1, itemIndex: 2 },
      { regex: /(\d+(?:\.\d+)?)\s+([a-z\u0900-\u097f]+)/g, qtyIndex: 1, itemIndex: 2 },
    ];

    for (const { regex, qtyIndex, itemIndex } of patterns) {
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const qtyRaw = match[qtyIndex];
        let quantity = 1;
        if (qtyRaw === 'half' || qtyRaw === 'aadha') {
          quantity = 0.5;
        } else if (wordNumbers[qtyRaw]) {
          quantity = wordNumbers[qtyRaw];
        } else {
          quantity = parseFloat(qtyRaw) || 1;
        }

        if (regex.source.includes('g|gram') && quantity >= 10) {
          quantity = parseFloat((quantity / 1000).toFixed(2));
        }

        tryAdd(match[itemIndex], quantity);
      }
    }

    // Plain item mention without quantity
    Object.keys({
      aloo: 1, potato: 1, pyaz: 1, onion: 1, tamatar: 1, tomato: 1, palak: 1, spinach: 1,
      milk: 1, paneer: 1, ghee: 1, bread: 1, rice: 1, chawal: 1, dal: 1, apple: 1, banana: 1,
    }).forEach((keyword) => {
      if (new RegExp(`\\b${keyword}\\b`).test(text) && !/\d+\s*(?:kilo|kg|g|gram)/.test(text)) {
        tryAdd(keyword, 1);
      }
    });
  }

  if (result.length === 0) {
    if (normalized.includes('sabzi ka thela') || normalized.includes('vegetables for a week')) {
      ['tomato', 'onion', 'potato', 'spinach'].forEach((b) => tryAdd(b, 1));
    } else if (normalized.includes('organic only')) {
      products.filter((p) => p.isOrganic && p.stock > 0).slice(0, 3).forEach((p) => mergeVoiceItems(result, p.id, 1));
    } else if (normalized.includes('bina pyaz')) {
      ['tomato', 'potato', 'spinach'].forEach((b) => tryAdd(b, 1));
    } else if (normalized.includes('fresh fruits under')) {
      products
        .filter((p) => p.category === 'Fruits' && p.stock > 0 && getEffectivePrice(p) < 100)
        .slice(0, 2)
        .forEach((p) => mergeVoiceItems(result, p.id, 1));
    } else {
      // Last resort: scan full transcript for any known product keywords
      const keywords = ['potato', 'onion', 'tomato', 'spinach', 'milk', 'paneer', 'rice', 'dal', 'bread', 'ghee', 'apple', 'banana', 'mango'];
      keywords.forEach((keyword) => {
        if (normalized.includes(keyword)) tryAdd(keyword, 1);
      });
    }
  }

  return result.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return item;
    return { ...item, quantity: Math.min(item.quantity, product.stock) };
  }).filter((item) => item.quantity > 0);
}

// Build Budget Basket: Greedy shopping list filler
export function buildBudgetBasket(budget: number, products: Product[]): { product: Product; quantity: number; cost: number }[] {
  const sorted = [...products]
    .map((p) => ({ product: p, effectivePrice: getEffectivePrice(p) }))
    .sort((a, b) => a.effectivePrice - b.effectivePrice);

  const basket: { product: Product; quantity: number; cost: number }[] = [];
  let remainingBudget = budget * 0.9;
  let uniqueCount = 0;

  for (const item of sorted) {
    if (uniqueCount >= 6) break;
    if (item.product.stock <= 0) continue;

    let quantityToBuy = 1;
    if (item.effectivePrice < 40 && remainingBudget >= item.effectivePrice * 2) {
      quantityToBuy = 2;
    }

    const cost = item.effectivePrice * quantityToBuy;
    if (cost <= remainingBudget && item.product.stock >= quantityToBuy) {
      basket.push({
        product: item.product,
        quantity: quantityToBuy,
        cost
      });
      remainingBudget -= cost;
      uniqueCount++;
    }
  }

  return basket;
}
