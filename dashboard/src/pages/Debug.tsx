import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Database,
  Cpu,
  Clock,
  Bell,
  Smartphone,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HealthData {
  database: {
    status: string;
    latency: string;
  };
  stats: {
    total_rides: string;
    total_users: string;
    online_drivers: string;
    active_devices: string;
  };
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  timestamp: string;
}

interface Device {
  device_token: string;
  platform: string;
  is_active: boolean;
  last_seen: string;
  did: string;
  name: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function Debug() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [healthRes, devicesRes] = await Promise.all([
        api.getHealth(),
        api.getNotificationDebug(),
      ]);
      setHealth(healthRes.health);
      setDevices(devicesRes.devices);
    } catch (error) {
      console.error('Failed to fetch debug info:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
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
          <h1 className="text-2xl font-bold text-gray-900">Debug</h1>
          <p className="text-gray-500">System health and debugging tools</p>
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

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-lg ${health?.database.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'}`}>
              <Database className={`w-5 h-5 ${health?.database.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Database</p>
              <div className="flex items-center gap-2">
                {health?.database.status === 'healthy' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="font-semibold text-gray-900 capitalize">{health?.database.status}</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Latency: <span className="font-medium text-gray-900">{health?.database.latency}</span>
          </p>
        </div>

        {/* Uptime */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Server Uptime</p>
              <p className="font-semibold text-gray-900">{formatUptime(health?.uptime || 0)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Last check: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '-'}
          </p>
        </div>

        {/* Memory */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Cpu className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Heap Memory</p>
              <p className="font-semibold text-gray-900">
                {formatBytes(health?.memory.heapUsed || 0)}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 rounded-full h-2"
              style={{
                width: `${((health?.memory.heapUsed || 0) / (health?.memory.heapTotal || 1)) * 100}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {formatBytes(health?.memory.heapUsed || 0)} / {formatBytes(health?.memory.heapTotal || 0)}
          </p>
        </div>

        {/* Active Devices */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-amber-100">
              <Smartphone className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Devices</p>
              <p className="font-semibold text-gray-900">{health?.stats.active_devices || 0}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Push notification targets
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold text-gray-900">{health?.stats.total_rides || 0}</p>
            <p className="text-sm text-gray-500">Total Rides</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{health?.stats.total_users || 0}</p>
            <p className="text-sm text-gray-500">Total Users</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{health?.stats.online_drivers || 0}</p>
            <p className="text-sm text-gray-500">Online Drivers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{health?.stats.active_devices || 0}</p>
            <p className="text-sm text-gray-500">Active Devices</p>
          </div>
        </div>
      </div>

      {/* Registered Devices */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Registered Push Devices
          </h2>
          <p className="text-sm text-gray-500">Devices registered for push notifications</p>
        </div>

        {devices.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Smartphone className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p>No devices registered</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Token</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {devices.map((device, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{device.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[150px]">{device.did}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        device.platform === 'ios' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {device.platform === 'ios' ? 'iOS' : 'Android'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {device.is_active ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500 text-sm">
                          <XCircle className="w-4 h-4" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {device.device_token.substring(0, 20)}...
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {device.last_seen 
                          ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true })
                          : 'Never'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
