import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { AlertTriangle, CheckCircle, ArrowLeft, Shield } from 'lucide-react';

interface SimulationData {
  id: string;
  status: string;
  campaign: {
    id: string;
    name: string;
    template: {
      subject: string;
      bodyHtml: string;
      senderName: string;
      senderEmail: string;
      difficulty: string;
      category: string;
    };
  };
}

interface Pill {
  id: string;
  title: string;
  content: string;
  whatWentWrong: string;
  tips: string;
  correctAction: string;
}

type ViewState = 'email' | 'clicked' | 'pill' | 'completed';

export default function SimulationPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [sim, setSim] = useState<SimulationData | null>(null);
  const [pill, setPill] = useState<Pill | null>(null);
  const [view, setView] = useState<ViewState>('email');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const fetchSim = async () => {
      try {
        const res = await api.get('/simulations/active');
        const found = res.data.find((s: SimulationData) => s.campaign.id === campaignId);
        if (found) {
          setSim(found);
          // Mark as opened
          await api.post(`/simulations/${campaignId}/interact`, { action: 'opened' });
        } else {
          navigate('/colaborador');
        }
      } catch {
        navigate('/colaborador');
      } finally {
        setLoading(false);
      }
    };
    fetchSim();
  }, [campaignId]);

  const handleClick = async () => {
    try {
      const res = await api.post(`/simulations/${campaignId}/interact`, { action: 'clicked' });
      if (res.data.pill) {
        setPill(res.data.pill);
        setView('clicked');
        setTimeout(() => setView('pill'), 2000);
      } else {
        setView('clicked');
        setTimeout(() => navigate('/colaborador'), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompletePill = async () => {
    if (!pill) return;
    setCompleting(true);
    try {
      await api.post(`/simulations/${campaignId}/pill-complete`, {
        pillId: pill.id,
        timeSpent: 120,
      });
      setView('completed');
    } catch {}
    finally { setCompleting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400">Carregando simulação...</p>
        </div>
      </div>
    );
  }

  if (!sim) return null;

  // ---- VIEW: Email ----
  if (view === 'email') {
    return (
      <div className="min-h-screen bg-slate-950 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/colaborador')} className="text-slate-500 hover:text-slate-300">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-slate-400 text-sm">Voltar ao AEGIS</span>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-xl">
            {/* Email header */}
            <div className="bg-gray-100 px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {sim.campaign.template.senderName.charAt(0)}
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">{sim.campaign.template.senderName}</p>
                  <p className="text-gray-500 text-xs">{sim.campaign.template.senderEmail}</p>
                </div>
              </div>
              <h2 className="text-gray-900 font-semibold mt-2">{sim.campaign.template.subject}</h2>
            </div>
            
            {/* Email body */}
            <div className="p-6">
              <div
                dangerouslySetInnerHTML={{
                  __html: sim.campaign.template.bodyHtml.replace(
                    /SIMULATION_CLICK_URL/g,
                    '#simulation-link'
                  )
                }}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('a')) {
                    e.preventDefault();
                    handleClick();
                  }
                }}
                className="cursor-pointer"
              />
            </div>
          </div>

          <div className="mt-4 bg-slate-900 rounded-xl p-4 border border-slate-800">
            <p className="text-slate-400 text-sm text-center">
              💡 Esta é uma simulação controlada do AEGIS. Clique em qualquer link para ver o resultado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---- VIEW: Clicked (interstitial) ----
  if (view === 'clicked') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-900/30 border-2 border-red-500 rounded-2xl p-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-red-400 animate-pulse" />
            </div>
            <h2 className="text-red-400 text-xl font-bold mb-2">⚠️ SIMULAÇÃO DE PHISHING</h2>
            <p className="text-slate-300 text-sm">
              Você clicou em um link de phishing simulado.
              <br />O AEGIS identificou sua interação.
            </p>
            <p className="text-slate-500 text-xs mt-4">
              Preparando pílula educativa...
            </p>
            <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
          </div>
        </div>
      </div>
    );
  }

  // ---- VIEW: Educational Pill ----
  if (view === 'pill' && pill) {
    return (
      <div className="min-h-screen bg-slate-950 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-orange-900/40 to-slate-900 border border-orange-800 rounded-2xl overflow-hidden">
            {/* Pill header */}
            <div className="bg-orange-900/60 px-6 py-5 flex items-center gap-4">
              <div className="bg-orange-500/20 p-3 rounded-xl">
                <Shield className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <p className="text-orange-300 text-xs font-semibold uppercase tracking-wide">Pílula Educativa</p>
                <h2 className="text-white text-xl font-bold">{pill.title}</h2>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* What happened */}
              <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
                <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  O que aconteceu
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">{pill.content}</p>
              </div>

              {/* What went wrong */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <h3 className="text-orange-400 font-semibold mb-2">🔍 Sinais que indicavam phishing</h3>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{pill.whatWentWrong}</p>
              </div>

              {/* Tips */}
              <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
                <h3 className="text-blue-400 font-semibold mb-2">💡 Como identificar na próxima vez</h3>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{pill.tips}</p>
              </div>

              {/* Correct action */}
              <div className="bg-emerald-900/20 border border-emerald-800 rounded-xl p-4">
                <h3 className="text-emerald-400 font-semibold mb-2">✅ O que fazer na próxima vez</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{pill.correctAction}</p>
              </div>

              <button
                onClick={handleCompletePill}
                disabled={completing}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
              >
                <CheckCircle className="w-5 h-5" />
                {completing ? 'Concluindo...' : 'Concluí o microtreinamento (+5 pts)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- VIEW: Completed ----
  if (view === 'completed') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-emerald-900/30 border border-emerald-700 rounded-2xl p-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-emerald-400 text-xl font-bold mb-2">Microtreinamento Concluído!</h2>
            <p className="text-slate-300 text-sm mb-1">+5 pontos adicionados à sua conta</p>
            <p className="text-slate-400 text-sm">
              Continue atento e use o botão de Reportar Ameaça do AEGIS quando identificar mensagens suspeitas.
            </p>
            <button onClick={() => navigate('/colaborador')} className="btn-primary mt-6 w-full flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              Voltar ao AEGIS
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

