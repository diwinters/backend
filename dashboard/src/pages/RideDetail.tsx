import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Car,
  DollarSign,
  Phone,
  History,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';

interface RideDetail {
  id: number;
  rider_did: string;
  driver_did: string | null;
  rider_name: string;
  rider_phone: string;
  driver_name: string | null;
  driver_phone: string | null;
  status: string;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_address: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  estimated_price: number;
  final_price: number | null;
  estimated_duration: number;
  estimated_distance: number;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

interface RideHistory {
  id: number;
  ride_id: number;
  status: string;
  changed_by: string;
  notes: string | null;
  changed_at: string;
}

interface Driver {
  did: string;
  name: string;
  is_available: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  offered: 'bg-blue-100 text-blue-700 border-blue-200',
  accepted: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  driver_arrived: 'bg-purple-100 text-purple-700 border-purple-200',
  in_progress: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export default function RideDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [history, setHistory] = useState<RideHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchRide();
  }, [id]);

  const fetchRide = async () => {
    try {
      const response = await api.getRide(id!);
      setRide(response.ride);
      setHistory(response.history);
    } catch (error) {
      console.error('Failed to fetch ride:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAssignModal = async () => {
    try {
      const response = await api.getDrivers({ online: true, limit: 50 });
      setDrivers(response.drivers);
      setShowAssignModal(true);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriver) return;
    setIsAssigning(true);
    setActionError('');
    try {
      await api.assignRide(id!, selectedDriver);
      setShowAssignModal(false);
      fetchRide();
    } catch (error: any) {
      setActionError(error.message || 'Failed to assign driver');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCancelRide = async () => {
    if (!confirm('Are you sure you want to cancel this ride?')) return;
    try {
      await api.cancelRide(id!, 'Cancelled by admin');
      fetchRide();
    } catch (error: any) {
      alert(error.message || 'Failed to cancel ride');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">Ride not found</p>
        <Link to="/rides" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to rides
        </Link>
      </div>
    );
  }

  const canAssign = ['pending', 'offered'].includes(ride.status);
  const canCancel = !['completed', 'cancelled'].includes(ride.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Ride #{ride.id}</h1>
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${
              statusColors[ride.status] || 'bg-gray-100 text-gray-700'
            }`}
          >
            {ride.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex gap-2">
          {canAssign && (
            <button
              onClick={handleOpenAssignModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Assign Driver
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancelRide}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancel Ride
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Route</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pickup</p>
                  <p className="text-gray-900">{ride.pickup_address}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {ride.pickup_latitude.toFixed(6)}, {ride.pickup_longitude.toFixed(6)}
                  </p>
                </div>
              </div>
              <div className="ml-4 border-l-2 border-dashed border-gray-200 h-8"></div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dropoff</p>
                  <p className="text-gray-900">{ride.dropoff_address}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {ride.dropoff_latitude.toFixed(6)}, {ride.dropoff_longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline / History */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Ride History
            </h2>
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">No history available</p>
            ) : (
              <div className="space-y-4">
                {history.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="relative">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          index === history.length - 1 ? 'bg-primary-600' : 'bg-gray-300'
                        }`}
                      />
                      {index < history.length - 1 && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-gray-900">
                        Status changed to <span className="font-semibold">{item.status.replace('_', ' ')}</span>
                      </p>
                      {item.notes && <p className="text-sm text-gray-500 mt-1">{item.notes}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(item.changed_at), 'MMM d, yyyy HH:mm:ss')}
                        {item.changed_by && ` • by ${item.changed_by}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rider Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Rider
            </h2>
            <div className="space-y-3">
              <p className="font-medium text-gray-900">{ride.rider_name || 'Unknown'}</p>
              {ride.rider_phone && (
                <a
                  href={`tel:${ride.rider_phone}`}
                  className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  {ride.rider_phone}
                </a>
              )}
              <p className="text-xs text-gray-400 break-all">{ride.rider_did}</p>
            </div>
          </div>

          {/* Driver Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Car className="w-5 h-5" />
              Driver
            </h2>
            {ride.driver_did ? (
              <div className="space-y-3">
                <p className="font-medium text-gray-900">{ride.driver_name || 'Unknown'}</p>
                {ride.driver_phone && (
                  <a
                    href={`tel:${ride.driver_phone}`}
                    className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
                  >
                    <Phone className="w-4 h-4" />
                    {ride.driver_phone}
                  </a>
                )}
                <p className="text-xs text-gray-400 break-all">{ride.driver_did}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No driver assigned</p>
            )}
          </div>

          {/* Price Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated</span>
                <span className="font-medium">{ride.estimated_price.toFixed(2)} MAD</span>
              </div>
              {ride.final_price && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Final</span>
                  <span className="font-semibold text-green-600">{ride.final_price.toFixed(2)} MAD</span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Distance</span>
                  <span>{(ride.estimated_distance / 1000).toFixed(1)} km</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Est. Duration</span>
                  <span>{Math.round(ride.estimated_duration / 60)} min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timestamps
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span>{format(new Date(ride.created_at), 'MMM d, HH:mm')}</span>
              </div>
              {ride.accepted_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Accepted</span>
                  <span>{format(new Date(ride.accepted_at), 'MMM d, HH:mm')}</span>
                </div>
              )}
              {ride.started_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Started</span>
                  <span>{format(new Date(ride.started_at), 'MMM d, HH:mm')}</span>
                </div>
              )}
              {ride.completed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Completed</span>
                  <span>{format(new Date(ride.completed_at), 'MMM d, HH:mm')}</span>
                </div>
              )}
              {ride.cancelled_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cancelled</span>
                  <span>{format(new Date(ride.cancelled_at), 'MMM d, HH:mm')}</span>
                </div>
              )}
            </div>
            {ride.cancellation_reason && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">
                  <span className="font-medium">Cancellation reason:</span> {ride.cancellation_reason}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Driver Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Driver</h3>
            
            {actionError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                {actionError}
              </div>
            )}

            {drivers.length === 0 ? (
              <p className="text-gray-500 mb-4">No online drivers available</p>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Driver
                </label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Choose a driver...</option>
                  {drivers.map((driver) => (
                    <option key={driver.did} value={driver.did}>
                      {driver.name} {driver.is_available ? '(Online)' : '(Offline)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignDriver}
                disabled={!selectedDriver || isAssigning}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAssigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
