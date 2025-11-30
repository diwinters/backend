import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RefreshCw, Navigation, User } from 'lucide-react';

interface DriverLocation {
  did: string;
  location: {
    lat: number;
    lng: number;
    heading: number;
    speed: number;
  };
  name: string;
  avatar: string | null;
  role: string;
  lastUpdate: string;
}

export default function LiveMap() {
  const { token } = useAuth();
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDrivers = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/admin/drivers/locations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setDrivers(data.drivers);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch driver locations', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    intervalRef.current = setInterval(fetchDrivers, 10000); // Poll every 10s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Driver Map</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time positions of {drivers.length} online drivers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={() => {
              setIsLoading(true);
              fetchDrivers();
            }}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Driver List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-medium text-gray-900">Online Drivers</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {drivers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No drivers online
              </div>
            ) : (
              drivers.map((driver) => (
                <div key={driver.did} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                      {driver.avatar ? (
                        <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {driver.name || 'Unknown Driver'}
                        </p>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          driver.role === 'taxi' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {driver.role || 'taxi'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {driver.location.speed ? `${Math.round(driver.location.speed * 3.6)} km/h` : 'Stopped'}
                        </span>
                        <span>
                          {new Date(driver.lastUpdate).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-mono text-gray-400 truncate">
                        {driver.location.lat.toFixed(5)}, {driver.location.lng.toFixed(5)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Placeholder (SVG Visualization) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4 min-h-[600px] relative overflow-hidden bg-slate-50">
            {/* Simple coordinate visualization */}
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                <div className="text-center">
                    <p>Map Visualization</p>
                    <p className="text-xs">(Install react-map-gl for full map)</p>
                </div>
            </div>
            
            {/* Render points relative to a center (Dakhla approx) */}
            {drivers.map((driver) => {
                // Simple projection for demo: Center on Dakhla (23.7, -15.9)
                // Scale: 1 degree = ~1000px
                const centerX = 23.718;
                const centerY = -15.932;
                const scale = 5000;
                
                const x = (driver.location.lng - centerY) * scale + 400; // Offset to center
                const y = -(driver.location.lat - centerX) * scale + 300;

                return (
                    <div 
                        key={driver.did}
                        className="absolute w-4 h-4 bg-primary-600 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000"
                        style={{ left: `${x}px`, top: `${y}px` }}
                        title={driver.name}
                    >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            {driver.name}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}
