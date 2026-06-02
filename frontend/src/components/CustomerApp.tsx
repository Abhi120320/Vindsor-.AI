'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, getEffectivePrice, getDaysSinceHarvest, getExpiryDaysRemaining, isNearExpiry, isRescueActive, parseVoiceCommand, buildBudgetBasket, Product, Vendor, Order } from '@/store/useAppStore';
import { RescueProductCard } from './RescueProductCard';
import { 
  Search, Mic, Star, MapPin, Clock, ShieldCheck, Heart, ShoppingBag, 
  ChevronRight, ArrowLeft, Trash2, Plus, Minus, CheckCircle, 
  Sparkles, ArrowRight, AlertCircle, Sparkle, Tag, FileText, Check, Percent, Bell, Coins, LogOut, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import GroceryBot from './GroceryBot';
import { BargainingChat } from './BargainingChat';
import {
  computeCustomerImpact,
  computeLoyaltyCoins,
  getCompanionProducts,
  getTopProductsForRecommendations,
} from '@/lib/live-metrics';
import { formatOrderStatus } from '@/lib/api/mappers';
import { BRAND_ASSISTANT, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

export function CustomerApp() {
  const currentUser = useAppStore((state) => state.currentUser);
  const products = useAppStore((state) => state.products);
  const vendors = useAppStore((state) => state.vendors);
  const cartItems = useAppStore((state) => state.cartItems);
  const negotiations = useAppStore((state) => state.negotiations);
  const orders = useAppStore((state) => state.orders);
  const activeVendorId = useAppStore((state) => state.activeVendorId);

  // Zustand actions
  const addToCart = useAppStore((state) => state.addToCart);
  const addVoiceOrderToCart = useAppStore((state) => state.addVoiceOrderToCart);
  const removeFromCart = useAppStore((state) => state.removeFromCart);
  const updateCartQuantity = useAppStore((state) => state.updateCartQuantity);
  const clearCart = useAppStore((state) => state.clearCart);
  const createNegotiation = useAppStore((state) => state.createNegotiation);
  const placeOrder = useAppStore((state) => state.placeOrder);
  const logout = useAppStore((state) => state.logout);

  // Local UI state
  const [activeTab, setActiveTab] = useState<'home' | 'browse' | 'orders' | 'bargains'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  // Native Speech Recognition & Voice Sheet
  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const customerOrders = orders.filter((o) => o.customerId === currentUser?.id);
  const customerNegotiations = negotiations.filter((n) => n.customerId === currentUser?.id);
  const pendingBargains = customerNegotiations.filter(
    (n) => n.status === 'pending' || n.status === 'countered'
  ).length;
  const impact = computeCustomerImpact(orders, currentUser?.id);
  const loyalty = computeLoyaltyCoins(currentUser?.orderCount ?? customerOrders.length);
  const topRecommendations = getTopProductsForRecommendations(products, 2);
  const companionProducts = getCompanionProducts(
    products,
    cartItems.map((c) => c.productId),
    3
  );
  const deliveryAddress =
    vendors.find((v) => v.id === activeVendorId)?.address ??
    vendors[0]?.address ??
    'Set location after choosing a store';
  const [voiceSimulated, setVoiceSimulated] = useState(false);
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef('');
  const voiceProcessedRef = useRef(false);

  const processVoiceTranscript = (rawText: string) => {
    const text = rawText.trim();
    if (!text || voiceProcessedRef.current) return;

    voiceProcessedRef.current = true;
    const parsed = parseVoiceCommand(text, products);

    if (parsed.length > 0) {
      addVoiceOrderToCart(parsed);
      toast.success(`Voice order added: ${parsed.length} items in cart 🛒`);
      setVoiceSheetOpen(false);
    } else {
      toast.error(`Heard "${text}" but couldn't match items. Try: "2 kilo aloo, 1 kilo pyaz, 1 litre milk"`);
      setVoiceSimulated(true);
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.lang = 'en-IN';
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceSimulated(false);
        setRecognitionError(null);
        voiceTranscriptRef.current = '';
        voiceProcessedRef.current = false;
        setTranscriptText('Listening... say your full order (e.g. "2 kilo aloo, 1 kilo pyaz, 1 litre milk")');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            voiceTranscriptRef.current += `${piece} `;
          } else {
            interim += piece;
          }
        }
        setTranscriptText((voiceTranscriptRef.current + interim).trim() || 'Listening...');
      };

      recognition.onerror = (event: any) => {
        console.error(event.error);
        setRecognitionError(event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setTranscriptText('Microphone permission blocked. Allow mic access or use simulation chips below.');
        } else {
          setTranscriptText('Mic error. Tap Stop when done, or use simulation chips below.');
        }
        setVoiceSimulated(true);
      };

      recognition.onend = () => {
        setIsListening(false);
        const text = voiceTranscriptRef.current.trim();
        if (text && !voiceProcessedRef.current) {
          processVoiceTranscript(text);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [products, addVoiceOrderToCart]);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<number | null>(null);
  const [suggestedBasket, setSuggestedBasket] = useState<{ product: Product; quantity: number; cost: number }[]>([]);

  // Price negotiation drawer
  const [negotiatingProductId, setNegotiatingProductId] = useState<string | null>(null);
  const [negotiateValue, setNegotiateValue] = useState<number>(0);

  // Payment flow
  const [checkoutSlideOpen, setCheckoutSlideOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'Razorpay' | 'PhonePe' | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const categories = ['All', 'Vegetables', 'Fruits', 'Dairy', 'Spices', 'Oils', 'Breads', 'Dal & Rice'];

  const handleStartListening = () => {
    setVoiceSheetOpen(true);
    voiceTranscriptRef.current = '';
    voiceProcessedRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn(err);
        setVoiceSimulated(true);
        setTranscriptText('Could not start microphone. Use simulation chips below.');
      }
    } else {
      setVoiceSimulated(true);
      setTranscriptText('Microphone API unsupported on this browser. Use simulation chips.');
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // already stopped
      }
    }
    setIsListening(false);
    const text = voiceTranscriptRef.current.trim() || transcriptText;
    if (text && text !== 'Listening... say your full order (e.g. "2 kilo aloo, 1 kilo pyaz, 1 litre milk")') {
      processVoiceTranscript(text);
    }
  };

  // Simulated Voice Command Selector fallback
  const handleSimulateVoice = (commandText: string) => {
    voiceProcessedRef.current = false;
    voiceTranscriptRef.current = commandText;
    setVoiceSimulated(true);
    setIsListening(true);
    setTranscriptText('');
    let currentText = '';
    let i = 0;
    const interval = setInterval(() => {
      if (i < commandText.length) {
        currentText += commandText[i];
        setTranscriptText(currentText);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          processVoiceTranscript(commandText);
          setIsListening(false);
        }, 400);
      }
    }, 20);
  };

  // Run budget basket builder
  const handleBuildBudgetBasket = (budget: number) => {
    setSelectedBudget(budget);
    const basket = buildBudgetBasket(budget, products);
    setSuggestedBasket(basket);
  };

  const handleAddBudgetBasketToCart = () => {
    if (suggestedBasket.length === 0) return;
    suggestedBasket.forEach((item) => {
      addToCart(item.product.id, item.quantity);
    });
    toast.success(`Added ${suggestedBasket.length} budget items to cart!`);
    setBudgetModalOpen(false);
    setSelectedBudget(null);
    setSuggestedBasket([]);
  };

  // Open negotiation drawer and set initial slider value (80% of original price)
  const openNegotiation = (product: Product) => {
    const originalPrice = getEffectivePrice(product);
    setNegotiatingProductId(product.id);
    setNegotiateValue(Math.round(originalPrice * 0.8));
  };

  const handleSendOffer = () => {
    if (!negotiatingProductId) return;
    const res = createNegotiation(negotiatingProductId, negotiateValue);
    if (res.success) {
      toast.success(res.message);
      setNegotiatingProductId(null);
      setActiveTab('bargains');
      setSelectedVendorId(null);
    } else {
      toast.error(res.message);
    }
  };

  // Payment countdown → place order via API
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (paymentModalOpen && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (paymentModalOpen && countdown === 0 && selectedPayment) {
      void (async () => {
        const res = await placeOrder(selectedPayment);
        if (res.success) {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          const latestOrder = useAppStore.getState().orders[0];
          setSuccessOrder(latestOrder);
          if (res.reward) {
            toast.success(`🎁 Reward unlocked: ${res.reward}`, { duration: 5000 });
          }
        } else {
          toast.error('Order placement failed.');
          setPaymentModalOpen(false);
        }
      })();
    }
    return () => clearTimeout(timer);
  }, [paymentModalOpen, countdown, selectedPayment, placeOrder]);

  const handleStartCheckout = () => {
    setCheckoutSlideOpen(true);
  };

  const handlePay = (method: 'Razorpay' | 'PhonePe') => {
    setSelectedPayment(method);
    setCountdown(3);
    setPaymentModalOpen(true);
    setCheckoutSlideOpen(false);
  };

  const downloadReceipt = (order: Order) => {
    const vendor = vendors.find((v) => v.id === order.vendorId);
    const itemsText = order.items
      .map((item) => `  - ${item.productName} (${item.quantity} ${item.unit}) : ₹${item.price} per ${item.unit}`)
      .join('\n');
    
    const receiptContent = `
================================================
                 ${BRAND_NAME.toUpperCase()}
            Official Sales Receipt
================================================
Order ID       : ${order.id}
Date/Time      : ${new Date(order.timestamp).toLocaleString()}
Customer ID    : ${order.customerId}
Vendor Store   : ${vendor?.name || 'Local Vendor'}
Payment Method : ${order.paymentMethod}
Status         : PAID & COMPLETED
------------------------------------------------
Purchased Items:
${itemsText}
------------------------------------------------
Delivery Fee   : ₹0 (Promo Free Delivery Applied)
Grand Total    : ₹${order.total}
================================================
Thank you for supporting hyperlocal merchants!
Keep your food fresh and prices fair.
`;
    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt_${order.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Plain-text receipt downloaded!');
  };

  const orderCount = currentUser?.orderCount || 0;
  const ordersUntilNextReward = () => {
    if (orderCount < 3) return 3 - orderCount;
    return 0;
  };

  const activeVendor = vendors.find((v) => v.id === activeVendorId);

  // Filter products by search and category
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const vendor = vendors.find((v) => v.id === p.vendorId);
    return matchesSearch && matchesCategory && vendor && !vendor.isSuspended;
  });

  // Expiring Products slice logic (expires in <= 3 days)
  const expiringProducts = products
    .filter((p) => p.stock > 0 && (isNearExpiry(p) || isRescueActive(p)))
    .sort((a, b) => getExpiryDaysRemaining(a) - getExpiryDaysRemaining(b));

  // Reactive Cart Total calculation overrides Zustand total for real-time negotiation updates
  const reactiveCartTotal = () => {
    return cartItems.reduce((sum, item) => {
      const negotiation = negotiations.find(
        (n) => n.productId === item.productId && 
               n.customerId === currentUser?.id &&
               (n.status === 'accepted' || n.status === 'countered')
      );
      const price = negotiation?.vendorCounter ?? 
                    negotiation?.customerOffer ?? 
                    (item.isNegotiated && item.negotiatedPrice !== undefined ? item.negotiatedPrice : item.unitPrice);
      return sum + price * item.quantity;
    }, 0);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#FAF9F6] text-[#2D332F] font-sans antialiased">
      
      {/* 1. LEFT SIDEBAR NAVIGATION PANEL */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#E5E2D9] p-6 space-y-6 flex-shrink-0">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#1E6B3F]/10 text-[#1E6B3F]">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black font-display text-[#1E6B3F] tracking-tight leading-none block">{BRAND_NAME}</span>
            <span className="text-[9px] text-[#626E65] font-semibold mt-0.5 tracking-wider block">{BRAND_TAGLINE}</span>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 flex flex-col space-y-1">
          {[
            { id: 'home', label: 'Home Feed', sub: 'Hyperlocal board', icon: Sparkles },
            { id: 'browse', label: 'Ask the Market', sub: 'AI Budget Planner', icon: Search },
            { id: 'bargains', label: 'Bargaining Chats', sub: 'Negotiate with vendors', icon: Tag, badge: pendingBargains },
            { id: 'orders', label: 'My Orders', sub: 'Purchase history', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as typeof activeTab); setSelectedVendorId(null); }}
                className={`flex items-start gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer text-left relative ${
                  isSelected 
                    ? 'bg-[#1E6B3F] text-white shadow-sm' 
                    : 'text-[#626E65] hover:text-[#2D332F] hover:bg-[#FAF9F6]'
                }`}
              >
                <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-white' : 'text-[#1E6B3F]'}`} />
                <div>
                  <span className="font-bold text-xs block leading-tight">{tab.label}</span>
                  <span className={`text-[9px] block mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-stone-400'}`}>
                    {tab.sub}
                  </span>
                </div>
                {'badge' in tab && tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute top-2 right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick links */}
          {[
            { label: 'Voice Order', sub: 'Hinglish Supported', icon: Mic, action: handleStartListening },
            { label: 'Rescue Deals', sub: 'Save More, Waste Less', icon: Percent, action: () => { setActiveTab('browse'); setSelectedVendorId(null); setSelectedCategory('All'); setSearchQuery(''); } },
            { label: 'Organic Corner', sub: 'Traceable & Trustworthy', icon: Sparkle, action: () => { setActiveTab('browse'); setSelectedVendorId(null); setSelectedCategory('Vegetables'); setSearchQuery('organic'); } },
            { label: 'Favorites List', sub: 'Your regular products', icon: Heart, action: () => { setActiveTab('orders'); setSelectedVendorId(null); } },
            { label: 'Local Vendors', sub: 'View nearby merchants', icon: MapPin, action: () => { setActiveTab('home'); setSelectedVendorId(null); setSearchQuery(''); } },
            { label: 'Help & Support', sub: 'Raise a ticket / dispute', icon: HelpCircle, action: () => { window.open('https://wa.me/919988776655', '_blank', 'noopener,noreferrer'); } }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={idx}
                onClick={() => {
                  item.action();
                }}
                className="flex items-start gap-3.5 px-4 py-3 rounded-xl text-[#626E65] hover:text-[#2D332F] hover:bg-[#FAF9F6] transition text-left cursor-pointer"
              >
                <Icon className="w-5 h-5 mt-0.5 text-[#1E6B3F]" />
                <div>
                  <span className="font-bold text-xs block leading-tight">{item.label}</span>
                  <span className="text-[9px] text-stone-400 block mt-0.5">{item.sub}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Exit Store View Helper */}
        {selectedVendorId && (
          <button
            onClick={() => setSelectedVendorId(null)}
            className="flex items-center justify-center gap-2 text-xs font-bold text-[#626E65] hover:text-[#2D332F] border border-[#E5E2D9] rounded-xl p-3 bg-[#FAF9F6] transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Store View</span>
          </button>
        )}

        {/* Impact Box widget */}
        <div className="bg-[#E8F3EC] rounded-2xl p-4 border border-[#1E6B3F]/20 space-y-3.5">
          <span className="text-[9px] font-black uppercase text-[#1E6B3F] tracking-widest block">Your Impact This Month</span>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[9px] text-[#626E65] block">Food Waste</span>
              <span className="text-xs font-extrabold text-[#1E6B3F] mt-0.5 block">{impact.foodWasteKg} kg</span>
            </div>
            <div>
              <span className="text-[9px] text-[#626E65] block">CO2 Saved</span>
              <span className="text-xs font-extrabold text-[#1E6B3F] mt-0.5 block">{impact.co2Kg} kg</span>
            </div>
            <div>
              <span className="text-[9px] text-[#626E65] block">Saved</span>
              <span className="text-xs font-extrabold text-[#1E6B3F] mt-0.5 block">₹{impact.savedInr}</span>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            toast.success("Successfully logged out");
          }}
          className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 transition cursor-pointer font-bold text-xs"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out Account</span>
        </button>
      </aside>

      {/* 2. CENTRAL PANEL (Primary feed columns matching mockup layout) */}
      <main className="flex-1 bg-[#FAF9F6] p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto max-w-4xl mx-auto w-full pb-24 lg:pb-8">
        
        {/* Header Ribbon */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          
          {/* Deliver to Badge */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E2D9] flex items-center justify-center text-[#1E6B3F] shadow-sm">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-semibold text-stone-400 block tracking-tight uppercase">Deliver To</span>
              <span className="text-xs font-extrabold text-[#2D332F] flex items-center gap-0.5">
                {deliveryAddress} <ChevronRight className="w-3.5 h-3.5 text-[#1E6B3F]" />
              </span>
            </div>
          </div>

          {/* Inline Search Hero Widget */}
          <div className="flex-1 w-full md:max-w-md relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search for vegetables, fruits, groceries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E2D9] focus:outline-none focus:ring-1 focus:ring-[#1E6B3F] bg-white text-xs font-semibold text-[#2D332F] shadow-sm placeholder:text-stone-400"
              />
            </div>
            <button
              onClick={() => setActiveTab('browse')}
              className="px-4 bg-[#1E6B3F] hover:bg-[#144d2c] text-white rounded-xl shadow transition cursor-pointer flex items-center justify-center"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* User Profile / Status elements */}
          <div className="flex items-center justify-end gap-2 sm:gap-3.5 flex-wrap">
            {/* Coins indicator */}
            <div className="hidden sm:flex bg-amber-500/10 border border-amber-500/20 text-amber-700 px-3 py-1.5 rounded-xl items-center gap-1.5 shadow-sm text-xs font-bold">
              <Coins className="w-4 h-4 text-amber-500 animate-spin [animation-duration:5s]" />
              <span>₹{loyalty.coins} Local Coins</span>
            </div>

            {/* Notification bell */}
            <button
              type="button"
              onClick={() => toast('No new notifications right now', { icon: '🔔' })}
              className="w-9 h-9 bg-white border border-[#E5E2D9] rounded-xl flex items-center justify-center text-stone-600 hover:text-black shadow-sm transition relative cursor-pointer"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
            </button>

            {/* Customer profile card */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-white/70 transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-[#1E6B3F]/20 text-[#1E6B3F] font-bold flex items-center justify-center border border-[#1E6B3F]/10">
                {(currentUser?.name?.[0] || "U").toUpperCase()}
              </div>
              <div className="leading-none hidden sm:block text-left">
                <span className="font-extrabold text-xs text-[#2D332F] block">
                  Hi, {currentUser?.name || "User"}
                </span>
                <span className="text-[9px] text-[#626E65] mt-0.5 block">Customer Account</span>
              </div>
            </button>
          </div>
        </div>

        {selectedVendorId ? (
          (() => {
            const vendor = vendors.find((v) => v.id === selectedVendorId);
            if (!vendor) return null;
            const vendorProducts = products.filter((p) => p.vendorId === vendor.id);

            return (
              <div className="space-y-6 animate-in fade-in duration-200">
                <button
                  onClick={() => setSelectedVendorId(null)}
                  className="inline-flex items-center gap-2 text-stone-600 hover:text-black font-bold text-xs cursor-pointer bg-white px-3 py-1.5 border border-[#E5E2D9] rounded-xl shadow-sm transition"
                >
                  <ArrowLeft className="w-4 h-4 text-[#1E6B3F]" /> Back to Nearby Shops
                </button>

                {/* Hero Header */}
                <div className="relative h-48 rounded-2xl overflow-hidden shadow-sm border border-[#E5E2D9]">
                  <img
                    src={vendor.heroPhotoUrl}
                    alt={vendor.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-5">
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl md:text-2xl font-black text-white font-display tracking-tight">{vendor.name}</h1>
                      {vendor.isVerified && (
                        <span className="inline-flex items-center gap-0.5 bg-[#1E6B3F] text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-2.5 h-2.5" /> Verified Stall
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-stone-300 text-xs mt-1.5">
                      <div className="flex items-center gap-1 font-bold text-white">
                        <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                        <span>{vendor.rating}</span>
                      </div>
                      <span>&bull;</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-300" />
                        <span>{vendor.deliveryTime}</span>
                      </div>
                      <span>&bull;</span>
                      <span>{vendor.address}</span>
                    </div>
                  </div>
                </div>

                {/* Daily shelf uploaded gallery photos */}
                {vendor.galleryPhotos && vendor.galleryPhotos.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 border border-[#E5E2D9] shadow-sm space-y-3">
                    <div>
                      <h3 className="text-sm font-black text-[#2D332F] font-display">Daily Shelf Uploads</h3>
                      <p className="text-[10px] text-[#626E65]">Photos uploaded by the merchant showing live produce condition today</p>
                    </div>
                    <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-thin">
                      {vendor.galleryPhotos.map((photo, i) => (
                        <div key={i} className="flex-shrink-0 w-36 h-24 rounded-xl overflow-hidden border border-stone-200 shadow-inner">
                          <img src={photo} alt="Daily Shelf Upload" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Produce Shelf List */}
                <div className="space-y-3.5">
                  <h2 className="text-lg font-black text-[#2D332F] font-display">Fresh Stock Today</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vendorProducts.map((p) => {
                      const effectivePrice = getEffectivePrice(p);
                      const isDiscounted = effectivePrice < p.pricePerKg;
                      const discountPercent = Math.round(((p.pricePerKg - effectivePrice) / p.pricePerKg) * 100);
                      const cartItem = cartItems.find((c) => c.productId === p.id);

                      // Check if there is an active negotiation for this product
                      const activeNeg = negotiations.find(
                        (n) => n.productId === p.id && n.customerId === currentUser?.id && n.status === 'accepted'
                      );

                      return (
                        <div key={p.id} className="bg-white rounded-2xl p-4 border border-[#E5E2D9] shadow-sm hover:shadow transition flex gap-4">
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-50 relative flex-shrink-0">
                            <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                            <span className="absolute top-1 left-1 text-sm bg-white/80 rounded px-1.5 py-0.5">{p.emoji}</span>
                          </div>

                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-start justify-between gap-1">
                                <h3 className="font-extrabold text-[#2D332F] truncate text-xs sm:text-sm">{p.name}</h3>
                                {p.isOrganic && (
                                  <span className="bg-[#1E6B3F]/10 text-[#1E6B3F] text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0">
                                    ORGANIC
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#626E65] mt-0.5">Stock capacity: {p.stock} {p.unit}</p>

                              {p.expiryDaysRemaining <= 3 && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full mt-1.5">
                                  ⚠️ Shelf Life: {p.expiryDaysRemaining} d remaining
                                </span>
                              )}
                            </div>

                            <div className="flex items-end justify-between mt-2 pt-2 border-t border-stone-100">
                              <div>
                                {isDiscounted ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-extrabold text-[#2D332F]">₹{effectivePrice}</span>
                                    <span className="text-[10px] text-stone-400 line-through">₹{p.pricePerKg}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-extrabold text-[#2D332F]">₹{p.pricePerKg}</span>
                                )}
                                <span className="text-[9px] text-[#626E65] font-semibold block">per {p.unit}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Negotiation CTA */}
                                {!cartItem?.isNegotiated && !activeNeg && (
                                  <button
                                    onClick={() => openNegotiation(p)}
                                    className="px-2 py-1 text-[10px] font-black text-[#1E6B3F] bg-[#1E6B3F]/5 hover:bg-[#1E6B3F]/10 rounded-lg border border-[#1E6B3F]/20 transition cursor-pointer"
                                  >
                                    🤝 Bargain
                                  </button>
                                )}
                                {cartItem?.isNegotiated && (
                                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-1 rounded border border-emerald-200">
                                    Deal locked
                                  </span>
                                )}

                                {/* Add / Edit quantities */}
                                {cartItem ? (
                                  <div className="flex items-center bg-[#FAF9F6] rounded-lg p-0.5 border border-[#E5E2D9]">
                                    <button
                                      onClick={() => updateCartQuantity(p.id, cartItem.quantity - 1)}
                                      className="p-1 text-stone-600 hover:text-stone-900 cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-6 text-center text-xs font-bold">{cartItem.quantity}</span>
                                    <button
                                      onClick={() => {
                                        if (cartItem.quantity >= p.stock) {
                                          toast.error('Limit reached stock capacity');
                                          return;
                                        }
                                        updateCartQuantity(p.id, cartItem.quantity + 1);
                                      }}
                                      className="p-1 text-stone-600 hover:text-stone-900 cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (p.stock <= 0) {
                                        toast.error('Item currently out of stock');
                                        return;
                                      }
                                      addToCart(p.id, 1);
                                      toast.success('Added to cart');
                                    }}
                                    disabled={p.stock <= 0}
                                    className="px-2.5 py-1 bg-[#1E6B3F] hover:bg-[#144d2c] disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                                  >
                                    <Plus className="w-3 h-3" /> Add
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          /* REGULAR TAB CONTENT */
          <>
            {activeTab === 'home' && (
              <div className="space-y-6">
                
                {/* 2. AI MARKET COPILOT HERO BANNER (Cream/green matching mockup design) */}
                <div className="bg-[#E8F3EC] rounded-3xl p-5 sm:p-6 md:p-8 border border-[#1E6B3F]/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                  
                  {/* Hero left text block */}
                  <div className="space-y-4 max-w-md z-10">
                    <span className="bg-[#1E6B3F]/10 text-[#1E6B3F] font-bold text-[10px] tracking-widest px-3 py-1 rounded-full uppercase inline-block">
                      Hyperlocal AI Sourcing
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-[#1E6B3F] font-display tracking-tight">AI Market Copilot</h2>
                    <p className="text-xs text-[#626E65] leading-relaxed">
                      Tell us your budget or dishes you want to cook. Our assistant builds the perfect under-budget grocery list dynamically matching live merchant stock.
                    </p>
                    <button
                      onClick={() => setBudgetModalOpen(true)}
                      className="px-5 py-3 bg-[#1E6B3F] hover:bg-[#144d2c] text-white rounded-xl text-xs font-bold transition shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 animate-spin [animation-duration:4s]" />
                      <span>Plan My Shopping</span>
                    </button>
                  </div>

                  {/* Bubbles & Illustration right side container */}
                  <div className="flex-1 flex flex-col justify-center items-end gap-3.5 relative z-10 w-full">
                    {[
                      { text: "I have ₹500 for vegetables this week." },
                      { text: "Cooking paneer tikka for 6 people." },
                      { text: "Need certified organic diet plans." }
                    ].map((bubble, i) => (
                      <div
                        key={i}
                        className="bg-white border border-[#E5E2D9] px-4 py-2.5 rounded-2xl text-xs font-semibold text-[#2D332F] shadow-sm hover:scale-[1.02] transition duration-200 cursor-pointer self-stretch md:self-auto flex items-center gap-2"
                        onClick={() => {
                          if (i === 0) { setBudgetModalOpen(true); handleBuildBudgetBasket(500); }
                          else toast(`Open ${BRAND_ASSISTANT} chat using the bubble icon below to plan dishes!`, { icon: '💬' });
                        }}
                      >
                        <Sparkle className="w-3.5 h-3.5 text-[#1E6B3F] flex-shrink-0" />
                        <span>{bubble.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Decorative background blobs to mimic mockup 3D bot feel */}
                  <div className="absolute -bottom-8 -right-8 w-44 h-44 rounded-full bg-[#1E6B3F]/5 blur-2xl"></div>
                </div>

                {/* 3. FOUR MID-PANEL GRID WIDGETS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Widget 1: Rescue Deals */}
                  <button 
                    onClick={() => { setActiveTab('browse'); setSelectedCategory('All'); setSearchQuery(''); }}
                    className="bg-white border border-[#E5E2D9] rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between h-32"
                  >
                    <div>
                      <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Hot</span>
                      <h4 className="font-extrabold text-xs text-[#2D332F] mt-1.5">Rescue Deals</h4>
                      <p className="text-[9px] text-[#626E65] mt-0.5 leading-snug">Save more on near-expiry items</p>
                    </div>
                    <span className="text-[10px] font-black text-[#1E6B3F] flex items-center gap-0.5">
                      Explore Deals <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Widget 2: Organic Corner */}
                  <button 
                    onClick={() => { setActiveTab('browse'); setSelectedCategory('Vegetables'); }}
                    className="bg-white border border-[#E5E2D9] rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between h-32"
                  >
                    <div>
                      <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">New</span>
                      <h4 className="font-extrabold text-xs text-[#2D332F] mt-1.5">Farm Direct</h4>
                      <p className="text-[9px] text-[#626E65] mt-0.5 leading-snug">Freshly harvested organic corner</p>
                    </div>
                    <span className="text-[10px] font-black text-[#1E6B3F] flex items-center gap-0.5">
                      View Produce <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Widget 3: Ask the Market */}
                  <button 
                    onClick={() => setBudgetModalOpen(true)}
                    className="bg-white border border-[#E5E2D9] rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between h-32"
                  >
                    <div>
                      <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">AI Optimizer</span>
                      <h4 className="font-extrabold text-xs text-[#2D332F] mt-1.5">Ask the Market</h4>
                      <p className="text-[9px] text-[#626E65] mt-0.5 leading-snug">Get best basket under budget</p>
                    </div>
                    <span className="text-[10px] font-black text-[#1E6B3F] flex items-center gap-0.5">
                      Plan Basket <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>

                {/* 4. EXPIRING SOON FLASH DEALS SECTION */}
                {expiringProducts.length > 0 && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-[#2D332F] font-display flex items-center gap-1.5">
                        <span className="text-amber-500">⚡</span> Flash Deals — Shelf Rescue Discount
                      </h3>
                      <button 
                        onClick={() => setActiveTab('browse')}
                        className="text-xs font-bold text-[#1E6B3F] hover:underline"
                      >
                        See All
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {expiringProducts.slice(0, 8).map((p) => {
                        const cartItem = cartItems.find((c) => c.productId === p.id);
                        const vendor = vendors.find((v) => v.id === p.vendorId);
                        const activeNeg = negotiations.find(
                          (n) => n.productId === p.id && n.customerId === currentUser?.id && n.status === 'accepted'
                        );

                        return (
                          <RescueProductCard
                            key={p.id}
                            product={p}
                            vendorName={vendor?.name}
                            cartQuantity={cartItem?.quantity}
                            compact
                            bargainLocked={!!cartItem?.isNegotiated || !!activeNeg}
                            onBargain={() => openNegotiation(p)}
                            onAdd={() => {
                              addToCart(p.id, 1);
                              toast.success('Added rescue deal to cart!');
                            }}
                            onDecrease={() => updateCartQuantity(p.id, (cartItem?.quantity ?? 1) - 1)}
                            onIncrease={() => {
                              if ((cartItem?.quantity ?? 0) >= p.stock) {
                                toast.error('Limit reached stock capacity');
                                return;
                              }
                              updateCartQuantity(p.id, (cartItem?.quantity ?? 0) + 1);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. CERTIFIED ORGANIC CORNER */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-[#2D332F] font-display flex items-center gap-1.5">
                      <span>🌿</span> Organic & Farm Direct produce
                    </h3>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                    {products
                      .filter((p) => p.isOrganic)
                      .map((p) => {
                        const effectivePrice = getEffectivePrice(p);
                        const cartItem = cartItems.find((c) => c.productId === p.id);
                        const daysSince = getDaysSinceHarvest(p);

                        return (
                          <div 
                            key={p.id} 
                            className="flex-shrink-0 w-44 bg-white border border-[#E5E2D9] rounded-2xl p-3 flex flex-col justify-between space-y-2.5 shadow-sm hover:shadow transition"
                          >
                            <div className="relative h-20 rounded-xl overflow-hidden bg-stone-50">
                              <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                              <span className="absolute top-1 left-1 text-xs bg-white/95 px-1.5 py-0.5 rounded font-black">{p.emoji}</span>
                              <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded">
                                certified
                              </span>
                            </div>

                            <div>
                              <h4 className="font-extrabold text-xs text-[#2D332F] truncate">{p.name}</h4>
                              <span className="text-[9px] text-emerald-700 font-semibold block mt-0.5">
                                🚜 Harvested {daysSince} {daysSince === 1 ? 'day' : 'days'} ago
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1.5 border-t border-stone-100">
                              <div>
                                <span className="font-extrabold text-xs text-[#2D332F]">₹{effectivePrice}</span>
                                <span className="text-[9px] text-[#626E65] block">/{p.unit}</span>
                              </div>

                              {cartItem ? (
                                <div className="flex items-center bg-[#FAF9F6] rounded-lg p-0.5 border border-[#E5E2D9]">
                                  <button
                                    onClick={() => updateCartQuantity(p.id, cartItem.quantity - 1)}
                                    className="p-0.5 text-stone-600 hover:text-stone-900 cursor-pointer"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="w-4 text-center text-[10px] font-bold">{cartItem.quantity}</span>
                                  <button
                                    onClick={() => updateCartQuantity(p.id, cartItem.quantity + 1)}
                                    className="p-0.5 text-stone-600 hover:text-stone-900 cursor-pointer"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    addToCart(p.id, 1);
                                    toast.success('Added Organic Produce to cart!');
                                  }}
                                  className="w-6.5 h-6.5 rounded-lg bg-[#1E6B3F] text-white flex items-center justify-center hover:bg-[#144d2c] transition cursor-pointer shadow-sm"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 6. SMART RECOMMENDATIONS FOR YOU */}
                <div className="space-y-4">
                  <h3 className="text-base font-black text-[#2D332F] font-display">Smart Recommendations for You</h3>
                  
                  {topRecommendations.length === 0 ? (
                    <p className="text-xs text-stone-500">Browse stores to see personalized picks.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {topRecommendations.map((p) => (
                        <div key={p.id} className="bg-white border border-[#E5E2D9] rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                          <div className="p-2 bg-[#1E6B3F]/10 text-[#1E6B3F] rounded-xl text-lg">
                            {p.emoji}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-[#2D332F]">{p.name}</h4>
                            <p className="text-[10px] text-[#626E65] mt-1 leading-relaxed">
                              In stock — ₹{getEffectivePrice(p)}/{p.unit}
                              {p.isOrganic ? ' · Organic' : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-white border border-[#E5E2D9] rounded-2xl p-4 space-y-3 shadow-sm">
                    <h4 className="font-extrabold text-xs text-[#2D332F]">You May Also Need</h4>
                    {companionProducts.length === 0 ? (
                      <p className="text-[10px] text-stone-500">Add items to your cart for suggestions.</p>
                    ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {companionProducts.map((p) => {
                        const cartItem = cartItems.find((c) => c.productId === p.id);
                        return (
                          <div key={p.id} className="bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span>{p.emoji}</span>
                              <div className="min-w-0">
                                <span className="font-bold text-[10px] text-[#2D332F] block truncate">{p.name.split(' ')[0]}</span>
                                <span className="text-[9px] text-[#626E65] block">₹{getEffectivePrice(p)}/{p.unit}</span>
                              </div>
                            </div>

                            {cartItem ? (
                              <span className="text-[9px] font-bold text-[#1E6B3F] bg-[#1E6B3F]/10 px-1.5 py-0.5 rounded">Added</span>
                            ) : (
                              <button
                                onClick={() => {
                                  addToCart(p.id, 1);
                                  toast.success(`Added ${p.name}`);
                                }}
                                className="w-5 h-5 rounded bg-[#1E6B3F] text-white flex items-center justify-center hover:bg-[#144d2c] transition text-[10px] cursor-pointer"
                              >
                                +
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                </div>

                {/* 7. NEARBY LOCAL VENDORS */}
                <div className="space-y-3.5">
                  <h3 className="text-base font-black text-[#2D332F] font-display">Top Local Vendors Near You</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vendors.map((vendor) => {
                      const isTrusted = vendor.rating >= 4.5;
                      return (
                        <div
                          key={vendor.id}
                          onClick={() => {
                            if (vendor.isSuspended) {
                              toast.error('This shop is suspended by Admin.');
                              return;
                            }
                            setSelectedVendorId(vendor.id);
                          }}
                          className={`relative h-32 rounded-2xl overflow-hidden shadow-sm hover:shadow group cursor-pointer border border-[#E5E2D9] ${
                            vendor.isSuspended ? 'opacity-40 filter grayscale cursor-not-allowed' : ''
                          }`}
                        >
                          <img
                            src={vendor.heroPhotoUrl}
                            alt={vendor.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                          <div className="absolute inset-0 bg-black/60 group-hover:bg-black/55 transition flex flex-col justify-end p-4">
                            <div className="flex items-center gap-1.5">
                              {vendor.isVerified && (
                                <span className="bg-emerald-600 text-white text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                                  Verified
                                </span>
                              )}
                              {isTrusted && (
                                <span className="bg-amber-500 text-white text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                                  Top Rated
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-black text-white tracking-wide mt-1.5">{vendor.name}</h3>
                            <div className="flex items-center gap-3 text-stone-300 text-[10px] mt-1">
                              <span className="flex items-center gap-0.5 text-white font-bold">
                                <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                                {vendor.rating}
                              </span>
                              <span>&bull;</span>
                              <span>{vendor.deliveryTime}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* TAB: BROWSE ALL PRODUCTS */}
            {activeTab === 'browse' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                        selectedCategory === cat
                          ? 'bg-[#1E6B3F] text-white border-[#1E6B3F] shadow-sm'
                          : 'bg-white text-[#626E65] border-[#E5E2D9] hover:text-[#2D332F]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((p) => {
                    const cartItem = cartItems.find((c) => c.productId === p.id);
                    const vendor = vendors.find((v) => v.id === p.vendorId);
                    const activeNeg = negotiations.find(
                      (n) => n.productId === p.id && n.customerId === currentUser?.id && n.status === 'accepted'
                    );

                    return (
                      <RescueProductCard
                        key={p.id}
                        product={p}
                        vendorName={vendor?.name}
                        cartQuantity={cartItem?.quantity}
                        bargainLocked={!!cartItem?.isNegotiated || !!activeNeg}
                        onBargain={() => openNegotiation(p)}
                        onAdd={() => {
                          if (p.stock <= 0) {
                            toast.error('Item currently out of stock');
                            return;
                          }
                          addToCart(p.id, 1);
                          toast.success('Added to cart');
                        }}
                        onDecrease={() => updateCartQuantity(p.id, (cartItem?.quantity ?? 1) - 1)}
                        onIncrease={() => {
                          if ((cartItem?.quantity ?? 0) >= p.stock) {
                            toast.error('Limit reached stock capacity');
                            return;
                          }
                          updateCartQuantity(p.id, (cartItem?.quantity ?? 0) + 1);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'bargains' && (
              <BargainingChat
                onBrowseDeals={() => {
                  setActiveTab('browse');
                  setSelectedVendorId(null);
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
              />
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <h1 className="text-xl font-black text-[#2D332F] font-display">My Orders</h1>

                {orders.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-[#E5E2D9] text-center shadow-sm space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-[#FAF9F6] text-stone-400 flex items-center justify-center mx-auto">
                      <FileText className="w-6 h-6 text-[#1E6B3F]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#2D332F]">No orders placed yet</h3>
                      <p className="text-[10px] text-[#626E65] mt-1">Your purchase receipts will appear here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const vendor = vendors.find((v) => v.id === order.vendorId);
                      return (
                        <div key={order.id} className="bg-white rounded-2xl p-5 border border-[#E5E2D9] shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-stone-400">Order ID: {order.id}</span>
                              <h3 className="font-extrabold text-[#2D332F] text-xs mt-0.5">{vendor?.name}</h3>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              order.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : order.status === 'rejected' || order.status === 'cancelled'
                                    ? 'bg-stone-200 text-stone-600'
                                    : 'bg-[#1E6B3F]/10 text-[#1E6B3F]'
                            }`}>
                              {formatOrderStatus(order.status)}
                            </span>
                          </div>

                          <div className="space-y-2 border-t border-b border-stone-100 py-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs text-stone-700">
                                <span>{item.productName} ({item.quantity} {item.unit})</span>
                                <span className="font-bold">₹{item.price * item.quantity}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-stone-400 font-semibold">
                              {new Date(order.timestamp).toLocaleString()}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => downloadReceipt(order)}
                                className="px-2.5 py-1.5 text-[10px] border border-[#E5E2D9] rounded-lg hover:bg-[#FAF9F6] font-bold text-[#626E65] inline-flex items-center gap-1 transition cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#1E6B3F]" /> Bill Receipt
                              </button>
                              <span className="text-xs font-black text-[#2D332F]">Grand Total: ₹{order.total}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* 3. RIGHT PANEL (Cart drawer, Loyalty widget & Voice Ordering assistant) */}
      <aside className="hidden xl:flex flex-col w-80 bg-white border-l border-[#E5E2D9] p-6 space-y-6 flex-shrink-0 overflow-y-auto">
        
        {/* Widget A: AI Voice Order */}
        <div className="bg-[#E8F3EC] rounded-2xl p-5 border border-[#1E6B3F]/10 space-y-4">
          <div>
            <h4 className="font-black text-xs text-[#1E6B3F] font-display uppercase tracking-wider">AI Voice Order</h4>
            <p className="text-[10px] text-[#626E65] mt-1 leading-normal">Try speaking standard shopping commands:</p>
          </div>

          <div className="space-y-2">
            {[
              "2 kilo aloo, 1 kilo pyaz",
              "Add half kilo tomatoes and 200g paneer",
              "I'm making biryani for 6 people"
            ].map((bubble, i) => (
              <div
                key={i}
                onClick={() => handleSimulateVoice(bubble)}
                className="bg-white/70 border border-[#E5E2D9]/40 p-2.5 rounded-xl text-[10px] font-semibold text-[#626E65] cursor-pointer hover:bg-white hover:text-black transition"
              >
                🎙️ "{bubble}"
              </div>
            ))}
          </div>

          <button
            onClick={handleStartListening}
            className="w-full py-2.5 bg-[#1E6B3F] hover:bg-[#144d2c] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Mic className="w-4 h-4" />
            <span>Click mic to speak</span>
          </button>
        </div>

        {/* Widget B: Shopping Cart Summary */}
        <div className="flex-1 flex flex-col space-y-4 min-h-[300px]">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-xs text-[#2D332F] font-display uppercase tracking-wider">
              My Cart ({cartItems.reduce((acc, c) => acc + c.quantity, 0)})
            </h4>
            {cartItems.length > 0 && (
              <button 
                onClick={() => { clearCart(); toast.success('Cart cleared'); }}
                className="text-[10px] text-stone-400 hover:text-rose-500 font-bold"
              >
                Clear All
              </button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#E5E2D9] rounded-2xl bg-[#FAF9F6]">
              <ShoppingBag className="w-7 h-7 text-stone-300" />
              <span className="text-[10px] font-bold text-stone-400 mt-2 block">Cart is empty</span>
              <span className="text-[9px] text-[#626E65] mt-1 block">Pick fresh items to checkout</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4">
              
              {activeVendor && (
                <div className="bg-[#1E6B3F]/5 border border-[#1E6B3F]/10 rounded-xl p-2.5 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#1E6B3F]" />
                  <span className="text-[9px] font-semibold text-[#626E65]">
                    Buying from: <span className="font-bold text-[#2D332F]">{activeVendor.name}</span>
                  </span>
                </div>
              )}

              {/* Scrollable Cart items */}
              <div className="flex-1 overflow-y-auto max-h-[220px] space-y-3.5 pr-1 divide-y divide-stone-100">
                {cartItems.map((item) => {
                  const product = products.find((p) => p.id === item.productId)!;
                  const negotiation = negotiations.find(
                    (n) => n.productId === item.productId && 
                           n.customerId === currentUser?.id &&
                           (n.status === 'accepted' || n.status === 'countered')
                  );

                  const price = negotiation?.vendorCounter ?? 
                                negotiation?.customerOffer ?? 
                                (item.isNegotiated && item.negotiatedPrice !== undefined ? item.negotiatedPrice : item.unitPrice);

                  return (
                    <div key={item.productId} className="flex gap-3 pt-3 items-center min-w-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-50 flex-shrink-0 relative">
                        <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
                        <span className="absolute top-0.5 left-0.5 text-xs">{product.emoji}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-[11px] text-[#2D332F] truncate">{product.name}</h5>
                        <p className="text-[9px] text-[#626E65] mt-0.5">₹{price} per {product.unit}</p>
                        
                        {negotiation && (
                          <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded border border-emerald-100 inline-block mt-0.5">
                            Negotiated deal
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center bg-[#FAF9F6] border border-[#E5E2D9] rounded p-0.5">
                          <button
                            onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                            className="p-0.5 text-stone-600 hover:text-stone-900 cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="w-4 text-center text-[10px] font-black">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                            className="p-0.5 text-stone-600 hover:text-stone-900 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1 text-[#626E65] hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grand Total */}
              <div className="border-t border-stone-100 pt-3 space-y-2.5">
                <div className="flex justify-between text-xs font-semibold text-[#626E65]">
                  <span>Total Cost</span>
                  <span className="font-black text-[#2D332F]">₹{reactiveCartTotal()}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-[#626E65]">
                  <span>Delivery Charge</span>
                  <span className="font-black text-emerald-700">FREE</span>
                </div>
                <div className="border-t border-[#E5E2D9]/40 pt-2 flex justify-between text-xs font-black text-[#2D332F]">
                  <span>Final Bill</span>
                  <span>₹{reactiveCartTotal()}</span>
                </div>
              </div>

              <button
                onClick={handleStartCheckout}
                className="w-full py-3 bg-[#1E6B3F] hover:bg-[#144d2c] text-white text-xs font-bold rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Checkout</span>
                <span>(₹{reactiveCartTotal()})</span>
              </button>
            </div>
          )}
        </div>

        {/* Widget C: Loyalty Coins card */}
        <div className="bg-[#FAF9F6] border border-[#E5E2D9] rounded-2xl p-4 space-y-3.5 shadow-inner">
          <div className="flex justify-between items-center">
            <h4 className="font-black text-xs text-[#2D332F] font-display uppercase tracking-wider">{BRAND_NAME} Loyalty</h4>
            <span className="text-[10px] text-[#1E6B3F] font-extrabold hover:underline cursor-pointer">See All</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-end text-xs font-black text-[#2D332F]">
              <span>{loyalty.coins} Coins</span>
              <span className="text-[10px] text-[#626E65] font-normal">Next reward at {loyalty.nextReward}</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-[#E5E2D9] h-2 rounded-full overflow-hidden">
              <div className="bg-[#1E6B3F] h-full rounded-full" style={{ width: `${loyalty.progress}%` }}></div>
            </div>
          </div>

          <div className="space-y-2 divide-y divide-[#E5E2D9]/40 text-[9px] text-[#626E65]">
            <div className="pt-2 flex justify-between font-semibold items-center">
              <span>Order Locally (Earn Coins)</span>
              <span className="text-emerald-700 font-extrabold">+50</span>
            </div>
            <div className="pt-2 flex justify-between font-semibold items-center">
              <span>Buy Organic (Double Coins)</span>
              <span className="text-emerald-700 font-extrabold">+100</span>
            </div>
            <div className="pt-2 flex justify-between font-semibold items-center">
              <span>Use Expiry Rescue Deals</span>
              <span className="text-emerald-700 font-extrabold">+150</span>
            </div>
          </div>
        </div>

      </aside>

      {/* MOBILE BOTTOM MENU NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E2D9] px-2 py-2 flex justify-between items-center z-30 shadow-2xl">
        {[
          { id: 'home', label: 'Home', icon: Sparkles },
          { id: 'browse', label: 'Browse', icon: Search },
          { id: 'bargains', label: 'Bargain', icon: Tag, badge: pendingBargains },
          { id: 'cart', label: 'Cart', icon: ShoppingBag, badge: cartItems.reduce((acc, c) => acc + c.quantity, 0) },
          { id: 'orders', label: 'Orders', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id && !selectedVendorId;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'cart') {
                  if (cartItems.length === 0) {
                    return;
                  }
                  setCheckoutSlideOpen(true);
                } else {
                  setActiveTab(tab.id as any);
                  setSelectedVendorId(null);
                }
              }}
              className="flex flex-col items-center flex-1 py-1 relative transition cursor-pointer"
            >
              <div className={`p-1.5 rounded-xl transition ${isSelected ? 'text-[#1E6B3F]' : 'text-stone-500'}`}>
                <Icon className="w-5.5 h-5.5" />
              </div>
              <span className={`text-[9px] font-bold tracking-tight ${isSelected ? 'text-[#1E6B3F]' : 'text-stone-500'}`}>
                {tab.label}
              </span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute top-0 right-4 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-white">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* VOICE INTERACTIVE MICROPHONE DIALOG SHEET */}
      {voiceSheetOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-[#E5E2D9]">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-[#2D332F] font-display">AI Voice Order assistant</h3>
                <p className="text-[10px] text-[#626E65]">Voice recognition with native transcript mapping</p>
              </div>
              <button
                onClick={() => { setVoiceSheetOpen(false); handleStopListening(); }}
                className="p-1 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 cursor-pointer font-bold w-6 h-6 flex items-center justify-center"
              >
                &times;
              </button>
            </div>

            {isListening && !voiceSimulated ? (
              <div className="bg-[#1E6B3F]/5 border border-[#1E6B3F]/10 rounded-2xl p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#1E6B3F] text-white flex items-center justify-center mx-auto animate-bounce shadow-md">
                  <Mic className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#1E6B3F] text-sm animate-pulse">Speak your full order...</h4>
                  <p className="text-[9px] text-[#626E65] mt-1 font-semibold">Say all items, then tap Stop — e.g. "2 kilo aloo, 1 kilo pyaz, 1 litre milk"</p>
                </div>
                <div className="font-mono text-[#2D332F] bg-white border border-[#E5E2D9] rounded-xl p-3 text-xs leading-relaxed min-h-12 shadow-inner">
                  {transcriptText}
                </div>
                <button
                  onClick={handleStopListening}
                  className="px-4 py-2 bg-[#1E6B3F] hover:bg-[#15502f] text-white rounded-xl text-[10px] font-bold transition cursor-pointer"
                >
                  Done — Add to Cart
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="font-mono text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-semibold">
                  ⚠️ {transcriptText || 'Mic state: Idle'}
                </div>

                <p className="text-[10px] text-[#626E65] font-black uppercase tracking-wider">Tap a quick simulation chip to test order parsing:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    "2 kilo aloo, 1 kilo pyaz",
                    "आधा किलो टमाटर",
                    "1 kilo tomato and 200g paneer",
                    "fresh fruits under ₹100",
                    "organic only please",
                    "bina pyaz ke subzi"
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSimulateVoice(chip)}
                      className="text-left px-3 py-2 bg-[#FAF9F6] border border-[#E5E2D9] hover:border-[#1E6B3F] rounded-xl text-xs font-semibold text-[#626E65] hover:text-[#1E6B3F] transition shadow-sm cursor-pointer"
                    >
                      💬 "{chip}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLAN GROCERY BUDGET MODAL */}
      {budgetModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-[#E5E2D9]">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-[#2D332F] font-display">Plan my Grocery</h3>
                <p className="text-[10px] text-[#626E65]">Optimize shopping basket items to fit your budget</p>
              </div>
              <button
                onClick={() => { setBudgetModalOpen(false); setSelectedBudget(null); }}
                className="p-1 bg-[#FAF9F6] hover:bg-stone-200 rounded-full text-stone-500 cursor-pointer font-bold w-6 h-6 flex items-center justify-center"
              >
                &times;
              </button>
            </div>

            {/* Quick budget Selectors */}
            <div className="space-y-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#626E65] block">Select target weekly budget</span>
              <div className="flex gap-2">
                {[200, 300, 500, 1000].map((b) => (
                  <button
                    key={b}
                    onClick={() => handleBuildBudgetBasket(b)}
                    className={`flex-1 py-2 border rounded-xl text-xs font-black transition cursor-pointer ${
                      selectedBudget === b 
                        ? 'bg-[#1E6B3F] text-white border-[#1E6B3F]'
                        : 'bg-[#FAF9F6] text-[#2D332F] border-[#E5E2D9] hover:bg-white'
                    }`}
                  >
                    ₹{b}
                  </button>
                ))}
              </div>
            </div>

            {selectedBudget && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-[#1E6B3F]/5 text-[#1E6B3F] rounded-xl p-3 text-[10px] font-bold flex justify-between border border-[#1E6B3F]/10">
                  <span>Target Limit: ₹{selectedBudget}</span>
                  <span>Safety Margin: ₹{(selectedBudget * 0.9).toFixed(0)}</span>
                </div>

                <div className="divide-y divide-stone-100 border border-[#E5E2D9] rounded-xl overflow-hidden bg-[#FAF9F6] max-h-[180px] overflow-y-auto">
                  {suggestedBasket.length === 0 ? (
                    <p className="p-4 text-center text-xs text-stone-500">Budget too low or no products in stock.</p>
                  ) : (
                    suggestedBasket.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{item.product.emoji}</span>
                          <div>
                            <span className="font-bold text-[#2D332F] block">{item.product.name}</span>
                            <span className="text-[9px] text-[#626E65] block">Qty: {item.quantity} {item.product.unit}</span>
                          </div>
                        </div>
                        <span className="font-extrabold text-[#2D332F]">₹{item.cost}</span>
                      </div>
                    ))
                  )}
                </div>

                {suggestedBasket.length > 0 && (
                  <div className="flex justify-between text-xs font-bold text-[#626E65] bg-[#E8F3EC] p-3 rounded-xl border border-[#1E6B3F]/20">
                    <span>Suggested Basket Cost:</span>
                    <span className="text-[#1E6B3F] font-black">₹{suggestedBasket.reduce((sum, item) => sum + item.cost, 0)}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setBudgetModalOpen(false); setSelectedBudget(null); }}
                    className="flex-1 py-2.5 bg-[#FAF9F6] hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBudgetBasketToCart}
                    disabled={suggestedBasket.length === 0}
                    className="flex-1 py-2.5 bg-[#1E6B3F] hover:bg-[#144d2c] disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    Add all to cart
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BARGAINING OFFER SLIDER DRAWER */}
      {negotiatingProductId && (() => {
        const prod = products.find((p) => p.id === negotiatingProductId)!;
        const originalPrice = getEffectivePrice(prod);
        const minVal = Math.round(originalPrice * 0.7);
        const maxVal = Math.round(originalPrice * 0.9);

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-[#E5E2D9]">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-[#2D332F] font-display">Negotiate Price</h3>
                  <p className="text-[10px] text-[#626E65]">{prod.name}</p>
                </div>
                <button
                  onClick={() => setNegotiatingProductId(null)}
                  className="p-1 bg-[#FAF9F6] hover:bg-stone-200 rounded-full text-stone-500 cursor-pointer font-bold w-6 h-6 flex items-center justify-center"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-[#626E65] bg-[#FAF9F6] p-3 rounded-xl border border-[#E5E2D9]">
                  <span>Regular Shelf Price</span>
                  <span className="text-[#2D332F] font-black">₹{originalPrice} / {prod.unit}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-stone-500">Your Bid Offer</span>
                    <span className="text-[#1E6B3F] text-sm">₹{negotiateValue}</span>
                  </div>
                  <input
                    type="range"
                    min={minVal}
                    max={maxVal}
                    value={negotiateValue}
                    onChange={(e) => setNegotiateValue(parseInt(e.target.value))}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#1E6B3F]"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 font-bold">
                    <span>Min (70%): ₹{minVal}</span>
                    <span>Max (90%): ₹{maxVal}</span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[9px] text-amber-800 leading-normal font-semibold">
                    AI Bargaining system limits offers between 70% and 90% of listed price. The vendor will check profit margin limits before accepting.
                  </p>
                </div>

                <button
                  onClick={handleSendOffer}
                  className="w-full py-2.5 bg-[#1E6B3F] hover:bg-[#144d2c] text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
                >
                  Send Bid Offer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CHECKOUT PAYMENT DIALOG DRAWER */}
      {checkoutSlideOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-[#E5E2D9]">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-[#2D332F] font-display">Secure Payment Gate</h3>
                <p className="text-[10px] text-[#626E65]">Select payment provider method</p>
              </div>
              <button
                onClick={() => setCheckoutSlideOpen(false)}
                className="p-1 bg-[#FAF9F6] hover:bg-stone-200 rounded-full text-stone-500 cursor-pointer font-bold w-6 h-6 flex items-center justify-center"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold text-[#626E65] bg-[#FAF9F6] p-3 rounded-xl border border-[#E5E2D9]">
                <span>Amount to Pay</span>
                <span className="text-[#2D332F] font-black">₹{reactiveCartTotal()}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handlePay('Razorpay')}
                  className="p-4 border border-[#E5E2D9] hover:border-blue-500 bg-white rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-blue-50/10 transition cursor-pointer text-center"
                >
                  <span className="text-base font-black text-blue-600 italic tracking-wider">Razorpay</span>
                  <span className="text-[8px] text-stone-400 font-bold block leading-normal">UPI, Credit/Debit Cards</span>
                </button>

                <button
                  onClick={() => handlePay('PhonePe')}
                  className="p-4 border border-[#E5E2D9] hover:border-purple-600 bg-white rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-purple-50/10 transition cursor-pointer text-center"
                >
                  <span className="text-base font-black text-purple-700 italic tracking-wider">PhonePe</span>
                  <span className="text-[8px] text-stone-400 font-bold block leading-normal">Direct UPI Payment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT TRANSACTION AND SUCCESS DIALOG */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-6 border border-[#E5E2D9]">
            {countdown > 0 ? (
              <div className="space-y-4 py-6">
                <div className="text-xl font-black italic tracking-widest">
                  {selectedPayment === 'Razorpay' ? (
                    <span className="text-blue-600">Razorpay Gate</span>
                  ) : (
                    <span className="text-purple-700">PhonePe UPI</span>
                  )}
                </div>

                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-stone-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-[#1E6B3F] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-2xl font-extrabold text-stone-850">{countdown}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Processing secure transaction...</h3>
                  <p className="text-[10px] text-stone-500 mt-1">Please hold. Do not refresh or close screen.</p>
                </div>
              </div>
            ) : (
              successOrder && (
                <div className="space-y-6">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#2D332F] font-display">Payment Completed!</h3>
                    <p className="text-[10px] text-stone-400 mt-1">Order {successOrder.id} generated on Supabase database successfully.</p>
                  </div>

                  <div className="border border-[#E5E2D9] bg-[#FAF9F6] rounded-xl p-3 text-left divide-y divide-[#E5E2D9]/40">
                    {successOrder.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex justify-between text-xs text-stone-700">
                        <span>{item.productName} ({item.quantity} {item.unit})</span>
                        <span className="font-bold">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="pt-2 flex justify-between text-xs font-black text-[#2D332F]">
                      <span>Final Paid</span>
                      <span>₹{successOrder.total}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadReceipt(successOrder)}
                      className="flex-1 py-2.5 border border-[#E5E2D9] hover:bg-stone-50 text-[#626E65] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#1E6B3F]" /> Save Bill
                    </button>
                    <button
                      onClick={() => {
                        setPaymentModalOpen(false);
                        setSuccessOrder(null);
                        setActiveTab('orders');
                      }}
                      className="flex-1 py-2.5 bg-[#1E6B3F] hover:bg-[#144d2c] text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
                    >
                      Track Order
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* CUSTOMER PROFILE MODAL */}
      {profileOpen && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-[#E5E2D9] shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#2D332F] font-display">My Profile</h3>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="p-1 rounded-full bg-[#FAF9F6] hover:bg-stone-200 text-stone-500 w-7 h-7 flex items-center justify-center cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9]">
              <div className="w-11 h-11 rounded-full bg-[#1E6B3F]/20 text-[#1E6B3F] font-black flex items-center justify-center">
                {(currentUser?.name?.[0] || "U").toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-extrabold text-[#2D332F]">{currentUser?.name || "User"}</p>
                <p className="text-[10px] font-semibold text-[#626E65] capitalize">
                  {currentUser?.role || "customer"} account
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between bg-white border border-[#E5E2D9] rounded-xl px-3 py-2">
                <span className="text-stone-500 font-semibold">Phone</span>
                <span className="text-[#2D332F] font-bold">{currentUser?.phone || "-"}</span>
              </div>
              <div className="flex justify-between bg-white border border-[#E5E2D9] rounded-xl px-3 py-2">
                <span className="text-stone-500 font-semibold">Orders</span>
                <span className="text-[#2D332F] font-bold">{currentUser?.orderCount ?? 0}</span>
              </div>
              <div className="flex justify-between bg-white border border-[#E5E2D9] rounded-xl px-3 py-2">
                <span className="text-stone-500 font-semibold">Auth</span>
                <span className="text-emerald-700 font-bold">Signed in</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                logout();
                toast.success("Logged out successfully");
              }}
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log out
            </button>
          </div>
        </div>
      )}

      {/* Floating AI Chatbot Assistant (GroceryBot) */}
      <GroceryBot />
    </div>
  );
}

// Icon fallbacks to ensure clean compilation
function TrendingUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
