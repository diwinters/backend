import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../contexts/CityContext';
import { api } from '../lib/api';

// =============================================================================
// UBER-STYLE DASHBOARD - World Class Operations Center
// =============================================================================

// Animated number counter
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, stepDuration);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <>{prefix}{displayValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}{suffix}</>;
}

// Pulse animation for live indicator
function LivePulse() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
    </span>
  );
}

// Sparkline mini chart
function Sparkline({ data, color = '#10b981' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-8">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        fill={`url(#gradient-${color.replace('#', '')})`}
        points={`0,100 ${points} 100,100`}
      />
    </svg>
  );
}

// Metric card with trend
function MetricCard({ 
  title, 
  value, 
  change, 
  changeLabel,
  icon, 
  color,
  sparkData,
  suffix = '',
}: { 
  title: string;
  value: number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: string;
  sparkData?: number[];
  suffix?: string;
}) {
  const isPositive = (change ?? 0) >= 0;
  
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-white/5 p-5 hover:border-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-black/20">
      {/* Glow effect */}
      <div 
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"
        style={{ backgroundColor: color }}
      />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <svg className={`w-3 h-3 ${isPositive ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {Math.abs(change)}%
            </div>
          )}
        </div>
        
        <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
        <p className="text-3xl font-bold text-white tracking-tight">
          <AnimatedNumber value={value} suffix={suffix} />
        </p>
        
        {changeLabel && (
          <p className="text-xs text-slate-500 mt-1">{changeLabel}</p>
        )}
        
        {sparkData && (
          <div className="mt-3">
            <Sparkline data={sparkData} color={color} />
          </div>
        )}
      </div>
    </div>
  );
}

// Service module card (Uber-style app launcher)
function ServiceCard({
  name,
  description,
  icon,
  color,
  href,
  stats,
  isLive,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  stats?: { label: string; value: string | number }[];
  isLive?: boolean;
}) {
  return (
    <Link
      to={href}
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-white/5 p-6 hover:border-white/20 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/40"
    >
      {/* Animated gradient border on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div 
          className="absolute inset-0 rounded-2xl"
          style={{ 
            background: `linear-gradient(135deg, ${color}20, transparent, ${color}10)`,
          }}
        />
      </div>
      
      {/* Glow */}
      <div 
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
        style={{ backgroundColor: color }}
      />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
            style={{ 
              backgroundColor: color,
              boxShadow: `0 8px 32px ${color}40`
            }}
          >
            {icon}
          </div>
          {isLive && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <LivePulse />
              LIVE
            </div>
          )}
        </div>
        
        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-opacity-100">{name}</h3>
        <p className="text-sm text-slate-400 mb-4">{description}</p>
        
        {stats && stats.length > 0 && (
          <div className="flex gap-6 pt-4 border-t border-white/5">
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
        
        {/* Arrow indicator */}
        <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// Live activity feed item
function ActivityItem({
  type,
  title,
  subtitle,
  time,
  status,
}: {
  type: 'ride' | 'driver' | 'stay' | 'delivery' | 'user';
  title: string;
  subtitle?: string;
  time: string;
  status: 'success' | 'pending' | 'error' | 'info';
}) {
  const typeConfig = {
    ride: { color: '#3b82f6', icon: <CarIcon /> },
    driver: { color: '#8b5cf6', icon: <UserIcon /> },
    stay: { color: '#f59e0b', icon: <BuildingIcon /> },
    delivery: { color: '#10b981', icon: <BoxIcon /> },
    user: { color: '#ec4899', icon: <UserPlusIcon /> },
  };
  
  const statusColors = {
    success: 'bg-emerald-500',
    pending: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className="flex items-start gap-4 py-4 border-b border-white/5 last:border-0 group hover:bg-white/[0.02] px-2 -mx-2 rounded-lg transition-colors">
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${typeConfig[type].color}20` }}
      >
        <div className="text-white scale-75" style={{ color: typeConfig[type].color }}>
          {typeConfig[type].icon}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{title}</p>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColors[status]}`} />
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      
      <div className="text-xs text-slate-500 whitespace-nowrap">
        {time}
      </div>
    </div>
  );
}

// Quick action button
function QuickAction({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick?: () => void; color: string }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
    >
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
        style={{ backgroundColor: `${color}20` }}
      >
        <div style={{ color }}>{icon}</div>
      </div>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </button>
  );
}

// =============================================================================
// Icons
// =============================================================================

function CarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  );
}

const Icons = {
  car: <CarIcon />,
  users: <UserIcon />,
};

function BuildingIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function PillIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-7.135 1.223c-1.052.18-2.137.18-3.19 0L2.666 20.313c-1.716-.293-2.298-2.379-1.066-3.611L3.002 15.3" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// =============================================================================
// Main Dashboard Component
// =============================================================================

export default function DashboardHome() {
  const { currentCity } = useCity();
  const [stats, setStats] = useState<any>(null);
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [overviewRes, ridesRes, driversRes] = await Promise.all([
          api.getOverviewStats().catch(() => ({ stats: {} })),
          api.getRides({ limit: 10 }).catch(() => ({ rides: [] })),
          api.getDriverLocations().catch(() => ({ drivers: [] })),
        ]);

        setStats({
          onlineDrivers: driversRes.drivers?.filter((d: any) => d.is_available).length || 0,
          totalDrivers: driversRes.drivers?.length || 0,
          activeRides: overviewRes.stats?.activeRides || 0,
          completedToday: overviewRes.stats?.completedToday || 0,
          revenueToday: overviewRes.stats?.revenueToday || 0,
          pendingApprovals: overviewRes.stats?.pendingApprovals || 0,
        });

        setRecentRides(ridesRes.rides || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [currentCity?.id]);

  // Mock sparkline data
  const sparklineData = {
    rides: [12, 19, 15, 25, 22, 30, 28, 35, 32, 40, 38, 45],
    revenue: [1200, 1900, 1500, 2500, 2200, 3000, 2800, 3500, 3200, 4000, 3800, 4500],
    drivers: [5, 8, 6, 10, 9, 12, 11, 15, 14, 18, 16, 20],
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/10 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
          </div>
          <p className="text-slate-400 text-sm">Loading command center...</p>
        </div>
      </div>
    );
  }

  const greeting = (() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a2e] via-[#16162a] to-[#0f0f1a] border border-white/5 p-8">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <LivePulse />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live Operations</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                {greeting}, Admin
              </h1>
              <p className="text-lg text-slate-400">
                Managing <span className="text-white font-semibold">{currentCity?.name || 'Raceef'}</span> operations
              </p>
            </div>
            
            <div className="flex flex-col items-start lg:items-end gap-2">
              <div className="text-4xl lg:text-5xl font-bold text-white font-mono tracking-tight">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm text-slate-500">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
          
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.onlineDrivers || 0}</p>
                <p className="text-xs text-slate-500">Drivers Online</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                <CarIcon />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.activeRides || 0}</p>
                <p className="text-xs text-slate-500">Active Rides</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                <ChartIcon />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.completedToday || 0}</p>
                <p className="text-xs text-slate-500">Completed Today</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <DollarIcon />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.revenueToday || 0} <span className="text-sm font-normal text-slate-500">{currentCity?.currency || 'DH'}</span></p>
                <p className="text-xs text-slate-500">Revenue Today</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Key Metrics</h2>
          <Link to="/debug" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View Analytics →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Active Rides"
            value={stats?.activeRides || 0}
            change={12}
            changeLabel="vs last hour"
            icon={<CarIcon />}
            color="#3b82f6"
            sparkData={sparklineData.rides}
          />
          <MetricCard
            title="Online Drivers"
            value={stats?.onlineDrivers || 0}
            change={8}
            changeLabel="vs yesterday"
            icon={<UserIcon />}
            color="#10b981"
            sparkData={sparklineData.drivers}
          />
          <MetricCard
            title="Today's Revenue"
            value={stats?.revenueToday || 0}
            change={15}
            changeLabel="vs yesterday"
            icon={<DollarIcon />}
            color="#f59e0b"
            sparkData={sparklineData.revenue}
            suffix={` ${currentCity?.currency || 'DH'}`}
          />
          <MetricCard
            title="Pending Approvals"
            value={stats?.pendingApprovals || 0}
            icon={<BellIcon />}
            color="#ec4899"
          />
        </div>
      </div>

      {/* Service Modules */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Services</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ServiceCard
            name="Rides"
            description="Manage transportation & drivers"
            icon={<CarIcon />}
            color="#3b82f6"
            href="/rides"
            isLive={true}
            stats={[
              { label: 'Active', value: stats?.activeRides || 0 },
              { label: 'Drivers', value: stats?.onlineDrivers || 0 },
            ]}
          />
          <ServiceCard
            name="Stays"
            description="Accommodation management"
            icon={<BuildingIcon />}
            color="#8b5cf6"
            href="/stays"
          />
          <ServiceCard
            name="Pharmacy"
            description="Medicine & health products"
            icon={<PillIcon />}
            color="#ef4444"
            href="/medicines"
          />
          <ServiceCard
            name="Content"
            description="Map pins & discovery"
            icon={<LayersIcon />}
            color="#f59e0b"
            href="/map-pills"
          />
          <ServiceCard
            name="Live Map"
            description="Real-time driver locations"
            icon={<MapIcon />}
            color="#10b981"
            href="/map"
            isLive={true}
          />
          <ServiceCard
            name="Platform"
            description="Cities, users & settings"
            icon={<GlobeIcon />}
            color="#6366f1"
            href="/cities"
          />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                <LivePulse />
              </div>
              <Link to="/rides" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                View All →
              </Link>
            </div>
          </div>
          <div className="p-6 max-h-[400px] overflow-y-auto">
            {recentRides.length > 0 ? (
              recentRides.map((ride, i) => (
                <ActivityItem
                  key={ride.id || i}
                  type="ride"
                  title={`Ride #${ride.id?.slice(-6) || i + 1}`}
                  subtitle={ride.pickup_address || 'Processing...'}
                  time={formatTimeAgo(ride.created_at)}
                  status={ride.status === 'completed' ? 'success' : ride.status === 'cancelled' ? 'error' : 'pending'}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-slate-500">
                  <CarIcon />
                </div>
                <p className="text-slate-400">No recent activity</p>
                <p className="text-sm text-slate-600 mt-1">Rides will appear here in real-time</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & City Modules */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-white/5 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-3">
              <QuickAction icon={<UserPlusIcon />} label="Add Driver" color="#10b981" />
              <QuickAction icon={<CogIcon />} label="Settings" color="#6366f1" />
              <QuickAction icon={<ChartIcon />} label="Reports" color="#f59e0b" />
            </div>
          </div>

          {/* City Modules Status */}
          {currentCity && (
            <div className="rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Active Modules</h3>
                <span className="text-xs text-slate-500">{currentCity.name}</span>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Rides', enabled: currentCity.modules?.rides?.enabled, icon: <CarIcon />, color: '#3b82f6' },
                  { name: 'Stays', enabled: currentCity.modules?.stays?.enabled, icon: <BuildingIcon />, color: '#8b5cf6' },
                  { name: 'Pharmacy', enabled: currentCity.modules?.pharmacy?.enabled, icon: <PillIcon />, color: '#ef4444' },
                  { name: 'Content', enabled: currentCity.modules?.content?.enabled, icon: <LayersIcon />, color: '#f59e0b' },
                ].map(mod => (
                  <div key={mod.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${mod.color}20` }}
                      >
                        <div className="scale-75" style={{ color: mod.color }}>{mod.icon}</div>
                      </div>
                      <span className="text-sm font-medium text-white">{mod.name}</span>
                    </div>
                    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      mod.enabled 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${mod.enabled ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                      {mod.enabled ? 'Active' : 'Off'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
