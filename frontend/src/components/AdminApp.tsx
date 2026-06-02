'use client';

import React, { useState } from 'react';
import { useAppStore, getEffectivePrice, Vendor, Order, Dispute } from '@/store/useAppStore';
import { buildOrdersSparkline, sparklinePath } from '@/lib/live-metrics';
import { 
  ShieldCheck, AlertTriangle, Users, Award, Check, X, BarChart2, ShieldAlert,
  Search, Shield, FileText, CheckCircle2, Landmark, HelpCircle, Ban, Edit, LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BRAND_NAME } from '@/lib/brand';

export function AdminApp() {
  const vendors = useAppStore((state) => state.vendors);
  const products = useAppStore((state) => state.products);
  const orders = useAppStore((state) => state.orders);
  const disputes = useAppStore((state) => state.disputes);
  const negotiations = useAppStore((state) => state.negotiations);
  
  // Zustand actions
  const toggleVerifyVendor = useAppStore((state) => state.toggleVerifyVendor);
  const toggleSuspendVendor = useAppStore((state) => state.toggleSuspendVendor);
  const resolveDispute = useAppStore((state) => state.resolveDispute);
  const escalateDispute = useAppStore((state) => state.escalateDispute);
  const logout = useAppStore((state) => state.logout);

  // Local UI state
  const [adminTab, setAdminTab] = useState<'vendors' | 'disputes' | 'overview'>('vendors');
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const handleEditVendor = (v: Vendor) => {
    setEditingVendorId(v.id);
    setEditName(v.name);
    setEditPhone(v.phone);
  };

  const handleSaveVendor = (id: string) => {
    if (!editName || !editPhone) {
      toast.error('Name and Phone cannot be empty');
      return;
    }
    // Update vendor directly in Zustand store array
    useAppStore.setState((state) => ({
      vendors: state.vendors.map((v) =>
        v.id === id ? { ...v, name: editName, phone: editPhone } : v
      )
    }));
    setEditingVendorId(null);
    toast.success('Vendor profile updated!');
  };

  // Platform Overview computations
  const totalOrders = orders.length;
  const totalGMV = orders.reduce((sum, o) => sum + o.total, 0);
  const activeVendorsCount = vendors.filter((v) => !v.isSuspended).length;
  const expiringItemsCount = products.filter((p) => p.expiryDaysRemaining <= 3).length;
  const resolvedNegsCount = negotiations.filter((n) => n.status !== 'pending').length;
  const sparklineValues = buildOrdersSparkline(orders);
  const sparkPath = sparklinePath(sparklineValues);

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      
      {/* Admin header */}
      <header className="sticky top-0 z-30 bg-stone-900 border-b border-stone-850 text-white px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-red-500 font-display flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> {BRAND_NAME} Admin
          </h2>
          <span className="text-[10px] text-stone-400 font-medium">Verify credentials & resolve customer disputes</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex bg-stone-800 p-0.5 rounded-xl border border-stone-750 overflow-x-auto max-w-[72vw] sm:max-w-none">
            {[
              { id: 'vendors', label: 'Vendors' },
              { id: 'disputes', label: 'Disputes' },
              { id: 'overview', label: 'Overview' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id as any)}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  adminTab === tab.id
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              sessionStorage.removeItem('adminAuthed');
              // logout state reset
              logout();
              window.location.reload();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-850 transition cursor-pointer"
            title="Exit Admin Portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 py-5 sm:py-6 space-y-6">
        
        {/* VENDORS TAB */}
        {adminTab === 'vendors' && (
          <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display">Manage Hyperlocal Vendors</h1>

            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-150 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-4">Vendor Store</th>
                      <th className="p-4">Phone Number</th>
                      <th className="p-4">Verified</th>
                      <th className="p-4">Suspended</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150">
                    {vendors.map((v) => {
                      const isEditing = editingVendorId === v.id;
                      return (
                        <tr key={v.id} className="hover:bg-stone-50/50 transition">
                          {/* Name edit */}
                          <td className="p-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="border border-stone-300 rounded-lg p-1.5 text-xs w-48 font-bold"
                              />
                            ) : (
                              <div>
                                <span className="font-bold text-stone-950 block text-sm">{v.name}</span>
                                <span className="text-[10px] text-stone-400 block mt-0.5">{v.address}</span>
                              </div>
                            )}
                          </td>

                          {/* Phone edit */}
                          <td className="p-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="border border-stone-300 rounded-lg p-1.5 text-xs w-32 font-mono"
                              />
                            ) : (
                              <span className="font-mono text-stone-700 font-semibold">{v.phone}</span>
                            )}
                          </td>

                          {/* Verification toggle */}
                          <td className="p-4">
                            <button
                              onClick={() => {
                                toggleVerifyVendor(v.id);
                                toast.success(`${v.name} verification status changed`);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer transition ${
                                v.isVerified
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-stone-100 border-stone-300 text-stone-500'
                              }`}
                            >
                              {v.isVerified ? 'Verified ✓' : 'Awaiting Audit'}
                            </button>
                          </td>

                          {/* Suspension toggle */}
                          <td className="p-4">
                            <button
                              onClick={() => {
                                toggleSuspendVendor(v.id);
                                toast.success(`${v.name} suspension status changed`);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer transition ${
                                v.isSuspended
                                  ? 'bg-red-50 border-red-200 text-red-600'
                                  : 'bg-stone-100 border-stone-300 text-stone-500'
                              }`}
                            >
                              {v.isSuspended ? 'Suspended 🚫' : 'Active'}
                            </button>
                          </td>

                          {/* Row actions */}
                          <td className="p-4 text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleSaveVendor(v.id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingVendorId(null)}
                                  className="px-2 py-1 bg-stone-100 text-stone-600 rounded font-bold hover:bg-stone-200 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditVendor(v)}
                                className="px-2 py-1 border border-stone-200 rounded-lg hover:bg-stone-50 font-bold text-stone-600 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit className="w-3 h-3" /> Edit
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

        {/* DISPUTES RESOLUTIONS TAB */}
        {adminTab === 'disputes' && (
          <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display">Customer Disputes Ledger</h1>

            <div className="space-y-4">
              {disputes.map((d) => (
                <div key={d.id} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                    <div>
                      <span className="text-[9px] font-black bg-red-100 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Dispute Log #{d.id}
                      </span>
                      <h4 className="text-base font-bold text-stone-900 mt-1 font-display">
                        Complaint against: {d.vendorName}
                      </h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      d.status === 'Resolved'
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-805 text-emerald-800'
                        : d.status === 'Escalated'
                        ? 'bg-amber-50 border-amber-250 text-amber-800'
                        : 'bg-red-50 border-red-200 text-red-650 text-red-700'
                    }`}>
                      {d.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="font-semibold text-stone-750 leading-relaxed text-sm">"{d.issue}"</p>
                    <div className="flex justify-between items-center text-stone-400 font-semibold pt-1">
                      <span>Opened by customer: {d.customerName}</span>
                      <span>Order Value: ₹{d.orderAmount}</span>
                    </div>
                  </div>

                  {d.status === 'Open' && (
                    <div className="flex gap-2 pt-3 border-t border-stone-100">
                      <button
                        onClick={() => {
                          resolveDispute(d.id);
                          toast.success('Dispute case successfully resolved!');
                        }}
                        className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Resolve Case
                      </button>
                      <button
                        onClick={() => {
                          escalateDispute(d.id);
                          toast.success('Dispute case escalated to supervisor!');
                        }}
                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Escalate Case
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PLATFORM OVERVIEW TAB */}
        {adminTab === 'overview' && (
          <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display">System Health Overview</h1>

            {/* Counters Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm text-center">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Session Orders</span>
                <span className="text-2xl font-extrabold text-stone-950 mt-1 block">{totalOrders}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm text-center">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Gross GMV</span>
                <span className="text-2xl font-extrabold text-stone-950 mt-1 block">₹{totalGMV}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm text-center">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Active Stores</span>
                <span className="text-2xl font-extrabold text-stone-950 mt-1 block">{activeVendorsCount}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm text-center">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Expiring shelf</span>
                <span className="text-2xl font-extrabold text-stone-950 mt-1 block">{expiringItemsCount}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm text-center col-span-2 md:col-span-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Bargains Done</span>
                <span className="text-2xl font-extrabold text-stone-950 mt-1 block">{resolvedNegsCount}</span>
              </div>
            </div>

            {/* Orders Sparkline Chart */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">Orders Placed Per Minute</h3>
              
              <div className="relative pt-2">
                {sparkPath ? (
                  <svg viewBox="0 0 500 100" className="w-full h-auto overflow-visible">
                    <line x1="10" y1="80" x2="490" y2="80" stroke="#FAF8F5" strokeWidth="1" />
                    <path d={sparkPath} fill="none" stroke="#DC2626" strokeWidth="3.5" strokeLinecap="round" />
                    <text x="10" y="95" fill="#A8A8A0" fontSize="8" fontWeight="bold" textAnchor="middle">10m ago</text>
                    <text x="250" y="95" fill="#A8A8A0" fontSize="8" fontWeight="bold" textAnchor="middle">5m ago</text>
                    <text x="490" y="95" fill="#EF4444" fontSize="8" fontWeight="bold" textAnchor="end">Now</text>
                  </svg>
                ) : (
                  <p className="text-xs text-stone-500 text-center py-8">No orders in the last 10 minutes.</p>
                )}
              </div>
              <p className="text-[10px] text-stone-500 font-bold text-center">
                Live order frequency from platform data ({orders.length} total orders).
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
