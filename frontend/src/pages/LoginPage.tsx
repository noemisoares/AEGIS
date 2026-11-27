import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle, ShieldCheck, User } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const axiosErr = err as {
        message?: string;
        response?: { status?: number; data?: { error?: string } };
      };
      const status = axiosErr?.response?.status;
      const apiMsg = axiosErr?.response?.data?.error;

      if (status === 401) {
        setError(apiMsg === 'Invalid credentials' ? 'Credenciais inválidas' : apiMsg || 'Credenciais inválidas');
      } else if (status === 400) {
        setError('Informe um e-mail válido e sua senha.');
      } else if (axiosErr?.message === 'API_UNAVAILABLE' || !axiosErr?.response || (status && status >= 500) || status === 404 || status === 405) {
        setError('Servidor da API indisponível. Verifique se o backend está em execução e se VITE_API_URL está configurada.');
      } else {
        setError(apiMsg || 'Erro ao autenticar na plataforma.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'manager' | 'collaborator') => {
    if (role === 'manager') {
      setEmail('juliana.ciso@aegiscorp.demo');
      setPassword('aegis@2024');
    } else {
      setEmail('carlos.silva@aegiscorp.demo');
      setPassword('aegis@colaborador');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 border border-blue-500 rounded-full" />
          <div className="absolute top-40 left-40 w-64 h-64 border border-blue-400 rounded-full" />
          <div className="absolute bottom-20 right-20 w-72 h-72 border border-indigo-500 rounded-full" />
        </div>
        
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center mb-8">
            <img src="/aegis.png" alt="AEGIS" className="w-28 h-28 object-contain" />
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4">AEGIS</h1>
          <p className="text-blue-300 text-xl mb-2">Governança Comportamental</p>
          <p className="text-slate-400 text-base">em Cibersegurança</p>
          
          <div className="mt-16 grid grid-cols-2 gap-6 text-left">
            {[
              { label: 'Simulações de Phishing', desc: 'Campanhas controladas e seguras' },
              { label: 'Pílulas Educativas', desc: 'Aprendizado imediato no erro' },
              { label: 'Human Risk Index', desc: 'Risco comportamental por setor' },
              { label: 'Painel SOC', desc: 'Governança em tempo real' },
            ].map(item => (
              <div key={item.label} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                <p className="text-blue-400 font-semibold text-sm">{item.label}</p>
                <p className="text-slate-400 text-xs mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/aegis.png" alt="AEGIS" className="w-11 h-11 object-contain shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-white">AEGIS</h1>
              <p className="text-slate-400 text-sm">Cibersegurança Comportamental</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold text-white mb-1">Bem-vindo de volta</h2>
            <p className="text-slate-400 text-sm mb-6">Acesse sua conta AEGIS</p>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">E-mail</label>
                <input
                  type="email"
                  className="input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar na plataforma'}
              </button>
            </form>

            {/* Demo shortcuts */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-3 text-center">Acesso rápido para demonstração</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('manager')}
                  className="text-xs bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 text-blue-300 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Juliana (CISO)</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('collaborator')}
                  className="text-xs bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>Carlos (Colaborador)</span>
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-600 text-xs mt-6">
            MVP de Demonstração Acadêmica — Dados 100% fictícios
          </p>
        </div>
      </div>
    </div>
  );
}

