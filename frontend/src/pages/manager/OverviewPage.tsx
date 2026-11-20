import { useEffect, useState } from 'react';
import api from '../../lib/api';
import {
  Users, Target, MousePointerClick, Flag, TrendingDown,
  Activity, Shield, AlertTriangle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Overview {
  users: { total: number; active: number };
  campaigns: { total: number; active: number; completed: number; list: Array<{ id: string; name: string; status: string }> };
  simulations: { total: number; clicked: number; reported: number; pillsCompleted: number; clickRate: string; reportRate: string; pillCompletionRate: string };
  recentEvents: Array<{ id: string; type: string; userId?: string; metadata?: Record<string, unknown>; createdAt: string }>;
}

interface BehaviorTrend {
  campaignId: string;
  campaignName: string;
  date: string;
  total: number;
  clicked: number;
  reported: number;
  clickRate: string;
  reportRate: string;
}

interface SectorData {
  id: string;
  name: string;
  userCount: number;
  avgHri: number;
  clickRate: string;
  reportRate: string;
}

const RISK_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MODERATE: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

const RISK_LABELS: Record<string, string> = {
  LOW: 'Baixo Risco',
  MODERATE: 'Moderado',
  HIGH: 'Alto Risco',
  CRITICAL: 'Crítico',
};

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-900/30',
    green: 'text-emerald-400 bg-emerald-900/30',
    red: 'text-red-400 bg-red-900/30',
    yellow: 'text-yellow-400 bg-yellow-900/30',
  };
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    CAMPAIGN_STARTED: { label: 'Campanha Iniciada', cls: 'text-blue-400 bg-blue-900/30' },
    CAMPAIGN_COMPLETED: { label: 'Campanha Concluída', cls: 'text-green-400 bg-green-900/30' },
    SIMULATION_CLICKED: { label: 'Clique Detectado', cls: 'text-red-400 bg-red-900/30' },
    SIMULATION_REPORTED: { label: 'Ameaça Reportada', cls: 'text-emerald-400 bg-emerald-900/30' },
    THREAT_REPORTED: { label: 'Ameaça Reportada', cls: 'text-emerald-400 bg-emerald-900/30' },
    PILL_COMPLETED: { label: 'Pílula Concluída', cls: 'text-purple-400 bg-purple-900/30' },
    POINTS_AWARDED: { label: 'Pontos Concedidos', cls: 'text-yellow-400 bg-yellow-900/30' },
    HRI_UPDATED: { label: 'HRI Atualizado', cls: 'text-indigo-400 bg-indigo-900/30' },
    USER_LOGIN: { label: 'Login', cls: 'text-slate-400 bg-slate-800' },
  };
  const item = map[type] || { label: type, cls: 'text-slate-400 bg-slate-800' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.cls}`}>{item.label}</span>
  );
}

export default function OverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trend, setTrend] = useState<BehaviorTrend[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = async () => {
    try {
      const [ov, tr, sec] = await Promise.all([
        api.get('/dashboard/overview'),
        api.get('/dashboard/behavior'),
        api.get('/dashboard/sectors'),
      ]);
      setOverview(ov.data);
      setTrend(tr.data);
      setSectors(sec.data);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Listen for SSE events to auto-refresh
    const handler = () => fetchData();
    window.addEventListener('aegis:event', handler);
    
    // Also poll every 30s as fallback
    const interval = setInterval(fetchData, 30000);
    return () => {
      window.removeEventListener('aegis:event', handler);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const ov = overview;
  
  // Pie chart data for risk distribution
  const riskDistribution = sectors.map(s => ({
    name: s.name,
    value: s.userCount,
    hri: s.avgHri,
    color: s.avgHri < 25 ? '#10b981' : s.avgHri < 50 ? '#f59e0b' : s.avgHri < 75 ? '#f97316' : '#ef4444',
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Painel SOC</h1>
          <p className="text-slate-400 text-sm mt-0.5">Governança Comportamental em Cibersegurança</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span>Tempo real</span>
          </div>
          <span className="text-slate-500 text-xs">Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}</span>
          <button onClick={fetchData} className="btn-secondary text-xs px-3 py-1.5">Atualizar</button>
        </div>
      </div>

      {/* Alert: active campaigns */}
      {ov && ov.campaigns.active > 0 && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4 flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <span className="text-blue-300 font-medium">{ov.campaigns.active} campanha(s) ativa(s)</span>
            <span className="text-slate-400 text-sm ml-2">— Monitoramento em andamento</span>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Colaboradores Ativos" value={ov?.users.active ?? 0} sub={`de ${ov?.users.total ?? 0} cadastrados`} color="blue" />
        <StatCard icon={Target} label="Campanhas" value={ov?.campaigns.total ?? 0} sub={`${ov?.campaigns.active ?? 0} ativas`} color="blue" />
        <StatCard icon={MousePointerClick} label="Taxa de Cliques" value={`${ov?.simulations.clickRate ?? 0}%`} sub={`${ov?.simulations.clicked ?? 0} de ${ov?.simulations.total ?? 0} simulações`} color="red" />
        <StatCard icon={Flag} label="Ameaças Reportadas" value={ov?.simulations.reported ?? 0} sub={`Taxa: ${ov?.simulations.reportRate ?? 0}%`} color="green" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Shield} label="Simulações Enviadas" value={ov?.simulations.total ?? 0} sub="Total acumulado" color="blue" />
        <StatCard icon={TrendingDown} label="Pílulas Concluídas" value={ov?.simulations.pillsCompleted ?? 0} sub={`${ov?.simulations.pillCompletionRate ?? 0}% dos que clicaram`} color="yellow" />
        <StatCard icon={Activity} label="Campanhas Concluídas" value={ov?.campaigns.completed ?? 0} sub="Histórico" color="green" />
        <StatCard icon={AlertTriangle} label="Campanhas em Rascunho" value={(ov?.campaigns.total ?? 0) - (ov?.campaigns.active ?? 0) - (ov?.campaigns.completed ?? 0)} sub="Aguardando início" color="yellow" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Behavior trend */}
        <div className="card lg:col-span-2">
          <h3 className="text-white font-semibold mb-4">Evolução Comportamental por Campanha</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="campaignName"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(v: string) => v.substring(0, 15)}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Line type="monotone" dataKey="clickRate" name="Taxa de Cliques %" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
              <Line type="monotone" dataKey="reportRate" name="Taxa de Reporte %" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Risk distribution by sector */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">HRI por Setor</h3>
          <div className="space-y-3">
            {sectors.slice(0, 6).map(s => {
              const risk = s.avgHri < 25 ? 'LOW' : s.avgHri < 50 ? 'MODERATE' : s.avgHri < 75 ? 'HIGH' : 'CRITICAL';
              const pct = s.avgHri;
              return (
                <div key={s.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{s.name}</span>
                    <span style={{ color: RISK_COLORS[risk] }} className="font-medium">{pct.toFixed(0)}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, pct)}%`, backgroundColor: RISK_COLORS[risk] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Click rate by department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Taxa de Cliques por Setor</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sectors} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
              />
              <Bar dataKey="clickRate" name="Taxa de Cliques %" fill="#ef4444" radius={[0, 4, 4, 0]} />
              <Bar dataKey="reportRate" name="Taxa de Reporte %" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent events */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Eventos Recentes</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {(ov?.recentEvents ?? []).slice(0, 15).map(ev => (
              <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                <EventTypeBadge type={ev.type} />
                <span className="text-slate-500 text-xs ml-auto shrink-0">
                  {format(new Date(ev.createdAt), 'HH:mm', { locale: ptBR })}
                </span>
              </div>
            ))}
            {(ov?.recentEvents ?? []).length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Nenhum evento recente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

