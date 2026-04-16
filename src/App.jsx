import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import RoomsPage from './pages/Rooms';
import ProductsPage from './pages/Products';
import UsersPage from './pages/Users';
import ReportsPage from './pages/Reports';
import SessionHistoryPage from './pages/SessionHistory';
import SettingsPage from './pages/Settings';
import useAuthStore from './stores/authStore';

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<ProtectedRoute roles={['SUPER_ADMIN', 'MANAGER']}><DashboardPage /></ProtectedRoute>} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/users" element={<ProtectedRoute roles={['SUPER_ADMIN', 'MANAGER']}><UsersPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['SUPER_ADMIN', 'MANAGER', 'STAFF']}><ReportsPage /></ProtectedRoute>} />
        <Route path="/session-history" element={<ProtectedRoute roles={['SUPER_ADMIN', 'MANAGER']}><SessionHistoryPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute roles={['SUPER_ADMIN', 'MANAGER']}><SettingsPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  );
}
