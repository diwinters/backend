import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import { api } from '../lib/api';
import {
  Car,
  LogOut,
  Globe,
  Activity,
  Wifi,
  Battery,
  Volume2,
  Maximize2,
  Minus,
  X,
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
  Shield,
} from 'lucide-react';

// =============================================================================
// Status Bar (Top bar like macOS/Windows taskbar)
// =============================================================================

function StatusBar() {
  const { admin, logout } = useAuth();
  const { currentCity, cities, setCurrentCity } = useCity();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.getHealth();
        setSystemStatus(res.health);
      } catch (e) {
        setSystemStatus({ status: 'error' });
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="h-7 bg-black/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 text-white text-xs font-medium select-none fixed top-0 left-0 right-0 z-50">
      {/* Left - Logo & City */}
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-4 h-4 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-sm flex items-center justify-center">
            <Shield className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="font-bold tracking-wider text-cyan-400">RACEEF</span>
          <span className="text-white/40 font-light">COMMAND</span>
        </Link>
        
        <div className="h-3 w-px bg-white/20" />
        
        {/* City Selector */}
        <div className="relative">
          <button
            onClick={() => setShowCityDropdown(!showCityDropdown)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
          >
            <Globe className="w-3 h-3 text-cyan-400" />
            <span>{currentCity?.name || 'Select City'}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
          
          {showCityDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCityDropdown(false)} />
              <div className="absolute top-full left-0 mt-1 w-48 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 py-1 overflow-hidden">
                {cities.map(city => (
                  <button
                    key={city.id}
                    onClick={() => {
                      setCurrentCity(city);
                      setShowCityDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/10 transition-colors ${
                      currentCity?.id === city.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/80'
                    }`}
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: city.primary_color || '#3b82f6' }}
                    />
                    {city.name}
                    {city.is_default && (
                      <span className="ml-auto text-[10px] text-white/40">DEFAULT</span>
                    )}
                  </button>
                ))}
                {cities.length === 0 && (
                  <div className="px-3 py-2 text-white/40 text-xs">No cities configured</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center - Nothing or breadcrumb could go here */}
      <div className="flex-1" />

      {/* Right - System Status & User */}
      <div className="flex items-center gap-3">
        {/* System Status */}
        <div className="flex items-center gap-2 text-white/60">
          <div className="flex items-center gap-1">
            <Activity className={`w-3 h-3 ${systemStatus?.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`} />
            <span className="text-[10px] uppercase tracking-wider">
              {systemStatus?.status === 'healthy' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <Wifi className="w-3 h-3" />
          <Volume2 className="w-3 h-3" />
          <Battery className="w-3 h-3" />
        </div>

        <div className="h-3 w-px bg-white/20" />

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-white/80">
          <span>{formatDate(time)}</span>
          <span className="font-mono">{formatTime(time)}</span>
        </div>

        <div className="h-3 w-px bg-white/20" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
          >
            <div className="w-4 h-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">
              {admin?.name?.[0] || 'A'}
            </div>
            <span className="max-w-[80px] truncate">{admin?.name || admin?.email}</span>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute top-full right-0 mt-1 w-48 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 py-1 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-xs font-medium text-white">{admin?.name}</p>
                  <p className="text-[10px] text-white/40">{admin?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Dock (Bottom bar like macOS dock)
// =============================================================================

interface DockItem {
  id: string;
  name: string;
  icon: ReactNode;
  path: string;
  color: string;
  badge?: number;
}

const dockItems: DockItem[] = [
  { id: 'home', name: 'Command Center', icon: <Home className="w-6 h-6" />, path: '/', color: '#0ea5e9' },
  { id: 'map', name: 'Live Map', icon: <Map className="w-6 h-6" />, path: '/map', color: '#10b981' },
  { id: 'rides', name: 'Rides', icon: <Car className="w-6 h-6" />, path: '/rides', color: '#6366f1' },
  { id: 'drivers', name: 'Drivers', icon: <Users className="w-6 h-6" />, path: '/drivers', color: '#8b5cf6' },
  { id: 'approval', name: 'Approvals', icon: <UserPlus className="w-6 h-6" />, path: '/drivers/approval', color: '#f59e0b' },
  { id: 'pricing', name: 'Pricing', icon: <DollarSign className="w-6 h-6" />, path: '/pricing', color: '#22c55e' },
  { id: 'stays', name: 'Stays', icon: <Building2 className="w-6 h-6" />, path: '/stays', color: '#ec4899' },
  { id: 'posts', name: 'Stay Posts', icon: <CheckCircle className="w-6 h-6" />, path: '/stay-posts', color: '#14b8a6' },
  { id: 'medicines', name: 'Pharmacy', icon: <Pill className="w-6 h-6" />, path: '/medicines', color: '#ef4444' },
  { id: 'pills', name: 'Map Pills', icon: <Layers className="w-6 h-6" />, path: '/map-pills', color: '#f97316' },
  { id: 'cities', name: 'Cities', icon: <Globe className="w-6 h-6" />, path: '/cities', color: '#3b82f6' },
  { id: 'users', name: 'Users', icon: <Users className="w-6 h-6" />, path: '/users', color: '#64748b' },
  { id: 'debug', name: 'Debug', icon: <Bug className="w-6 h-6" />, path: '/debug', color: '#71717a' },
];

function Dock({ activePath }: { activePath: string }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-end gap-1 px-3 py-2 bg-black/80 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl">
        {dockItems.map((item) => {
          const isActive = activePath === item.path || 
            (item.path !== '/' && activePath.startsWith(item.path));
          
          return (
            <Link
              key={item.id}
              to={item.path}
              className="group relative flex flex-col items-center"
            >
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900/95 border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
                {item.name}
              </div>
              
              {/* Icon */}
              <div 
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive 
                    ? 'scale-110 shadow-lg shadow-black/50' 
                    : 'hover:scale-105 hover:-translate-y-1'
                }`}
                style={{ 
                  background: isActive 
                    ? `linear-gradient(135deg, ${item.color}, ${item.color}cc)`
                    : `linear-gradient(135deg, ${item.color}80, ${item.color}50)`
                }}
              >
                <div className="text-white drop-shadow">{item.icon}</div>
                
                {/* Badge */}
                {item.badge && item.badge > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </div>
              
              {/* Active indicator */}
              {isActive && (
                <div className="w-1 h-1 bg-white rounded-full mt-1" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Window Chrome (For pages that look like windows)
// =============================================================================

export function WindowChrome({ 
  title, 
  children,
  className = '',
  fullHeight = false,
}: { 
  title: string; 
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
}) {
  return (
    <div className={`bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl ${fullHeight ? 'h-full' : ''} ${className}`}>
      {/* Title bar */}
      <div className="h-9 bg-black/50 border-b border-white/10 flex items-center justify-between px-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 cursor-pointer transition-colors" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 cursor-pointer transition-colors" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 cursor-pointer transition-colors" />
          </div>
        </div>
        
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{title}</span>
        
        <div className="flex items-center gap-2 text-white/30">
          <Minus className="w-4 h-4 hover:text-white/60 cursor-pointer transition-colors" />
          <Maximize2 className="w-3.5 h-3.5 hover:text-white/60 cursor-pointer transition-colors" />
          <X className="w-4 h-4 hover:text-white/60 cursor-pointer transition-colors" />
        </div>
      </div>
      
      {/* Content */}
      <div className={`text-white ${fullHeight ? 'h-[calc(100%-36px)] overflow-auto' : ''}`}>
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// Main Layout
// =============================================================================

export default function LayoutV2({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: 'linear-gradient(135deg, rgba(0,10,20,0.97), rgba(0,5,15,0.99)), url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920")',
      }}
    >
      {/* Status Bar */}
      <StatusBar />

      {/* Main Content Area */}
      <main className="pb-24 pt-10 px-4 min-h-screen">
        {children}
      </main>

      {/* Dock */}
      <Dock activePath={location.pathname} />
    </div>
  );
}
