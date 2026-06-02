'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Brain,
  Download,
  Package,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  Warehouse,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useVendorAnalyticsSocket } from '@/hooks/useVendorAnalyticsSocket';
import {
  AnalyticsCard,
  CircularHealthScore,
  LiveIndicator,
  SectionTitle,
  Skeleton,
  TrendBadge,
} from '@/components/analytics/analytics-ui';
import {
  buildActivitiesFromOrders,
  buildAIInsights,
  buildForecastData,
  buildHeatmapData,
  buildInventoryInsights,
  buildRevenueByHour,
  buildTopProducts,
  computeHealthScore,
  computeKPIs,
  filterOrdersByRange,
  formatTrend,
  HEATMAP_SLOT_LABELS,
  type ActivityItem,
  type DateRange,
  type ForecastHorizon,
} from '@/lib/analytics-utils';

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
];

const FORECAST_TABS: { id: ForecastHorizon; label: string }[] = [
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: '7d', label: 'Next 7 Days' },
  { id: '30d', label: 'Next 30 Days' },
];

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

interface VendorAnalyticsDashboardProps {
  vendorId: string;
  vendorRating?: number;
}

export function VendorAnalyticsDashboard({
  vendorId,
  vendorRating = 0,
}: VendorAnalyticsDashboardProps) {
  const orders = useAppStore((s) => s.orders);
  const products = useAppStore((s) => s.products);

  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [forecastHorizon, setForecastHorizon] = useState<ForecastHorizon>('tomorrow');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const seededActivities = useRef(false);

  const vendorOrders = useMemo(
    () => orders.filter((o) => o.vendorId === vendorId),
    [orders, vendorId]
  );
  const vendorProducts = useMemo(
    () => products.filter((p) => p.vendorId === vendorId),
    [products, vendorId]
  );
  const rangedOrders = useMemo(
    () => filterOrdersByRange(vendorOrders, dateRange),
    [vendorOrders, dateRange, refreshKey]
  );

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const { status, activities, setActivities, pushActivity } = useVendorAnalyticsSocket({
    onNewOrder: bumpRefresh,
    onOrderAccepted: bumpRefresh,
    onOrderDelivered: bumpRefresh,
    onInventoryUpdated: bumpRefresh,
    onPaymentSuccess: bumpRefresh,
    onForecastGenerated: bumpRefresh,
    onHealthScoreUpdated: bumpRefresh,
  });

  // Seed activity feed from real order history (once)
  useEffect(() => {
    if (seededActivities.current || vendorOrders.length === 0) return;
    seededActivities.current = true;
    setActivities(buildActivitiesFromOrders(vendorOrders));
  }, [vendorOrders, setActivities]);

  // Live: reflect in-app stock changes in activity feed
  const prevStockRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    vendorProducts.forEach((p) => {
      const prev = prevStockRef.current.get(p.id);
      if (prev !== undefined && prev !== p.stock) {
        pushActivity({
          id: `stock-${p.id}-${Date.now()}`,
          message: `${p.name} stock updated — ${p.stock} ${p.unit}`,
          time: 'Just now',
          type: 'inventory',
        });
        bumpRefresh();
      }
      prevStockRef.current.set(p.id, p.stock);
    });
  }, [vendorProducts, pushActivity, bumpRefresh]);

  // Live: new orders placed in-app (same tab or persisted reload)
  const prevOrderCount = useRef(vendorOrders.length);
  useEffect(() => {
    if (vendorOrders.length > prevOrderCount.current) {
      const newest = vendorOrders[0];
      if (newest) {
        pushActivity({
          id: `live-order-${newest.id}`,
          message: `Order ${newest.id} placed — ${formatINR(newest.total)}`,
          time: 'Just now',
          type: 'order',
        });
      }
      bumpRefresh();
    }
    prevOrderCount.current = vendorOrders.length;
  }, [vendorOrders, pushActivity, bumpRefresh]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [dateRange, vendorId]);

  const kpis = useMemo(
    () => computeKPIs(rangedOrders, vendorProducts, vendorOrders, dateRange),
    [rangedOrders, vendorProducts, vendorOrders, dateRange]
  );
  const revenueData = useMemo(() => buildRevenueByHour(rangedOrders), [rangedOrders]);
  const forecastData = useMemo(
    () => buildForecastData(forecastHorizon, vendorOrders),
    [forecastHorizon, vendorOrders, refreshKey]
  );
  const topProducts = useMemo(
    () => buildTopProducts(rangedOrders, vendorProducts),
    [rangedOrders, vendorProducts]
  );
  const inventory = useMemo(
    () => buildInventoryInsights(vendorProducts, rangedOrders),
    [vendorProducts, rangedOrders, refreshKey]
  );
  const insights = useMemo(
    () => buildAIInsights(rangedOrders, vendorProducts),
    [rangedOrders, vendorProducts]
  );
  const health = useMemo(
    () => computeHealthScore(vendorOrders, vendorProducts, vendorRating),
    [vendorOrders, vendorProducts, vendorRating, refreshKey]
  );
  const heatmap = useMemo(() => buildHeatmapData(vendorOrders), [vendorOrders, refreshKey]);

  const hasAnyActivity =
    vendorOrders.length > 0 ||
    vendorProducts.length > 0 ||
    activities.length > 0;

  const handleExport = () => {
    const report = {
      vendorId,
      dateRange,
      generatedAt: new Date().toISOString(),
      kpis,
      topProducts,
      health,
      revenueByHour: revenueData,
      forecast: forecastData,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-analytics-${dateRange}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-24">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <LiveIndicator status={status} />
      </div>
    );
  }

  if (!hasAnyActivity) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center pb-24 text-center">
        <AnalyticsCard className="max-w-md p-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#006B4F]/10">
            <BarChart3Placeholder />
          </div>
          <h2 className="text-xl font-bold text-stone-900">No analytics available yet</h2>
          <p className="mt-2 text-sm text-stone-500">
            Start receiving orders and managing inventory to unlock real-time business intelligence.
          </p>
        </AnalyticsCard>
        <LiveIndicator status={status} />
      </div>
    );
  }

  const revenueTrend = formatTrend(kpis.trends.revenue);
  const ordersTrend = formatTrend(kpis.trends.orders);
  const inventoryTrend = formatTrend(kpis.trends.inventory);
  const forecastTrend = formatTrend(kpis.trends.forecast);

  return (
    <div className="space-y-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Live Business Analytics
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Monitor your business performance in real-time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
            {DATE_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setDateRange(r.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  dateRange === r.id
                    ? 'bg-[#006B4F] text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm transition hover:border-[#006B4F]/30 hover:text-[#006B4F]"
          >
            <Download className="h-3.5 w-3.5" />
            Export Report
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="Revenue"
          value={formatINR(kpis.revenue)}
          trend={revenueTrend}
          icon={<TrendingUp className="h-4 w-4" />}
          delay={0}
        />
        <KPICard
          label="Orders"
          value={`${kpis.orderCount} Order${kpis.orderCount === 1 ? '' : 's'}`}
          trend={ordersTrend}
          icon={<ShoppingCart className="h-4 w-4" />}
          delay={0.05}
        />
        <KPICard
          label="Inventory Health"
          value={`${kpis.inventoryHealth}%`}
          trend={inventoryTrend}
          icon={<Warehouse className="h-4 w-4" />}
          delay={0.1}
        />
        <KPICard
          label="Forecast Accuracy"
          value={kpis.forecastAccuracy > 0 ? `${kpis.forecastAccuracy}%` : '—'}
          trend={forecastTrend}
          icon={<Target className="h-4 w-4" />}
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsCard className="p-6">
          <SectionTitle title="Revenue by Hour" subtitle="Live updates from orders & Socket.IO" />
          {revenueData.every((d) => d.revenue === 0) ? (
            <EmptyChart message="No revenue recorded in this period." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#006B4F" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#006B4F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#78716c' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #F0F1F3', fontSize: 12 }}
                    formatter={(v) => [formatINR(Number(v ?? 0)), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#006B4F"
                    strokeWidth={2.5}
                    fill="url(#revenueGrad)"
                    isAnimationActive
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard className="p-6">
          <SectionTitle
            title="Demand Forecast"
            subtitle="Predicted vs actual from your order history"
            action={
              <div className="flex rounded-lg border border-stone-100 bg-stone-50 p-0.5">
                {FORECAST_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setForecastHorizon(tab.id)}
                    className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                      forecastHorizon === tab.id
                        ? 'bg-white text-[#006B4F] shadow-sm'
                        : 'text-stone-500'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
          />
          {forecastData.length === 0 ? (
            <EmptyChart message="Need more order history to generate forecasts." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#006B4F" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#00A86B" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="confidence" name="Confidence %" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <AnalyticsCard className="p-6 lg:col-span-2">
          <SectionTitle title="Top Selling Products" subtitle="Units, revenue & margin" />
          {topProducts.length === 0 ? (
            <EmptySection message="No product sales in this period." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    <th className="pb-3 pr-4">Product</th>
                    <th className="pb-3 pr-4">Units Sold</th>
                    <th className="pb-3 pr-4">Revenue</th>
                    <th className="pb-3">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <motion.tr
                      key={`${p.name}-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-stone-50 last:border-0"
                    >
                      <td className="py-3.5 pr-4 font-medium text-stone-900">{p.name}</td>
                      <td className="py-3.5 pr-4 text-stone-600">{p.unitsSold}</td>
                      <td className="py-3.5 pr-4 font-semibold text-stone-800">{formatINR(p.revenue)}</td>
                      <td className="py-3.5">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-[#00A86B]">
                          {p.margin}%
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard className="p-6">
          <SectionTitle title="Vendor Health Score" subtitle="From your live store data" />
          <div className="flex flex-col items-center">
            <CircularHealthScore score={health.score} />
            <div className="mt-4 w-full space-y-2">
              <FactorBar label="Profitability" value={health.factors.profitability} />
              <FactorBar label="Inventory Efficiency" value={health.factors.inventoryEfficiency} />
              <FactorBar label="Customer Satisfaction" value={health.factors.customerSatisfaction} />
              <FactorBar label="Order Completion" value={health.factors.orderCompletionRate} />
            </div>
          </div>
        </AnalyticsCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsCard className="p-6">
          <SectionTitle title="Inventory Insights" subtitle="Stock alerts & movement" />
          <div className="grid gap-3 sm:grid-cols-2">
            <InventoryGroup title="Low Stock Alerts" items={inventory.lowStock} color="orange" />
            <InventoryGroup title="Out of Stock" items={inventory.outOfStock} color="red" />
            <InventoryGroup title="Fast Moving" items={inventory.fastMoving} color="green" />
            <InventoryGroup title="Slow Moving" items={inventory.slowMoving} color="orange" />
          </div>
        </AnalyticsCard>

        <AnalyticsCard className="p-6">
          <SectionTitle
            title="AI Business Insights"
            subtitle="Generated from your store data"
            action={<Sparkles className="h-4 w-4 text-[#006B4F]" />}
          />
          {insights.length === 0 ? (
            <EmptySection message="Insights will appear as you receive orders." />
          ) : (
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-3 rounded-2xl border border-stone-100 bg-[#F8F9FA] p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#006B4F]/10">
                    <Brain className="h-4 w-4 text-[#006B4F]" />
                  </div>
                  <p className="text-sm leading-relaxed text-stone-700">{insight.text}</p>
                </motion.div>
              ))}
            </div>
          )}
        </AnalyticsCard>
      </div>

      <AnalyticsCard className="p-6">
        <SectionTitle title="Sales Heatmap" subtitle="Revenue intensity by day & hour (last 7 days)" />
        {heatmap.grid.every((row) => row.every((v) => v === 0)) ? (
          <EmptySection message="No sales data for the heatmap yet." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="min-w-[520px]">
                <div className="mb-2 grid grid-cols-[48px_repeat(8,1fr)] gap-1 text-[10px] font-medium text-stone-400">
                  <div />
                  {HEATMAP_SLOT_LABELS.map((s) => (
                    <div key={s} className="text-center">
                      {s}
                    </div>
                  ))}
                </div>
                {heatmap.grid.map((row, di) => (
                  <div key={heatmap.dayLabels[di]} className="mb-1 grid grid-cols-[48px_repeat(8,1fr)] gap-1">
                    <div className="flex items-center text-xs font-medium text-stone-500">
                      {heatmap.dayLabels[di]}
                    </div>
                    {row.map((intensity, si) => (
                      <HeatCell key={`${di}-${si}`} intensity={intensity} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-[10px] text-stone-500">
              <span>Low</span>
              <div className="flex h-2 max-w-xs flex-1 gap-0.5 overflow-hidden rounded-full">
                {[0, 25, 50, 75, 100].map((v) => (
                  <div key={v} className="flex-1" style={{ backgroundColor: heatColor(v) }} />
                ))}
              </div>
              <span>High</span>
            </div>
          </>
        )}
      </AnalyticsCard>

      <AnalyticsCard className="p-6">
        <SectionTitle title="Live Activity Feed" subtitle="Real-time business events" />
        {activities.length === 0 ? (
          <EmptySection message="Waiting for orders, payments, or inventory updates…" />
        ) : (
          <div className="relative space-y-0">
            <div className="absolute bottom-2 left-[15px] top-2 w-px bg-stone-100" />
            <AnimatePresence mode="popLayout">
              {activities.map((item, i) => (
                <ActivityRow key={item.id} item={item} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </AnalyticsCard>

      <LiveIndicator status={status} />
    </div>
  );
}

function KPICard({
  label,
  value,
  trend,
  icon,
  delay,
}: {
  label: string;
  value: string;
  trend: { label: string; positive: boolean } | null;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
      <AnalyticsCard className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{label}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#006B4F]/8 text-[#006B4F]">{icon}</span>
        </div>
        <p className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">{value}</p>
        {trend && (
          <div className="mt-2">
            <TrendBadge value={trend.label} positive={trend.positive} />
          </div>
        )}
      </AnalyticsCard>
    </motion.div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50">
      <p className="text-sm text-stone-500">{message}</p>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-8 text-center">
      <p className="text-sm text-stone-500">{message}</p>
    </div>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-stone-500">{label}</span>
        <span className="font-semibold text-stone-700">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
        <motion.div
          className="h-full rounded-full bg-[#006B4F]"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function InventoryGroup({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: 'red' | 'orange' | 'green';
}) {
  const styles = {
    red: 'border-rose-100 bg-rose-50/50 text-rose-700',
    orange: 'border-amber-100 bg-amber-50/50 text-amber-800',
    green: 'border-emerald-100 bg-emerald-50/50 text-emerald-800',
  }[color];

  return (
    <div className={`rounded-2xl border p-3 ${styles}`}>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs opacity-70">None</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-1.5 text-xs">
              <Package className="h-3 w-3 opacity-60" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function heatColor(intensity: number) {
  const t = intensity / 100;
  if (t <= 0) return '#F0F1F3';
  if (t < 0.25) return '#E8F5F0';
  if (t < 0.5) return '#9FD4BC';
  if (t < 0.75) return '#3D9B73';
  return '#006B4F';
}

function HeatCell({ intensity }: { intensity: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="aspect-square rounded-md"
      style={{ backgroundColor: heatColor(intensity) }}
      title={intensity > 0 ? `${intensity}% of peak` : 'No sales'}
    />
  );
}

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  const dotColor = {
    order: 'bg-[#006B4F]',
    inventory: 'bg-amber-500',
    forecast: 'bg-violet-500',
    payment: 'bg-[#00A86B]',
    supplier: 'bg-sky-500',
  }[item.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.03 }}
      className="relative flex gap-4 py-3 pl-1"
    >
      <span className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${dotColor}`} />
      <div className="flex flex-1 items-start justify-between gap-2 border-b border-stone-50 pb-3 last:border-0">
        <p className="text-sm font-medium text-stone-800">{item.message}</p>
        <span className="shrink-0 text-[11px] text-stone-400">{item.time}</span>
      </div>
    </motion.div>
  );
}

function BarChart3Placeholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-[#006B4F]" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" strokeLinecap="round" />
      <rect x="7" y="10" width="3" height="8" rx="1" fill="currentColor" opacity="0.3" stroke="none" />
      <rect x="12" y="6" width="3" height="12" rx="1" fill="currentColor" opacity="0.5" stroke="none" />
      <rect x="17" y="13" width="3" height="5" rx="1" fill="currentColor" opacity="0.3" stroke="none" />
    </svg>
  );
}
