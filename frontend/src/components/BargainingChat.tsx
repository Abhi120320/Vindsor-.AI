'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  useAppStore,
  type BargainMessage,
  type Negotiation,
} from '@/store/useAppStore';
import { ArrowLeft, MessageCircle, Send, ShoppingBag, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

function buildLegacyMessages(neg: Negotiation): BargainMessage[] {
  const msgs: BargainMessage[] = [
    {
      id: `${neg.id}_sys`,
      role: 'system',
      content: `Bargain started for ${neg.productName} (listed at ₹${neg.originalPrice})`,
      timestamp: neg.timestamp,
    },
    {
      id: `${neg.id}_cust`,
      role: 'customer',
      content: `I'd like to buy at ₹${neg.customerOffer}. Can you accept?`,
      amount: neg.customerOffer,
      timestamp: neg.timestamp,
    },
  ];

  if (neg.status === 'accepted') {
    msgs.push({
      id: `${neg.id}_vend`,
      role: 'vendor',
      content: `Deal! Final price: ₹${neg.vendorCounter ?? neg.customerOffer}.`,
      amount: neg.vendorCounter ?? neg.customerOffer,
      timestamp: neg.timestamp,
    });
  } else if (neg.status === 'countered' && neg.vendorCounter != null) {
    msgs.push({
      id: `${neg.id}_vend`,
      role: 'vendor',
      content: `I can offer ₹${neg.vendorCounter} instead.`,
      amount: neg.vendorCounter,
      timestamp: neg.timestamp,
    });
  } else if (neg.status === 'rejected') {
    msgs.push({
      id: `${neg.id}_vend`,
      role: 'vendor',
      content: `Sorry, I can't accept ₹${neg.customerOffer} right now.`,
      timestamp: neg.timestamp,
    });
  }

  return msgs;
}

function statusLabel(status: Negotiation['status']) {
  switch (status) {
    case 'pending':
      return { text: 'Awaiting vendor', className: 'bg-amber-100 text-amber-800' };
    case 'countered':
      return { text: 'Counter offer', className: 'bg-blue-100 text-blue-800' };
    case 'accepted':
      return { text: 'Deal locked', className: 'bg-emerald-100 text-emerald-800' };
    case 'rejected':
      return { text: 'Declined', className: 'bg-stone-200 text-stone-600' };
  }
}

interface BargainingChatProps {
  onBrowseDeals?: () => void;
}

export function BargainingChat({ onBrowseDeals }: BargainingChatProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const negotiations = useAppStore((s) => s.negotiations);
  const vendors = useAppStore((s) => s.vendors);
  const products = useAppStore((s) => s.products);
  const acceptVendorCounter = useAppStore((s) => s.acceptVendorCounter);
  const sendRevisedOffer = useAppStore((s) => s.sendRevisedOffer);
  const addToCart = useAppStore((s) => s.addToCart);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revisedOffer, setRevisedOffer] = useState(0);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const myNegotiations = negotiations
    .filter((n) => n.customerId === currentUser?.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const pendingCount = myNegotiations.filter((n) => n.status === 'pending' || n.status === 'countered').length;
  const selected = myNegotiations.find((n) => n.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && myNegotiations.length > 0) {
      setSelectedId(myNegotiations[0].id);
    }
  }, [myNegotiations, selectedId]);

  useEffect(() => {
    if (selected) {
      const min = Math.round(selected.originalPrice * 0.7);
      const max = Math.round(selected.originalPrice * 0.9);
      setRevisedOffer(Math.min(max, Math.max(min, selected.vendorCounter ?? selected.customerOffer)));
    }
  }, [selected]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages, selected?.status]);

  const handleAcceptCounter = () => {
    if (!selected) return;
    const res = acceptVendorCounter(selected.id);
    if (res.success) toast.success(res.message);
    else toast.error(res.message);
  };

  const handleSendRevised = () => {
    if (!selected) return;
    const res = sendRevisedOffer(selected.id, revisedOffer);
    if (res.success) toast.success(res.message);
    else toast.error(res.message);
  };

  const handleAddToCart = () => {
    if (!selected) return;
    const product = products.find((p) => p.id === selected.productId);
    if (!product) return;
    addToCart(product.id, 1);
    toast.success(`${product.name} added to cart at bargained price`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#2D332F] font-display flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#1E6B3F]" />
            Bargaining Chats
          </h1>
          <p className="text-[10px] text-[#626E65] mt-0.5">
            {pendingCount > 0
              ? `${pendingCount} active conversation${pendingCount === 1 ? '' : 's'}`
              : 'Negotiate prices directly with local vendors'}
          </p>
        </div>
        {onBrowseDeals && (
          <button
            type="button"
            onClick={onBrowseDeals}
            className="px-3 py-2 text-[10px] font-bold bg-[#1E6B3F] text-white rounded-xl hover:bg-[#15502f] transition cursor-pointer"
          >
            Start new bargain
          </button>
        )}
      </div>

      {myNegotiations.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-[#E5E2D9] text-center shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1E6B3F]/10 text-[#1E6B3F] flex items-center justify-center mx-auto">
            <MessageCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2D332F]">No bargaining chats yet</h3>
            <p className="text-[10px] text-[#626E65] mt-1 max-w-xs mx-auto">
              Tap 🤝 Bargain on any product to open a chat with the vendor and negotiate your price.
            </p>
          </div>
          {onBrowseDeals && (
            <button
              type="button"
              onClick={onBrowseDeals}
              className="px-4 py-2.5 text-xs font-bold bg-[#1E6B3F] text-white rounded-xl hover:bg-[#15502f] transition cursor-pointer"
            >
              Browse products to bargain
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-[420px]">
          {/* Conversation list */}
          <div className={`bg-white rounded-2xl border border-[#E5E2D9] overflow-hidden shadow-sm ${selectedId ? 'hidden lg:block' : 'block'}`}>
            <div className="px-4 py-3 border-b border-[#E5E2D9] bg-[#FAF9F6]">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#626E65]">Conversations</span>
            </div>
            <div className="divide-y divide-[#E5E2D9]/60 max-h-[480px] overflow-y-auto">
              {myNegotiations.map((neg) => {
                const vendor = vendors.find((v) => v.id === neg.vendorId);
                const badge = statusLabel(neg.status);
                const isActive = selectedId === neg.id;
                return (
                  <button
                    key={neg.id}
                    type="button"
                    onClick={() => setSelectedId(neg.id)}
                    className={`w-full text-left px-4 py-3 transition cursor-pointer ${
                      isActive ? 'bg-[#1E6B3F]/8 border-l-4 border-[#1E6B3F]' : 'hover:bg-[#FAF9F6] border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#2D332F] truncate">{neg.productName}</p>
                        <p className="text-[9px] text-stone-400 truncate">{vendor?.name ?? 'Local vendor'}</p>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0 ${badge.className}`}>
                        {badge.text}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#626E65] mt-1 truncate">
                      Your bid: ₹{neg.customerOffer}
                      {neg.vendorCounter != null ? ` · Counter: ₹${neg.vendorCounter}` : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat thread */}
          {selected && (
            <div className={`bg-white rounded-2xl border border-[#E5E2D9] shadow-sm flex flex-col min-h-[420px] ${selectedId ? 'flex' : 'hidden lg:flex'}`}>
              <div className="px-4 py-3 border-b border-[#E5E2D9] flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-[#FAF9F6] text-stone-500 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-black text-[#2D332F] truncate">{selected.productName}</h2>
                  <p className="text-[9px] text-stone-400">
                    {vendors.find((v) => v.id === selected.vendorId)?.name ?? 'Vendor'} · Listed ₹{selected.originalPrice}
                  </p>
                </div>
                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${statusLabel(selected.status).className}`}>
                  {statusLabel(selected.status).text}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF9F6]/50">
                {(selected.messages?.length ? selected.messages : buildLegacyMessages(selected)).map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'customer' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}
                  >
                    {msg.role === 'system' ? (
                      <div className="px-3 py-1.5 rounded-full bg-stone-200/80 text-[9px] font-semibold text-stone-600 max-w-[90%] text-center">
                        {msg.content}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          msg.role === 'customer'
                            ? 'bg-[#1E6B3F] text-white rounded-br-md'
                            : 'bg-white border border-[#E5E2D9] text-[#2D332F] rounded-bl-md'
                        }`}
                      >
                        <p className="font-semibold">{msg.content}</p>
                        {msg.amount != null && (
                          <p className={`text-[10px] mt-1 font-black ${msg.role === 'customer' ? 'text-emerald-100' : 'text-[#1E6B3F]'}`}>
                            ₹{msg.amount}
                          </p>
                        )}
                        <p className={`text-[8px] mt-1 ${msg.role === 'customer' ? 'text-emerald-200/80' : 'text-stone-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                {selected.status === 'pending' && (
                  <div className="flex justify-center">
                    <div className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-semibold text-amber-800 animate-pulse">
                      Vendor is reviewing your offer…
                    </div>
                  </div>
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-[#E5E2D9] bg-white space-y-3">
                {selected.status === 'countered' && selected.vendorCounter != null && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleAcceptCounter}
                      className="flex-1 min-w-[120px] py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Accept ₹{selected.vendorCounter}
                    </button>
                    <div className="flex flex-1 min-w-[160px] gap-2">
                      <input
                        type="number"
                        value={revisedOffer}
                        min={Math.round(selected.originalPrice * 0.7)}
                        max={Math.round(selected.originalPrice * 0.9)}
                        onChange={(e) => setRevisedOffer(parseInt(e.target.value, 10) || 0)}
                        className="flex-1 border border-[#E5E2D9] rounded-xl px-3 text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={handleSendRevised}
                        className="px-3 py-2 bg-[#1E6B3F] hover:bg-[#15502f] text-white rounded-xl cursor-pointer"
                        aria-label="Send revised offer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {selected.status === 'rejected' && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={revisedOffer}
                      min={Math.round(selected.originalPrice * 0.7)}
                      max={Math.round(selected.originalPrice * 0.9)}
                      onChange={(e) => setRevisedOffer(parseInt(e.target.value, 10) || 0)}
                      className="flex-1 border border-[#E5E2D9] rounded-xl px-3 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleSendRevised}
                      className="px-4 py-2 bg-[#1E6B3F] hover:bg-[#15502f] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Retry offer
                    </button>
                  </div>
                )}

                {selected.status === 'accepted' && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full py-2.5 bg-[#1E6B3F] hover:bg-[#15502f] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Add to cart at ₹{selected.vendorCounter ?? selected.customerOffer}
                  </button>
                )}

                {selected.status === 'pending' && (
                  <p className="text-[9px] text-center text-stone-400 font-semibold">
                    You&apos;ll get a reply here when the vendor responds.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
