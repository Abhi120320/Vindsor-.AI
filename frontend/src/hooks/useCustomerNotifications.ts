'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';

const SOCKET_URL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080'
    : '';

export function useCustomerNotifications() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const hydrateCatalog = useAppStore((s) => s.hydrateCatalog);

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'customer' || !SOCKET_URL) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      socket.emit('join-room', 'customer-room');
    });

    socket.on('notification-created', (payload?: { title?: string; message?: string; type?: string }) => {
      if (!payload?.message) return;
      toast(payload.message, {
        icon: payload.type === 'PROMOTION' ? '🔥' : '🔔',
        duration: 6000,
      });
      void hydrateCatalog();
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, currentUser?.id, currentUser?.role, hydrateCatalog]);
}
