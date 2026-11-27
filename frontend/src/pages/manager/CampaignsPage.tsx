import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Plus, Play, CheckCircle, Clock, AlertCircle, ChevronRight, X, Loader2, Bot, Lightbulb } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  template?: { name: string; difficulty: string; category: string };
  _count?: { targets: number; simulationResults: number; threatReports: number };
}

interface Template {
  id: string;
  name: string;
  subject: string;
  difficulty: string;
  category: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { label: 'Rascunho', cls: 'text-slate-400 bg-slate-800', icon: Clock },
  SCHEDULED: { label: 'Agendada', cls: 'text-blue-400 bg-blue-900/30 border border-blue-800', icon: Clock },
  ACTIVE: { label: 'Ativa', cls: 'text-emerald-400 bg-emerald-900/30 border border-emerald-800', icon: Play },
  COMPLETED: { label: 'Concluída', cls: 'text-purple-400 bg-purple-900/30 border border-purple-800', icon: CheckCircle },
  CANCELLED: { label: 'Cancelada', cls: 'text-red-400 bg-red-900/30', icon: AlertCircle },
};

const DIFF_MAP: Record<string, string> = { EASY: 'Fácil', MEDIUM: 'Médio', HARD: 'Difícil' };
const DIFF_COLOR: Record<string, string> = {
  EASY: 'text-emerald-400',
  MEDIUM: 'text-yellow-400',
  HARD: 'text-red-400',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', templateId: '' });
  const [actionMsg, setActionMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/campaigns/templates/list'),
      ]);
      setCampaigns(cRes.data);
      setTemplates(tRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const createCampaign = async () => {
    if (!form.name || !form.templateId) return;
    setCreating(true);
    try {
      await api.post('/campaigns', form);
      setShowCreate(false);
      setForm({ name: '', description: '', templateId: '' });
      await fetchData();
      setActionMsg('Campanha criada com sucesso!');
    } finally {
      setCreating(false);
    }
  };

  const startCampaign = async (id: string) => {
    try {
      await api.post(`/campaigns/${id}/start`, { targetAll: true });
      await fetchData();
      setSelectedCampaign(null);
      setActionMsg('Campanha iniciada! Simulações enviadas a todos os colaboradores.');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setActionMsg(`Erro: ${msg || 'Falha ao iniciar campanha'}`);
    }
  };

  const completeCampaign = async (id: string) => {
    try {
      await api.post(`/campaigns/${id}/complete`);
      await fetchData();
      setSelectedCampaign(null);
      setActionMsg('Campanha concluída. HRI recalculado.');
    } catch {}
  };

  const simulateBehavior = async (id: string) => {
    setSimulating(true);
    try {
      const res = await api.post(`/demo/simulate-campaign/${id}`);
      await fetchData();
      setActionMsg(`Comportamentos simulados: ${res.data.stats.total} colaboradores, ${res.data.stats.clicked} cliques, ${res.data.stats.reported} reportes`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setActionMsg(`Erro: ${msg || 'Falha na simulação'}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campanhas de Phishing</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie simulações controladas de engenharia social</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      {actionMsg && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-blue-300 text-sm">{actionMsg}</span>
          <button onClick={() => setActionMsg('')} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Campaign cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Carregando campanhas...</div>
        ) : campaigns.map(c => {
          const statusInfo = STATUS_MAP[c.status] || STATUS_MAP.DRAFT;
          const StatusIcon = statusInfo.icon;
          return (
            <div key={c.id} className="card hover:border-slate-700 transition-colors cursor-pointer" onClick={() => setSelectedCampaign(c)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-900/40 rounded-lg flex items-center justify-center shrink-0">
                    <Play className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-medium truncate">{c.name}</h3>
                    <p className="text-slate-500 text-xs mt-0.5">{c.template?.name} · Dificuldade: <span className={DIFF_COLOR[c.template?.difficulty ?? 'MEDIUM']}>{DIFF_MAP[c.template?.difficulty ?? 'MEDIUM']}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0 ml-4">
                  <div className="text-center hidden md:block">
                    <p className="text-white font-medium">{c._count?.targets ?? 0}</p>
                    <p className="text-slate-500 text-xs">Alvos</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="text-white font-medium">{c._count?.simulationResults ?? 0}</p>
                    <p className="text-slate-500 text-xs">Simulações</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="text-emerald-400 font-medium">{c._count?.threatReports ?? 0}</p>
                    <p className="text-slate-500 text-xs">Reportes</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${statusInfo.cls}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            </div>
          );
        })}
        {!loading && campaigns.length === 0 && (
          <div className="text-center py-12 text-slate-500">Nenhuma campanha. Crie a primeira!</div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Nova Campanha de Phishing</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome da campanha *</label>
                <input className="input" placeholder="ex: Campanha Q1 — Senhas Corporativas"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Descrição</label>
                <textarea className="input resize-none" rows={2} placeholder="Objetivo da campanha..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Modelo de Phishing *</label>
                <select className="input" value={form.templateId} onChange={e => setForm(f => ({ ...f, templateId: e.target.value }))}>
                  <option value="">Selecione um modelo...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({DIFF_MAP[t.difficulty]})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn-primary" onClick={createCampaign} disabled={creating || !form.name || !form.templateId}>
                {creating ? 'Criando...' : 'Criar Campanha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedCampaign.name}</h2>
                <p className="text-slate-400 text-sm mt-0.5">{selectedCampaign.description}</p>
              </div>
              <button onClick={() => setSelectedCampaign(null)} className="text-slate-500 hover:text-white ml-4 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-white">{selectedCampaign._count?.targets ?? 0}</p>
                <p className="text-slate-400 text-xs">Alvos</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-white">{selectedCampaign._count?.simulationResults ?? 0}</p>
                <p className="text-slate-400 text-xs">Simulações</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-emerald-400">{selectedCampaign._count?.threatReports ?? 0}</p>
                <p className="text-slate-400 text-xs">Reportes</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {selectedCampaign.status === 'DRAFT' && (
                <button onClick={() => startCampaign(selectedCampaign.id)} className="btn-primary flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Iniciar Campanha (todos os colaboradores)
                </button>
              )}
              {selectedCampaign.status === 'ACTIVE' && (
                <>
                  <button
                    onClick={() => simulateBehavior(selectedCampaign.id)}
                    disabled={simulating}
                    className="btn-secondary flex items-center gap-2"
                  >
                    {simulating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Simulando...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 shrink-0" />
                        <span>Simular Comportamentos (Demo)</span>
                      </>
                    )}
                  </button>
                  <button onClick={() => completeCampaign(selectedCampaign.id)} className="btn-secondary flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Concluir Campanha
                  </button>
                </>
              )}
            </div>

            {selectedCampaign.status === 'ACTIVE' && (
              <div className="mt-4 bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                <p className="text-blue-300 text-sm flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Modo Demo:</strong> Use "Simular Comportamentos" para gerar eventos realistas automaticamente,
                    demonstrando cliques, reportes e conclusões de pílulas distribuídos pelos colaboradores.
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

