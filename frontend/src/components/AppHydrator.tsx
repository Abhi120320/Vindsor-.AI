'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications';
import { useFrequentProductDealAlerts } from '@/hooks/useFrequentProductDealAlerts';

export function AppHydrator() {
  const hydrateCatalog = useAppStore((s) => s.hydrateCatalog);
  const refreshUserOrders = useAppStore((s) => s.refreshUserOrders);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const currentUser = useAppStore((s) => s.currentUser);

  useCustomerNotifications();
  useFrequentProductDealAlerts();

  useEffect(() => {
    hydrateCatalog();
  }, [hydrateCatalog]);

  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      refreshUserOrders();
    }
  }, [isAuthenticated, currentUser?.id, refreshUserOrders]);

  useEffect(() => {
    const interval = setInterval(() => {
      hydrateCatalog();
      if (isAuthenticated && currentUser?.id) refreshUserOrders();
    }, 60000);
    return () => clearInterval(interval);
  }, [hydrateCatalog, refreshUserOrders, isAuthenticated, currentUser?.id]);

  return null;
}
