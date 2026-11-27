import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, Target, TrendingUp,
  FileText, LogOut, Bell, Settings, Flag, Menu, X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { API_BASE } from '../lib/api';

function NavItem({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; message: string; time: Date }>>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [newNotifCount, setNewNotifCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Connect to SSE for real-time events
    const token = localStorage.getItem('aegis_token');
    if (!token) return;

    let isSubscribed = true;
    let reconnectTimeout: any = null;
    let controller = new AbortController();

    const connectSSE = () => {
      if (!isSubscribed) return;

      fetch(`${API_BASE}/sse/events`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }).then(async (response) => {
        if (!response.ok || !response.body) {
          throw new Error('SSE connection failed');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (isSubscribed) {
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

                    // Notify pages to refresh data
                    window.dispatchEvent(new CustomEvent('aegis:event', { detail: data }));
                  }
                }
              } catch {}
            }
          }
        }
      }).catch((err) => {
        if (isSubscribed && err.name !== 'AbortError') {
          // Reconnect with backoff
          reconnectTimeout = setTimeout(connectSSE, 5000);
        }
      });
    };

    connectSSE();

    return () => {
      isSubscribed = false;
      clearTimeout(reconnectTimeout);
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

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="h-screen overflow-hidden bg-slate-950 flex">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-30 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="shrink-0 flex items-center justify-between gap-3 p-5 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/aegis.png"
              alt="AEGIS"
              className="w-9 h-9 object-contain shrink-0"
            />
            <div className="min-w-0">
              <span className="text-white font-bold text-lg leading-tight block">AEGIS</span>
              <p className="text-slate-500 text-xs truncate">SOC Dashboard</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation (independently scrollable if viewport is short) */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Principal</p>
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Visão Geral" onClick={closeMobileMenu} />
          <NavItem to="/dashboard/colaboradores" icon={Users} label="Colaboradores" onClick={closeMobileMenu} />
          <NavItem to="/dashboard/campanhas" icon={Target} label="Campanhas" onClick={closeMobileMenu} />
          <NavItem to="/dashboard/denuncias" icon={Flag} label="Denúncias" onClick={closeMobileMenu} />
          
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-5">Governança</p>
          <NavItem to="/dashboard/hri" icon={TrendingUp} label="Risco Humano (HRI)" onClick={closeMobileMenu} />
          <NavItem to="/dashboard/relatorios" icon={FileText} label="Relatórios" onClick={closeMobileMenu} />
        </nav>

        {/* User info & Logout anchored at bottom */}
        <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-sm font-medium truncate">{user?.name}</p>
              <p className="text-slate-500 text-xs">{user?.role === 'MANAGER' ? 'Gestor / CISO' : 'Admin'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/70 text-sm transition-colors w-full px-2.5 py-2 rounded-lg"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-slate-400 text-sm truncate">
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

