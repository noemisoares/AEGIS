import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Search, Filter, ChevronDown } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle?: string;
  status: string;
  departmentName?: string;
  totalPoints: number;
  currentHri?: number;
  riskLevel?: string;
}

const RISK_COLORS: Record<string, string> = {
  LOW: 'badge-low',
  MODERATE: 'badge-moderate',
  HIGH: 'badge-high',
  CRITICAL: 'badge-critical',
};

const RISK_LABELS: Record<string, string> = {
  LOW: 'Baixo',
  MODERATE: 'Moderado',
  HIGH: 'Alto',
  CRITICAL: 'Crítico',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (deptFilter) params.departmentId = deptFilter;
      const res = await api.get('/users', { params });
      setUsers(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, deptFilter]);

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const hriColor = (score?: number) => {
    if (!score) return 'text-slate-500';
    if (score < 25) return 'text-emerald-400';
    if (score < 50) return 'text-yellow-400';
    if (score < 75) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Colaboradores</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total} colaboradores cadastrados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Colaborador</th>
                <th className="text-left text-slate-400 text-xs font-medium px-4 py-3 uppercase tracking-wide">Setor</th>
                <th className="text-left text-slate-400 text-xs font-medium px-4 py-3 uppercase tracking-wide">Cargo</th>
                <th className="text-center text-slate-400 text-xs font-medium px-4 py-3 uppercase tracking-wide">HRI</th>
                <th className="text-center text-slate-400 text-xs font-medium px-4 py-3 uppercase tracking-wide">Risco</th>
                <th className="text-center text-slate-400 text-xs font-medium px-4 py-3 uppercase tracking-wide">Pontos</th>
                <th className="text-center text-slate-400 text-xs font-medium px-4 py-3 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">Carregando...</td>
                </tr>
              ) : filtered.map(user => (
                <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-900/50 rounded-full flex items-center justify-center text-blue-300 text-sm font-medium shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-slate-200 text-sm font-medium">{user.name}</p>
                        <p className="text-slate-500 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{user.departmentName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{user.jobTitle ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-mono font-bold text-sm ${hriColor(user.currentHri)}`}>
                      {user.currentHri != null ? user.currentHri.toFixed(1) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.riskLevel ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_COLORS[user.riskLevel]}`}>
                        {RISK_LABELS[user.riskLevel]}
                      </span>
                    ) : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-yellow-400 font-medium text-sm">{user.totalPoints}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.status === 'ACTIVE'
                        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {user.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">Nenhum colaborador encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
          <span className="text-slate-500 text-sm">Mostrando {filtered.length} de {total}</span>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs px-3 py-1" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Anterior
            </button>
            <span className="text-slate-400 text-sm px-2 self-center">Página {page}</span>
            <button className="btn-secondary text-xs px-3 py-1" onClick={() => setPage(p => p + 1)} disabled={users.length < 20}>
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

