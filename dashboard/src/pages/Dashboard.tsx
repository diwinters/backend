import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  Car,
  Users,
  MapPin,
  DollarSign,
  Clock,
  TrendingUp,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface Stats {
  totalRides: number;
  activeRides: number;
  completedToday: number;
  totalUsers: number;
  totalDrivers: number;
  onlineDrivers: number;
  pendingRides: number;
  revenueToday: number;
}

interface DailyStats {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<DailyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [overviewRes, chartRes] = await Promise.all([
        api.getOverviewStats(),
        api.getRideStats(7),
      ]);
      setStats(overviewRes.stats);
      setChartData(chartRes.stats.reverse());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of your ride-hailing platform</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<MapPin className="w-5 h-5 text-blue-600" />}
          label="Active Rides"
          value={stats?.activeRides || 0}
          subValue={`${stats?.pendingRides || 0} pending`}
          color="bg-blue-100"
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-green-600" />}
          label="Completed Today"
          value={stats?.completedToday || 0}
          subValue={`${stats?.totalRides || 0} total`}
          color="bg-green-100"
        />
        <StatCard
          icon={<Car className="w-5 h-5 text-purple-600" />}
          label="Online Drivers"
          value={stats?.onlineDrivers || 0}
          subValue={`${stats?.totalDrivers || 0} total`}
          color="bg-purple-100"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-amber-600" />}
          label="Revenue Today"
          value={`${(stats?.revenueToday || 0).toFixed(2)} MAD`}
          color="bg-amber-100"
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ride Activity</h2>
            <p className="text-sm text-gray-500">Last 7 days</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
              <span className="text-gray-600">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="text-gray-600">Cancelled</span>
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                fontSize={12}
                tickFormatter={(date) => format(parseISO(date), 'MMM d')}
              />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                labelFormatter={(date) => format(parseISO(date as string), 'MMMM d, yyyy')}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#6366f1"
                fillOpacity={1}
                fill="url(#colorCompleted)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cancelled"
                stroke="#f87171"
                fill="transparent"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No ride data available
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/rides?status=pending"
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Pending Rides</p>
              <p className="text-sm text-gray-500">View and manage pending ride requests</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
        </Link>

        <Link
          to="/drivers?online=true"
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Online Drivers</p>
              <p className="text-sm text-gray-500">Monitor active drivers in real-time</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
        </Link>
      </div>

      {/* Users Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Platform Summary</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
            <div className="text-sm text-gray-500 mt-1">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{stats?.totalDrivers || 0}</div>
            <div className="text-sm text-gray-500 mt-1">Registered Drivers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{stats?.onlineDrivers || 0}</div>
            <div className="text-sm text-gray-500 mt-1">Currently Online</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{stats?.totalRides || 0}</div>
            <div className="text-sm text-gray-500 mt-1">Total Rides</div>
          </div>
        </div>
      </div>
    </div>
  );
}
