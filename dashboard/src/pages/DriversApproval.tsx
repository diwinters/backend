import { useState } from 'react';
import { api } from '../lib/api';
import { UserPlus, Trash2, Search, Car, Truck } from 'lucide-react';
import * as Toast from '../components/Toast';

export default function DriversApproval() {
  const [didInput, setDidInput] = useState('');
  const [driverRole, setDriverRole] = useState<'taxi' | 'delivery'>('taxi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastApproved, setLastApproved] = useState<any>(null);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!didInput.trim()) {
      Toast.show('Please enter a DID');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.approveDriver(didInput.trim(), driverRole);
      Toast.show(`Driver approved successfully!`, 'success');
      setLastApproved(response);
      setDidInput('');
    } catch (error: any) {
      Toast.show(error.message || 'Failed to approve driver', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (did: string) => {
    if (!confirm('Are you sure you want to revoke driver approval?')) {
      return;
    }

    try {
      await api.revokeDriver(did);
      Toast.show('Driver approval revoked', 'success');
      setLastApproved(null);
    } catch (error: any) {
      Toast.show(error.message || 'Failed to revoke approval', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Driver Approval</h1>
        <p className="text-gray-500">Approve users as taxi drivers or delivery personnel (livreurs)</p>
      </div>

      {/* Approval Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Approve New Driver</h2>
        
        <form onSubmit={handleApprove} className="space-y-4">
          {/* DID Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User DID
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={didInput}
                onChange={(e) => setDidInput(e.target.value)}
                placeholder="did:plc:abc123..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter the AT Protocol DID of the user to approve as driver
            </p>
          </div>

          {/* Driver Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Driver Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setDriverRole('taxi')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  driverRole === 'taxi'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={isSubmitting}
              >
                <div className="flex flex-col items-center gap-2">
                  <Car className={`w-8 h-8 ${driverRole === 'taxi' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`font-medium ${driverRole === 'taxi' ? 'text-blue-900' : 'text-gray-700'}`}>
                    Taxi Driver
                  </span>
                  <span className="text-xs text-gray-500">Passenger rides</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDriverRole('delivery')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  driverRole === 'delivery'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={isSubmitting}
              >
                <div className="flex flex-col items-center gap-2">
                  <Truck className={`w-8 h-8 ${driverRole === 'delivery' ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={`font-medium ${driverRole === 'delivery' ? 'text-green-900' : 'text-gray-700'}`}>
                    Livreur
                  </span>
                  <span className="text-xs text-gray-500">Package delivery</span>
                </div>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !didInput.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            {isSubmitting ? 'Approving...' : 'Approve Driver'}
          </button>
        </form>
      </div>

      {/* Last Approved Driver */}
      {lastApproved && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recently Approved</h2>
            <button
              onClick={() => handleRevoke(lastApproved.user.did)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Revoke
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">DID</p>
              <p className="font-mono text-sm text-gray-900">{lastApproved.user.did}</p>
            </div>
            
            {lastApproved.profile?.handle && (
              <div>
                <p className="text-sm text-gray-500">Handle</p>
                <p className="text-gray-900">@{lastApproved.profile.handle}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500">Driver Type</p>
              <div className="flex items-center gap-2 mt-1">
                {lastApproved.user.driver_role === 'taxi' ? (
                  <>
                    <Car className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-900">Taxi Driver</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4 text-green-600" />
                    <span className="text-gray-900">Livreur (Delivery)</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Approved
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">How It Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Enter the user's AT Protocol DID (from their profile)</li>
          <li>• System fetches their profile from PLC Directory automatically</li>
          <li>• User will see driver mode toggle in their app immediately</li>
          <li>• Taxi drivers see car icon, livreurs see truck icon</li>
          <li>• Only approved drivers can go online and receive ride requests</li>
        </ul>
      </div>
    </div>
  );
}
