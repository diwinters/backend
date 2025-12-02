import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useCity, City } from '../contexts/CityContext';
import {
  Globe,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  CheckCircle,
  Car,
  Building2,
  ShoppingBag,
  Pill,
  Layers,
  Clock,
  Save,
  X,
} from 'lucide-react';

// Extended City interface for list display with stats
interface CityWithStats extends City {
  stays_count?: number;
  pills_count?: number;
  pricing_count?: number;
}

// =============================================================================
// Module Toggle Component
// =============================================================================

function ModuleToggle({
  label,
  icon,
  enabled,
  onChange,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  color: string;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
        enabled
          ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20`
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        enabled ? `bg-${color}-500 text-white` : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
      }`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className={`text-sm font-medium ${enabled ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
          {label}
        </p>
        <p className="text-xs text-gray-400">{enabled ? 'Enabled' : 'Disabled'}</p>
      </div>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
        enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}>
        {enabled && <CheckCircle className="w-3 h-3 text-white" />}
      </div>
    </button>
  );
}

// =============================================================================
// City Card Component
// =============================================================================

function CityCard({
  city,
  onEdit,
  onDelete,
}: {
  city: CityWithStats;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const enabledModules = Object.entries(city.modules || {})
    .filter(([_, config]) => config?.enabled)
    .map(([key]) => key);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header with color */}
      <div 
        className="h-24 relative"
        style={{ backgroundColor: city.primary_color || '#3B82F6' }}
      >
        {city.cover_image_url && (
          <img 
            src={city.cover_image_url} 
            alt={city.name}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Status badges */}
        <div className="absolute top-3 right-3 flex gap-2">
          {city.is_default && (
            <span className="px-2 py-1 bg-white/90 text-gray-900 text-xs font-medium rounded-full">
              Default
            </span>
          )}
          {!city.is_active && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
              Inactive
            </span>
          )}
          {city.is_coming_soon && (
            <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full">
              Coming Soon
            </span>
          )}
        </div>

        {/* City icon */}
        <div className="absolute -bottom-6 left-4">
          <div 
            className="w-14 h-14 rounded-xl bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-2xl font-bold"
            style={{ color: city.primary_color || '#3B82F6' }}
          >
            {city.name[0]}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-8 px-4 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {city.name}
            </h3>
            {city.name_ar && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{city.name_ar}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-primary-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {!city.is_default && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {city.country_code}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {city.timezone.split('/')[1] || city.timezone}
          </span>
          <span>{city.currency}</span>
        </div>

        {/* Enabled modules */}
        <div className="flex flex-wrap gap-2 mb-4">
          {enabledModules.map((mod) => (
            <span
              key={mod}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full capitalize"
            >
              {mod}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{city.stays_count || 0}</p>
            <p className="text-xs text-gray-500">Stays</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{city.pills_count || 0}</p>
            <p className="text-xs text-gray-500">Pills</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{city.pricing_count || 0}</p>
            <p className="text-xs text-gray-500">Pricing</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// City Form Modal
// =============================================================================

function CityFormModal({
  city,
  onClose,
  onSave,
}: {
  city: CityWithStats | null;
  onClose: () => void;
  onSave: (data: Partial<City>) => Promise<void>;
}) {
  const [formData, setFormData] = useState<Partial<City>>({
    slug: city?.slug || '',
    name: city?.name || '',
    name_ar: city?.name_ar || '',
    country_code: city?.country_code || 'MA',
    timezone: city?.timezone || 'Africa/Casablanca',
    currency: city?.currency || 'DH',
    center_lat: city?.center_lat || 0,
    center_lng: city?.center_lng || 0,
    default_zoom: city?.default_zoom || 13,
    primary_color: city?.primary_color || '#3B82F6',
    is_active: city?.is_active ?? false,
    is_default: city?.is_default ?? false,
    is_coming_soon: city?.is_coming_soon ?? false,
    modules: city?.modules || {
      rides: { enabled: true, settings: {} },
      stays: { enabled: true, settings: {} },
      shop: { enabled: false, settings: {} },
      pharmacy: { enabled: false, settings: {} },
      content: { enabled: true, settings: {} },
    },
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const updateModule = (module: string, enabled: boolean) => {
    const currentModules = formData.modules || {
      rides: { enabled: false, settings: {} },
      stays: { enabled: false, settings: {} },
      shop: { enabled: false, settings: {} },
      pharmacy: { enabled: false, settings: {} },
      content: { enabled: false, settings: {} },
    };
    const moduleKey = module as keyof typeof currentModules;
    const currentModule = currentModules[moduleKey] || { enabled: false, settings: {} };
    
    setFormData({
      ...formData,
      modules: {
        ...currentModules,
        [module]: { ...currentModule, enabled },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {city ? 'Edit City' : 'Add City'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                City Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="e.g., dakhla"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={!!city}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Primary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-12 h-10 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name (English) *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Dakhla"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name (Arabic)
              </label>
              <input
                type="text"
                value={formData.name_ar || ''}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="الداخلة"
                dir="rtl"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country
              </label>
              <input
                type="text"
                value={formData.country_code}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase().slice(0, 2) })}
                placeholder="MA"
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency
              </label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                placeholder="DH"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timezone
              </label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                placeholder="Africa/Casablanca"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Center Latitude *
              </label>
              <input
                type="number"
                step="any"
                value={formData.center_lat}
                onChange={(e) => setFormData({ ...formData, center_lat: parseFloat(e.target.value) })}
                placeholder="23.7221"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Center Longitude *
              </label>
              <input
                type="number"
                step="any"
                value={formData.center_lng}
                onChange={(e) => setFormData({ ...formData, center_lng: parseFloat(e.target.value) })}
                placeholder="-15.9347"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Zoom
              </label>
              <input
                type="number"
                value={formData.default_zoom}
                onChange={(e) => setFormData({ ...formData, default_zoom: parseInt(e.target.value) })}
                min={1}
                max={20}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Modules */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Enabled Modules
            </label>
            <div className="grid grid-cols-2 gap-3">
              <ModuleToggle
                label="Rides"
                icon={<Car className="w-5 h-5" />}
                enabled={formData.modules?.rides?.enabled ?? true}
                onChange={(enabled) => updateModule('rides', enabled)}
                color="blue"
              />
              <ModuleToggle
                label="Stays"
                icon={<Building2 className="w-5 h-5" />}
                enabled={formData.modules?.stays?.enabled ?? true}
                onChange={(enabled) => updateModule('stays', enabled)}
                color="purple"
              />
              <ModuleToggle
                label="Shop"
                icon={<ShoppingBag className="w-5 h-5" />}
                enabled={formData.modules?.shop?.enabled ?? false}
                onChange={(enabled) => updateModule('shop', enabled)}
                color="green"
              />
              <ModuleToggle
                label="Pharmacy"
                icon={<Pill className="w-5 h-5" />}
                enabled={formData.modules?.pharmacy?.enabled ?? false}
                onChange={(enabled) => updateModule('pharmacy', enabled)}
                color="red"
              />
              <ModuleToggle
                label="Content"
                icon={<Layers className="w-5 h-5" />}
                enabled={formData.modules?.content?.enabled ?? true}
                onChange={(enabled) => updateModule('content', enabled)}
                color="orange"
              />
            </div>
          </div>

          {/* Status flags */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Default City</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_coming_soon}
                onChange={(e) => setFormData({ ...formData, is_coming_soon: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Coming Soon</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {city ? 'Save Changes' : 'Create City'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Main Cities Page
// =============================================================================

export default function Cities() {
  const { refreshCities } = useCity();
  const [cities, setCities] = useState<CityWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCity, setEditingCity] = useState<CityWithStats | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchCities = async () => {
    try {
      setIsLoading(true);
      const response = await api.getCitiesAdmin();
      setCities(response.cities);
    } catch (error) {
      console.error('Failed to fetch cities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const handleSaveCity = async (data: Partial<City>) => {
    try {
      if (editingCity) {
        await api.updateCity(editingCity.id, data);
      } else {
        await api.createCity(data as any);
      }
      await fetchCities();
      await refreshCities();
      setEditingCity(null);
      setShowAddModal(false);
    } catch (error: any) {
      alert(error.message || 'Failed to save city');
    }
  };

  const handleDeleteCity = async (city: CityWithStats) => {
    if (!confirm(`Are you sure you want to delete ${city.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteCity(city.id);
      await fetchCities();
      await refreshCities();
    } catch (error: any) {
      alert(error.message || 'Failed to delete city');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cities</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage operational cities and their configurations
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add City
        </button>
      </div>

      {/* Cities Grid */}
      {cities.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No cities yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by adding your first city</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add City
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cities.map((city) => (
            <CityCard
              key={city.id}
              city={city}
              onEdit={() => setEditingCity(city)}
              onDelete={() => handleDeleteCity(city)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {(showAddModal || editingCity) && (
        <CityFormModal
          city={editingCity}
          onClose={() => {
            setEditingCity(null);
            setShowAddModal(false);
          }}
          onSave={handleSaveCity}
        />
      )}
    </div>
  );
}
