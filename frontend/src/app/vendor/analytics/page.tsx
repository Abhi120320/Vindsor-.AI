'use client';

import { VendorAnalyticsDashboard } from '@/components/analytics/VendorAnalyticsDashboard';
import { useAppStore } from '@/store/useAppStore';

export default function VendorAnalyticsPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const vendors = useAppStore((s) => s.vendors);
  const vendor = vendors.find((v) => v.phone === currentUser?.phone) ?? vendors[0];

  if (!vendor) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] p-6">
        <p className="text-stone-500">No vendor profile found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <VendorAnalyticsDashboard vendorId={vendor.id} vendorRating={vendor.rating} />
      </div>
    </main>
  );
}
