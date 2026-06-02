'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AdminApp } from '@/components/AdminApp';
import { Shield, Key, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { BRAND_NAME } from '@/lib/brand';

export default function AdminRoute() {
  const adminLogin = useAppStore((state) => state.adminLogin);
  const currentUser = useAppStore((state) => state.currentUser);
  const [phone, setPhone] = useState('9000000001');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (currentUser?.role === 'admin') {
      setIsAuthenticated(true);
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin(phone, password);
      setIsAuthenticated(true);
      toast.success('Admin authentication successful');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Incorrect credentials');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-[#4E6E58] border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  if (isAuthenticated && currentUser?.role === 'admin') {
    return <AdminApp />;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 text-red-600 mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 font-display">{BRAND_NAME} Admin</h1>
          <p className="text-sm text-stone-500 mt-1">Sign in with your admin account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Admin Phone
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-[#FAF8F5]/50 text-stone-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-[#FAF8F5]/50 text-stone-950 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all duration-250 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Authenticate Admin'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
