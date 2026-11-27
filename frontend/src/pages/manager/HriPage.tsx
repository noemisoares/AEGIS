import { useEffect, useState } from 'react';
import api from '../../lib/api';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell
} from 'recharts';
import { RefreshCw, BarChart3 } from 'lucide-react';

interface DepartmentHri {
  id: string;
  name: string;
  userCount: number;
  avgHri: number;
  riskLevel: string;
  history: Array<{ avgScore: number; calculatedAt: string; riskLevel: string }>;
  distribution: { low: number; moderate: number; high: number; critical: number };
}

const RISK_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MODERATE: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

const RISK_LABELS: Record<string, string> = {
  LOW: 'Baixo Risco',
  MODERATE: 'Risco Moderado',
  HIGH: 'Alto Risco',
  CRITICAL: 'Risco Crítico',
};

function HriGauge({ score, risk }: { score: number; risk: string }) {
  const color = RISK_COLORS[risk] || '#6b7280';
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-bold" style={{ color }}>{score.toFixed(0)}</p>
        <p className="text-xs text-slate-500">HRI</p>
      </div>
    </div>
  );
}

export default function HriPage() {
  const [departments, setDepartments] = useState<DepartmentHri[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [selected, setSelected] = useState<DepartmentHri | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hri/departments');
      setDepartments(res.data);
      if (selected) {
        const updated = res.data.find((d: DepartmentHri) => d.id === selected.id);
        if (updated) setSelected(updated);
      }
    } finally {
      setLoading(false);
    }
  };

  const recalculate = async () => {
    setRecalculating(true);
    try {
      await api.post('/hri/recalculate');
      await fetchData();
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const overallHri = departments.length > 0
    ? departments.reduce((sum, d) => sum + d.avgHri, 0) / departments.length
    : 0;
  
  const overallRisk = overallHri < 25 ? 'LOW' : overallHri < 50 ? 'MODERATE' : overallHri < 75 ? 'HIGH' : 'CRITICAL';

  // Radar chart data for all departments
  const radarData = departments.map(d => ({
    subject: d.name,
    HRI: Math.round(d.avgHri),
    fullMark: 100,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Human Risk Index</h1>
          <p className="text-slate-400 text-sm mt-0.5">Índice de Risco Humano Comportamental por Setor</p>
        </div>
        <button onClick={recalculate} disabled={recalculating} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
          {recalculating ? 'Recalculando...' : 'Recalcular HRI'}
        </button>
      </div>

      {/* Methodology note */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <h3 className="text-slate-300 font-medium text-sm mb-2 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Metodologia HRI (documentada)</span>
        </h3>
        <div className="grid grid-cols-5 gap-2 text-xs text-slate-500">
          {[
            { factor: 'Taxa de Cliques', weight: '40%', desc: 'Principal indicador de vulnerabilidade' },
            { factor: 'Taxa de Reporte', weight: '25%', desc: 'Inversamente proporcional (maior = menor risco)' },
            { factor: 'Reincidência', weight: '20%', desc: 'Erros repetidos em múltiplas campanhas' },
            { factor: 'Pílulas Concluídas', weight: '10%', desc: 'Inversamente proporcional' },
            { factor: 'Participação', weight: '5%', desc: 'Baixa participação = incerteza' },
          ].map(f => (
            <div key={f.factor} className="bg-slate-800/50 rounded-lg p-2">
              <p className="text-blue-400 font-semibold">{f.weight}</p>
              <p className="text-slate-300 font-medium mt-0.5">{f.factor}</p>
              <p className="text-slate-600 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs mt-2">Escala: 0–24 (Baixo) | 25–49 (Moderado) | 50–74 (Alto) | 75–100 (Crítico) · Janela: últimas 20 simulações por colaborador</p>
      </div>

      {/* Overall HRI */}
      <div className="card">
        <div className="flex items-center gap-6">
          <HriGauge score={overallHri} risk={overallRisk} />
          <div>
            <p className="text-slate-400 text-sm">HRI Médio Organizacional</p>
            <p className="text-2xl font-bold text-white">{overallHri.toFixed(1)}</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
              style={{ background: `${RISK_COLORS[overallRisk]}20`, color: RISK_COLORS[overallRisk], border: `1px solid ${RISK_COLORS[overallRisk]}40` }}>
              {RISK_LABELS[overallRisk]}
            </span>
          </div>
          <div className="ml-auto grid grid-cols-4 gap-4 hidden md:grid">
            {[
              { label: 'Baixo Risco', key: 'low', color: '#10b981' },
              { label: 'Moderado', key: 'moderate', color: '#f59e0b' },
              { label: 'Alto Risco', key: 'high', color: '#f97316' },
              { label: 'Crítico', key: 'critical', color: '#ef4444' },
            ].map(({ label, key, color }) => {
              const count = departments.reduce((sum, d) => sum + (d.distribution as Record<string, number>)[key], 0);
              return (
                <div key={key} className="text-center">
                  <p className="text-xl font-bold" style={{ color }}>{count}</p>
                  <p className="text-slate-500 text-xs">{label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Department cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-32 mb-3" />
              <div className="h-8 bg-slate-800 rounded w-16 mb-2" />
            </div>
          ))
        ) : departments.map(dept => {
          const color = RISK_COLORS[dept.riskLevel] || '#6b7280';
          return (
            <div
              key={dept.id}
              className="card hover:border-slate-700 cursor-pointer transition-all"
              style={{ borderColor: selected?.id === dept.id ? color : undefined }}
              onClick={() => setSelected(selected?.id === dept.id ? null : dept)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">{dept.name}</h3>
                <span className="text-xs" style={{ color }}>{dept.userCount} colaboradores</span>
              </div>
              <div className="flex items-center gap-4">
                <HriGauge score={dept.avgHri} risk={dept.riskLevel} />
                <div className="flex-1">
                  <div className="space-y-1.5">
                    {[
                      { label: 'Baixo', val: dept.distribution.low, color: '#10b981' },
                      { label: 'Moderado', val: dept.distribution.moderate, color: '#f59e0b' },
                      { label: 'Alto', val: dept.distribution.high, color: '#f97316' },
                      { label: 'Crítico', val: dept.distribution.critical, color: '#ef4444' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-14">{item.label}</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${dept.userCount > 0 ? (item.val / dept.userCount) * 100 : 0}%`, backgroundColor: item.color }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-5 text-right">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected department history chart */}
      {selected && selected.history.length > 0 && (
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Evolução HRI — {selected.name}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={[...selected.history].map((h, i) => ({ ...h, index: `C${i + 1}`, score: h.avgScore.toFixed(1) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="index" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="score" name="HRI Médio" stroke={RISK_COLORS[selected.riskLevel] || '#3b82f6'} strokeWidth={2} dot={{ fill: RISK_COLORS[selected.riskLevel] }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparison bar chart */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">Comparativo de HRI por Setor</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={departments.map(d => ({ name: d.name, hri: parseFloat(d.avgHri.toFixed(1)), fill: RISK_COLORS[d.riskLevel] }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
            <Bar dataKey="hri" name="HRI Médio" radius={[4, 4, 0, 0]}>
              {departments.map((dept) => (
                <Cell key={dept.id} fill={RISK_COLORS[dept.riskLevel] || '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

