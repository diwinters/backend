import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../contexts/CityContext';
import { api } from '../lib/api';
import { Card, CardHeader } from '../components/LayoutV2';

// =============================================================================
// Icons
// =============================================================================

const Icons = {
  car: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
  users: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  building: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  ),
  pill: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-7.135 1.223c-1.052.18-2.137.18-3.19 0L2.666 20.313c-1.716-.293-2.298-2.379-1.066-3.611L3.002 15.3" />
    </svg>
  ),
  layers: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
    </svg>
  ),
  globe: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  map: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  ),
  trendingUp: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  trendingDown: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
  ),
  arrow: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  dollar: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// =============================================================================
// App Module Card (macOS Launchpad style)
// =============================================================================

function AppCard({
  name,
  description,
  icon,
  color,
  href,
  stats,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  stats?: { label: string; value: string | number }[];
}) {
  return (
    <Link
      to={href}
      className="group bg-white rounded-2xl border border-[#d1d1d6] p-6 hover:shadow-xl hover:shadow-black/5 hover:border-[#007aff]/30 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          {Icons.arrow}
        </div>
      </div>
      
      <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">{name}</h3>
      <p className="text-[13px] text-[#86868b] mb-4">{description}</p>
      
      {stats && stats.length > 0 && (
        <div className="pt-4 border-t border-[#f5f5f7] flex gap-4">
          {stats.map((stat, i) => (
            <div key={i}>
              <p className="text-[20px] font-semibold text-[#1d1d1f]">{stat.value}</p>
              <p className="text-[11px] text-[#86868b] uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}

// =============================================================================
// Stat Card
// =============================================================================

function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#d1d1d6] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] text-[#86868b] mb-1">{title}</p>
          <p className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">{value}</p>
        </div>
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
      </div>
      
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-3">
          <div className={`flex items-center gap-0.5 ${change >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
            {change >= 0 ? Icons.trendingUp : Icons.trendingDown}
            <span className="text-[13px] font-medium">
              {change >= 0 ? '+' : ''}{change}%
            </span>
          </div>
          {changeLabel && (
            <span className="text-[12px] text-[#86868b]">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Recent Activity
// =============================================================================

function ActivityItem({
  type,
  title,
  time,
  status,
}: {
  type: 'ride' | 'driver' | 'stay';
  title: string;
  time: string;
  status: 'success' | 'pending' | 'error';
}) {
  const config = {
    ride: { color: '#007aff', icon: Icons.car },
    driver: { color: '#af52de', icon: Icons.users },
    stay: { color: '#ff9500', icon: Icons.building },
  };
  
  const statusColors = {
    success: 'bg-[#34c759]',
    pending: 'bg-[#ff9500]',
    error: 'bg-[#ff3b30]',
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#f5f5f7] last:border-0">
      <div 
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
        style={{ backgroundColor: config[type].color }}
      >
        <div className="scale-75">{config[type].icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-[#1d1d1f] truncate">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColors[status]}`} />
          <span className="text-[12px] text-[#86868b]">{time}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Dashboard
// =============================================================================

export default function DashboardHome() {
  const { currentCity } = useCity();
  const [stats, setStats] = useState<any>(null);
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [overviewRes, ridesRes, driversRes] = await Promise.all([
          api.getOverviewStats().catch(() => ({ stats: {} })),
          api.getRides({ limit: 5 }).catch(() => ({ rides: [] })),
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#d1d1d6] border-t-[#007aff] rounded-full animate-spin" />
          <p className="text-[15px] text-[#86868b]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
          {greeting} 👋
        </h1>
        <p className="text-[15px] text-[#86868b] mt-1">
          Here's what's happening in <span className="font-medium text-[#1d1d1f]">{currentCity?.name || 'your city'}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Online Drivers"
          value={stats?.onlineDrivers || 0}
          change={12}
          changeLabel="vs yesterday"
          icon={<div className="scale-75">{Icons.users}</div>}
          color="#007aff"
        />
        <StatCard
          title="Active Rides"
          value={stats?.activeRides || 0}
          icon={<div className="scale-75">{Icons.car}</div>}
          color="#34c759"
        />
        <StatCard
          title="Completed Today"
          value={stats?.completedToday || 0}
          change={8}
          changeLabel="vs yesterday"
          icon={<div className="scale-75">{Icons.check}</div>}
          color="#5856d6"
        />
        <StatCard
          title="Revenue"
          value={`${stats?.revenueToday || 0} ${currentCity?.currency || 'DH'}`}
          change={15}
          changeLabel="vs yesterday"
          icon={<div className="scale-75">{Icons.dollar}</div>}
          color="#ff9500"
        />
      </div>

      {/* Apps Grid */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-4">Apps</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AppCard
            name="Rides"
            description="Transportation & drivers management"
            icon={Icons.car}
            color="#007aff"
            href="/rides"
            stats={[
              { label: 'Active', value: stats?.activeRides || 0 },
              { label: 'Drivers', value: stats?.onlineDrivers || 0 },
            ]}
          />
          <AppCard
            name="Stays"
            description="Accommodation providers"
            icon={Icons.building}
            color="#af52de"
            href="/stays"
          />
          <AppCard
            name="Pharmacy"
            description="Medicine & health products"
            icon={Icons.pill}
            color="#ff3b30"
            href="/medicines"
          />
          <AppCard
            name="Content"
            description="Map pins & discovery content"
            icon={Icons.layers}
            color="#ff9500"
            href="/map-pills"
          />
          <AppCard
            name="Live Map"
            description="Real-time driver locations"
            icon={Icons.map}
            color="#34c759"
            href="/map"
          />
          <AppCard
            name="Platform"
            description="Cities, users & system settings"
            icon={Icons.globe}
            color="#5856d6"
            href="/cities"
          />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card padding={false}>
          <div className="p-5 border-b border-[#f5f5f7]">
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Recent Activity</h3>
          </div>
          <div className="p-5 max-h-72 overflow-y-auto">
            {recentRides.length > 0 ? (
              recentRides.map((ride, i) => (
                <ActivityItem
                  key={ride.id || i}
                  type="ride"
                  title={`Ride #${ride.id?.slice(-6) || i + 1}`}
                  time={formatTimeAgo(ride.created_at)}
                  status={ride.status === 'completed' ? 'success' : ride.status === 'cancelled' ? 'error' : 'pending'}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-[#f5f5f7] rounded-full flex items-center justify-center mx-auto mb-3">
                  {Icons.clock}
                </div>
                <p className="text-[14px] text-[#86868b]">No recent activity</p>
              </div>
            )}
          </div>
        </Card>

        {/* City Modules */}
        {currentCity && (
          <Card>
            <CardHeader 
              title="Active Modules" 
              description={`Enabled for ${currentCity.name}`}
            />
            <div className="space-y-3">
              {[
                { name: 'Rides', enabled: currentCity.modules?.rides?.enabled, icon: Icons.car, color: '#007aff' },
                { name: 'Stays', enabled: currentCity.modules?.stays?.enabled, icon: Icons.building, color: '#af52de' },
                { name: 'Pharmacy', enabled: currentCity.modules?.pharmacy?.enabled, icon: Icons.pill, color: '#ff3b30' },
                { name: 'Content', enabled: currentCity.modules?.content?.enabled, icon: Icons.layers, color: '#ff9500' },
              ].map(mod => (
                <div key={mod.name} className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: mod.color }}
                    >
                      <div className="scale-75">{mod.icon}</div>
                    </div>
                    <span className="text-[14px] font-medium text-[#1d1d1f]">{mod.name}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${
                    mod.enabled 
                      ? 'bg-[#34c759]/10 text-[#34c759]' 
                      : 'bg-[#86868b]/10 text-[#86868b]'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${mod.enabled ? 'bg-[#34c759]' : 'bg-[#86868b]'}`} />
                    {mod.enabled ? 'Active' : 'Disabled'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
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
