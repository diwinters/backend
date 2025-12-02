import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

export interface City {
  id: number;
  slug: string;
  name: string;
  name_ar: string | null;
  country_code: string;
  timezone: string;
  currency: string;
  center_lat: number;
  center_lng: number;
  default_zoom: number;
  boundary: any;
  modules: {
    rides: { enabled: boolean; settings: any };
    stays: { enabled: boolean; settings: any };
    shop: { enabled: boolean; settings: any };
    pharmacy: { enabled: boolean; settings: any };
    content: { enabled: boolean; settings: any };
  };
  settings: any;
  cover_image_url: string | null;
  icon_url: string | null;
  primary_color: string;
  is_active: boolean;
  is_default: boolean;
  is_coming_soon: boolean;
  launch_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CityContextType {
  cities: City[];
  currentCity: City | null;
  isLoading: boolean;
  error: string | null;
  setCurrentCity: (city: City) => void;
  refreshCities: () => Promise<void>;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

const CITY_STORAGE_KEY = 'dashboard_current_city';

export function CityProvider({ children }: { children: ReactNode }) {
  const [cities, setCities] = useState<City[]>([]);
  const [currentCity, setCurrentCityState] = useState<City | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getCitiesAdmin();
      setCities(response.cities);

      // Restore saved city or use default
      const savedCitySlug = localStorage.getItem(CITY_STORAGE_KEY);
      let cityToSelect: City | null = null;

      if (savedCitySlug) {
        cityToSelect = response.cities.find((c: City) => c.slug === savedCitySlug) || null;
      }

      if (!cityToSelect) {
        cityToSelect = response.cities.find((c: City) => c.is_default) || response.cities[0] || null;
      }

      setCurrentCityState(cityToSelect);
    } catch (err) {
      console.error('Failed to fetch cities:', err);
      setError('Failed to load cities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const setCurrentCity = (city: City) => {
    setCurrentCityState(city);
    localStorage.setItem(CITY_STORAGE_KEY, city.slug);
  };

  const refreshCities = async () => {
    await fetchCities();
  };

  return (
    <CityContext.Provider
      value={{
        cities,
        currentCity,
        isLoading,
        error,
        setCurrentCity,
        refreshCities,
      }}
    >
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
}
