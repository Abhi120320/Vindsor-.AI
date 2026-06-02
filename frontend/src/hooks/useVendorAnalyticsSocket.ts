'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ActivityItem } from '@/lib/analytics-utils';
import { formatRelativeTime } from '@/lib/analytics-utils';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8080';

interface SocketCallbacks {
  onNewOrder?: (payload?: unknown) => void;
  onOrderAccepted?: (payload?: unknown) => void;
  onOrderDelivered?: (payload?: unknown) => void;
  onInventoryUpdated?: (payload?: unknown) => void;
  onPaymentSuccess?: (payload?: unknown) => void;
  onForecastGenerated?: (payload?: unknown) => void;
  onHealthScoreUpdated?: (payload?: unknown) => void;
}

function activityFromEvent(type: ActivityItem['type'], message: string): ActivityItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    time: formatRelativeTime(new Date()),
    type,
  };
}

export function useVendorAnalyticsSocket(callbacks: SocketCallbacks = {}) {
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const pushActivity = useCallback((item: ActivityItem) => {
    setActivities((prev) => [item, ...prev].slice(0, 20));
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      socket.emit('join-room', 'vendor-room');
    });

    socket.on('disconnect', () => setStatus('offline'));
    socket.io.on('reconnect_attempt', () => setStatus('reconnecting'));
    socket.io.on('reconnect', () => setStatus('connected'));
    socket.io.on('reconnect_failed', () => setStatus('offline'));

    socket.on('new-order', (payload?: { id?: string; totalAmount?: number }) => {
      const amount =
        payload?.totalAmount != null
          ? ` — ₹${Math.round(payload.totalAmount)}`
          : '';
      pushActivity(activityFromEvent('order', `Fresh order received${amount}`));
      callbacksRef.current.onNewOrder?.(payload);
    });

    socket.on('order-accepted', (payload?: { id?: string }) => {
      pushActivity(
        activityFromEvent('order', `Order ${payload?.id ?? ''} accepted`.trim())
      );
      callbacksRef.current.onOrderAccepted?.(payload);
    });

    socket.on('order-delivered', (payload?: { id?: string }) => {
      pushActivity(
        activityFromEvent('order', `Order ${payload?.id ?? ''} delivered`.trim())
      );
      callbacksRef.current.onOrderDelivered?.(payload);
    });

    socket.on('inventory-updated', (payload?: { productId?: string; quantity?: number }) => {
      const qty = payload?.quantity != null ? ` → ${payload.quantity} units` : '';
      pushActivity(activityFromEvent('inventory', `Stock updated${qty}`));
      callbacksRef.current.onInventoryUpdated?.(payload);
    });

    socket.on('payment-success', (payload?: { amount?: number }) => {
      const amount =
        payload?.amount != null ? ` — ₹${Math.round(payload.amount)}` : '';
      pushActivity(activityFromEvent('payment', `Payment received${amount}`));
      callbacksRef.current.onPaymentSuccess?.(payload);
    });

    socket.on('forecast-generated', () => {
      pushActivity(activityFromEvent('forecast', 'Forecast generated'));
      callbacksRef.current.onForecastGenerated?.();
    });

    socket.on('forecast-ready', () => {
      pushActivity(activityFromEvent('forecast', 'Forecast generated'));
      callbacksRef.current.onForecastGenerated?.();
    });

    socket.on('health-score-updated', (payload?: { score?: number }) => {
      const score = payload?.score != null ? ` — ${payload.score}/100` : '';
      pushActivity(activityFromEvent('forecast', `Health score updated${score}`));
      callbacksRef.current.onHealthScoreUpdated?.(payload);
    });

    socket.on('notification-created', (payload?: { message?: string; title?: string }) => {
      if (payload?.title?.toLowerCase().includes('supplier')) {
        pushActivity(
          activityFromEvent('supplier', payload.message ?? 'Supplier accepted order')
        );
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [pushActivity]);

  return { status, activities, setActivities, pushActivity };
};
