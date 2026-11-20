import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield, LayoutDashboard, Users, Target, TrendingUp,
  FileText, LogOut, Bell, Settings
} from 'lucide-react';
import { useState, useEffect } from 'react';

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; message: string; time: Date }>>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [newNotifCount, setNewNotifCount] = useState(0);

  useEffect(() => {
    // Connect to SSE for real-time events
    const token = localStorage.getItem('aegis_token');
    if (!token) return;

    const eventSource = new EventSource(`/api/sse/events`, {
      // Note: EventSource doesn't support custom headers,
      // so we append token as query param workaround via axios interceptor
    });

    // Use fetch-based SSE for auth
    const controller = new AbortController();
    
    const connectSSE = () => {
      fetch('/api/sse/events', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }).then(async (response) => {
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type && data.type !== 'CONNECTED') {
                  const message = getEventMessage(data);
                  if (message) {
                    setNotifications(prev => [
                      { id: data.id || Date.now().toString(), type: data.type, message, time: new Date() },
                      ...prev.slice(0, 19)
                    ]);
                    setNewNotifCount(prev => prev + 1);
                  }
                }
              } catch {}
            }
          }
        }
      }).catch(() => {});
    };

    connectSSE();
    eventSource.close();

    return () => {
      controller.abort();
    };
  }, []);

  function getEventMessage(data: { type: string; metadata?: Record<string, unknown> }): string | null {
    const meta = data.metadata || {};
    switch (data.type) {
      case 'CAMPAIGN_STARTED': return `Campanha "${meta.campaignName}" iniciada`;
      case 'CAMPAIGN_COMPLETED': return `Campanha "${meta.campaignName}" concluída`;
      case 'THREAT_REPORTED': return `Nova ameaça reportada`;
      case 'SIMULATION_CLICKED': return `Colaborador clicou em simulação`;
      case 'PILL_COMPLETED': return `Pílula educativa concluída`;
      case 'HRI_UPDATED': return `HRI atualizado`;
      default: return null;
    }
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-lg">AEGIS</span>
            <p className="text-slate-500 text-xs">SOC Dashboard</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Principal</p>
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Visão Geral" />
          <NavItem to="/dashboard/colaboradores" icon={Users} label="Colaboradores" />
          <NavItem to="/dashboard/campanhas" icon={Target} label="Campanhas" />
          
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-5">Governança</p>
          <NavItem to="/dashboard/hri" icon={TrendingUp} label="Risco Humano (HRI)" />
          <NavItem to="/dashboard/relatorios" icon={FileText} label="Relatórios" />
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-sm font-medium truncate">{user?.name}</p>
              <p className="text-slate-500 text-xs">{user?.role === 'MANAGER' ? 'Gestor / CISO' : 'Admin'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition-colors w-full px-2 py-1 rounded">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => { setShowNotif(!showNotif); setNewNotifCount(0); }}
                className="relative text-slate-400 hover:text-white transition-colors"
              >
                <Bell className="w-5 h-5" />
                {newNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {newNotifCount > 9 ? '9+' : newNotifCount}
                  </span>
                )}
              </button>
              
              {showNotif && (
                <div className="absolute right-0 top-8 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50">
                  <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">Eventos em Tempo Real</span>
                    <span className="text-xs text-slate-500">{notifications.length} eventos</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-6">Aguardando eventos...</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="px-3 py-2 border-b border-slate-800 hover:bg-slate-800/50">
                          <p className="text-slate-200 text-sm">{n.message}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{n.time.toLocaleTimeString('pt-BR')}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="text-slate-400 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

