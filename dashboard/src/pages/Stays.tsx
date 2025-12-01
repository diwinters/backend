import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Building2,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Stay {
  id: number;
  did: string;
  name: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Stays() {
  const [stays, setStays] = useState<Stay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add stay form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDid, setNewDid] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchStays = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getStays();
      setStays(response.stays);
    } catch (err) {
      console.error('Failed to fetch stays:', err);
      setError('Failed to load stay providers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStays();
  }, []);

  const handleAddStay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDid.trim()) return;
    
    setIsAdding(true);
    setAddError(null);
    try {
      await api.addStay(newDid.trim(), newName.trim() || undefined, newDescription.trim() || undefined);
      setNewDid('');
      setNewName('');
      setNewDescription('');
      setShowAddForm(false);
      fetchStays();
    } catch (err: any) {
      console.error('Failed to add stay:', err);
      setAddError(err.message || 'Failed to add stay provider');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleStay = async (id: number) => {
    try {
      await api.toggleStay(id);
      fetchStays();
    } catch (err) {
      console.error('Failed to toggle stay:', err);
    }
  };

  const handleDeleteStay = async (id: number, name: string | null) => {
    if (!confirm(`Are you sure you want to delete "${name || 'this stay provider'}"?`)) return;
    
    try {
      await api.deleteStay(id);
      fetchStays();
    } catch (err) {
      console.error('Failed to delete stay:', err);
    }
  };

  const filteredStays = stays.filter(stay => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      stay.did.toLowerCase().includes(query) ||
      stay.name?.toLowerCase().includes(query) ||
      stay.description?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stay Providers</h1>
          <p className="text-gray-500">Manage users who can post accommodations in the Stay section</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStays}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Stay Provider
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by DID, name, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Add Stay Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Stay Provider</h2>
            <form onSubmit={handleAddStay} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newDid}
                  onChange={(e) => setNewDid(e.target.value)}
                  placeholder="did:plc:..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Hotel name or owner name"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to auto-fetch from profile
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional notes about this stay provider"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              {addError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {addError}
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddError(null);
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !newDid.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isAdding ? 'Adding...' : 'Add Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Building2 className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stays.length}</p>
              <p className="text-sm text-gray-500">Total Providers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stays.filter(s => s.is_active).length}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <XCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stays.filter(s => !s.is_active).length}
              </p>
              <p className="text-sm text-gray-500">Inactive</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stays List */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-500 mt-3">Loading stay providers...</p>
          </div>
        ) : filteredStays.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchQuery ? 'No stay providers match your search' : 'No stay providers added yet'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Provider</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">DID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Added</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStays.map((stay) => (
                <tr key={stay.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{stay.name || 'Unnamed'}</p>
                      {stay.description && (
                        <p className="text-sm text-gray-500 truncate max-w-xs">{stay.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {stay.did.length > 30 ? `${stay.did.slice(0, 15)}...${stay.did.slice(-10)}` : stay.did}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      stay.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        stay.is_active ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      {stay.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDistanceToNow(new Date(stay.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleStay(stay.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          stay.is_active 
                            ? 'text-green-600 hover:bg-green-50' 
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={stay.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {stay.is_active ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteStay(stay.id, stay.name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
