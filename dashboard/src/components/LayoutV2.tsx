import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';

// =============================================================================
// macOS-style Icons (SF Symbols inspired)
// =============================================================================

const Icons = {
  home: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  car: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
  users: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  building: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  ),
  pill: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-7.135 1.223c-1.052.18-2.137.18-3.19 0L2.666 20.313c-1.716-.293-2.298-2.379-1.066-3.611L3.002 15.3" />
    </svg>
  ),
  map: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  ),
  layers: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
    </svg>
  ),
  dollar: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  globe: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  check: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  userPlus: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  ),
  bug: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75V8.25m0 0l3-3m-3 3l-3-3m9.75 13.5A23.978 23.978 0 0112 18.75c-2.306 0-4.537.324-6.644.912M3.102 17.662A23.903 23.903 0 0012 15c3.073 0 6.023.575 8.726 1.62" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  menu: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  logout: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  ),
  sun: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ),
  moon: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
};

// =============================================================================
// Types & Navigation Config
// =============================================================================

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  badge?: number;
}

interface AppModule {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  color: string;
  path: string;
  items: NavItem[];
}

const modules: AppModule[] = [
  {
    id: 'rides',
    name: 'Rides',
    description: 'Transportation & drivers',
    icon: Icons.car,
    color: '#007aff',
    path: '/rides',
    items: [
      { id: 'all-rides', label: 'All Rides', icon: Icons.car, path: '/rides' },
      { id: 'drivers', label: 'Drivers', icon: Icons.users, path: '/drivers' },
      { id: 'approvals', label: 'Approvals', icon: Icons.userPlus, path: '/drivers/approval' },
      { id: 'pricing', label: 'Pricing', icon: Icons.dollar, path: '/pricing' },
      { id: 'live-map', label: 'Live Map', icon: Icons.map, path: '/map' },
    ],
  },
  {
    id: 'stays',
    name: 'Stays',
    description: 'Accommodation providers',
    icon: Icons.building,
    color: '#af52de',
    path: '/stays',
    items: [
      { id: 'providers', label: 'Providers', icon: Icons.building, path: '/stays' },
      { id: 'posts', label: 'Posts', icon: Icons.check, path: '/stay-posts' },
    ],
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    description: 'Medicine & health',
    icon: Icons.pill,
    color: '#ff3b30',
    path: '/medicines',
    items: [
      { id: 'medicines', label: 'Medicines', icon: Icons.pill, path: '/medicines' },
    ],
  },
  {
    id: 'content',
    name: 'Content',
    description: 'Map pins & content',
    icon: Icons.layers,
    color: '#ff9500',
    path: '/map-pills',
    items: [
      { id: 'map-pills', label: 'Map Pills', icon: Icons.layers, path: '/map-pills' },
    ],
  },
  {
    id: 'platform',
    name: 'Platform',
    description: 'System settings',
    icon: Icons.globe,
    color: '#5856d6',
    path: '/cities',
    items: [
      { id: 'cities', label: 'Cities', icon: Icons.globe, path: '/cities' },
      { id: 'users', label: 'Users', icon: Icons.users, path: '/users' },
      { id: 'debug', label: 'System', icon: Icons.bug, path: '/debug' },
    ],
  },
];

// =============================================================================
// macOS Window Chrome
// =============================================================================

function WindowTitleBar({ 
  title, 
  showBack,
  onBack,
}: { 
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}) {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <div className={`h-12 border-b flex items-center px-4 relative select-none transition-colors duration-200
      ${isDark 
        ? 'bg-gradient-to-b from-[#16162a] to-[#12121f] border-white/5' 
        : 'bg-gradient-to-b from-gray-100 to-gray-50 border-gray-200'
      }`}
    >
      {/* Traffic lights */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e14640] hover:brightness-110 cursor-pointer" />
        <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dfa123] hover:brightness-110 cursor-pointer" />
        <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29] hover:brightness-110 cursor-pointer" />
      </div>
      
      {/* Back button + Title */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {showBack && onBack && (
          <button 
            onClick={onBack}
            className="absolute left-20 flex items-center gap-1 text-[13px] text-blue-500 hover:text-blue-600 transition-colors"
          >
            {Icons.chevronLeft}
            <span>Back</span>
          </button>
        )}
        <span className={`text-[13px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{title}</span>
      </div>
      
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-lg transition-all duration-200 ${
          isDark 
            ? 'text-slate-400 hover:text-white hover:bg-white/10' 
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
        }`}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? Icons.sun : Icons.moon}
      </button>
    </div>
  );
}

// =============================================================================
// Sidebar
// =============================================================================

function Sidebar({ 
  isOpen, 
  onClose,
  activeModule,
  onModuleChange,
}: { 
  isOpen: boolean;
  onClose: () => void;
  activeModule: AppModule | null;
  onModuleChange: (module: AppModule | null) => void;
}) {
  const location = useLocation();
  const { currentCity, cities, setCurrentCity } = useCity();
  const { admin, logout } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline'>('offline');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await api.getHealth();
        setSystemStatus('online');
      } catch {
        setSystemStatus('offline');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-[260px] backdrop-blur-xl 
        border-r transition-colors duration-200
        transform transition-transform duration-300 ease-out
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
        ${isDark 
          ? 'bg-[#0f0f14]/95 border-white/5' 
          : 'bg-white/95 border-gray-200'
        }
      `}>
        {/* City Header */}
        <div className={`p-4 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
          <div className="relative">
            <button
              onClick={() => setShowCityDropdown(!showCityDropdown)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                isDark 
                  ? 'bg-white/5 hover:bg-white/10 border-white/5' 
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
              }`}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-md"
                style={{ backgroundColor: currentCity?.primary_color || '#007aff' }}
              >
                {currentCity?.name?.[0] || 'R'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className={`text-[15px] font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {currentCity?.name || 'Select City'}
                </p>
                <p className={`text-[12px] ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                  {currentCity?.country_code || 'No city selected'}
                </p>
              </div>
              <div className={`transition-transform ${isDark ? 'text-slate-400' : 'text-gray-400'} ${showCityDropdown ? 'rotate-180' : ''}`}>
                {Icons.chevronDown}
              </div>
            </button>

            {/* City Dropdown */}
            {showCityDropdown && (
              <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-xl z-50 py-2 max-h-64 overflow-y-auto ${
                isDark ? 'bg-[#1a1a2e] border-white/10' : 'bg-white border-gray-200'
              }`}>
                {cities.length > 0 ? cities.map(city => (
                  <button
                    key={city.id}
                    onClick={() => {
                      setCurrentCity(city);
                      setShowCityDropdown(false);
                      onModuleChange(null); // Go back to apps grid
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                    } ${currentCity?.id === city.id ? 'bg-blue-500/20' : ''}`}
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: city.primary_color || '#007aff' }}
                    >
                      {city.name[0]}
                    </div>
                    <span className={`text-[14px] ${currentCity?.id === city.id ? 'font-semibold text-blue-500' : (isDark ? 'text-white' : 'text-gray-900')}`}>
                      {city.name}
                    </span>
                    {city.is_default && (
                      <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full ${isDark ? 'text-slate-500 bg-white/5' : 'text-gray-500 bg-gray-100'}`}>
                        Default
                      </span>
                    )}
                  </button>
                )) : (
                  <div className="px-4 py-6 text-center">
                    <p className={`text-[13px] ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>No cities configured</p>
                    <Link 
                      to="/cities" 
                      className="text-[13px] text-blue-500 hover:underline mt-1 inline-block"
                      onClick={() => setShowCityDropdown(false)}
                    >
                      Add a city →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {activeModule ? (
            // Module-specific navigation
            <>
              <button
                onClick={() => onModuleChange(null)}
                className="flex items-center gap-2 px-3 py-2 mb-4 text-[13px] text-blue-500 hover:text-blue-600 transition-colors"
              >
                {Icons.chevronLeft}
                <span>All Apps</span>
              </button>
              
              <div className="mb-4">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                    style={{ backgroundColor: activeModule.color }}
                  >
                    {activeModule.icon}
                  </div>
                  <div>
                    <p className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeModule.name}</p>
                    <p className={`text-[12px] ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{activeModule.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                {activeModule.items.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all ${
                        isActive
                          ? 'bg-blue-500 text-white font-medium'
                          : isDark 
                            ? 'text-slate-300 hover:bg-white/5' 
                            : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className={isActive ? 'text-white' : (isDark ? 'text-slate-500' : 'text-gray-400')}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            // Apps grid
            <>
              {/* Home */}
              <Link
                to="/"
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all mb-4 ${
                  location.pathname === '/'
                    ? 'bg-blue-500 text-white font-medium'
                    : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className={location.pathname === '/' ? 'text-white' : (isDark ? 'text-slate-500' : 'text-gray-400')}>
                  {Icons.home}
                </span>
                Overview
              </Link>

              <div className="mb-3">
                <p className={`px-3 text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                  Apps
                </p>
              </div>

              <div className="space-y-1">
                {modules.map(mod => (
                  <button
                    key={mod.id}
                    onClick={() => onModuleChange(mod)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all group ${
                      isDark ? 'text-slate-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: mod.color }}
                    >
                      {mod.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{mod.name}</p>
                    </div>
                    <svg className={`w-4 h-4 ${isDark ? 'text-slate-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Bottom section */}
        <div className={`p-4 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
          {/* Status */}
          <div className={`flex items-center gap-2 px-3 py-2 mb-3 rounded-lg ${
            systemStatus === 'online' ? 'bg-emerald-500/10' : 'bg-red-500/10'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              systemStatus === 'online' ? 'bg-emerald-500' : 'bg-red-500'
            }`} />
            <span className={`text-[12px] font-medium ${
              systemStatus === 'online' ? 'text-emerald-500' : 'text-red-500'
            }`}>
              {systemStatus === 'online' ? 'System Online' : 'System Offline'}
            </span>
          </div>

          {/* User */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
              {admin?.name?.[0] || admin?.email?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{admin?.name || 'Admin'}</p>
              <p className={`text-[11px] truncate ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{admin?.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className={`p-2 transition-colors rounded-lg ${
                isDark 
                  ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' 
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title="Sign out"
            >
              {Icons.logout}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// =============================================================================
// Exported Components
// =============================================================================

export function Card({ 
  children,
  className = '',
  padding = true,
}: { 
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  const { isDark } = useTheme();
  return (
    <div className={`rounded-2xl border transition-colors duration-200 ${
      isDark 
        ? 'bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border-white/5' 
        : 'bg-white border-gray-200 shadow-sm'
    } ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ 
  title, 
  description,
  action,
}: { 
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const { isDark } = useTheme();
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className={`text-[17px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
        {description && <p className={`text-[13px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

// =============================================================================
// Main Layout
// =============================================================================

export default function LayoutV2({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<AppModule | null>(null);
  const location = useLocation();
  const { isDark } = useTheme();

  // Auto-detect active module from current path
  useEffect(() => {
    const currentModule = modules.find(mod => 
      mod.items.some(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
    );
    if (currentModule && activeModule?.id !== currentModule.id) {
      setActiveModule(currentModule);
    }
  }, [location.pathname]);

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Overview';
    
    for (const mod of modules) {
      for (const item of mod.items) {
        if (location.pathname === item.path || location.pathname.startsWith(item.path + '/')) {
          return `${mod.name} — ${item.label}`;
        }
      }
    }
    return 'Raceef Admin';
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-200 ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'}`}>
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Window Title Bar */}
        <WindowTitleBar 
          title={getPageTitle()}
          showBack={activeModule !== null && location.pathname !== '/'}
          onBack={() => setActiveModule(null)}
        />
        
        {/* Mobile menu button */}
        <div className={`lg:hidden flex items-center h-12 px-4 border-b ${
          isDark ? 'bg-[#0f0f14] border-white/5' : 'bg-white border-gray-200'
        }`}>
          <button 
            onClick={() => setSidebarOpen(true)}
            className={`p-2 -ml-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-slate-400 hover:text-white hover:bg-white/5' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {Icons.menu}
          </button>
        </div>
        
        {/* Main Content */}
        <main className={`flex-1 overflow-auto p-6 transition-colors duration-200 ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
