'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, getEffectivePrice, Product, UserPreferences } from '@/store/useAppStore';
import { MessageSquare, X, Send, Trash2, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { BRAND_ASSISTANT, BRAND_NAME } from '@/lib/brand';

type BotLanguage = 'hinglish' | 'english' | 'hindi' | 'kannada';

function detectLanguageSwitch(text: string): BotLanguage | null {
  const normalized = text.trim().toLowerCase();
  if (/^(english|eng)$/.test(normalized)) return 'english';
  if (/^(hindi|हिंदी|hind)$/.test(normalized)) return 'hindi';
  if (/^(hinglish)$/.test(normalized)) return 'hinglish';
  if (/^(kannada|kannad|ಕನ್ನಡ)$/.test(normalized)) return 'kannada';
  return null;
}

function languageLabel(language: BotLanguage) {
  if (language === 'english') return 'English';
  if (language === 'hindi') return 'Hindi';
  if (language === 'kannada') return 'Kannada';
  return 'Hinglish';
}

// System prompt for general grocery questions (no auto cart add)
function buildSystemPrompt(products: any[], preferences: UserPreferences | undefined, language: BotLanguage) {
  const languageInstruction =
    language === 'english'
      ? 'Respond only in simple, friendly English.'
      : language === 'hindi'
        ? 'Respond only in simple, friendly Hindi (Devanagari script).'
        : language === 'kannada'
          ? 'Respond only in simple, friendly Kannada (Kannada script).'
          : 'Respond in natural Hinglish (Hindi + English mix).';

  return `You are ${BRAND_ASSISTANT}, a friendly hyperlocal grocery assistant for ${BRAND_NAME} in Bengaluru, India.

${languageInstruction}
Answer briefly. Do NOT suggest cart items unless the user asks what to cook or prepare.

USER PREFERENCES:
${preferences ? `
- Likes: ${preferences.likes.join(', ') || 'none'}
- Dislikes: ${preferences.dislikes.join(', ') || 'none'}
- Diet: ${preferences.dietType || 'none'}
- Budget: ${preferences.budget ? '₹' + preferences.budget : 'none'}
` : 'None saved yet.'}

AVAILABLE PRODUCTS:
${JSON.stringify(products, null, 2)}
`;
}

interface IngredientLine {
  productId?: string;
  productName: string;
  quantity: number;
  unit?: string;
}

interface MatchedIngredient {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

// Conversational prompt: list all dish ingredients (including items not in stock)
function buildMealSuggestionPrompt(
  dishRequest: string,
  products: { name: string; unit: string; stock: number; effectivePrice: number }[],
  preferences: UserPreferences | undefined,
  language: BotLanguage
) {
  const languageInstruction =
    language === 'english'
      ? 'Reply in English.'
      : language === 'hindi'
        ? 'Reply in Hindi (Devanagari).'
        : language === 'kannada'
          ? 'Reply in Kannada script.'
          : 'Reply in natural Hinglish.';

  const dislikes = preferences?.dislikes?.length ? preferences.dislikes.join(', ') : 'none';

  return `You are ${BRAND_ASSISTANT}, a friendly grocery assistant for ${BRAND_NAME}, Bengaluru.

The customer wants to cook/prepare: "${dishRequest}"

STORE CATALOG (prefer these when available):
${JSON.stringify(products.filter((p) => p.stock > 0), null, 2)}

RULES:
1. List ONLY ingredients required for this dish with practical quantities for 2 servings.
2. Mention each item with quantity and unit (kg, g, pack) in plain conversational text.
3. Include items even if they are NOT in the store catalog — do not skip them.
4. Never include disliked items: ${dislikes}
5. ${languageInstruction}
6. Do NOT use JSON or bullet lists. Write 2-4 short sentences like: "Chilli toh sabse pehle le lo, 1 kg. Aur phir onion, 1/2 kg le lo."
7. Do NOT mention cart or checkout.`;
}

// Extract preferences dynamically from message content
function extractAndSavePreferences(userText: string, updatePreferences: Function) {
  const text = userText.toLowerCase();

  // Extract budget
  const budgetMatch = text.match(/₹?\s*(\d+)\s*(rupee|rs|rupe|budget)/i);
  if (budgetMatch) {
    updatePreferences({ budget: parseInt(budgetMatch[1]) });
  }

  // Extract diet type
  if (text.includes('vegan')) {
    updatePreferences({ dietType: 'vegan' });
  } else if (text.includes('non-veg') || text.includes('nonveg')) {
    updatePreferences({ dietType: 'non-veg' });
  } else if (text.includes('veg') || text.includes('shakahari')) {
    updatePreferences({ dietType: 'veg' });
  }

  // Extract likes and dislikes
  const likes: string[] = [];
  const dislikes: string[] = [];

  const itemKeywords = ['paneer', 'spinach', 'apple', 'tomato', 'potato', 'onion', 'milk', 'bread', 'rice', 'dal', 'butter', 'ghee', 'mango', 'cauliflower', 'yogurt'];

  itemKeywords.forEach((item) => {
    if (text.includes(item)) {
      if (text.includes(`hate ${item}`) || text.includes(`don't like ${item}`) || text.includes(`dont like ${item}`) || text.includes(`avoid ${item}`) || text.includes(`${item} nahi`)) {
        dislikes.push(item);
      } else if (text.includes(`love ${item}`) || text.includes(`like ${item}`) || text.includes(`want ${item}`) || text.includes(`buy ${item}`) || text.includes(`add ${item}`) || text.includes(`${item} pasand`)) {
        likes.push(item);
      }
    }
  });

  if (likes.length > 0) {
    updatePreferences({ likes });
  }
  if (dislikes.length > 0) {
    updatePreferences({ dislikes });
  }
}

function isMealPrepRequest(text: string) {
  const normalized = text.toLowerCase();
  if (/^(budget|deal|discount|cheapest|organic deals|weekly plan)/.test(normalized.trim())) {
    return false;
  }
  return /(cook|make|prepare|banau|banaun|bana|recipe|ingredients|khana|eat|breakfast|lunch|dinner|snack|sabzi|bhaji|baji|dal|roti|paneer|biryani|pasta|curry|salad|sandwich|omelette|fried rice|thali|masala|chutney|dosa|idli|paratha|pulao|soup|stir fry|upma|poha|chole|rajma|kheer|halwa|le lo|jaroorat|chahiye)/.test(
      normalized
    ) || /(i want|i need|help me|going to).*(make|cook|prepare|ban)/.test(normalized)
    || /^[a-z0-9\s'-]{2,48}$/i.test(normalized.trim());
}

function normalizeIngredientName(name: string): string {
  return name
    .replace(/^(aur|phir|then|also|and)\s+/i, '')
    .replace(/\b(toph|toh|sabse|pehle|bhi|le|lo|lena|sakte|ho|karna|hai|ki|jaroorat|hogi|need|take|buy|get)\b/gi, ' ')
    .replace(/[?!.,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function cleanIngredientLabel(raw: string): string {
  const normalized = normalizeIngredientName(raw);
  if (!normalized || normalized.length < 2) return '';

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 3) {
    return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  // Keep short food-like phrase (e.g. "organic tomatoes")
  const trimmed = words.slice(0, 3).join(' ');
  return trimmed
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function dedupeIngredientLines(lines: IngredientLine[]): IngredientLine[] {
  const cleaned: IngredientLine[] = [];

  for (const line of lines) {
    const label = cleanIngredientLabel(line.productName);
    if (!label) continue;
    cleaned.push({
      productId: line.productId,
      productName: label,
      quantity: line.quantity,
      unit: line.unit,
    });
  }

  const sorted = [...cleaned].sort((a, b) => b.productName.length - a.productName.length);
  const results: IngredientLine[] = [];

  for (const line of sorted) {
    const key = normalizeIngredientName(line.productName);
    const isDuplicate = results.some((existing) => {
      const existingKey = normalizeIngredientName(existing.productName);
      return existingKey.includes(key) || key.includes(existingKey);
    });
    if (!isDuplicate) results.push(line);
  }

  return results;
}

function extractIngredientsFromText(content: string): IngredientLine[] {
  return dedupeIngredientLines([
    ...parseIngredientList(content),
    ...parseIngredientsFromSummary(content),
    ...parseIngredientsFromProse(content),
  ]);
}

function parseIngredientList(rawText: string): IngredientLine[] {
  const listMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
  if (!listMatch) return [];

  try {
    const parsed = JSON.parse(listMatch[1]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.productName === 'string')
      .map((item) => ({
        productName: String(item.productName).trim(),
        quantity: Math.max(0.1, Number(item.quantity) || 1),
        unit: item.unit ? String(item.unit) : undefined,
      }));
  } catch {
    return [];
  }
}

function matchProductForIngredient(ingredientName: string, products: Product[]): Product | null {
  const inStock = products.filter((p) => p.stock > 0);
  const needle = normalizeIngredientName(ingredientName);
  if (!needle) return null;

  const exact = inStock.find((p) => normalizeIngredientName(p.name) === needle);
  if (exact) return exact;

  const contains = inStock.find((p) => {
    const productName = normalizeIngredientName(p.name);
    return productName.includes(needle) || needle.includes(productName);
  });
  if (contains) return contains;

  const needleWords = needle.split(/\s+/).filter((w) => w.length > 1);
  let best: Product | null = null;
  let bestScore = 0;

  for (const product of inStock) {
    const productLower = normalizeIngredientName(product.name);
    const productWords = productLower.split(/\s+/);
    const score = needleWords.reduce((sum, word) => {
      if (productWords.some((pw) => pw.includes(word) || word.includes(pw))) return sum + 1;
      if (productLower.includes(word)) return sum + 1;
      return sum;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }

  return bestScore > 0 ? best : null;
}

function isIngredientInStock(line: IngredientLine, products: Product[]): boolean {
  if (line.productId) {
    return products.some((p) => p.id === line.productId && p.stock > 0);
  }
  return matchProductForIngredient(line.productName, products) !== null;
}

function resolveMealIngredients(lines: IngredientLine[], products: Product[]): MatchedIngredient[] {
  const resolved = new Map<string, MatchedIngredient>();

  for (const line of lines) {
    const product =
      (line.productId
        ? products.find((p) => p.id === line.productId && p.stock > 0)
        : null) ?? matchProductForIngredient(line.productName, products);
    if (!product) continue;

    const qty = Math.min(line.quantity, product.stock);
    if (qty <= 0) continue;

    const existing = resolved.get(product.id);
    if (!existing) {
      resolved.set(product.id, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unit: product.unit,
      });
    }
  }

  return Array.from(resolved.values());
}

function getUnavailableIngredients(lines: IngredientLine[], products: Product[]): IngredientLine[] {
  return lines.filter((line) => !isIngredientInStock(line, products));
}

function parseFraction(value: string): number {
  const trimmed = value.trim();
  if (trimmed.includes('/')) {
    const [num, den] = trimmed.split('/').map((part) => parseFloat(part));
    if (num && den) return num / den;
  }
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseIngredientsFromProse(content: string): IngredientLine[] {
  const results: IngredientLine[] = [];
  const seen = new Set<string>();

  const pushLine = (name: string, qty: string, unit?: string) => {
    const cleaned = cleanIngredientLabel(name);
    if (!cleaned) return;
    const key = normalizeIngredientName(cleaned);
    if (seen.has(key)) return;
    seen.add(key);
    results.push({
      productName: cleaned,
      quantity: parseFraction(qty),
      unit: unit?.toLowerCase(),
    });
  };

  const unit = String.raw`(kg|g|l|litre|liters?|pack)\b`;
  const qty = String.raw`([\d./]+)\s*${unit}`;

  const patterns: RegExp[] = [
    new RegExp(String.raw`([A-Za-z][A-Za-z\s]{0,30}?)\s+bhi\s+le\s+sakte\s+ho,?\s*${qty}`, 'gi'),
    new RegExp(String.raw`([A-Za-z][A-Za-z\s]{0,24}?)\s+toh\s+sabse\s+pehle\s+le\s+lo,?\s*${qty}`, 'gi'),
    new RegExp(String.raw`(?:aur\s+phir|phir|and)\s+([A-Za-z][A-Za-z\s]{0,24}?),\s*${qty}`, 'gi'),
    new RegExp(String.raw`\b([A-Za-z][A-Za-z\s]{0,24}?),\s*${qty}`, 'gi'),
    new RegExp(String.raw`([A-Za-z][A-Za-z\s]{0,24}?)\s+le\s+lo,?\s*${qty}`, 'gi'),
    new RegExp(String.raw`(?:need|take|buy|get)\s+([A-Za-z][A-Za-z\s]{0,30}?)\s*[,—–-]?\s*${qty}`, 'gi'),
    new RegExp(String.raw`([A-Za-z][A-Za-z\s]{0,30}?)\s*[—–-]\s*${qty}`, 'gi'),
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      pushLine(match[1], match[2], match[3]);
    }
  }

  return results;
}

function parseIngredientsFromSummary(content: string): IngredientLine[] {
  const lines: IngredientLine[] = [];
  const regex = /[•\-*]\s*(.+?)\s*[—–-]\s*([\d.]+)\s*(\S+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    lines.push({
      productName: match[1].trim(),
      quantity: parseFloat(match[2]) || 1,
      unit: match[3],
    });
  }
  return lines;
}

function getMessageIngredients(message: { content: string; parsedList?: IngredientLine[] }): IngredientLine[] {
  const fromContent = extractIngredientsFromText(message.content);
  if (fromContent.length > 0) return fromContent;

  if (message.parsedList?.length) {
    return dedupeIngredientLines(
      message.parsedList.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
      }))
    );
  }

  return [];
}

export default function GroceryBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [botLanguage, setBotLanguage] = useState<BotLanguage>('hinglish');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentUser = useAppStore((state) => state.currentUser);
  const products = useAppStore((state) => state.products);
  const setCartFromMealItems = useAppStore((state) => state.setCartFromMealItems);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const addChatMessage = useAppStore((state) => state.addChatMessage);
  const clearChatHistory = useAppStore((state) => state.clearChatHistory);

  const preferences = currentUser?.preferences || { likes: [], dislikes: [], dietType: null, budget: null, chatHistory: [] };
  const messages = preferences.chatHistory;

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Alert pulse for new user load
  useEffect(() => {
    if (!isOpen && messages.length === 0) {
      setHasNewMessages(true);
    }
  }, [isOpen, messages]);

  const handleOpenToggle = () => {
    setIsOpen(!isOpen);
    setHasNewMessages(false);
  };

  // Sourcing catalog formatting
  const productCatalog = products.map((p) => ({
    name: p.name,
    category: p.category,
    price: p.pricePerKg,
    unit: p.unit,
    isOrganic: p.isOrganic,
    effectivePrice: getEffectivePrice(p),
    expiryDaysRemaining: p.expiryDaysRemaining,
    stock: p.stock
  }));

  const addExactMealToCart = (lines: IngredientLine[]) => {
    const matched = resolveMealIngredients(lines, products);
    const unavailable = getUnavailableIngredients(lines, products);

    const addedCount = setCartFromMealItems(
      matched.map((item) => ({ productId: item.productId, quantity: item.quantity }))
    );

    return { matched, unavailable, addedCount };
  };

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    setInput('');
    isLoading && setInput('');
    setIsLoading(true);

    // Save user message in store
    addChatMessage('user', text);
    
    // Save user preferences locally in store
    extractAndSavePreferences(text, updatePreferences);

    const languageSwitch = detectLanguageSwitch(text);
    if (languageSwitch) {
      setBotLanguage(languageSwitch);
      const switchMessage =
        languageSwitch === 'english'
          ? `Language switched to ${languageLabel(languageSwitch)}. Tell me what you want to cook or prepare, and I'll add matching items to your cart.`
          : languageSwitch === 'hindi'
            ? `भाषा ${languageLabel(languageSwitch)} में बदल दी गई है। बताइए आप क्या बनाना चाहते हैं, मैं सामान कार्ट में जोड़ दूंगा।`
            : languageSwitch === 'kannada'
              ? `ಭಾಷೆಯನ್ನು ${languageLabel(languageSwitch)} ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ. ನೀವು ಏನು ತಯಾರಿಸಲು ಬಯಸುತ್ತೀರಿ ಹೇಳಿ, ನಾನು ಸಾಮಗ್ರಿಗಳನ್ನು ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸುತ್ತೇನೆ.`
              : `Language ${languageLabel(languageSwitch)} mein switch ho gayi. Batao kya banana hai, main items cart mein add kar dunga.`;
      addChatMessage('assistant', switchMessage);
      setIsLoading(false);
      return;
    }

    // Meal prep: conversational ingredient list, then match against live store stock.
    if (isMealPrepRequest(text)) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: text }],
            system: buildMealSuggestionPrompt(
              text,
              productCatalog,
              useAppStore.getState().currentUser?.preferences,
              botLanguage
            ),
          }),
        });

        if (!response.ok) {
          throw new Error('API server returned error');
        }

        const data = await response.json();
        const rawText = data.content?.[0]?.text || data.response || '';
        const ingredientLines = extractIngredientsFromText(rawText);

        addChatMessage(
          'assistant',
          rawText.trim() || 'Could not suggest ingredients for this dish.',
          ingredientLines.length ? ingredientLines : undefined
        );
      } catch {
        addChatMessage('assistant', 'Sorry, server error aayi hai. Kuch der baad try karein! 🙏');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const historyPayload = [...messages, { role: 'user', content: text }].map((m) => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          system: buildSystemPrompt(
            productCatalog,
            useAppStore.getState().currentUser?.preferences,
            botLanguage
          )
        })
      });

      if (!response.ok) {
        throw new Error('API server returned error');
      }

      const data = await response.json();
      const rawText = data.content?.[0]?.text || '';
      const ingredientLines = extractIngredientsFromText(rawText);

      addChatMessage('assistant', rawText, ingredientLines.length ? ingredientLines : undefined);

    } catch (e) {
      addChatMessage('assistant', 'Sorry, server error aayi hai. Kuch der baad try karein! 🙏');
    } finally {
      setIsLoading(false);
    }
  };

  const addBotListToCart = (list: IngredientLine[]) => {
    const { addedCount, unavailable } = addExactMealToCart(list);
    if (addedCount > 0) {
      if (unavailable.length > 0) {
        toast.success(`${addedCount} in-store items added. ${unavailable.length} not available.`);
      } else {
        toast.success(`${addedCount} items added to cart! 🛒`);
      }
    } else {
      toast.error('None of these items are available in store.');
    }
  };

  const clearChat = () => {
    clearChatHistory();
    toast.success('Chat cleared!');
  };

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 select-none">
      
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={handleOpenToggle}
          className="relative w-14 h-14 bg-gradient-to-tr from-[#1E6B3F] to-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 hover:shadow-2xl transition duration-300 group cursor-pointer"
        >
          <MessageSquare className="w-6 h-6" />
          {hasNewMessages && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border border-white animate-ping"></span>
          )}
          {hasNewMessages && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border border-white"></span>
          )}
          {/* Tooltip */}
          <div className="absolute right-16 top-2.5 whitespace-nowrap bg-stone-900 text-stone-100 text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition duration-300 shadow-md">
            Hi! I&apos;m {BRAND_ASSISTANT} 🤖 Plan your grocery
          </div>
        </button>
      )}

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="bg-[#F4FAF6] rounded-3xl border-2 border-[#1E6B3F]/25 shadow-2xl shadow-[#1E6B3F]/10 flex flex-col w-[360px] h-[480px] overflow-hidden animate-in slide-in-from-bottom duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1E6B3F] to-emerald-500 p-4 text-white flex items-center justify-between shadow">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span>🤖</span>
              </div>
              <div>
                <h3 className="font-extrabold text-sm font-display tracking-wide">{BRAND_ASSISTANT}</h3>
                <span className="text-[9px] font-semibold text-emerald-50">AI Grocery Assistant</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={clearChat}
                className="p-1 hover:bg-white/10 rounded text-emerald-50 cursor-pointer"
                title="Clear Chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleOpenToggle}
                className="p-1 hover:bg-white/10 rounded text-emerald-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Customer language selector */}
          <div className="px-3 py-2 border-b border-[#1E6B3F]/15 bg-[#EAF5EE] flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#1E6B3F]">Language</span>
            {[
              { id: 'hinglish', label: 'Hinglish' },
              { id: 'english', label: 'English' },
              { id: 'hindi', label: 'Hindi' },
              { id: 'kannada', label: 'Kannada' }
            ].map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setBotLanguage(lang.id as BotLanguage)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                  botLanguage === lang.id
                    ? 'bg-[#1E6B3F] text-white border-[#1E6B3F]'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-[#1E6B3F]/40'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#EAF5EE]/70 scrollbar-thin">
            
            {/* Welcome message */}
            <div className="flex gap-2 items-start max-w-[85%]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1E6B3F] to-emerald-500 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                Bot
              </div>
              <div className="bg-white/90 border border-[#1E6B3F]/20 text-[#2D332F] rounded-r-2xl rounded-bl-2xl p-3 text-xs leading-relaxed shadow-sm">
                {botLanguage === 'english' &&
                  `Hi! I'm ${BRAND_ASSISTANT} 👋 Tell me what you want to cook or prepare — I'll find matching items and add them to your cart.`}
                {botLanguage === 'hindi' &&
                  `नमस्ते! 🙏 मैं रसोई बॉट हूं। बताइए आप क्या बनाना चाहते हैं — मैं सामान ढूंढकर कार्ट में जोड़ दूंगा।`}
                {botLanguage === 'kannada' &&
                  `ನಮಸ್ಕಾರ! 🙏 ನಾನು ರಸೋಯಿ ಬಾಟ್. ನೀವು ಏನು ತಯಾರಿಸಲು ಬಯಸುತ್ತೀರಿ ಹೇಳಿ — ನಾನು ಸಾಮಗ್ರಿಗಳನ್ನು ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸುತ್ತೇನೆ.`}
                {botLanguage === 'hinglish' &&
                  `Namaste! 🙏 Main ${BRAND_ASSISTANT} hoon. Batao kya banana hai — main matching items cart mein add kar dunga.`}
              </div>
            </div>

            {/* Conversation logs */}
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              const ingredientLines = !isUser ? getMessageIngredients(m) : [];
              const matchedItems = !isUser ? resolveMealIngredients(ingredientLines, products) : [];
              const unavailableItems = !isUser ? getUnavailableIngredients(ingredientLines, products) : [];
              const showIngredientPanel = !isUser && (matchedItems.length > 0 || unavailableItems.length > 0);
              const showAddButton = !isUser && matchedItems.length > 0;
              return (
                <div key={idx} className={`flex gap-2 items-start ${isUser ? 'justify-end' : ''}`}>
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1E6B3F] to-emerald-500 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      Bot
                    </div>
                  )}
                  
                  <div className="flex flex-col space-y-1.5 max-w-[85%]">
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-gradient-to-tr from-[#1E6B3F] to-emerald-500 text-white rounded-l-2xl rounded-tr-2xl'
                        : 'bg-white/95 border border-[#1E6B3F]/20 text-[#2D332F] rounded-r-2xl rounded-bl-2xl'
                    }`}>
                      {m.content.replace(/```json[\s\S]*?```/g, '').trim()}
                    </div>

                    {showIngredientPanel && (
                      <>
                        {matchedItems.length > 0 && (
                          <div className="rounded-xl border border-[#1E6B3F]/20 bg-white/90 px-3 py-2 text-[10px] text-stone-600 space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-wide text-[#1E6B3F]">
                              In store
                            </p>
                            {matchedItems.map((item) => (
                              <div key={item.productId} className="flex justify-between gap-2">
                                <span className="font-semibold text-stone-800 truncate">{item.productName}</span>
                                <span className="shrink-0">{item.quantity} {item.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {unavailableItems.length > 0 && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-[10px] text-amber-900 space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-wide text-amber-700">
                              Not available in store
                            </p>
                            {unavailableItems.map((item, itemIdx) => (
                              <div key={`${item.productName}-${itemIdx}`} className="flex justify-between gap-2">
                                <span className="font-semibold truncate">{item.productName}</span>
                                <span className="shrink-0 text-amber-800">
                                  {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {showAddButton && (
                          <button
                            type="button"
                            onClick={() => addBotListToCart(ingredientLines)}
                            className="self-start py-2 px-4 bg-[#1E6B3F] hover:bg-[#15502f] text-white text-[11px] font-bold rounded-xl flex items-center gap-2 shadow-md transition-all duration-200 cursor-pointer"
                          >
                            <ShoppingBag className="w-4 h-4" /> Add to cart ({matchedItems.length})
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading typing indicator */}
            {isLoading && (
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1E6B3F] to-emerald-500 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                  Bot
                </div>
                <div className="bg-white/95 border border-[#1E6B3F]/20 rounded-r-2xl rounded-bl-2xl px-4 py-3 flex gap-1 items-center shadow-sm">
                  <span className="w-1.5 h-1.5 bg-[#1E6B3F]/60 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-[#1E6B3F]/60 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#1E6B3F]/60 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          {messages.length === 0 && (
            <div className="px-4 py-2 border-t border-[#1E6B3F]/15 bg-[#EAF5EE] flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
              {[
                { label: 'Paneer sabzi', text: 'I want to cook paneer sabzi for dinner' },
                { label: 'Dal + rice', text: 'Help me prepare dal chawal' },
                { label: 'Tomato soup', text: 'Make tomato soup' },
                { label: 'Veg biryani', text: 'Cook vegetable biryani' }
              ].map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(chip.text)}
                  className="px-2.5 py-1.5 border border-[#1E6B3F]/25 bg-white/90 hover:bg-[#1E6B3F] hover:text-white hover:border-[#1E6B3F] rounded-xl text-[10px] font-bold text-[#1E6B3F] transition cursor-pointer"
                >
                  💡 {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Input text form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="p-3 border-t border-[#1E6B3F]/15 bg-[#F4FAF6] flex gap-2"
          >
            <input
              type="text"
              placeholder="What do you want to cook or eat?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border border-[#1E6B3F]/25 px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B3F]/30 focus:border-[#1E6B3F] bg-white text-[#2D332F] placeholder:text-[#626E65]/70"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 bg-gradient-to-tr from-[#1E6B3F] to-emerald-500 text-white rounded-xl disabled:bg-stone-300 disabled:cursor-not-allowed hover:shadow transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
