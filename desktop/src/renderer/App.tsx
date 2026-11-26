import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield,
  Flag,
  Award,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  UserCheck,
  TrendingDown,
  BellRing,
  Settings
} from 'lucide-react';

const resolveApiBase = (): string => {
  const custom = localStorage.getItem('aegis_api_url');
  if (custom) return custom.endsWith('/api') ? custom : `${custom.replace(/\/$/, '')}/api`;
  const envUrl = (window as any)?._AEGIS_API_URL || (typeof process !== 'undefined' ? process.env?.VITE_API_URL : undefined);
  if (envUrl) return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
  return 'http://localhost:3001/api';
};

let API_BASE = resolveApiBase();

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle?: string;
  departmentName?: string;
  totalPoints: number;
  currentHri?: number;
  riskLevel?: string;
}

interface ActiveSimulation {
  id: string;
  status: string;
  sentAt: string;
  campaign: {
    id: string;
    name: string;
    template: {
      id: string;
      name: string;
      subject: string;
      senderName: string;
      senderEmail: string;
      bodyText: string;
      difficulty: string;
    };
  };
}

interface EducationalPill {
  id: string;
  title: string;
  content: string;
  whatWentWrong: string;
  tips: string;
  correctAction: string;
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('aegis_desktop_token'));
  const [user, setUser] = useState<Collaborator | null>(null);
  const [loginEmail, setLoginEmail] = useState('carlos.silva@aegiscorp.demo');
  const [loginPassword, setLoginPassword] = useState('aegis@colaborador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeSimulations, setActiveSimulations] = useState<ActiveSimulation[]>([]);
  const [selectedSim, setSelectedSim] = useState<ActiveSimulation | null>(null);
  const [educationalPill, setEducationalPill] = useState<EducationalPill | null>(null);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [interactedError, setInteractedError] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(API_BASE);

  useEffect(() => {
    const initApi = async () => {
      if (window.electronAPI?.getApiUrl) {
        try {
          const remoteUrl = await window.electronAPI.getApiUrl();
          if (remoteUrl && !localStorage.getItem('aegis_api_url')) {
            const formatted = remoteUrl.endsWith('/api') ? remoteUrl : `${remoteUrl.replace(/\/$/, '')}/api`;
            API_BASE = formatted;
            setApiUrlInput(formatted);
          }
        } catch (e) {
          console.warn('Could not retrieve API URL from main process:', e);
        }
      }
    };
    initApi();
  }, []);

  const handleSaveApiUrl = () => {
    const cleanUrl = apiUrlInput.trim();
    if (cleanUrl) {
      const formatted = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl.replace(/\/$/, '')}/api`;
      localStorage.setItem('aegis_api_url', formatted);
      API_BASE = formatted;
      setApiUrlInput(formatted);
      setShowConfig(false);
      if (token) fetchProfile(token);
    }
  };

  // Authenticate / fetch profile
  const fetchProfile = async (authToken: string) => {
    try {
      const res = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(res.data);
      fetchSimulations(authToken);
    } catch {
      handleLogout();
    }
  };

  const fetchSimulations = async (authToken: string) => {
    try {
      const res = await axios.get(`${API_BASE}/simulations/active`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const previousCount = activeSimulations.length;
      setActiveSimulations(res.data);

      if (res.data.length > previousCount && previousCount >= 0) {
        // Trigger notification
        if (window.electronAPI) {
          window.electronAPI.showNotification(
            'AEGIS — Nova Simulação',
            'Uma nova mensagem corporativa requer sua atenção e análise.'
          );
        }
      }
    } catch (err) {
      console.error('Error fetching simulations', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
      const interval = setInterval(() => {
        fetchProfile(token);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: loginEmail,
        password: loginPassword,
      });
      const authToken = res.data.token;
      setToken(authToken);
      localStorage.setItem('aegis_desktop_token', authToken);
      setUser(res.data.user);
      fetchSimulations(authToken);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Falha ao autenticar agente desktop');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('aegis_desktop_token');
    setSelectedSim(null);
    setEducationalPill(null);
    setInteractedError(false);
  };

  const handleReportThreat = async (campaignId?: string) => {
    if (!token) return;
    setReporting(true);
    setReportFeedback(null);
    try {
      const res = await axios.post(
        `${API_BASE}/threat-reports`,
        {
          campaignId: campaignId || selectedSim?.campaign.id,
          reportType: 'SIMULATION',
          description: 'Reportado diretamente pelo botão de ameaça do AEGIS Desktop Agent',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReportFeedback(res.data.message);
      if (res.data.pointsAwarded > 0) {
        if (window.electronAPI) {
          window.electronAPI.showNotification(
            'AEGIS — Ameaça Reportada!',
            `Parabéns! Você identificou a ameaça com sucesso e conquistou +${res.data.pointsAwarded} pontos!`
          );
        }
      }
      setSelectedSim(null);
      fetchProfile(token);
    } catch (err: any) {
      setReportFeedback('Erro ao registrar reporte.');
    } finally {
      setReporting(false);
    }
  };

  const handleSimLinkClick = async (campaignId: string) => {
    if (!token) return;
    try {
      const res = await axios.post(
        `${API_BASE}/simulations/${campaignId}/interact`,
        { action: 'clicked' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setInteractedError(true);
      if (res.data.pill) {
        setEducationalPill(res.data.pill);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompletePill = async () => {
    if (!token || !selectedSim || !educationalPill) return;
    try {
      await axios.post(
        `${API_BASE}/simulations/${selectedSim.campaign.id}/pill-complete`,
        { pillId: educationalPill.id, timeSpent: 90 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEducationalPill(null);
      setInteractedError(false);
      setSelectedSim(null);
      fetchProfile(token);
    } catch (err) {
      console.error(err);
    }
  };

  // 1. LOGIN SCREEN
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center p-6 text-slate-100">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-600/20 border border-blue-500/30 rounded-2xl mb-3">
            <Shield className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AEGIS AGENT</h1>
          <p className="text-xs text-slate-400 mt-1">Terminal de Governança Comportamental</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Identificação do Colaborador</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-lg text-xs text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-400">E-mail corporativo</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Senha de acesso</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition mt-2 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Conectar Agente
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">Credencial de demonstração configurada para Carlos Silva</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE PILL MODAL
  if (educationalPill && selectedSim) {
    return (
      <div className="min-h-screen bg-slate-950 p-5 flex flex-col justify-between text-slate-100">
        <div>
          <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/60 rounded-xl mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <h2 className="text-xs font-bold text-red-300 uppercase">Simulação Interrompida</h2>
              <p className="text-[11px] text-slate-400">Você clicou em uma simulação de phishing.</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h1 className="text-base font-bold text-white">{educationalPill.title}</h1>
            <p className="text-xs text-slate-300 leading-relaxed">{educationalPill.content}</p>

            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <span className="text-[11px] font-semibold text-yellow-400 uppercase">Sinais de Alerta:</span>
              <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">{educationalPill.whatWentWrong}</p>
            </div>

            <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-xl">
              <span className="text-[11px] font-semibold text-blue-400 uppercase">Conduta Recomendada:</span>
              <p className="text-xs text-slate-300 mt-1">{educationalPill.correctAction}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleCompletePill}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950"
        >
          <CheckCircle className="w-4 h-4" />
          Concluir Pílula Educativa (+5 pts)
        </button>
      </div>
    );
  }

  // 3. SIMULATION VIEWING MODAL
  if (selectedSim) {
    return (
      <div className="min-h-screen bg-slate-950 p-5 flex flex-col justify-between text-slate-100">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5" /> Simulação em Ambiente Seguro
            </span>
            <button
              onClick={() => setSelectedSim(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Voltar
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <div className="text-xs text-slate-400 space-y-1 pb-3 border-b border-slate-800">
              <p><strong className="text-slate-300">De:</strong> {selectedSim.campaign.template.senderName} &lt;{selectedSim.campaign.template.senderEmail}&gt;</p>
              <p><strong className="text-slate-300">Assunto:</strong> {selectedSim.campaign.template.subject}</p>
            </div>
            <div className="pt-3 text-xs text-slate-300 leading-relaxed space-y-3">
              <p>{selectedSim.campaign.template.bodyText}</p>
              
              <div className="pt-2">
                <button
                  onClick={() => handleSimLinkClick(selectedSim.campaign.id)}
                  className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition"
                >
                  Clique aqui para acessar o procedimento
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => handleReportThreat(selectedSim.campaign.id)}
            disabled={reporting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950"
          >
            <Flag className="w-4 h-4" />
            {reporting ? 'Processando Reporte...' : 'Reportar como Ameaça (+20 pts)'}
          </button>
        </div>
      </div>
    );
  }

  // 4. MAIN AGENT DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-5 text-slate-100">
      <div>
        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <span className="text-xs font-bold text-white tracking-wide">AEGIS AGENT</span>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Ativo e Protegido
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Desconectar"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">{user.name}</h2>
              <p className="text-xs text-slate-400">{user.jobTitle || 'Colaborador'} · {user.departmentName || 'Geral'}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                <Award className="w-4 h-4" />
                <span>{user.totalPoints} pts</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Human Risk Index (HRI):</span>
            <span className="font-semibold text-blue-400">
              {user.currentHri != null ? `${user.currentHri.toFixed(1)} / 100` : '50.0 (Base)'}
            </span>
          </div>
        </div>

        {/* Feedback message */}
        {reportFeedback && (
          <div className="mb-4 p-3 bg-blue-950/40 border border-blue-800 rounded-xl text-xs text-blue-300 flex items-center justify-between">
            <span>{reportFeedback}</span>
            <button onClick={() => setReportFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Primary Action Button: REPORT SUSPICIOUS MESSAGE */}
        <div className="mb-4">
          <button
            onClick={() => handleReportThreat(activeSimulations[0]?.campaign.id)}
            disabled={reporting}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2.5 active:scale-[0.99]"
          >
            <Flag className="w-5 h-5" />
            <span>REPORTAR AMEAÇA SUSPEITA</span>
          </button>
        </div>

        {/* Active Simulations Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Simulações Recentes ({activeSimulations.length})
            </span>
            <button
              onClick={() => token && fetchProfile(token)}
              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Atualizar
            </button>
          </div>

          {activeSimulations.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 text-center">
              <CheckCircle className="w-6 h-6 text-emerald-500/60 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-medium">Nenhuma mensagem pendente</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Seu terminal está com o ciclo de conscientização em dia.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeSimulations.map((sim) => (
                <div
                  key={sim.id}
                  onClick={() => setSelectedSim(sim)}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 rounded-xl p-3 cursor-pointer transition flex items-center justify-between"
                >
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-semibold text-slate-200 truncate">{sim.campaign.template.subject}</p>
                    <p className="text-[11px] text-slate-400 truncate">{sim.campaign.template.senderName}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-4 pt-3 border-t border-slate-900 text-center flex items-center justify-between">
        <p className="text-[10px] text-slate-600">
          AEGIS Security Agent v1.0.0
        </p>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-slate-500 hover:text-slate-300 transition"
          title="Configuração de Servidor API"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {showConfig && (
        <div className="mt-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-left">
          <p className="text-[11px] font-semibold text-slate-300 mb-1.5">Endereço da API do Backend:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiUrlInput}
              onChange={(e) => setApiUrlInput(e.target.value)}
              placeholder="https://api-aegis.onrender.com/api"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSaveApiUrl}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded-lg font-medium"
            >
              Salvar
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Configurável para ambiente de Nuvem ou Localhost.</p>
        </div>
      )}
    </div>
  );
}

