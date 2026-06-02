'use client';

import {
  ArrowRight,
  Bell,
  ChevronDown,
  Leaf,
  Mic,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { BRAND_NAME, BRAND_TAGLINE, SUPPORT_EMAIL } from '@/lib/brand';
import toast from 'react-hot-toast';

interface LandingHeroProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onSignUp?: () => void;
}

const NAV_LINKS = [
  { label: 'About Us', href: '#about' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Vendors', href: '#for-vendors' },
  { label: 'Support', href: '#support' },
];

const AVATAR_URLS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
];

const PHONE_PRODUCTS = [
  {
    name: 'Tomatoes',
    price: 22,
    unit: 'kg',
    image: 'https://images.unsplash.com/photo-1546094097-e1743b7d4b9?w=240&h=240&fit=crop',
  },
  {
    name: 'Potatoes',
    price: 18,
    unit: 'kg',
    image: 'https://images.unsplash.com/photo-1518977679601-b53f82aba655?w=240&h=240&fit=crop',
  },
  {
    name: 'Onions',
    price: 20,
    unit: 'kg',
    image: 'https://images.unsplash.com/photo-1618512496876-a0863ac78e1e?w=240&h=240&fit=crop',
  },
];

/** Split brand for logo styling: "Vendsor" + " .AI" */
function BrandLogoText() {
  const dotIndex = BRAND_NAME.indexOf('.');
  if (dotIndex === -1) {
    return <span className="font-display text-[17px] font-bold tracking-tight text-[#1B4332]">{BRAND_NAME}</span>;
  }
  const main = BRAND_NAME.slice(0, dotIndex).trimEnd();
  const suffix = BRAND_NAME.slice(dotIndex);
  return (
    <span className="font-display text-[17px] font-bold tracking-tight leading-none">
      <span className="text-[#1B4332]">{main}</span>
      <span className="text-[#2D6A4F]">{suffix.startsWith(' ') ? ' ' : ''}{suffix}</span>
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LandingHero({ onGetStarted, onSignIn, onSignUp }: LandingHeroProps) {
  const handleSignUp = onSignUp ?? onGetStarted;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1B4332] flex flex-col overflow-x-hidden">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-40 bg-[#FAFAFA]/90 backdrop-blur-md border-b border-stone-100/80">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-[72px] grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#1B4332] text-white">
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <BrandLogoText />
              <p className="text-[10px] text-stone-400 mt-0.5 leading-tight hidden sm:block">{BRAND_TAGLINE}</p>
            </div>
          </div>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-7 justify-center">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] font-medium text-stone-500 hover:text-[#1B4332] transition-colors whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={onSignIn}
              className="text-[13px] font-semibold text-stone-600 hover:text-[#1B4332] transition px-2 py-2 cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              className="rounded-full bg-[#1B4332] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#163828] transition shadow-sm cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative max-w-[1280px] mx-auto px-6 lg:px-10 pt-14 lg:pt-[72px] pb-16 lg:pb-24 min-h-[calc(100vh-72px)] flex items-center">
          <div className="grid lg:grid-cols-2 gap-10 xl:gap-6 items-center w-full">
            {/* Left column */}
            <div className="max-w-[520px] lg:pr-4">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#D8F3DC]/80 border border-[#95D5B2]/40 px-3.5 py-1.5 mb-7">
                <span className="text-sm leading-none">✨</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1B4332]">
                  AI-POWERED LOCAL SHOPPING
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-[44px] sm:text-[52px] lg:text-[56px] font-extrabold tracking-[-0.02em] text-[#1B4332] leading-[1.08]">
                Shop Local
                <span className="text-[#40916C]">.</span>
                <br />
                Save More
                <span className="text-[#40916C]">.</span>
              </h1>

              <p className="mt-5 text-[15px] sm:text-base text-stone-500 leading-[1.65] max-w-[440px]">
                Connect with trusted local vendors, get the best prices, negotiate smarter, and enjoy
                fresh products delivered to your doorstep.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#1B4332] px-7 py-3.5 text-[14px] font-semibold text-white shadow-md hover:bg-[#163828] hover:shadow-lg transition cursor-pointer"
                >
                  Get Started
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => toast('Google sign-in coming soon — use Sign Up for now')}
                  className="inline-flex items-center justify-center gap-2.5 rounded-full border border-stone-200 bg-white px-6 py-3.5 text-[14px] font-semibold text-stone-700 shadow-sm hover:border-stone-300 hover:bg-stone-50 transition cursor-pointer"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </div>

              {/* Social proof */}
              <div className="mt-9 flex items-center gap-3.5">
                <div className="flex items-center">
                  <div className="flex -space-x-2.5">
                    {AVATAR_URLS.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm"
                        style={{ zIndex: AVATAR_URLS.length - i }}
                      />
                    ))}
                  </div>
                  <span className="ml-2 inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full bg-[#1B4332] px-2 text-[10px] font-bold text-white shadow-sm">
                    +10k
                  </span>
                </div>
                <p className="text-[13px] text-stone-400 leading-snug">
                  Trusted by{' '}
                  <span className="font-semibold text-stone-600">10,000+</span> happy customers
                </p>
              </div>
            </div>

            {/* Right column — phone + floating cards */}
            <div className="relative flex justify-center lg:justify-end min-h-[580px] lg:min-h-[640px]">
              {/* Radial glow */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full pointer-events-none -z-10"
                style={{
                  background:
                    'radial-gradient(circle, rgba(149, 213, 178, 0.35) 0%, rgba(216, 243, 220, 0.15) 45%, transparent 70%)',
                }}
              />

              {/* Floating card — Fresh Farm Basket */}
              <div className="absolute left-0 lg:-left-2 top-6 xl:top-10 z-10 w-[168px] rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden hidden sm:block landing-float">
                <div className="h-[88px] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=200&fit=crop"
                    alt="Fresh vegetables"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[12px] font-bold text-[#1B4332] leading-tight">Fresh Farm Basket</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Harvested today morning</p>
                </div>
              </div>

              {/* Phone mockup */}
              <div className="relative z-20 w-[290px] sm:w-[300px]">
                <div className="rounded-[44px] border-[7px] border-[#1a1a1a] bg-[#1a1a1a] shadow-[0_25px_60px_rgba(0,0,0,0.18)] overflow-hidden">
                  <div className="rounded-[36px] bg-[#FAFAFA] overflow-hidden">
                    {/* Status bar + Dynamic Island */}
                    <div className="relative flex items-center justify-between px-7 pt-3 pb-0 h-8">
                      <span className="text-[11px] font-semibold text-[#1B4332]">9:41</span>
                      <div className="absolute left-1/2 -translate-x-1/2 top-2 w-[88px] h-[26px] bg-[#1a1a1a] rounded-full" />
                      <div className="flex items-center gap-1 opacity-80">
                        <div className="w-3.5 h-2 border border-[#1B4332] rounded-sm relative">
                          <div className="absolute inset-[1px] bg-[#1B4332] rounded-[1px]" style={{ width: '60%' }} />
                        </div>
                      </div>
                    </div>

                    {/* App header */}
                    <div className="px-4 pt-3 pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-stone-400">
                            Deliver To
                          </p>
                          <button
                            type="button"
                            className="flex items-center gap-0.5 mt-0.5 text-[12px] font-bold text-[#1B4332]"
                          >
                            Koramangala, Bengaluru
                            <ChevronDown className="h-3 w-3 text-stone-400" strokeWidth={2.5} />
                          </button>
                        </div>
                        <div className="relative h-8 w-8 rounded-full bg-white border border-stone-100 shadow-sm flex items-center justify-center">
                          <Bell className="h-3.5 w-3.5 text-stone-500" />
                          <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-white" />
                        </div>
                      </div>

                      <p className="mt-4 text-[15px] font-extrabold text-[#1B4332] tracking-tight">
                        Good Morning, Ananya 👋
                      </p>
                    </div>

                    {/* Search */}
                    <div className="px-4 mb-4">
                      <div className="flex items-center gap-2 rounded-2xl bg-white border border-stone-200/80 px-3 py-2.5 shadow-sm">
                        <Search className="h-3.5 w-3.5 text-stone-300 shrink-0" strokeWidth={2} />
                        <span className="text-[10px] text-stone-400 flex-1 truncate">
                          Search vegetables, fruits, groceries…
                        </span>
                        <div className="h-7 w-7 rounded-xl bg-[#1B4332] flex items-center justify-center shrink-0">
                          <Mic className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>

                    {/* Popular Near You */}
                    <div className="px-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-stone-400">
                          Popular Near You
                        </p>
                        <button type="button" className="text-[9px] font-bold text-[#40916C]">
                          View all
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {PHONE_PRODUCTS.map((p) => (
                          <div
                            key={p.name}
                            className="rounded-2xl bg-white border border-stone-100 overflow-hidden shadow-sm"
                          >
                            <div className="h-[72px] overflow-hidden bg-stone-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="px-1.5 py-2 text-center">
                              <p className="text-[10px] font-bold text-[#1B4332] truncate">{p.name}</p>
                              <p className="text-[10px] font-extrabold text-[#40916C] mt-0.5">
                                ₹{p.price}/{p.unit}
                              </p>
                              <span className="inline-block mt-1.5 text-[7px] font-bold uppercase tracking-wide bg-[#D8F3DC] text-[#2D6A4F] px-2 py-0.5 rounded-full">
                                Fresh
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Market Assistant banner */}
                    <div className="mx-4 mt-4 mb-5 rounded-2xl bg-[#D8F3DC]/60 border border-[#95D5B2]/30 p-3 flex gap-2.5 items-start">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center shrink-0 text-lg shadow-sm">
                        🤖
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-[#1B4332] leading-tight">
                          Try AI Market Assistant
                        </p>
                        <p className="text-[9px] text-stone-500 mt-1 leading-snug">
                          Tell us what you need or your budget, we&apos;ll build the perfect basket for you.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating card — Local Store / Fresh Mandi Stall */}
              <div className="absolute right-0 lg:-right-2 bottom-20 xl:bottom-24 z-10 w-[172px] rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden hidden sm:block landing-float-delayed">
                <div className="bg-[#1B4332] px-3 py-2 flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-[0.12em] text-white/90">
                    Local Store
                  </span>
                  <div className="flex items-center gap-1.5 text-white/80">
                    <Leaf className="h-3 w-3" strokeWidth={2.5} />
                    <ShoppingCart className="h-3 w-3" strokeWidth={2.5} />
                    <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[12px] font-bold text-[#1B4332]">Fresh Mandi Stall</p>
                  <span className="inline-flex mt-2 items-center gap-1 text-[8px] font-bold uppercase tracking-wide text-[#40916C] bg-[#D8F3DC] px-2 py-1 rounded-full">
                    ✓ Verified Shop
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Anchor sections (below fold — nav targets) */}
        <section id="about" className="border-t border-stone-100 bg-white py-16 scroll-mt-20">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="font-display text-2xl font-bold text-[#1B4332]">About {BRAND_NAME}</h2>
            <p className="mt-3 text-stone-500 text-sm leading-relaxed">
              We connect hyperlocal vendors with customers who want fresh produce, fair prices, and
              AI-powered shopping — all in one marketplace built for Indian neighborhoods.
            </p>
          </div>
        </section>

        <section id="how-it-works" className="py-16 scroll-mt-20 bg-[#FAFAFA]">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="font-display text-2xl font-bold text-[#1B4332] text-center mb-10">
              How It Works
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { step: '1', title: 'Browse local vendors', desc: 'Discover verified shops near you with live inventory.' },
                { step: '2', title: 'Bargain & build basket', desc: 'Negotiate prices or let AI assemble your perfect order.' },
                { step: '3', title: 'Pay & get delivery', desc: 'Checkout securely and track your order in real time.' },
              ].map((item) => (
                <div key={item.step} className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1B4332] text-white text-sm font-bold">
                    {item.step}
                  </span>
                  <h3 className="mt-4 font-bold text-[#1B4332]">{item.title}</h3>
                  <p className="mt-2 text-sm text-stone-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="for-vendors" className="border-t border-stone-100 bg-[#1B4332] py-16 scroll-mt-20">
          <div className="max-w-3xl mx-auto px-6 text-center text-white">
            <h2 className="font-display text-2xl font-bold">For Vendors</h2>
            <p className="mt-3 text-white/80 text-sm leading-relaxed">
              Manage inventory, respond to bargains, upload shelf photos, and access live analytics —
              everything you need to grow your local business.
            </p>
            <button
              type="button"
              onClick={onGetStarted}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1B4332] hover:bg-stone-50 transition cursor-pointer"
            >
              Start selling
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section id="support" className="py-12 scroll-mt-20 border-t border-stone-100 bg-white">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-500">
            <p>
              © {new Date().getFullYear()} {BRAND_NAME} — {BRAND_TAGLINE}
            </p>
            <div className="flex gap-6">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-[#1B4332] transition">
                {SUPPORT_EMAIL}
              </a>
              <button type="button" onClick={onSignIn} className="hover:text-[#1B4332] transition cursor-pointer">
                Sign In
              </button>
            </div>
          </div>
        </section>
      </main>

      <style jsx global>{`
        @keyframes landing-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .landing-float {
          animation: landing-float 5s ease-in-out infinite;
        }
        .landing-float-delayed {
          animation: landing-float 5s ease-in-out infinite 1.2s;
        }
      `}</style>
    </div>
  );
}
