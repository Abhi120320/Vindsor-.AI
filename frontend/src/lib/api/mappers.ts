import type { Order, Product, User, Vendor } from '@/store/useAppStore';

type BackendRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN' | 'SUPPLIER';

export interface BackendUser {
  id: string;
  name: string;
  phone: string;
  role: BackendRole;
  vendor?: { id: string; businessName: string; location: string; rating: number } | null;
}

export interface BackendVendor {
  id: string;
  businessName: string;
  location: string;
  category: string;
  rating: number;
  healthScore?: number;
  user?: { phone: string; name: string };
}

export interface BackendProduct {
  id: string;
  vendorId: string | null;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  quality?: string | null;
  expiryDate?: string | null;
  lowestPrice?: number | null;
  rescueThresholdDays?: number | null;
}

const CATEGORY_MAP: Record<string, Product['category']> = {
  Vegetables: 'Vegetables',
  Fruits: 'Fruits',
  Dairy: 'Dairy',
  Spices: 'Spices',
  Oils: 'Oils',
  Breads: 'Breads',
  'Dal & Rice': 'Dal & Rice',
  Grocery: 'Vegetables',
  General: 'Vegetables',
};

const EMOJI: Record<string, string> = {
  Vegetables: '🥬',
  Fruits: '🍎',
  Dairy: '🥛',
  Spices: '🌶️',
  Oils: '🫒',
  Breads: '🍞',
  'Dal & Rice': '🍚',
};

function inferUnit(name: string, category: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('milk') || lower.includes('oil') || lower.includes('ghee')) return 'L';
  if (lower.includes('bread') || lower.includes('paneer') || lower.includes('egg')) return 'pack';
  return 'kg';
}

export function mapBackendRole(role: BackendRole): User['role'] {
  if (role === 'VENDOR') return 'vendor';
  if (role === 'ADMIN') return 'admin';
  return 'customer';
}

export function mapBackendUser(user: BackendUser, orderCount = 0): User {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: mapBackendRole(user.role),
    orderCount,
    preferences: {
      likes: [],
      dislikes: [],
      dietType: null,
      budget: null,
      chatHistory: [],
    },
  };
}

export function mapBackendVendor(v: BackendVendor): Vendor {
  return {
    id: v.id,
    name: v.businessName,
    rating: v.rating ?? 0,
    deliveryTime: '20-30 mins',
    address: v.location,
    phone: v.user?.phone ?? '',
    heroPhotoUrl: '',
    galleryPhotos: [],
    isVerified: (v.rating ?? 0) >= 4,
    isSuspended: false,
  };
}

export function mapBackendProduct(p: BackendProduct): Product | null {
  if (!p.vendorId) return null;
  const category = CATEGORY_MAP[p.category] ?? 'Vegetables';
  const organic = p.name.toLowerCase().includes('organic');
  const expiryDate = p.expiryDate ? new Date(p.expiryDate).toISOString().slice(0, 10) : '';
  const expiryDaysRemaining = p.expiryDate
    ? Math.max(0, Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 5;

  return {
    id: p.id,
    name: p.name,
    category,
    vendorId: p.vendorId,
    pricePerKg: p.price,
    unit: inferUnit(p.name, p.category),
    stock: p.stock,
    isOrganic: organic,
    harvestDate: new Date().toISOString().slice(0, 10),
    organicCertification: organic ? 'Local Organic' : '',
    expiryDaysRemaining,
    expiryDate,
    quality: p.quality ?? 'Standard',
    lowestPrice: p.lowestPrice ?? null,
    rescueThresholdDays: p.rescueThresholdDays ?? 2,
    costPrice: Math.round(p.price * 0.72),
    emoji: EMOJI[category] ?? '🛒',
    photoUrl: p.imageUrl ?? '',
  };
}

const STATUS_MAP: Record<string, Order['status']> = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PROCESSING: 'preparing',
  SHIPPED: 'dispatched',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
};

export function formatOrderStatus(status: Order['status']): string {
  const labels: Record<Order['status'], string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    preparing: 'Preparing',
    dispatched: 'Out for delivery',
    delivered: 'Delivered',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  };
  return labels[status] ?? status;
}

export function mapBackendOrder(o: {
  id: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items?: { productId: string; quantity: number; unitPrice: number; product?: { name: string } }[];
}): Order {
  return {
    id: o.id,
    customerId: o.buyerId,
    vendorId: o.sellerId,
    items: (o.items ?? []).map((item) => ({
      productId: item.productId,
      productName: item.product?.name ?? item.productId,
      quantity: item.quantity,
      price: item.unitPrice,
      unit: 'kg',
    })),
    total: o.totalAmount,
    status: STATUS_MAP[o.status] ?? 'pending',
    timestamp: o.createdAt,
    paymentMethod: 'Razorpay',
  };
}

export function toBackendRole(role: 'customer' | 'vendor'): BackendRole {
  return role === 'vendor' ? 'VENDOR' : 'CUSTOMER';
}
