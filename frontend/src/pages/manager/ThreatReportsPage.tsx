import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Flag, CheckCircle, XCircle, Clock, Search, ShieldAlert, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ThreatReport {
  id: string;
  reportType: string;
  description: string | null;
  isCorrect: boolean | null;
  status: string;
  pointsAwarded: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    department: { name: string } | null;
  };
  campaign: {
    id: string;
    name: string;
  } | null;
}

export default function ThreatReportsPage() {
  const [reports, setReports] = useState<ThreatReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/threat-reports');
      setReports(res.data);
    } catch (err) {
      console.error('Failed to load threat reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (reportId: string, newStatus: 'CONFIRMED' | 'REJECTED') => {
    try {
      setUpdatingId(reportId);
      await api.patch(`/threat-reports/${reportId}/status`, {
        status: newStatus,
        isCorrect: newStatus === 'CONFIRMED',
      });
      await fetchReports();
    } catch (err) {
      console.error('Failed to update report status', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchesSearch =
      r.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.campaign && r.campaign.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Flag className="w-6 h-6 text-emerald-400" />
            Denúncias de Ameaças
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Acompanhe e valide alertas de segurança e suspeitas reportadas pelos colaboradores.
          </p>
        </div>
        <button onClick={fetchReports} className="btn-secondary text-xs px-3 py-1.5 self-start sm:self-auto">
          Atualizar Lista
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs">Total de Denúncias</p>
              <p className="text-2xl font-bold text-white mt-1">{reports.length}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-900/30 text-blue-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs">Confirmadas como Ameaça</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {reports.filter((r) => r.status === 'CONFIRMED' || r.isCorrect === true).length}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-900/30 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs">Pendentes de Revisão</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {reports.filter((r) => r.status === 'PENDING').length}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-yellow-900/30 text-yellow-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="input pl-9 text-sm"
            placeholder="Buscar por colaborador, descrição ou campanha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'CONFIRMED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                filterStatus === st
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {st === 'ALL' ? 'Todos' : st === 'PENDING' ? 'Pendentes' : st === 'CONFIRMED' ? 'Confirmados' : 'Descartados'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando denúncias...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">Nenhuma denúncia encontrada para os filtros atuais.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase">
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Tipo / Campanha</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Status SOC</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-semibold text-xs">
                          {report.user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{report.user.name}</p>
                          <p className="text-slate-500 text-xs">{report.user.department?.name || 'Geral'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-blue-400 text-xs font-medium block">
                        {report.reportType === 'SIMULATION' ? '🎯 Simulação' : '⚠️ Ameaça Real'}
                      </span>
                      <span className="text-slate-400 text-xs truncate max-w-[200px] block">
                        {report.campaign ? report.campaign.name : 'Reporte Avulso'}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-slate-300 text-xs truncate" title={report.description || ''}>
                        {report.description || 'Sem detalhes fornecidos'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                      {format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </td>
                    <td className="py-3 px-4">
                      {report.status === 'CONFIRMED' || report.isCorrect === true ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                          <CheckCircle className="w-3 h-3" /> Confirmada
                        </span>
                      ) : report.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-950/60 text-red-400 border border-red-800">
                          <XCircle className="w-3 h-3" /> Falso Positivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-950/60 text-yellow-400 border border-yellow-800">
                          <Clock className="w-3 h-3" /> Em Análise
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {report.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleUpdateStatus(report.id, 'CONFIRMED')}
                            disabled={updatingId === report.id}
                            title="Confirmar ameaça válida"
                            className="p-1 rounded hover:bg-emerald-900/40 text-emerald-400 transition"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(report.id, 'REJECTED')}
                            disabled={updatingId === report.id}
                            title="Descartar denúncia"
                            className="p-1 rounded hover:bg-red-900/40 text-red-400 transition"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
