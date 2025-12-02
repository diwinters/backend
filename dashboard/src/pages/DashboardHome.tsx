import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../contexts/CityContext';
import { api } from '../lib/api';
import { Card, CardHeader } from '../components/LayoutV2';
import {
  Car,
  Building2,
  Pill,
  Layers,
  Globe,
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Zap,
  Package,
} from 'lucide-react';

// =============================================================================
// Stat Card Component
// =============================================================================

function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconBg,
  href,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconBg: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className={`text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-gray-400">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
      {href && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm font-medium text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
            View details <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      )}
    </div>
  );

  return href ? <Link to={href}>{content}</Link> : content;
}

// =============================================================================
// Quick Action Card
// =============================================================================

function QuickAction({
  title,
  description,
  icon,
  color,
  href,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
}) {
  return (
    <Link 
      to={href}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 group"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

// =============================================================================
// Activity Item
// =============================================================================

function ActivityItem({
  type,
  title,
  description,
  time,
  status,
}: {
  type: 'ride' | 'driver' | 'stay' | 'system';
  title: string;
  description: string;
  time: string;
  status?: 'success' | 'pending' | 'error';
}) {
  const typeConfig = {
    ride: { icon: <Car className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600' },
    driver: { icon: <Users className="w-4 h-4" />, color: 'bg-purple-100 text-purple-600' },
    stay: { icon: <Building2 className="w-4 h-4" />, color: 'bg-pink-100 text-pink-600' },
    system: { icon: <Zap className="w-4 h-4" />, color: 'bg-gray-100 text-gray-600' },
  };

  const statusIcon = {
    success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    pending: <Clock className="w-4 h-4 text-yellow-500" />,
    error: <XCircle className="w-4 h-4 text-red-500" />,
  };

  const config = typeConfig[type];

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          {status && statusIcon[status]}
        </div>
        <p className="text-sm text-gray-500 truncate">{description}</p>
        <p className="text-xs text-gray-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Module Status Card
// =============================================================================

function ModuleStatus({
  name,
  status,
  count,
  icon,
  color,
}: {
  name: string;
  status: 'active' | 'inactive' | 'warning';
  count?: number;
  icon: React.ReactNode;
  color: string;
}) {
  const statusConfig = {
    active: { dot: 'bg-green-500', text: 'Active' },
    inactive: { dot: 'bg-gray-400', text: 'Inactive' },
    warning: { dot: 'bg-yellow-500', text: 'Warning' },
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${statusConfig[status].dot}`} />
            <span className="text-xs text-gray-500">{statusConfig[status].text}</span>
          </div>
        </div>
      </div>
      {count !== undefined && (
        <span className="text-lg font-semibold text-gray-700">{count}</span>
      )}
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good {getGreeting()}! 👋</h1>
          <p className="text-gray-500 mt-1">
            Here's what's happening in {currentCity?.name || 'your city'} today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            All systems operational
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Online Drivers"
          value={stats?.onlineDrivers || 0}
          change={12}
          changeLabel="from yesterday"
          icon={<Users className="w-5 h-5 text-white" />}
          iconBg="bg-gradient-to-br from-indigo-500 to-purple-600"
          href="/drivers"
        />
        <StatCard
          title="Active Rides"
          value={stats?.activeRides || 0}
          icon={<Car className="w-5 h-5 text-white" />}
          iconBg="bg-gradient-to-br from-blue-500 to-cyan-600"
          href="/rides"
        />
        <StatCard
          title="Completed Today"
          value={stats?.completedToday || 0}
          change={8}
          changeLabel="from yesterday"
          icon={<CheckCircle2 className="w-5 h-5 text-white" />}
          iconBg="bg-gradient-to-br from-green-500 to-emerald-600"
          href="/rides"
        />
        <StatCard
          title="Revenue Today"
          value={`${stats?.revenueToday || 0} ${currentCity?.currency || 'DH'}`}
          change={15}
          changeLabel="from yesterday"
          icon={<DollarSign className="w-5 h-5 text-white" />}
          iconBg="bg-gradient-to-br from-orange-500 to-red-500"
          href="/rides"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickAction
              title="Live Map"
              description="View real-time driver locations"
              icon={<MapPin className="w-5 h-5 text-white" />}
              color="bg-gradient-to-br from-green-500 to-emerald-600"
              href="/map"
            />
            <QuickAction
              title="Manage Rides"
              description="View and manage all rides"
              icon={<Car className="w-5 h-5 text-white" />}
              color="bg-gradient-to-br from-blue-500 to-indigo-600"
              href="/rides"
            />
            <QuickAction
              title="Driver Approvals"
              description={`${stats?.pendingApprovals || 0} pending requests`}
              icon={<Users className="w-5 h-5 text-white" />}
              color="bg-gradient-to-br from-purple-500 to-pink-600"
              href="/drivers/approval"
            />
            <QuickAction
              title="Pharmacy"
              description="Manage medicine inventory"
              icon={<Pill className="w-5 h-5 text-white" />}
              color="bg-gradient-to-br from-red-500 to-orange-500"
              href="/medicines"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <Card padding={false}>
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {recentRides.length > 0 ? (
                recentRides.map((ride, i) => (
                  <ActivityItem
                    key={ride.id || i}
                    type="ride"
                    title={`Ride #${ride.id?.slice(-6) || i}`}
                    description={ride.pickup_address?.substring(0, 40) || 'No address'}
                    time={formatTimeAgo(ride.created_at)}
                    status={ride.status === 'completed' ? 'success' : ride.status === 'cancelled' ? 'error' : 'pending'}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* City Modules */}
      {currentCity && (
        <Card>
          <CardHeader 
            title="City Modules" 
            description={`Active modules for ${currentCity.name}`}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ModuleStatus
              name="Rides"
              status={currentCity.modules?.rides?.enabled ? 'active' : 'inactive'}
              icon={<Car className="w-4 h-4 text-blue-600" />}
              color="bg-blue-100"
            />
            <ModuleStatus
              name="Stays"
              status={currentCity.modules?.stays?.enabled ? 'active' : 'inactive'}
              icon={<Building2 className="w-4 h-4 text-purple-600" />}
              color="bg-purple-100"
            />
            <ModuleStatus
              name="Pharmacy"
              status={currentCity.modules?.pharmacy?.enabled ? 'active' : 'inactive'}
              icon={<Pill className="w-4 h-4 text-red-600" />}
              color="bg-red-100"
            />
            <ModuleStatus
              name="Content"
              status={currentCity.modules?.content?.enabled ? 'active' : 'inactive'}
              icon={<Layers className="w-4 h-4 text-orange-600" />}
              color="bg-orange-100"
            />
          </div>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

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
