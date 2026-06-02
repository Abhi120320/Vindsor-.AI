'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CustomerApp } from '@/components/CustomerApp';
import { VendorApp } from '@/components/VendorApp';
import { ShoppingBag, LogOut, CheckCircle, ArrowLeft, Key, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { LandingHero } from '@/components/LandingHero';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

function RoleToggle({
  value,
  onChange,
}: {
  value: 'customer' | 'vendor';
  onChange: (role: 'customer' | 'vendor') => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
        I am a
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('customer')}
          className={`p-3 rounded-xl border text-center text-sm transition cursor-pointer ${
            value === 'customer'
              ? 'border-[#1B4332] bg-[#1B4332]/5 text-[#1B4332] font-bold'
              : 'border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Customer
        </button>
        <button
          type="button"
          onClick={() => onChange('vendor')}
          className={`p-3 rounded-xl border text-center text-sm transition cursor-pointer ${
            value === 'vendor'
              ? 'border-[#1B4332] bg-[#1B4332]/5 text-[#1B4332] font-bold'
              : 'border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Vendor
        </button>
      </div>
    </div>
  );
}

function AuthGate({ onBack, initialTab = 'login' }: { onBack?: () => void; initialTab?: 'login' | 'signup' }) {
  const passwordLogin = useAppStore((state) => state.passwordLogin);
  const registerAccount = useAppStore((state) => state.registerAccount);

  const [tab, setTab] = useState<'login' | 'signup'>(initialTab);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'customer' | 'vendor'>('customer');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await passwordLogin(phone, password, role);
      toast.success('Successfully logged in!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await registerAccount(name.trim(), phone, password, role);
      toast.success('Account created — welcome!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/35 focus:border-[#1B4332] bg-[#FAF9F6]/50 text-stone-950 text-sm';

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden p-8 relative">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-6 left-6 flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-[#1B4332] transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        )}

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1B4332]/10 text-[#1B4332] mb-3">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 font-display">{BRAND_NAME}</h1>
          <p className="text-sm text-stone-500 mt-1">{BRAND_TAGLINE}</p>
        </div>

        <div className="flex bg-stone-100 p-1 rounded-xl mb-6 border border-stone-200">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 py-2 text-center rounded-lg text-sm font-semibold transition cursor-pointer ${
              tab === 'login' ? 'bg-[#1B4332] text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 text-center rounded-lg text-sm font-semibold transition cursor-pointer ${
              tab === 'signup' ? 'bg-[#1B4332] text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Sign Up
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <RoleToggle value={role} onChange={setRole} />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm font-medium">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={`${inputClass} pl-12`}
                />
              </div>
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
                  minLength={6}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pl-10 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1B4332] hover:bg-[#163828] active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all duration-250 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <RoleToggle value={role} onChange={setRole} />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm font-medium">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={`${inputClass} pl-12`}
                />
              </div>
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
                  minLength={6}
                  placeholder="Create a password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pl-10 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1B4332] hover:bg-[#163828] active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all duration-250 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function RoleSelector({ onRoleSelected }: { onRoleSelected: (role: 'customer' | 'vendor') => void }) {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 font-display">Welcome to {BRAND_NAME}</h1>
        <p className="text-stone-600 mt-2">Choose how you would like to participate in the marketplace today</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Shopping Card */}
        <button
          onClick={() => onRoleSelected('customer')}
          className="bg-white border-2 border-stone-200 hover:border-[#1E6B3F] rounded-3xl p-8 text-left shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-5 group-hover:scale-110 transition duration-300">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-stone-950 font-display">🛒 I'm Shopping</h2>
          <p className="text-sm text-stone-600 mt-2 leading-relaxed">
            Order fresh organic vegetables and dairy, use voice assistant commands, negotiate prices directly with vendors, and get under-budget market baskets instantly.
          </p>
          <div className="mt-6 flex items-center text-sm font-bold text-[#1E6B3F] group-hover:translate-x-1 transition duration-200">
            Go to Customer Portal &rarr;
          </div>
        </button>

        {/* Selling Card */}
        <button
          onClick={() => onRoleSelected('vendor')}
          className="bg-white border-2 border-stone-200 hover:border-[#1E6B3F] rounded-3xl p-8 text-left shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#1E6B3F]/10 text-[#1E6B3F] flex items-center justify-center mb-5 group-hover:scale-110 transition duration-300">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-stone-950 font-display">🧺 I'm Selling</h2>
          <p className="text-sm text-stone-600 mt-2 leading-relaxed">
            Manage inventory and stock quantities, upload daily shelf photos, respond to customer bargaining bids with AI counter-price suggestions, and view custom analytics.
          </p>
          <div className="mt-6 flex items-center text-sm font-bold text-[#1E6B3F] group-hover:translate-x-1 transition duration-200">
            Go to Vendor Portal &rarr;
          </div>
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const currentUser = useAppStore((state) => state.currentUser);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const setRole = useAppStore((state) => state.setRole);
  const logout = useAppStore((state) => state.logout);

  const [mounted, setMounted] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-[#1E6B3F] border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    if (!showAuth) {
      return (
        <LandingHero
          onGetStarted={() => {
            setAuthTab('signup');
            setShowAuth(true);
          }}
          onSignIn={() => {
            setAuthTab('login');
            setShowAuth(true);
          }}
          onSignUp={() => {
            setAuthTab('signup');
            setShowAuth(true);
          }}
        />
      );
    }
    return <AuthGate onBack={() => setShowAuth(false)} initialTab={authTab} />;
  }

  // If role is not selected, force role selection
  if (!currentUser.role) {
    return (
      <RoleSelector
        onRoleSelected={(role) => {
          setRole(role);
          toast.success(`Accessing ${role === 'vendor' ? 'Vendor' : 'Customer'} Dashboard`);
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-[#FAF9F6] text-stone-900 flex flex-col font-sans select-none pb-12">
      
      {/* Logout only */}
      <div className="bg-stone-900 border-b border-stone-800 px-4 py-2 flex items-center justify-end z-30">
        <button
          onClick={() => {
            logout();
            toast.success('Logged out successfully');
          }}
          className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
          title="Log Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Role Views */}
      <div className="flex-1">
        {currentUser.role === 'customer' && <CustomerApp />}
        {currentUser.role === 'vendor' && <VendorApp />}
      </div>
    </div>
  );
}
