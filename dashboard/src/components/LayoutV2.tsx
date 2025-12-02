import { ReactNode, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import {
  Car,
  Users,
  MapPin,
  Bug,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  UserPlus,
  DollarSign,
  Map,
  Building2,
  CheckCircle,
  Pill,
  Layers,
  Globe,
  Settings,
  Home,
  ShoppingBag,
  MapPinned,
  Activity,
} from 'lucide-react';

// =============================================================================
// Module-Based Navigation Structure
// =============================================================================

interface NavModule {
  id: string;
  name: string;
  icon: ReactNode;
  color: string;
  items: NavItem[];
  requiresModule?: string; // Module key from city.modules
}

interface NavItem {
  name: string;
  path: string;
  icon: ReactNode;
  badge?: number;
}

const navModules: NavModule[] = [
  {
    id: 'rides',
    name: 'Rides',
    icon: <Car className="w-5 h-5" />,
    color: 'bg-blue-500',
    requiresModule: 'rides',
    items: [
      { name: 'Live Map', path: '/rides/map', icon: <Map className="w-4 h-4" /> },
      { name: 'All Rides', path: '/rides', icon: <MapPin className="w-4 h-4" /> },
      { name: 'Drivers', path: '/rides/drivers', icon: <Car className="w-4 h-4" /> },
      { name: 'Approvals', path: '/rides/approvals', icon: <UserPlus className="w-4 h-4" /> },
      { name: 'Pricing', path: '/rides/pricing', icon: <DollarSign className="w-4 h-4" /> },
    ],
  },
  {
    id: 'stays',
    name: 'Stays',
    icon: <Building2 className="w-5 h-5" />,
    color: 'bg-purple-500',
    requiresModule: 'stays',
    items: [
      { name: 'Providers', path: '/stays', icon: <Building2 className="w-4 h-4" /> },
      { name: 'Post Approvals', path: '/stays/posts', icon: <CheckCircle className="w-4 h-4" /> },
    ],
  },
  {
    id: 'commerce',
    name: 'Commerce',
    icon: <ShoppingBag className="w-5 h-5" />,
    color: 'bg-green-500',
    items: [
      { name: 'Pharmacy', path: '/commerce/pharmacy', icon: <Pill className="w-4 h-4" /> },
      { name: 'Shop', path: '/commerce/shop', icon: <ShoppingBag className="w-4 h-4" /> },
    ],
  },
  {
    id: 'content',
    name: 'Content',
    icon: <MapPinned className="w-5 h-5" />,
    color: 'bg-orange-500',
    requiresModule: 'content',
    items: [
      { name: 'Map Pills', path: '/content/pills', icon: <Layers className="w-4 h-4" /> },
    ],
  },
  {
    id: 'platform',
    name: 'Platform',
    icon: <Globe className="w-5 h-5" />,
    color: 'bg-gray-600',
    items: [
      { name: 'Cities', path: '/platform/cities', icon: <Globe className="w-4 h-4" /> },
      { name: 'Users', path: '/platform/users', icon: <Users className="w-4 h-4" /> },
      { name: 'Debug', path: '/platform/debug', icon: <Bug className="w-4 h-4" /> },
    ],
  },
];

// =============================================================================
// City Selector Component
// =============================================================================

function CitySelector() {
  const { cities, currentCity, setCurrentCity, isLoading } = useCity();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors w-full"
      >
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: currentCity?.primary_color || '#3B82F6' }}
        >
          {currentCity?.name?.[0] || '?'}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-900">{currentCity?.name || 'Select City'}</p>
          <p className="text-xs text-gray-500">{currentCity?.country_code || ''}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-64 overflow-y-auto">
            {cities.map((city) => (
              <button
                key={city.id}
                onClick={() => {
                  setCurrentCity(city);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                  currentCity?.id === city.id ? 'bg-primary-50' : ''
                }`}
              >
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: city.primary_color || '#3B82F6' }}
                >
                  {city.name[0]}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">{city.name}</p>
                </div>
                {!city.is_active && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                    Inactive
                  </span>
                )}
                {currentCity?.id === city.id && (
                  <CheckCircle className="w-4 h-4 text-primary-600" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Module Nav Item Component
// =============================================================================

function ModuleNavSection({ module, isExpanded, onToggle }: { 
  module: NavModule; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const location = useLocation();
  const { currentCity } = useCity();
  
  // Check if module is enabled for current city
  const isModuleEnabled = useMemo(() => {
    if (!module.requiresModule) return true;
    if (!currentCity?.modules) return true;
    const moduleConfig = currentCity.modules[module.requiresModule as keyof typeof currentCity.modules];
    return moduleConfig?.enabled ?? true;
  }, [currentCity, module.requiresModule]);

  // Check if any item in this module is active
  const isModuleActive = module.items.some(
    item => location.pathname === item.path || location.pathname.startsWith(item.path + '/')
  );

  if (!isModuleEnabled) {
    return null;
  }

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isModuleActive
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <div className={`w-7 h-7 rounded-lg ${module.color} flex items-center justify-center text-white`}>
          {module.icon}
        </div>
        <span className="flex-1 text-left">{module.name}</span>
        <ChevronRight 
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
        />
      </button>

      {isExpanded && (
        <div className="ml-10 mt-1 space-y-0.5">
          {module.items.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {item.icon}
                {item.name}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Layout Component
// =============================================================================

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();
  const { currentCity } = useCity();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>(['rides']);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Determine current page title
  const currentPageTitle = useMemo(() => {
    for (const module of navModules) {
      for (const item of module.items) {
        if (location.pathname === item.path || location.pathname.startsWith(item.path + '/')) {
          return item.name;
        }
      }
    }
    if (location.pathname === '/') return 'Dashboard';
    return '';
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">Raceef</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 -mt-0.5">Operations</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* City Selector */}
        <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <CitySelector />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {/* Home/Dashboard Link */}
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2 ${
              location.pathname === '/'
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white">
              <Home className="w-4 h-4" />
            </div>
            Dashboard
          </Link>

          <div className="h-px bg-gray-100 dark:bg-gray-700 my-3" />

          {/* Module Navigation */}
          {navModules.map((module) => (
            <ModuleNavSection
              key={module.id}
              module={module}
              isExpanded={expandedModules.includes(module.id)}
              onToggle={() => toggleModule(module.id)}
            />
          ))}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center">
              <span className="text-primary-700 dark:text-primary-400 font-semibold">
                {admin?.name?.[0] || admin?.email?.[0] || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {admin?.name || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {admin?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {/* Breadcrumb / Page Title */}
              <div className="flex items-center gap-2">
                {currentCity && (
                  <>
                    <span className="text-sm text-gray-400 dark:text-gray-500">{currentCity.name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  </>
                )}
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentPageTitle}
                </h1>
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Quick city indicator (mobile) */}
              <div className="lg:hidden flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div 
                  className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: currentCity?.primary_color || '#3B82F6' }}
                >
                  {currentCity?.name?.[0] || '?'}
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {currentCity?.name}
                </span>
              </div>

              {/* Settings */}
              <Link
                to="/settings"
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
