import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { Shield, Flag, Star, AlertTriangle, CheckCircle, LogOut, Bell, BookOpen } from 'lucide-react';

interface ActiveSim {
  id: string;
  status: string;
  sentAt: string;
  campaign: {
    id: string;
    name: string;
    template: {
      name: string;
      subject: string;
      senderName: string;
      senderEmail: string;
      bodyText: string;
      difficulty: string;
    };
  };
}

interface UserActivity {
  transactions: Array<{ id: string; points: number; reason: string; description: string; createdAt: string }>;
}

export default function CollaboratorPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSims, setActiveSims] = useState<ActiveSim[]>([]);
  const [points, setPoints] = useState(user?.totalPoints ?? 0);
  const [activity, setActivity] = useState<UserActivity>({ transactions: [] });
  const [reportMsg, setReportMsg] = useState('');
  const [reporting, setReporting] = useState(false);
  const [hri, setHri] = useState<{ score: number; riskLevel: string } | null>(null);

  const fetchData = async () => {
    try {
      const [simsRes, ptsRes, hriRes] = await Promise.all([
        api.get('/simulations/active'),
        api.get('/points/me'),
        api.get(`/hri/users/${user?.id}`),
      ]);
      setActiveSims(simsRes.data);
      setPoints(ptsRes.data.totalPoints);
      setActivity({ transactions: ptsRes.data.transactions });
      setHri({ score: hriRes.data.currentScore ?? 50, riskLevel: hriRes.data.riskLevel ?? 'MODERATE' });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleReport = async (campaignId: string) => {
    setReporting(true);
    try {
      const res = await api.post('/threat-reports', {
        campaignId,
        reportType: 'SIMULATION',
        description: 'Colaborador identificou e reportou simulação de phishing',
      });
      setReportMsg(res.data.message);
      setPoints(res.data.newTotal || points);
      await fetchData();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setReportMsg(msg || 'Erro ao reportar');
    } finally {
      setReporting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const RISK_COLOR: Record<string, string> = {
    LOW: 'text-emerald-400',
    MODERATE: 'text-yellow-400',
    HIGH: 'text-orange-400',
    CRITICAL: 'text-red-400',
  };

  const RISK_LABEL: Record<string, string> = {
    LOW: 'Baixo Risco',
    MODERATE: 'Risco Moderado',
    HIGH: 'Alto Risco',
    CRITICAL: 'Risco Crítico',
  };

  const REASON_LABEL: Record<string, string> = {
    THREAT_REPORTED_CORRECT: '🛡️ Ameaça reportada corretamente',
    THREAT_IDENTIFIED: '🔍 Ameaça identificada',
    PILL_COMPLETED: '📚 Pílula educativa concluída',
    CAMPAIGN_PARTICIPATION: '🎯 Participação em campanha',
    BONUS: '⭐ Bônus',
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold">AEGIS</span>
              <p className="text-slate-500 text-xs">Agente de Segurança</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold">{points} pts</span>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-slate-300">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Welcome */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Bem-vindo(a),</p>
              <h1 className="text-xl font-bold text-white mt-0.5">{user?.name}</h1>
              <p className="text-slate-500 text-sm">{user?.jobTitle} · {user?.departmentName}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs">Meu HRI</p>
              <p className={`text-2xl font-bold ${RISK_COLOR[hri?.riskLevel ?? 'MODERATE']}`}>
                {hri?.score?.toFixed(0) ?? '—'}
              </p>
              <p className={`text-xs ${RISK_COLOR[hri?.riskLevel ?? 'MODERATE']}`}>
                {RISK_LABEL[hri?.riskLevel ?? 'MODERATE']}
              </p>
            </div>
          </div>
        </div>

        {/* Success message */}
        {reportMsg && (
          <div className="bg-emerald-900/30 border border-emerald-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-300">{reportMsg}</span>
            </div>
            <button onClick={() => setReportMsg('')} className="text-slate-500 hover:text-slate-300 text-lg">×</button>
          </div>
        )}

        {/* Active Simulations */}
        <div>
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" />
            Mensagens Recebidas
            {activeSims.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{activeSims.length}</span>
            )}
          </h2>

          {activeSims.length === 0 ? (
            <div className="card text-center py-8">
              <Shield className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhuma simulação ativa no momento</p>
              <p className="text-slate-600 text-sm mt-1">Você será notificado quando houver uma nova campanha</p>
            </div>
          ) : activeSims.map(sim => (
            <div key={sim.id} className="card border-blue-900/50 bg-slate-900 mb-3">
              {/* Fake email preview */}
              <div className="bg-slate-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3 pb-3 border-b border-slate-700">
                  <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {sim.campaign.template.senderName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-white font-medium text-sm">{sim.campaign.template.senderName}</span>
                      <span className="text-slate-500 text-xs">{new Date(sim.sentAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-slate-500 text-xs">{sim.campaign.template.senderEmail}</p>
                    <p className="text-slate-300 font-medium text-sm mt-1">{sim.campaign.template.subject}</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm mt-3 leading-relaxed">{sim.campaign.template.bodyText}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate(`/simulacao/${sim.campaign.id}`)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Abrir mensagem completa
                </button>
                <button
                  onClick={() => handleReport(sim.campaign.id)}
                  disabled={reporting}
                  className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-2 border-emerald-800 text-emerald-400 hover:bg-emerald-900/20"
                >
                  <Flag className="w-4 h-4" />
                  {reporting ? 'Reportando...' : '🛡️ Reportar como Ameaça (+20 pts)'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Points history */}
        <div>
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            Histórico de Pontos
          </h2>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold text-yellow-400">{points}</p>
                <p className="text-slate-400 text-sm">pontos acumulados</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-white font-medium">{activity.transactions.filter(t => t.reason === 'THREAT_REPORTED_CORRECT').length}</p>
                    <p className="text-xs">Reportes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">{activity.transactions.filter(t => t.reason === 'PILL_COMPLETED').length}</p>
                    <p className="text-xs">Pílulas</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activity.transactions.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Nenhuma atividade ainda</p>
              ) : activity.transactions.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <div>
                    <p className="text-slate-300 text-sm">{REASON_LABEL[t.reason] || t.description}</p>
                    <p className="text-slate-600 text-xs">{new Date(t.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                  <span className="text-yellow-400 font-bold">+{t.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security tips */}
        <div className="card">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Dicas de Segurança
          </h3>
          <ul className="space-y-2 text-slate-400 text-sm">
            {[
              '🔍 Sempre verifique o domínio do remetente antes de clicar em links',
              '⏰ Desconfie de mensagens que criam urgência artificial',
              '🏦 Sua empresa nunca pedirá dados bancários por e-mail',
              '🔑 Nunca clique em links de redefinição de senha enviados por e-mail',
              '🛡️ Em caso de dúvida, use o botão de Reportar Ameaça do AEGIS',
            ].map(tip => (
              <li key={tip} className="flex items-start gap-2 py-1 border-b border-slate-800/50 last:border-0">
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

