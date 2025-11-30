import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import {
  ChevronLeft,
  ChevronRight,
  Car,
  MapPin,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Driver {
  did: string;
  name: string;
  phone: string;
  avatar: string | null;
  user_type: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  last_location_update: string | null;
  completed_rides: number;
  active_ride: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function Drivers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const page = parseInt(searchParams.get('page') || '1');
  const online = searchParams.get('online');

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const response = await api.getDrivers({
        page,
        limit: 20,
        online: online === 'true' ? true : online === 'false' ? false : undefined,
      });
      setDrivers(response.drivers);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [page, online]);

  const handleOnlineFilter = (filter: string) => {
    setSearchParams((params) => {
      if (filter) {
        params.set('online', filter);
      } else {
        params.delete('online');
      }
      params.set('page', '1');
      return params;
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((params) => {
      params.set('page', String(newPage));
      return params;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <p className="text-gray-500">View and manage all registered drivers</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => handleOnlineFilter('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !online ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Drivers
        </button>
        <button
          onClick={() => handleOnlineFilter('true')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            online === 'true' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Online
        </button>
        <button
          onClick={() => handleOnlineFilter('false')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            online === 'false' ? 'bg-gray-300 text-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          Offline
        </button>
      </div>

      {/* Drivers Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : drivers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Car className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No drivers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => (
            <div
              key={driver.did}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                    {driver.avatar ? (
                      <img
                        src={driver.avatar}
                        alt={driver.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-semibold text-gray-400">
                        {driver.name?.[0] || 'D'}
                      </span>
                    )}
                  </div>
                  {/* Online indicator */}
                  <div
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                      driver.is_available ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{driver.name || 'Unknown'}</h3>
                  <p className="text-sm text-gray-500">{driver.phone || 'No phone'}</p>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    {driver.is_available ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500">
                        <XCircle className="w-4 h-4" />
                        Offline
                      </span>
                    )}
                    {driver.active_ride > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Car className="w-4 h-4" />
                        On ride
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Completed Rides</p>
                  <p className="text-lg font-semibold text-gray-900">{driver.completed_rides}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Active</p>
                  <p className="text-sm text-gray-600">
                    {driver.last_location_update
                      ? formatDistanceToNow(new Date(driver.last_location_update), { addSuffix: true })
                      : 'Never'}
                  </p>
                </div>
              </div>

              {/* Location */}
              {driver.latitude && driver.longitude && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span className="font-mono text-xs">
                    {driver.latitude.toFixed(4)}, {driver.longitude.toFixed(4)}
                  </span>
                </div>
              )}

              {/* DID */}
              <p className="mt-3 text-xs text-gray-400 truncate">{driver.did}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pagination.limit + 1} to{' '}
            {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} drivers
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === pagination.totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
