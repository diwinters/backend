import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CityProvider } from './contexts/CityContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LayoutV2 from './components/LayoutV2';
import Login from './pages/Login';
import DashboardHome from './pages/DashboardHome';
import Rides from './pages/Rides';
import RideDetail from './pages/RideDetail';
import Drivers from './pages/Drivers';
import DriversApproval from './pages/DriversApproval';
import Users from './pages/Users';
import Debug from './pages/Debug';
import Pricing from './pages/Pricing';
import LiveMap from './pages/LiveMap';
import Stays from './pages/Stays';
import StayPostsApproval from './pages/StayPostsApproval';
import Medicines from './pages/Medicines';
import MapPills from './pages/MapPills';
import Cities from './pages/Cities';
import Feeds from './pages/Feeds';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { admin } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={admin ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <CityProvider>
              <LayoutV2>
                <Routes>
                  <Route path="/" element={<DashboardHome />} />
                  <Route path="/rides" element={<Rides />} />
                  <Route path="/rides/:id" element={<RideDetail />} />
                  <Route path="/drivers" element={<Drivers />} />
                  <Route path="/drivers/approval" element={<DriversApproval />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/stays" element={<Stays />} />
                  <Route path="/stay-posts" element={<StayPostsApproval />} />
                  <Route path="/medicines" element={<Medicines />} />
                  <Route path="/map-pills" element={<MapPills />} />
                  <Route path="/map" element={<LiveMap />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/cities" element={<Cities />} />
                  <Route path="/feeds" element={<Feeds />} />
                  <Route path="/debug" element={<Debug />} />
                </Routes>
              </LayoutV2>
            </CityProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
