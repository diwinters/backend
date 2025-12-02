import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import { api } from '../lib/api';
import {
  Car,
  LogOut,
  Globe,
  ChevronDown,
  Users,
  Building2,
  Pill,
  Layers,
  DollarSign,
  Bug,
  UserPlus,
  CheckCircle,
  Map,
  Home,
  Search,
  Bell,
  Settings,
  Menu,
  X,
  Zap,
} from 'lucide-react';

// =============================================================================
// Navigation Items
// =============================================================================

interface NavItem {
  id: string;
  name: string;
  icon: ReactNode;
  path: string;
  badge?: number;
}

const primaryNav: NavItem[] = [
  { id: 'home', name: 'Overview', icon: <Home className="w-4 h-4" />, path: '/' },
  { id: 'map', name: 'Live Map', icon: <Map className="w-4 h-4" />, path: '/map' },
];

const ridesNav: NavItem[] = [
  { id: 'rides', name: 'All Rides', icon: <Car className="w-4 h-4" />, path: '/rides' },
  { id: 'drivers', name: 'Drivers', icon: <Users className="w-4 h-4" />, path: '/drivers' },
  { id: 'approval', name: 'Approvals', icon: <UserPlus className="w-4 h-4" />, path: '/drivers/approval' },
  { id: 'pricing', name: 'Pricing', icon: <DollarSign className="w-4 h-4" />, path: '/pricing' },
];

const staysNav: NavItem[] = [
  { id: 'stays', name: 'Providers', icon: <Building2 className="w-4 h-4" />, path: '/stays' },
  { id: 'posts', name: 'Posts', icon: <CheckCircle className="w-4 h-4" />, path: '/stay-posts' },
];

const commerceNav: NavItem[] = [
  { id: 'medicines', name: 'Pharmacy', icon: <Pill className="w-4 h-4" />, path: '/medicines' },
];

const contentNav: NavItem[] = [
  { id: 'pills', name: 'Map Pills', icon: <Layers className="w-4 h-4" />, path: '/map-pills' },
];

const platformNav: NavItem[] = [
  { id: 'cities', name: 'Cities', icon: <Globe className="w-4 h-4" />, path: '/cities' },
  { id: 'users', name: 'Users', icon: <Users className="w-4 h-4" />, path: '/users' },
  { id: 'debug', name: 'System', icon: <Bug className="w-4 h-4" />, path: '/debug' },
];

// =============================================================================
// Sidebar Component
// =============================================================================

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();
  const { currentCity, cities, setCurrentCity } = useCity();
  const [showCityPicker, setShowCityPicker] = useState(false);

  const NavSection = ({ title, items }: { title?: string; items: NavItem[] }) => (
    <div className="mb-6">
      {title && (
        <h3 className="px-3 mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={onClose}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}>
                {item.icon}
              </span>
              {item.name}
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

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
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-out
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">Raceef</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* City Selector */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <button
              onClick={() => setShowCityPicker(!showCityPicker)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: currentCity?.primary_color || '#6366f1' }}
              >
                {currentCity?.name?.[0] || 'C'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentCity?.name || 'Select City'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {currentCity?.country_code || 'No city selected'}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCityPicker ? 'rotate-180' : ''}`} />
            </button>

            {showCityPicker && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
                {cities.length > 0 ? cities.map(city => (
                  <button
                    key={city.id}
                    onClick={() => {
                      setCurrentCity(city);
                      setShowCityPicker(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                      currentCity?.id === city.id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div 
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: city.primary_color || '#6366f1' }}
                    >
                      {city.name[0]}
                    </div>
                    <span className={`text-sm ${currentCity?.id === city.id ? 'font-medium text-indigo-600' : 'text-gray-700'}`}>
                      {city.name}
                    </span>
                    {city.is_default && (
                      <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Default</span>
                    )}
                  </button>
                )) : (
                  <div className="px-3 py-4 text-center text-sm text-gray-500">
                    No cities configured
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <NavSection items={primaryNav} />
          <NavSection title="Rides" items={ridesNav} />
          <NavSection title="Stays" items={staysNav} />
          <NavSection title="Commerce" items={commerceNav} />
          <NavSection title="Content" items={contentNav} />
          <NavSection title="Platform" items={platformNav} />
        </nav>
      </aside>
    </>
  );
}

// =============================================================================
// Header Component
// =============================================================================

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
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

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview';
    if (path === '/map') return 'Live Map';
    if (path === '/rides') return 'Rides';
    if (path === '/drivers') return 'Drivers';
    if (path.includes('/approval')) return 'Driver Approvals';
    if (path === '/pricing') return 'Pricing';
    if (path === '/stays') return 'Stay Providers';
    if (path === '/stay-posts') return 'Stay Posts';
    if (path === '/medicines') return 'Pharmacy';
    if (path === '/map-pills') return 'Map Pills';
    if (path === '/cities') return 'Cities';
    if (path === '/users') return 'Users';
    if (path === '/debug') return 'System Debug';
    return 'Dashboard';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          systemStatus === 'online' 
            ? 'bg-green-50 text-green-700' 
            : 'bg-red-50 text-red-700'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${systemStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
          {systemStatus === 'online' ? 'System Online' : 'Offline'}
        </div>

        {/* Search */}
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg shadow-indigo-500/20">
              {admin?.name?.[0] || admin?.email?.[0] || 'A'}
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{admin?.name}</p>
                  <p className="text-xs text-gray-500">{admin?.email}</p>
                </div>
                <div className="py-1">
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-400" />
                    Settings
                  </button>
                </div>
                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// Window/Card Component for Pages
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
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
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
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
