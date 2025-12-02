import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/rides" element={<Rides />} />
                <Route path="/rides/:id" element={<RideDetail />} />
                <Route path="/drivers" element={<Drivers />} />
                <Route path="/drivers/approval" element={<DriversApproval />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/stays" element={<Stays />} />
                <Route path="/stay-posts" element={<StayPostsApproval />} />
                <Route path="/medicines" element={<Medicines />} />
                <Route path="/map" element={<LiveMap />} />
                <Route path="/users" element={<Users />} />
                <Route path="/debug" element={<Debug />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
