import type { Order, Product } from '@/store/useAppStore';

export type DateRange = 'today' | '7d' | '30d' | '90d';
export type ForecastHorizon = 'tomorrow' | '7d' | '30d';

export interface ActivityItem {
  id: string;
  message: string;
  time: string;
  type: 'order' | 'inventory' | 'forecast' | 'payment' | 'supplier';
}

export interface RevenuePoint {
  hour: string;
  revenue: number;
}

export interface ForecastPoint {
  label: string;
  predicted: number;
  actual: number;
  confidence: number;
}

export interface TopProductRow {
  name: string;
  unitsSold: number;
  revenue: number;
  margin: number;
}

export interface AIInsight {
  id: string;
  text: string;
  type: 'demand' | 'inventory' | 'savings';
}

export interface HealthFactors {
  profitability: number;
  inventoryEfficiency: number;
  customerSatisfaction: number;
  orderCompletionRate: number;
}

export interface KPITrends {
  revenue: number | null;
  orders: number | null;
  inventory: number | null;
  forecast: number | null;
}

const HOUR_BUCKETS = ['6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HEATMAP_SLOTS = [6, 9, 12, 15, 18, 21, 0, 3];

function getRangeStart(range: DateRange): Date {
  const now = new Date();
  const start = new Date(now);
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
    return start;
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getPreviousRangeOrders(orders: Order[], range: DateRange): Order[] {
  const currentStart = getRangeStart(range);
  const previousEnd = new Date(currentStart);
  previousEnd.setMilliseconds(-1);

  const previousStart = new Date(currentStart);
  if (range === 'today') {
    previousStart.setDate(previousStart.getDate() - 1);
    previousStart.setHours(0, 0, 0, 0);
  } else {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    previousStart.setDate(previousStart.getDate() - days);
  }

  return orders.filter((o) => {
    const ts = new Date(o.timestamp);
    return ts >= previousStart && ts <= previousEnd;
  });
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function filterOrdersByRange(orders: Order[], range: DateRange): Order[] {
  const start = getRangeStart(range);
  return orders.filter((o) => new Date(o.timestamp) >= start);
}

export function computeKPIs(
  orders: Order[],
  products: Product[],
  allOrders: Order[],
  range: DateRange
) {
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const orderCount = orders.length;
  const stocked = products.filter((p) => p.stock > 0).length;
  const inventoryHealth = products.length ? Math.round((stocked / products.length) * 100) : 0;

  const previousOrders = getPreviousRangeOrders(allOrders, range);
  const prevRevenue = previousOrders.reduce((sum, o) => sum + o.total, 0);
  const prevOrderCount = previousOrders.length;
  const prevStocked = products.length ? Math.round((stocked / products.length) * 100) : 0;

  const forecastAccuracy = computeForecastAccuracy(allOrders, range);

  const trends: KPITrends = {
    revenue: percentChange(revenue, prevRevenue),
    orders: percentChange(orderCount, prevOrderCount),
    inventory: percentChange(inventoryHealth, prevStocked),
    forecast: forecastAccuracy.trend,
  };

  return {
    revenue,
    orderCount,
    inventoryHealth,
    forecastAccuracy: forecastAccuracy.score,
    trends,
  };
}

function computeForecastAccuracy(
  orders: Order[],
  range: DateRange
): { score: number; trend: number | null } {
  const dailyTotals = new Map<string, number>();
  orders.forEach((o) => {
    const key = new Date(o.timestamp).toISOString().slice(0, 10);
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + o.total);
  });

  const sortedDays = [...dailyTotals.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (sortedDays.length < 3) {
    return { score: 0, trend: null };
  }

  let totalError = 0;
  let comparisons = 0;
  for (let i = 1; i < sortedDays.length; i++) {
    const predicted = sortedDays[i - 1][1];
    const actual = sortedDays[i][1];
    if (predicted === 0 && actual === 0) continue;
    const error = Math.abs(actual - predicted) / Math.max(predicted, actual, 1);
    totalError += error;
    comparisons++;
  }

  const score = comparisons ? Math.round((1 - totalError / comparisons) * 100) : 0;

  const recent = sortedDays.slice(-7);
  const older = sortedDays.slice(-14, -7);
  if (older.length === 0) return { score, trend: null };

  const recentAvg =
    recent.reduce((s, [, v]) => s + v, 0) / Math.max(recent.length, 1);
  const olderAvg =
    older.reduce((s, [, v]) => s + v, 0) / Math.max(older.length, 1);
  return { score, trend: percentChange(recentAvg, olderAvg) };
}

function hourBucketIndex(h: number): number {
  if (h < 7) return 0;
  if (h < 9) return 1;
  if (h < 11) return 2;
  if (h < 13) return 3;
  if (h < 15) return 4;
  if (h < 17) return 5;
  if (h < 19) return 6;
  if (h < 21) return 7;
  return 8;
}

export function buildRevenueByHour(orders: Order[]): RevenuePoint[] {
  const buckets = HOUR_BUCKETS.map((hour) => ({ hour, revenue: 0 }));

  orders.forEach((order) => {
    const idx = hourBucketIndex(new Date(order.timestamp).getHours());
    buckets[idx].revenue += order.total;
  });

  return buckets;
}

export function buildForecastData(horizon: ForecastHorizon, orders: Order[]): ForecastPoint[] {
  if (orders.length === 0) return [];

  const dailyUnits = new Map<string, number>();
  orders.forEach((o) => {
    const key = new Date(o.timestamp).toISOString().slice(0, 10);
    const units = o.items.reduce((s, i) => s + i.quantity, 0);
    dailyUnits.set(key, (dailyUnits.get(key) ?? 0) + units);
  });

  const sorted = [...dailyUnits.entries()].sort(([a], [b]) => a.localeCompare(b));
  const values = sorted.map(([, v]) => v);
  const avg = values.reduce((s, v) => s + v, 0) / Math.max(values.length, 1);

  if (horizon === 'tomorrow') {
    const hourly = HOUR_BUCKETS.map((hour) => ({ hour, units: 0 }));
    orders.forEach((o) => {
      const idx = hourBucketIndex(new Date(o.timestamp).getHours());
      hourly[idx].units += o.items.reduce((s, i) => s + i.quantity, 0);
    });
    const hourlyAvg = hourly.map((h) => h.units / Math.max(orders.length / 9, 1));
    return hourly.map((h, i) => ({
      label: h.hour,
      predicted: Math.round(hourlyAvg[i] * 1.05),
      actual: h.units,
      confidence: h.units > 0 ? 85 : 0,
    }));
  }

  if (horizon === '7d') {
    const last7 = sorted.slice(-7);
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return labels.map((label, i) => {
      const entry = last7[i];
      const actual = entry ? entry[1] : 0;
      return {
        label,
        predicted: Math.round(avg),
        actual,
        confidence: actual > 0 ? Math.min(95, Math.round(70 + (actual / Math.max(avg, 1)) * 15)) : 0,
      };
    });
  }

  const weekly: { label: string; actual: number }[] = [];
  for (let w = 0; w < 4; w++) {
    const chunk = sorted.slice(w * 7, (w + 1) * 7);
    weekly.push({
      label: `W${w + 1}`,
      actual: chunk.reduce((s, [, v]) => s + v, 0),
    });
  }
  const weeklyAvg = weekly.reduce((s, w) => s + w.actual, 0) / Math.max(weekly.length, 1);

  return weekly.map((w) => ({
    label: w.label,
    predicted: Math.round(weeklyAvg),
    actual: w.actual,
    confidence: w.actual > 0 ? Math.min(95, Math.round(65 + (w.actual / Math.max(weeklyAvg, 1)) * 20)) : 0,
  }));
}

export function buildTopProducts(orders: Order[], products: Product[]): TopProductRow[] {
  const map = new Map<string, { units: number; revenue: number; name: string; margin: number }>();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      const margin =
        product && item.price > 0
          ? Math.round(((item.price - product.costPrice) / item.price) * 100)
          : 0;
      const existing = map.get(item.productId) ?? {
        units: 0,
        revenue: 0,
        name: item.productName,
        margin,
      };
      existing.units += item.quantity;
      existing.revenue += item.price * item.quantity;
      if (product) existing.margin = margin;
      map.set(item.productId, existing);
    });
  });

  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((r) => ({
      name: r.name,
      unitsSold: r.units,
      revenue: r.revenue,
      margin: r.margin,
    }));
}

export function buildInventoryInsights(products: Product[], orders: Order[]) {
  const salesByProduct = new Map<string, number>();
  orders.forEach((o) => {
    o.items.forEach((item) => {
      salesByProduct.set(item.productId, (salesByProduct.get(item.productId) ?? 0) + item.quantity);
    });
  });

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 3).map((p) => p.name);
  const outOfStock = products.filter((p) => p.stock === 0).map((p) => p.name);

  const withSales = products
    .map((p) => ({ product: p, sold: salesByProduct.get(p.id) ?? 0 }))
    .sort((a, b) => b.sold - a.sold);

  const fastMoving = withSales
    .filter((x) => x.sold > 0)
    .slice(0, 5)
    .map((x) => x.product.name);

  const slowMoving = products
    .filter((p) => p.stock > 0 && (salesByProduct.get(p.id) ?? 0) === 0)
    .slice(0, 5)
    .map((p) => p.name);

  return { lowStock, outOfStock, fastMoving, slowMoving };
}

export function buildAIInsights(orders: Order[], products: Product[]): AIInsight[] {
  const insights: AIInsight[] = [];
  const salesByProduct = new Map<string, { name: string; sold: number }>();

  orders.forEach((o) => {
    o.items.forEach((item) => {
      const cur = salesByProduct.get(item.productId) ?? { name: item.productName, sold: 0 };
      cur.sold += item.quantity;
      salesByProduct.set(item.productId, cur);
    });
  });

  const topSeller = [...salesByProduct.values()].sort((a, b) => b.sold - a.sold)[0];
  if (topSeller && topSeller.sold > 0) {
    insights.push({
      id: 'demand-top',
      text: `${topSeller.name} is your top seller with ${topSeller.sold} units in this period — consider increasing stock.`,
      type: 'demand',
    });
  }

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 2);
  lowStock.slice(0, 2).forEach((p) => {
    insights.push({
      id: `low-${p.id}`,
      text: `${p.name} is running low (${p.stock} ${p.unit} left). Restock soon to avoid missed sales.`,
      type: 'inventory',
    });
  });

  const outOfStock = products.filter((p) => p.stock === 0);
  if (outOfStock.length > 0) {
    insights.push({
      id: 'oos',
      text: `${outOfStock.length} product${outOfStock.length > 1 ? 's are' : ' is'} out of stock: ${outOfStock
        .slice(0, 3)
        .map((p) => p.name)
        .join(', ')}${outOfStock.length > 3 ? '…' : ''}.`,
      type: 'inventory',
    });
  }

  const slowProducts = products.filter(
    (p) => p.stock > 10 && (salesByProduct.get(p.id)?.sold ?? 0) === 0
  );
  if (slowProducts.length > 0) {
    const p = slowProducts[0];
    const tiedUp = Math.round(p.stock * p.costPrice);
    insights.push({
      id: `slow-${p.id}`,
      text: `${p.name} has ${p.stock} ${p.unit} in stock with no recent sales (~₹${tiedUp} tied up). Consider a promotion.`,
      type: 'savings',
    });
  }

  if (orders.length === 0 && products.length > 0) {
    insights.push({
      id: 'no-orders',
      text: 'No orders in this period yet. Share your store link and keep prices competitive to drive first sales.',
      type: 'demand',
    });
  }

  return insights.slice(0, 5);
}

export function computeHealthScore(
  orders: Order[],
  products: Product[],
  rating: number
): { score: number; factors: HealthFactors } {
  if (orders.length === 0 && products.length === 0) {
    return {
      score: 0,
      factors: {
        profitability: 0,
        inventoryEfficiency: 0,
        customerSatisfaction: 0,
        orderCompletionRate: 0,
      },
    };
  }

  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const profitability = Math.min(100, Math.round(revenue / 250));
  const avgStock = products.length
    ? products.reduce((s, p) => s + p.stock, 0) / products.length
    : 0;
  const inventoryEfficiency =
    products.length === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round(100 - (avgStock / 20) * 100)));
  const customerSatisfaction = Math.round(rating * 20);
  const delivered = orders.filter((o) => o.status === 'delivered').length;
  const orderCompletionRate = orders.length
    ? Math.round((delivered / orders.length) * 100)
    : 0;

  const score = Math.round(
    profitability * 0.25 +
      inventoryEfficiency * 0.25 +
      customerSatisfaction * 0.25 +
      orderCompletionRate * 0.25
  );

  return {
    score,
    factors: {
      profitability,
      inventoryEfficiency,
      customerSatisfaction,
      orderCompletionRate,
    },
  };
}

export function buildHeatmapData(orders: Order[]): { grid: number[][]; dayLabels: string[] } {
  const grid = Array.from({ length: 7 }, () => Array(8).fill(0));
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const weekOrders = orders.filter((o) => new Date(o.timestamp) >= weekStart);
  let maxRevenue = 0;

  weekOrders.forEach((order) => {
    const d = new Date(order.timestamp);
    const dayIdx = d.getDay();
    const hour = d.getHours();
    let slotIdx = HEATMAP_SLOTS.findIndex((s, i) => {
      const next = HEATMAP_SLOTS[i + 1] ?? 24;
      return hour >= s && hour < next;
    });
    if (slotIdx < 0) slotIdx = 7;
    grid[dayIdx][slotIdx] += order.total;
    maxRevenue = Math.max(maxRevenue, grid[dayIdx][slotIdx]);
  });

  const normalized = grid.map((row) =>
    row.map((v) => (maxRevenue === 0 ? 0 : Math.round((v / maxRevenue) * 100)))
  );

  return { grid: normalized, dayLabels: DAY_LABELS };
}

export function buildActivitiesFromOrders(orders: Order[]): ActivityItem[] {
  return orders.slice(0, 8).map((o) => ({
    id: `order-${o.id}`,
    message: `Order ${o.id} — ${formatINR(o.total)} (${o.status})`,
    time: formatRelativeTime(new Date(o.timestamp)),
    type: 'order' as const,
  }));
}

export function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hr ago';
  if (hrs < 24) return `${hrs} hrs ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatTrend(trend: number | null): { label: string; positive: boolean } | null {
  if (trend === null) return null;
  if (trend === 0) return { label: '0%', positive: true };
  return {
    label: `${trend > 0 ? '+' : ''}${trend}%`,
    positive: trend >= 0,
  };
}

export const HEATMAP_SLOT_LABELS = ['6a', '9a', '12p', '3p', '6p', '9p', '12a', '3a'];
