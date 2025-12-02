import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCity } from '../contexts/CityContext';
import { api } from '../lib/api';
import {
  Car,
  Building2,
  ShoppingBag,
  MapPinned,
  Globe,
  ArrowUpRight,
  Users,
  MapPin,
  DollarSign,
  Clock,
  Activity,
  Zap,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface CityModules {
  rides?: { enabled: boolean; settings?: object };
  stays?: { enabled: boolean; settings?: object };
  shop?: { enabled: boolean; settings?: object };
  pharmacy?: { enabled: boolean; settings?: object };
  content?: { enabled: boolean; settings?: object };
}

interface QuickStat {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

// =============================================================================
// Module App Card Component
// =============================================================================

function ModuleAppCard({
  name,
  icon,
  color,
  href,
  stats,
  isEnabled = true,
}: {
  name: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  stats?: { label: string; value: string | number }[];
  isEnabled?: boolean;
}) {
  if (!isEnabled) {
    return (
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 opacity-50">
        <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Not enabled for this city</p>
      </div>
    );
  }

  return (
    <Link
      to={href}
      className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 group"
    >
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{name}</h3>
      
      {stats && stats.length > 0 && (
        <div className="flex items-center gap-4 mt-3">
          {stats.map((stat, i) => (
            <div key={i}>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}

// =============================================================================
// Quick Stats Row
// =============================================================================

function QuickStatsRow({ stats }: { stats: QuickStat[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
              {stat.icon}
            </div>
            {stat.change !== undefined && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                stat.change >= 0 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {stat.change >= 0 ? '+' : ''}{stat.change}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Live Activity Feed
// =============================================================================

function LiveActivityFeed() {
  // This would connect to WebSocket for real-time updates
  const activities = [
    { type: 'ride', message: 'New ride requested', time: 'Just now', color: 'bg-blue-500' },
    { type: 'driver', message: 'Driver Ahmed went online', time: '2m ago', color: 'bg-green-500' },
    { type: 'ride', message: 'Ride #1234 completed', time: '5m ago', color: 'bg-gray-500' },
    { type: 'stay', message: 'New stay post pending review', time: '10m ago', color: 'bg-purple-500' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-500" />
          Live Activity
        </h3>
        <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live
        </span>
      </div>
      
      <div className="space-y-3">
        {activities.map((activity, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${activity.color}`} />
            <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">{activity.message}</p>
            <span className="text-xs text-gray-400">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Dashboard Component
// =============================================================================

export default function DashboardHome() {
  const { currentCity } = useCity();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const [overviewRes, cityStatsRes] = await Promise.all([
          api.getOverviewStats(),
          api.getCityStats(),
        ]);
        setStats({
          overview: overviewRes.stats,
          cities: cityStatsRes.stats,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [currentCity?.id]);

  // Get current city stats
  const cityStats = stats?.cities?.find((c: any) => c.id === currentCity?.id) || {};
  const modules: CityModules = currentCity?.modules || {};

  const quickStats: QuickStat[] = [
    {
      label: 'Online Drivers',
      value: cityStats.online_drivers || stats?.overview?.onlineDrivers || 0,
      icon: <Car className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Active Rides',
      value: cityStats.active_rides || stats?.overview?.activeRides || 0,
      icon: <MapPin className="w-5 h-5 text-green-600" />,
      color: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Completed Today',
      value: cityStats.completed_today || stats?.overview?.completedToday || 0,
      change: 12,
      icon: <Clock className="w-5 h-5 text-purple-600" />,
      color: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Revenue Today',
      value: `${cityStats.revenue_today || stats?.overview?.revenueToday || 0} ${currentCity?.currency || 'DH'}`,
      change: 8,
      icon: <DollarSign className="w-5 h-5 text-orange-600" />,
      color: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here's what's happening in {currentCity?.name || 'your city'} today.
          </p>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
          <Zap className="w-4 h-4" />
          All systems operational
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStatsRow stats={quickStats} />

      {/* Module Apps Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Apps</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <ModuleAppCard
            name="Rides"
            icon={<Car className="w-7 h-7" />}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            href="/rides/map"
            isEnabled={modules.rides?.enabled ?? true}
            stats={[
              { label: 'Drivers', value: cityStats.online_drivers || 0 },
              { label: 'Active', value: cityStats.active_rides || 0 },
            ]}
          />
          
          <ModuleAppCard
            name="Stays"
            icon={<Building2 className="w-7 h-7" />}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            href="/stays"
            isEnabled={modules.stays?.enabled ?? true}
            stats={[
              { label: 'Providers', value: cityStats.active_stays || 0 },
            ]}
          />
          
          <ModuleAppCard
            name="Commerce"
            icon={<ShoppingBag className="w-7 h-7" />}
            color="bg-gradient-to-br from-green-500 to-green-600"
            href="/commerce/pharmacy"
            isEnabled={modules.pharmacy?.enabled || modules.shop?.enabled}
          />
          
          <ModuleAppCard
            name="Content"
            icon={<MapPinned className="w-7 h-7" />}
            color="bg-gradient-to-br from-orange-500 to-orange-600"
            href="/content/pills"
            isEnabled={modules.content?.enabled ?? true}
            stats={[
              { label: 'Pills', value: cityStats.map_pills || 0 },
            ]}
          />
          
          <ModuleAppCard
            name="Platform"
            icon={<Globe className="w-7 h-7" />}
            color="bg-gradient-to-br from-gray-600 to-gray-700"
            href="/platform/cities"
            stats={[
              { label: 'Cities', value: stats?.cities?.length || 0 },
            ]}
          />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Activity Feed */}
        <LiveActivityFeed />

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/rides/approvals"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Driver Approvals</p>
                <p className="text-xs text-gray-500">Review pending</p>
              </div>
            </Link>
            
            <Link
              to="/stays/posts"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Stay Posts</p>
                <p className="text-xs text-gray-500">Pending review</p>
              </div>
            </Link>
            
            <Link
              to="/rides/pricing"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Pricing</p>
                <p className="text-xs text-gray-500">Configure rates</p>
              </div>
            </Link>
            
            <Link
              to="/platform/cities"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Cities</p>
                <p className="text-xs text-gray-500">Manage regions</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
