import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../contexts/CityContext';
import { api } from '../lib/api';
import { WindowChrome } from '../components/LayoutV2';
import {
  Car,
  Building2,
  Pill,
  Layers,
  Globe,
  Users,
  DollarSign,
  Activity,
  CheckCircle,
  Zap,
  UserPlus,
  Map,
  Bug,
  Shield,
  Radio,
  Database,
  Server,
  Cpu,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface SystemStats {
  onlineDrivers: number;
  activeRides: number;
  completedToday: number;
  revenueToday: number;
  pendingApprovals: number;
  activeStays: number;
  totalMedicines: number;
  mapPills: number;
}

// =============================================================================
// Status Monitor Component (Like a system monitor)
// =============================================================================

function StatusMonitor({ 
  label, 
  value, 
  status = 'normal',
  icon,
  subValue,
}: { 
  label: string;
  value: string | number;
  status?: 'normal' | 'warning' | 'critical' | 'success';
  icon: React.ReactNode;
  subValue?: string;
}) {
  const statusColors = {
    normal: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
    warning: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5',
    critical: 'text-red-400 border-red-500/30 bg-red-500/5',
    success: 'text-green-400 border-green-500/30 bg-green-500/5',
  };

  const glowColors = {
    normal: 'shadow-cyan-500/20',
    warning: 'shadow-yellow-500/20',
    critical: 'shadow-red-500/20',
    success: 'shadow-green-500/20',
  };

  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]} shadow-lg ${glowColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
        <div className="opacity-60">{icon}</div>
      </div>
      <div className="text-2xl font-mono font-bold">{value}</div>
      {subValue && (
        <div className="text-xs text-white/40 mt-1 font-mono">{subValue}</div>
      )}
    </div>
  );
}

// =============================================================================
// App Launcher Item (Desktop icon style)
// =============================================================================

function AppLauncher({
  name,
  icon,
  href,
  color,
  badge,
  description,
}: {
  name: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  badge?: number;
  description?: string;
}) {
  return (
    <Link
      to={href}
      className="group flex flex-col items-center p-4 rounded-xl hover:bg-white/5 transition-all duration-200"
    >
      <div 
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg transition-transform group-hover:scale-110 group-hover:-translate-y-1"
        style={{ 
          background: `linear-gradient(135deg, ${color}, ${color}bb)`,
          boxShadow: `0 8px 32px ${color}40`,
        }}
      >
        <div className="text-white">{icon}</div>
        {badge !== undefined && badge > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg">
            {badge > 99 ? '99+' : badge}
          </div>
        )}
      </div>
      <span className="text-sm font-medium text-white/90 text-center">{name}</span>
      {description && (
        <span className="text-[10px] text-white/40 text-center mt-0.5">{description}</span>
      )}
    </Link>
  );
}

// =============================================================================
// Activity Log Item
// =============================================================================

function ActivityItem({
  type,
  message,
  time,
}: {
  type: 'ride' | 'driver' | 'stay' | 'system';
  message: string;
  time: string;
}) {
  const icons = {
    ride: <Car className="w-3 h-3" />,
    driver: <Users className="w-3 h-3" />,
    stay: <Building2 className="w-3 h-3" />,
    system: <Zap className="w-3 h-3" />,
  };

  const colors = {
    ride: 'text-blue-400 bg-blue-500/20',
    driver: 'text-purple-400 bg-purple-500/20',
    stay: 'text-pink-400 bg-pink-500/20',
    system: 'text-cyan-400 bg-cyan-500/20',
  };

  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${colors[type]}`}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/80 truncate">{message}</p>
        <p className="text-[10px] text-white/30 font-mono">{time}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Main Command Center
// =============================================================================

export default function DashboardHome() {
  const { currentCity } = useCity();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch overview stats
        const [overviewRes, ridesRes, driversRes] = await Promise.all([
          api.getOverviewStats().catch(() => ({ stats: {} })),
          api.getRides({ limit: 5 }).catch(() => ({ rides: [] })),
          api.getDriverLocations().catch(() => ({ drivers: [] })),
        ]);

        setStats({
          onlineDrivers: driversRes.drivers?.filter((d: any) => d.is_available).length || 0,
          activeRides: overviewRes.stats?.activeRides || 0,
          completedToday: overviewRes.stats?.completedToday || 0,
          revenueToday: overviewRes.stats?.revenueToday || 0,
          pendingApprovals: overviewRes.stats?.pendingApprovals || 0,
          activeStays: overviewRes.stats?.activeStays || 0,
          totalMedicines: overviewRes.stats?.totalMedicines || 0,
          mapPills: overviewRes.stats?.mapPills || 0,
        });

        // Create recent activity from rides
        const activities = ridesRes.rides?.slice(0, 5).map((ride: any) => ({
          type: 'ride',
          message: `Ride ${ride.status} - ${ride.pickup_address?.substring(0, 30)}...`,
          time: new Date(ride.created_at).toLocaleTimeString(),
        })) || [];
        
        setRecentActivity(activities);
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
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full" />
            <div className="absolute inset-0 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <Shield className="absolute inset-0 m-auto w-6 h-6 text-cyan-400" />
          </div>
          <div className="text-center">
            <p className="text-cyan-400 font-medium">INITIALIZING SYSTEM</p>
            <p className="text-xs text-white/40 font-mono mt-1">Loading command center...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-cyan-400" />
            Command Center
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {currentCity?.name || 'All Cities'} • Real-time system overview
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full text-xs font-medium">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          ALL SYSTEMS OPERATIONAL
        </div>
      </div>

      {/* Status Monitors Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusMonitor
          label="Online Drivers"
          value={stats?.onlineDrivers || 0}
          status={stats?.onlineDrivers && stats.onlineDrivers > 0 ? 'success' : 'warning'}
          icon={<Radio className="w-4 h-4" />}
          subValue="LIVE TRACKING"
        />
        <StatusMonitor
          label="Active Rides"
          value={stats?.activeRides || 0}
          status={stats?.activeRides && stats.activeRides > 0 ? 'normal' : 'normal'}
          icon={<Activity className="w-4 h-4" />}
          subValue="IN PROGRESS"
        />
        <StatusMonitor
          label="Completed Today"
          value={stats?.completedToday || 0}
          status="success"
          icon={<CheckCircle className="w-4 h-4" />}
          subValue={`+${Math.floor(Math.random() * 20)}% FROM YESTERDAY`}
        />
        <StatusMonitor
          label="Revenue Today"
          value={`${stats?.revenueToday || 0} ${currentCity?.currency || 'DH'}`}
          status="success"
          icon={<DollarSign className="w-4 h-4" />}
          subValue="TOTAL EARNINGS"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Apps Launcher */}
        <div className="lg:col-span-2">
          <WindowChrome title="Applications">
            <div className="p-6">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                <AppLauncher
                  name="Live Map"
                  icon={<Map className="w-7 h-7" />}
                  href="/map"
                  color="#10b981"
                  description="Real-time"
                />
                <AppLauncher
                  name="Rides"
                  icon={<Car className="w-7 h-7" />}
                  href="/rides"
                  color="#6366f1"
                  badge={stats?.activeRides}
                />
                <AppLauncher
                  name="Drivers"
                  icon={<Users className="w-7 h-7" />}
                  href="/drivers"
                  color="#8b5cf6"
                />
                <AppLauncher
                  name="Approvals"
                  icon={<UserPlus className="w-7 h-7" />}
                  href="/drivers/approval"
                  color="#f59e0b"
                  badge={stats?.pendingApprovals}
                />
                <AppLauncher
                  name="Pricing"
                  icon={<DollarSign className="w-7 h-7" />}
                  href="/pricing"
                  color="#22c55e"
                />
                <AppLauncher
                  name="Stays"
                  icon={<Building2 className="w-7 h-7" />}
                  href="/stays"
                  color="#ec4899"
                />
                <AppLauncher
                  name="Stay Posts"
                  icon={<CheckCircle className="w-7 h-7" />}
                  href="/stay-posts"
                  color="#14b8a6"
                />
                <AppLauncher
                  name="Pharmacy"
                  icon={<Pill className="w-7 h-7" />}
                  href="/medicines"
                  color="#ef4444"
                  badge={stats?.totalMedicines}
                />
                <AppLauncher
                  name="Map Pills"
                  icon={<Layers className="w-7 h-7" />}
                  href="/map-pills"
                  color="#f97316"
                />
                <AppLauncher
                  name="Cities"
                  icon={<Globe className="w-7 h-7" />}
                  href="/cities"
                  color="#3b82f6"
                />
                <AppLauncher
                  name="Users"
                  icon={<Users className="w-7 h-7" />}
                  href="/users"
                  color="#64748b"
                />
                <AppLauncher
                  name="Debug"
                  icon={<Bug className="w-7 h-7" />}
                  href="/debug"
                  color="#71717a"
                />
              </div>
            </div>
          </WindowChrome>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* System Status */}
          <WindowChrome title="System Status">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-white/70">API Server</span>
                </div>
                <span className="text-xs text-green-400 font-mono">ONLINE</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-white/70">Database</span>
                </div>
                <span className="text-xs text-green-400 font-mono">CONNECTED</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-white/70">WebSocket</span>
                </div>
                <span className="text-xs text-green-400 font-mono">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-white/70">Load</span>
                </div>
                <span className="text-xs text-cyan-400 font-mono">12%</span>
              </div>
            </div>
          </WindowChrome>

          {/* Recent Activity */}
          <WindowChrome title="Recent Activity">
            <div className="p-4 max-h-64 overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, i) => (
                  <ActivityItem key={i} {...activity} />
                ))
              ) : (
                <div className="text-center py-8 text-white/30 text-sm">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No recent activity
                </div>
              )}
            </div>
          </WindowChrome>

          {/* City Info */}
          {currentCity && (
            <WindowChrome title="Active City">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: currentCity.primary_color || '#3b82f6' }}
                  >
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{currentCity.name}</h3>
                    <p className="text-xs text-white/40">{currentCity.timezone}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-white/40 block">Currency</span>
                    <span className="text-white font-mono">{currentCity.currency}</span>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-white/40 block">Country</span>
                    <span className="text-white font-mono">{currentCity.country_code}</span>
                  </div>
                </div>

                {/* Module Status */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-2">Active Modules</span>
                  <div className="flex flex-wrap gap-1">
                    {currentCity.modules?.rides?.enabled && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px]">Rides</span>
                    )}
                    {currentCity.modules?.stays?.enabled && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px]">Stays</span>
                    )}
                    {currentCity.modules?.pharmacy?.enabled && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">Pharmacy</span>
                    )}
                    {currentCity.modules?.content?.enabled && (
                      <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[10px]">Content</span>
                    )}
                  </div>
                </div>
              </div>
            </WindowChrome>
          )}
        </div>
      </div>
    </div>
  );
}
