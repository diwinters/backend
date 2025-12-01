import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface PricingConfig {
  id: number;
  city_slug: string;
  name: string;
  currency: string;
  timezone: string;
  is_active: boolean;
  config: any;
  updated_at: string;
}

export default function Pricing() {
  const [configs, setConfigs] = useState<PricingConfig[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (selectedCity && configs.length > 0) {
      const config = configs.find(c => c.city_slug === selectedCity);
      if (config) {
        setEditConfig(JSON.stringify(config.config, null, 2));
      }
    }
  }, [selectedCity, configs]);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPricingConfigs();
      setConfigs(data.configs);
      if (!selectedCity && data.configs.length > 0) {
        setSelectedCity(data.configs[0].city_slug);
      }
    } catch (err) {
      setError('Failed to fetch pricing configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCity) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate JSON
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(editConfig);
      } catch (e) {
        throw new Error('Invalid JSON format');
      }

      await api.updatePricingConfig(selectedCity, parsedConfig);
      
      setSuccess('Configuration saved successfully');
      // Update local state
      setConfigs(configs.map(c => 
        c.city_slug === selectedCity ? { ...c, config: parsedConfig } : c
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pricing Configuration</h1>
        <button
          onClick={fetchConfigs}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {configs.map((config) => (
              <button
                key={config.city_slug}
                onClick={() => setSelectedCity(config.city_slug)}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  selectedCity === config.city_slug
                    ? 'border-primary-600 text-primary-600 bg-primary-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {config.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              JSON Configuration
            </h2>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>

          <div className="relative">
            <textarea
              value={editConfig}
              onChange={(e) => setEditConfig(e.target.value)}
              className="w-full h-[600px] font-mono text-sm p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              spellCheck={false}
            />
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            <p>Tip: Be careful when editing JSON structure. Ensure all required fields are present.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
