'use client';

import { motion } from 'framer-motion';
import type { ConnectionStatus } from '@/hooks/useVendorAnalyticsSocket';

const cardHover = {
  rest: { y: 0, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' },
  hover: { y: -4, boxShadow: '0 12px 40px rgba(0,107,79,0.08)' },
};

export function AnalyticsCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      variants={cardHover}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={`bg-white rounded-[24px] border border-stone-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 bg-[length:200%_100%] ${className}`}
    />
  );
}

export function LiveIndicator({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: { dot: 'bg-[#00A86B]', text: 'Connected', pulse: true },
    reconnecting: { dot: 'bg-amber-400', text: 'Reconnecting', pulse: true },
    offline: { dot: 'bg-stone-400', text: 'Offline', pulse: false },
  }[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full border border-stone-200/80 bg-white/95 px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-md"
    >
      <span className="relative flex h-2.5 w-2.5">
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${config.dot}`}
          />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${config.dot}`} />
      </span>
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#006B4F]">
          Live Data
        </span>
        <span className="text-[11px] font-medium text-stone-500">{config.text}</span>
      </div>
    </motion.div>
  );
}

export function CircularHealthScore({
  score,
  size = 140,
}: {
  score: number;
  size?: number;
}) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F0F1F3"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#006B4F"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight text-stone-900">{score}</span>
        <span className="text-xs font-medium text-stone-400">/100</span>
      </div>
    </div>
  );
}

export function TrendBadge({ value, positive = true }: { value: string; positive?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        positive ? 'bg-emerald-50 text-[#00A86B]' : 'bg-rose-50 text-rose-600'
      }`}
    >
      {positive ? '↑' : '↓'} {value}
    </span>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
