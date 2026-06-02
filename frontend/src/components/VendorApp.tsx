'use client';

import React, { useState } from 'react';
import { useAppStore, getEffectivePrice, getExpiryDaysRemaining, isRescueActive, Product, Vendor, Order, Negotiation } from '@/store/useAppStore';
import { 
  Plus, Trash2, ShieldCheck, Sun, Moon, TrendingUp, Clock, AlertTriangle, Users, 
  Check, X, Mic, Settings, ShoppingBag, Upload, Tag, RefreshCw, BarChart2, Bell, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorAnalyticsDashboard } from '@/components/analytics/VendorAnalyticsDashboard';
import { formatOrderStatus } from '@/lib/api/mappers';
import { BRAND_NAME } from '@/lib/brand';

export function VendorApp() {
  const currentUser = useAppStore((state) => state.currentUser);
  const products = useAppStore((state) => state.products);
  const vendors = useAppStore((state) => state.vendors);
  const negotiations = useAppStore((state) => state.negotiations);
  const orders = useAppStore((state) => state.orders);

  // Zustand actions
  const updateVendorPhoto = useAppStore((state) => state.updateVendorPhoto);
  const addGalleryPhoto = useAppStore((state) => state.addGalleryPhoto);
  const updateStock = useAppStore((state) => state.updateStock);
  const addProduct = useAppStore((state) => state.addProduct);
  const updateProductPhoto = useAppStore((state) => state.updateProductPhoto);
  const syncOrderAction = useAppStore((state) => state.syncOrderAction);
  const respondToNegotiation = useAppStore((state) => state.respondToNegotiation);

  // Local UI state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'negotiations' | 'analytics' | 'notifications'>('dashboard');
  const [highlightProductId, setHighlightProductId] = useState<string | null>(null);

  // Stock edit states
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editExpiry, setEditExpiry] = useState<number>(0);

  const PRODUCT_CATEGORIES: Product['category'][] = [
    'Vegetables',
    'Fruits',
    'Dairy',
    'Spices',
    'Oils',
    'Breads',
    'Dal & Rice',
  ];

  const [showAddForm, setShowAddForm] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<Product['category']>('Vegetables');
  const [newStock, setNewStock] = useState(10);
  const [newPrice, setNewPrice] = useState(40);
  const [newUnit, setNewUnit] = useState('kg');
  const [newExpiry, setNewExpiry] = useState(10);
  const [newQuality, setNewQuality] = useState('Farm Fresh');
  const [newLowestPrice, setNewLowestPrice] = useState(0);
  const [newRescueThreshold, setNewRescueThreshold] = useState(2);
  const [newOrganic, setNewOrganic] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Counter negotiation states
  const [counterNegId, setCounterNegId] = useState<string | null>(null);
  const [counterValue, setCounterValue] = useState<number>(0);

  // Image compressor helper (max 400px width, 70% quality JPEG)
  const compressAndSave = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          callback(compressed);
        } else {
          callback(img.src);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  // Find the vendor linked to this logged-in user profile
  const currentVendor =
    vendors.find((v) => v.phone === currentUser?.phone) ??
    (currentUser?.role === 'vendor' ? vendors[0] : undefined);
  if (!currentVendor) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center">
        <p className="text-sm text-stone-500">No vendor store linked to your account yet.</p>
      </div>
    );
  }
  const vendorProducts = products.filter((p) => p.vendorId === currentVendor.id);
  const vendorOrders = orders.filter((o) => o.vendorId === currentVendor.id);
  const vendorNegotiations = negotiations.filter((n) => n.vendorId === currentVendor.id);
  const pendingNegs = vendorNegotiations.filter((n) => n.status === 'pending');

  // Handle Hero image upload
  const handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndSave(file, (base64) => {
        updateVendorPhoto(currentVendor.id, base64);
        toast.success("Store hero photo updated successfully!");
      });
    }
  };

  // Handle Product photo upload
  const handleProductPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, productId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndSave(file, (base64) => {
        updateProductPhoto(productId, base64);
        addGalleryPhoto(currentVendor.id, base64);
        toast.success("Product shelf photo uploaded and synced to daily gallery!");
      });
    }
  };

  const handleEditClick = (p: Product) => {
    setEditingProductId(p.id);
    setEditStock(p.stock);
    setEditPrice(p.pricePerKg);
    setEditExpiry(p.expiryDaysRemaining);
  };

  const handleSaveStock = (productId: string) => {
    updateStock(currentVendor.id, productId, {
      stock: editStock,
      pricePerKg: editPrice,
      expiryDaysRemaining: editExpiry
    });
    setEditingProductId(null);
    toast.success("Product stock details updated!");
  };

  const resetAddForm = () => {
    setNewName('');
    setNewCategory('Vegetables');
    setNewStock(10);
    setNewPrice(40);
    setNewUnit('kg');
    setNewExpiry(10);
    setNewQuality('Farm Fresh');
    setNewLowestPrice(0);
    setNewRescueThreshold(2);
    setNewOrganic(false);
    setNewPhotoUrl('');
    setShowAddForm(false);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Enter a product name');
      return;
    }
    if (newStock <= 0 || newPrice <= 0) {
      toast.error('Stock and price must be greater than zero');
      return;
    }
    if (newLowestPrice > 0 && newLowestPrice >= newPrice) {
      toast.error('Lowest rescue price must be less than the original price');
      return;
    }
    setAddingProduct(true);
    try {
      const expiryDate = new Date(Date.now() + newExpiry * 86400000).toISOString();
      await addProduct(currentVendor.id, {
        name: newName.trim(),
        category: newCategory,
        stock: newStock,
        pricePerKg: newPrice,
        unit: newUnit,
        isOrganic: newOrganic,
        expiryDaysRemaining: newExpiry,
        expiryDate,
        quality: newQuality,
        lowestPrice: newLowestPrice > 0 ? newLowestPrice : undefined,
        rescueThresholdDays: newRescueThreshold,
        photoUrl: newPhotoUrl || undefined,
      });
      toast.success(`${newName.trim()} added to your shelf!`);
      resetAddForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleNewProductPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndSave(file, (base64) => setNewPhotoUrl(base64));
    }
  };

  // Stat Card Metrics
  const totalRevenue = vendorOrders.reduce((acc, o) => acc + o.total, 0);
  const totalOrdersCount = vendorOrders.length;
  const lowStockCount = vendorProducts.filter((p) => p.stock <= 2).length;
  const pendingNegCount = pendingNegs.length;

  const formatOrderStatusLabel = (status: Order['status']) => formatOrderStatus(status);

  const orderStatusClass = (status: Order['status']) => {
    if (status === 'delivered') return 'bg-emerald-100 text-emerald-800';
    if (status === 'rejected' || status === 'cancelled') return 'bg-stone-200 text-stone-600';
    if (status === 'pending') return 'bg-amber-100 text-amber-800';
    return 'bg-[#1E6B3F]/10 text-[#1E6B3F]';
  };

  const handleOrderAction = async (
    orderId: string,
    action: 'accept' | 'reject' | 'preparing' | 'dispatched' | 'delivered',
    successMessage: string
  ) => {
    const ok = await syncOrderAction(orderId, action);
    if (ok) toast.success(successMessage);
    else toast.error('Could not update order on server. Saved locally.');
  };

  // Alerts logic for notifications page
  const alerts: { type: 'critical' | 'warning' | 'info'; title: string; desc: string; prodId?: string }[] = [];
  vendorProducts.forEach((p) => {
    const daysLeft = getExpiryDaysRemaining(p);
    if (daysLeft <= 1) {
      alerts.push({
        type: 'critical',
        title: `🔴 Expiry Danger: ${p.name}`,
        desc: isRescueActive(p)
          ? `Rescue price ₹${p.lowestPrice} is live. Clear shelf before expiry.`
          : `Expires tomorrow! Rescue pricing will auto-activate if configured.`,
        prodId: p.id
      });
    } else if (daysLeft <= (p.rescueThresholdDays ?? 2)) {
      alerts.push({
        type: 'warning',
        title: `🟡 Rescue window: ${p.name}`,
        desc: `${daysLeft} days left — customers see lowest price ₹${p.lowestPrice ?? 'N/A'}.`,
        prodId: p.id
      });
    } else if (daysLeft <= 3) {
      alerts.push({
        type: 'warning',
        title: `🟡 Expiry Warning: ${p.name}`,
        desc: `Expiring in ${daysLeft} days. Rescue price activates at ${p.rescueThresholdDays ?? 2} days left.`,
        prodId: p.id
      });
    }
    
    if (p.stock <= 2) {
      alerts.push({
        type: 'warning',
        title: `🟡 Low Stock: ${p.name}`,
        desc: `Almost out of stock (${p.stock} ${p.unit} remaining). Reorder from morning mandi.`,
        prodId: p.id
      });
    }
  });

  // Sort alerts by urgency (critical first, then warning, then info)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const priority = { critical: 3, warning: 2, info: 1 };
    return priority[b.type] - priority[a.type];
  });

  // Deep-link routing action
  const handleAlertAction = (prodId?: string) => {
    if (prodId) {
      setHighlightProductId(prodId);
      setActiveTab('stock');
      // Scroll to row behavior
      setTimeout(() => {
        const el = document.getElementById(`row-${prodId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(screen-50px)]">
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-stone-200 p-6 space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#1E6B3F]/10 text-[#1E6B3F]">
            <TrendingUp className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold font-display text-stone-900">{BRAND_NAME}</span>
        </div>

        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
          <span className="text-[10px] text-stone-500 font-bold block uppercase tracking-wider">Active Shop</span>
          <h3 className="font-bold text-stone-950 text-sm mt-0.5">{currentVendor.name}</h3>
        </div>

        <nav className="flex flex-col space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
            { id: 'stock', label: 'Stock Manager', icon: Plus },
            { id: 'negotiations', label: `Bargaining Inbox (${pendingNegCount})`, icon: Tag },
            { id: 'analytics', label: 'Live Analytics', icon: TrendingUp },
            { id: 'notifications', label: `Smart Alerts (${sortedAlerts.length})`, icon: Bell }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  isSelected 
                    ? 'bg-[#1E6B3F]/10 text-[#1E6B3F]' 
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-[#FAF9F6] pb-24 lg:pb-8 max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 py-5 sm:py-6">
        
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display">Merchant Dashboard</h1>
                <p className="text-sm text-stone-500">Live feed and summaries for {currentVendor.name}</p>
              </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Today's Revenue</span>
                <span className="text-2xl font-extrabold text-stone-950 block mt-1">₹{totalRevenue}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Orders Received</span>
                <span className="text-2xl font-extrabold text-stone-950 block mt-1">{totalOrdersCount}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Low Stock Items</span>
                <span className={`text-2xl font-extrabold block mt-1 ${lowStockCount > 0 ? 'text-rose-600' : 'text-stone-950'}`}>
                  {lowStockCount}
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Pending Bargains</span>
                <span className={`text-2xl font-extrabold block mt-1 ${pendingNegCount > 0 ? 'text-amber-500' : 'text-stone-950'}`}>
                  {pendingNegCount}
                </span>
              </div>
            </div>

            {/* Live Orders Feed */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-stone-900 font-display">Live Incoming Orders</h3>
              {vendorOrders.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-6">No orders placed by customers yet.</p>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {vendorOrders.map((order) => (
                    <div key={order.id} className="bg-stone-50 rounded-2xl p-4 border border-stone-150 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-stone-500 block">Order ID: {order.id}</span>
                          <span className="text-xs font-bold text-stone-700 mt-0.5 block">Customer: {order.customerId}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${orderStatusClass(order.status)}`}>
                          {formatOrderStatusLabel(order.status)}
                        </span>
                      </div>

                      <div className="divide-y divide-stone-200/60 text-xs">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="py-1.5 flex justify-between">
                            <span>{item.productName} ({item.quantity} {item.unit})</span>
                            <span className="font-semibold">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-stone-200/60">
                        <span className="text-xs text-stone-400 font-semibold">
                          {new Date(order.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <span className="text-sm font-extrabold text-stone-950 mr-2">Total: ₹{order.total}</span>

                          {order.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOrderAction(order.id, 'accept', 'Order accepted!')
                                }
                                className="px-3 py-1.5 bg-[#1E6B3F] hover:bg-[#144d2c] text-white text-xs font-bold rounded-lg cursor-pointer animate-pulse"
                              >
                                Accept Order
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOrderAction(order.id, 'reject', 'Order rejected.')
                                }
                                className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold rounded-lg cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {order.status === 'accepted' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOrderAction(order.id, 'preparing', 'Order status updated to Preparing')
                              }
                              className="px-3 py-1.5 bg-[#1E6B3F] hover:bg-[#144d2c] text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Start Preparing
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOrderAction(order.id, 'dispatched', 'Order dispatched out for delivery!')
                              }
                              className="px-3 py-1.5 bg-[#1E6B3F] hover:bg-[#144d2c] text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Dispatch Order
                            </button>
                          )}
                          {order.status === 'dispatched' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOrderAction(order.id, 'delivered', 'Order successfully delivered!')
                              }
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Confirm Delivered
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STOCK MANAGEMENT */}
        {activeTab === 'stock' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display">Shelf Stock Manager</h1>
              <button
                type="button"
                onClick={() => setShowAddForm((v) => !v)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E6B3F] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#144d2c] transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {showAddForm ? 'Cancel' : 'Add Item'}
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleAddProduct}
                className="bg-white rounded-3xl border border-[#1E6B3F]/20 shadow-sm p-5 sm:p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-stone-900 font-display">Add New Product</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Product Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tomatoes, Milk, Basmati Rice"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B3F]/30 focus:border-[#1E6B3F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as Product['category'])}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B3F]/30 focus:border-[#1E6B3F] bg-white"
                    >
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Unit
                    </label>
                    <select
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B3F]/30 focus:border-[#1E6B3F] bg-white"
                    >
                      <option value="kg">kg</option>
                      <option value="L">L</option>
                      <option value="pack">pack</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Stock
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newStock}
                      onChange={(e) => setNewStock(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B3F]/30 focus:border-[#1E6B3F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Quality
                    </label>
                    <select
                      value={newQuality}
                      onChange={(e) => setNewQuality(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B3F]/30 focus:border-[#1E6B3F] bg-white"
                    >
                      <option value="Premium">Premium</option>
                      <option value="Farm Fresh">Farm Fresh</option>
                      <option value="Standard">Standard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Original Price (₹)
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newPrice}
                      onChange={(e) => setNewPrice(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B3F]/30 focus:border-[#1E6B3F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Lowest Rescue Price (₹)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={newLowestPrice || ''}
                      placeholder="e.g. 21 when original is ₹30"
                      onChange={(e) => setNewLowestPrice(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B3F]/30 focus:border-[#1E6B3F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Shelf Life (days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newExpiry}
                      onChange={(e) => setNewExpiry(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B3F]/30 focus:border-[#1E6B3F]"
                    />
                    <p className="text-[9px] text-stone-400 mt-1">
                      Expiry auto-set {newExpiry} days from today
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Activate rescue price when (days left)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      required
                      value={newRescueThreshold}
                      onChange={(e) => setNewRescueThreshold(parseInt(e.target.value, 10) || 2)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B3F]/30 focus:border-[#1E6B3F]"
                    />
                    <p className="text-[9px] text-stone-400 mt-1">
                      e.g. 2 = switch to lowest price when 2 days remain
                    </p>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm font-semibold text-stone-700 cursor-pointer pb-2.5">
                      <input
                        type="checkbox"
                        checked={newOrganic}
                        onChange={(e) => setNewOrganic(e.target.checked)}
                        className="rounded border-stone-300 text-[#1E6B3F] focus:ring-[#1E6B3F]"
                      />
                      Organic product
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Product Photo (optional)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                        {newPhotoUrl ? (
                          <img src={newPhotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-5 h-5 text-stone-400" />
                        )}
                      </div>
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 cursor-pointer">
                        Upload photo
                        <input type="file" accept="image/*" className="hidden" onChange={handleNewProductPhoto} />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={addingProduct}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E6B3F] text-white text-sm font-bold hover:bg-[#144d2c] disabled:opacity-60 cursor-pointer"
                  >
                    {addingProduct ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add to Shelf
                  </button>
                  <button
                    type="button"
                    onClick={resetAddForm}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-600 hover:bg-stone-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Shop Hero Image Upload Zone */}
            <div className="bg-white border-2 border-dashed border-stone-300 rounded-3xl p-6 text-center space-y-3 relative hover:border-[#1E6B3F] transition group">
              <input
                type="file"
                accept="image/*"
                onChange={handleHeroUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-12 h-12 rounded-2xl bg-[#1E6B3F]/10 text-[#1E6B3F] flex items-center justify-center mx-auto group-hover:scale-110 transition duration-300">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-900">Upload Today's Shop Hero Photo</h4>
                <p className="text-xs text-stone-500 mt-1">Customers see this photo when browsing nearby shops.</p>
              </div>
            </div>

            {/* Product stock table */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-150 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-4">Photo</th>
                      <th className="p-4">Product Name</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4">Price/Kg</th>
                      <th className="p-4">Expiry (Days)</th>
                      <th className="p-4">Organic</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150">
                    {vendorProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-10 text-center">
                          <p className="text-sm text-stone-500 mb-3">No items on your shelf yet.</p>
                          <button
                            type="button"
                            onClick={() => setShowAddForm(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E6B3F] text-white text-sm font-bold hover:bg-[#144d2c] cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            Add your first item
                          </button>
                        </td>
                      </tr>
                    )}
                    {vendorProducts.map((p) => {
                      const isEditing = editingProductId === p.id;
                      const isHighlighted = highlightProductId === p.id;

                      return (
                        <tr
                          key={p.id}
                          id={`row-${p.id}`}
                          className={`hover:bg-stone-50/50 transition ${
                            isHighlighted ? 'bg-amber-50 animate-pulse border-2 border-amber-300' : ''
                          }`}
                        >
                          {/* Image picker */}
                          <td className="p-4">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-100 group border border-stone-200">
                              {p.photoUrl ? (
                                <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl">{p.emoji}</div>
                              )}
                              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition">
                                <Upload className="w-4 h-4" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleProductPhotoUpload(e, p.id)}
                                />
                              </label>
                            </div>
                          </td>

                          {/* Product Details */}
                          <td className="p-4 font-bold text-stone-900">
                            <div className="flex items-center gap-1">
                              <span>{p.emoji}</span>
                              <span className="truncate max-w-[120px]">{p.name}</span>
                            </div>
                          </td>

                          {/* Stock (inline editable) */}
                          <td className="p-4">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editStock}
                                onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                                className="w-16 border border-stone-300 rounded px-1.5 py-1 font-semibold"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5 font-semibold">
                                <span>{p.stock} {p.unit}</span>
                                {p.stock <= 2 && (
                                  <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-1.5 py-0.5 rounded">LOW</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Price (inline editable) */}
                          <td className="p-4">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
                                className="w-16 border border-stone-300 rounded px-1.5 py-1 font-semibold"
                              />
                            ) : (
                              <span className="font-semibold text-stone-900">₹{p.pricePerKg}</span>
                            )}
                          </td>

                          {/* Expiry days (inline editable) */}
                          <td className="p-4">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editExpiry}
                                onChange={(e) => setEditExpiry(parseInt(e.target.value) || 0)}
                                className="w-16 border border-stone-300 rounded px-1.5 py-1 font-semibold"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5 font-semibold">
                                <span>{p.expiryDaysRemaining} d</span>
                                {p.expiryDaysRemaining <= 3 && (
                                  <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded">WARN</span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="p-4 font-bold">
                            {p.isOrganic ? <span className="text-emerald-700 font-semibold">🌿 Yes</span> : <span className="text-stone-400 font-normal">No</span>}
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleSaveStock(p.id)}
                                  className="px-2.5 py-1 bg-[#1E6B3F] hover:bg-[#144d2c] text-white rounded font-bold cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingProductId(null)}
                                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded font-bold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditClick(p)}
                                className="px-3 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-50 font-bold text-stone-600 cursor-pointer"
                              >
                                Update
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NEGOTIATIONS INBOX */}
        {activeTab === 'negotiations' && (
          <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display">Price Bargaining Inbox</h1>

            {pendingNegs.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center shadow-sm">
                <p className="text-xs text-stone-400 font-semibold">No active bargaining inquiries from customers.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingNegs.map((neg) => {
                  const product = products.find((p) => p.id === neg.productId);
                  if (!product) return null;

                  // Minimum acceptable floor preserving 12% margin
                  const floorVal = Math.round(product.costPrice * 1.12);
                  const isBidAcceptable = neg.customerOffer >= floorVal;
                  
                  // AI Counter calculation
                  const aiCounter = Math.round(Math.max(neg.customerOffer * 1.08, product.costPrice * 1.12));

                  return (
                    <div key={neg.id} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-4">
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-[#1E6B3F] bg-[#1E6B3F]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Bid Offer Sighted
                          </span>
                          <h3 className="text-base font-bold text-stone-900 mt-1 font-display">
                            {neg.productName} (Listed at ₹{neg.originalPrice})
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-stone-400 font-semibold block">Customer Bid</span>
                          <span className={`text-lg font-black ${isBidAcceptable ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' : 'text-rose-600 bg-rose-50 border border-rose-200'} px-2 py-0.5 rounded-lg inline-block mt-0.5`}>
                            ₹{neg.customerOffer}
                          </span>
                        </div>
                      </div>

                      {/* AI Advisor Card */}
                      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 animate-pulse">
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-stone-900 uppercase">🤖 AI Bargaining Advisor</h4>
                          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                            Cost Price: ₹{product.costPrice} • Minimum Safe Margin Floor: ₹{floorVal}.
                            <br />
                            {isBidAcceptable ? (
                              <span className="text-emerald-700 font-bold">
                                Accept is safe! The customer offer is above the margin floor.
                              </span>
                            ) : (
                              <span className="text-rose-600 font-semibold">
                                Bid is too low (below margin floor of ₹{floorVal}). Recommend Counter Offer at ₹{aiCounter}.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
                        <button
                          onClick={() => {
                            respondToNegotiation(neg.id, 'accepted');
                            toast.success("Accepted customer bargain price!");
                          }}
                          className="flex-1 min-w-[100px] py-2.5 bg-emerald-750 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Accept Offer
                        </button>
                        
                        {counterNegId === neg.id ? (
                          <div className="flex gap-1.5 w-full md:w-auto">
                            <input
                              type="number"
                              value={counterValue}
                              onChange={(e) => setCounterValue(parseInt(e.target.value) || 0)}
                              className="w-20 border border-stone-300 rounded-xl px-2 text-xs font-bold"
                            />
                            <button
                              onClick={() => {
                                respondToNegotiation(neg.id, 'countered', counterValue);
                                setCounterNegId(null);
                                toast.success(`Countered offer sent at ₹${counterValue}`);
                              }}
                              className="px-3 py-2 bg-[#1E6B3F] text-white text-xs font-bold rounded-xl cursor-pointer"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => setCounterNegId(null)}
                              className="px-3 py-2 bg-stone-100 text-stone-500 text-xs font-bold rounded-xl cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setCounterNegId(neg.id);
                              setCounterValue(aiCounter);
                            }}
                            className="flex-1 min-w-[100px] py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Counter Counter Value
                          </button>
                        )}

                        <button
                          onClick={() => {
                            respondToNegotiation(neg.id, 'rejected');
                            toast.success("Rejected customer bargaining offer.");
                          }}
                          className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-500 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LIVE ANALYTICS DASHBOARD */}
        {activeTab === 'analytics' && (
          <div className="-mx-1 rounded-[28px] bg-[#F8F9FA] p-4 sm:p-6">
            <VendorAnalyticsDashboard
              vendorId={currentVendor.id}
              vendorRating={currentVendor.rating}
            />
          </div>
        )}

        {/* TAB 5: SMART NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display">Smart Alerts & Sourcing</h1>

            <div className="space-y-3">
              {sortedAlerts.map((alert, idx) => {
                let borderTheme = 'border-stone-200 bg-white';
                let iconColor = 'text-stone-500 bg-stone-100';

                if (alert.type === 'critical') {
                  borderTheme = 'border-rose-200 bg-rose-50/20';
                  iconColor = 'text-rose-600 bg-rose-100';
                } else if (alert.type === 'warning') {
                  borderTheme = 'border-amber-250 bg-amber-50/20';
                  iconColor = 'text-amber-600 bg-amber-100';
                } else if (alert.type === 'info') {
                  borderTheme = 'border-emerald-100 bg-emerald-50/10';
                  iconColor = 'text-[#1E6B3F] bg-emerald-50';
                }

                return (
                  <div key={idx} className={`border rounded-2xl p-4 flex gap-4 items-start transition ${borderTheme}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">{alert.title}</h4>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">{alert.desc}</p>
                      
                      {alert.prodId && (
                        <button
                          onClick={() => handleAlertAction(alert.prodId)}
                          className="mt-3 text-[10px] font-bold text-[#1E6B3F] hover:text-[#144d2c] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          Take action &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Mobile bottom nav menu */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-2 flex justify-between items-center z-30 shadow-2xl">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
          { id: 'stock', label: 'Stock', icon: Plus },
          { id: 'negotiations', label: 'Bargains', icon: Tag, badge: pendingNegCount },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'notifications', label: 'Alerts', icon: Bell, badge: sortedAlerts.filter(a => a.type === 'critical').length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex flex-col items-center flex-1 py-1 relative transition cursor-pointer"
            >
              <div className={`p-1.5 rounded-xl transition ${isSelected ? 'text-[#1E6B3F]' : 'text-stone-500'}`}>
                <Icon className="w-5.5 h-5.5" />
              </div>
              <span className={`text-[9px] font-bold tracking-tight ${isSelected ? 'text-[#1E6B3F]' : 'text-stone-500'}`}>
                {tab.label}
              </span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute top-0 right-3.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-white">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
