import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import OverviewPage from './pages/manager/OverviewPage';
import UsersPage from './pages/manager/UsersPage';
import CampaignsPage from './pages/manager/CampaignsPage';
import HriPage from './pages/manager/HriPage';
import ReportsPage from './pages/manager/ReportsPage';
import CollaboratorPage from './pages/collaborator/CollaboratorPage';
import SimulationPage from './pages/collaborator/SimulationPage';

function ProtectedRoute({ children, requireManager = false }: { children: React.ReactNode; requireManager?: boolean }) {
  const { user, isLoading, isManager } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Carregando AEGIS...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireManager && !isManager) return <Navigate to="/colaborador" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={user.role === 'COLLABORATOR' ? '/colaborador' : '/dashboard'} replace />} />
      
      {/* Manager Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute requireManager>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<OverviewPage />} />
        <Route path="colaboradores" element={<UsersPage />} />
        <Route path="campanhas" element={<CampaignsPage />} />
        <Route path="hri" element={<HriPage />} />
        <Route path="relatorios" element={<ReportsPage />} />
      </Route>

      {/* Collaborator Routes */}
      <Route path="/colaborador" element={
        <ProtectedRoute>
          <CollaboratorPage />
        </ProtectedRoute>
      } />
      
      <Route path="/simulacao/:campaignId" element={
        <ProtectedRoute>
          <SimulationPage />
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

