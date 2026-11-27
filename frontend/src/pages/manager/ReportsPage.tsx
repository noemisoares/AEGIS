import { useState } from 'react';
import api from '../../lib/api';
import { FileText, FileSpreadsheet, Download, Building2, Target, Check } from 'lucide-react';

export default function ReportsPage() {
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({
    title: 'Relatório de Governança Comportamental — AEGIS Corporation',
    format: 'PDF',
    type: 'GENERAL',
  });

  const downloadReport = async (payload: { title: string; format: string; type: string }, filenamePrefix = 'aegis-report') => {
    setGenerating(true);
    try {
      const res = await api.post('/audit/reports/generate', payload, {
        responseType: 'blob',
      });

      const ext = payload.format === 'PDF' ? 'pdf' : 'csv';
      const mime = payload.format === 'PDF' ? 'application/pdf' : 'text/csv;charset=utf-8';
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mime }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filenamePrefix}-${Date.now()}.${ext}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Report error:', e);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const generateReport = () => downloadReport(filters);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Relatórios de Auditoria</h1>
        <p className="text-slate-400 text-sm mt-0.5">Exporte evidências comportamentais para conformidade e governança</p>
      </div>

      {/* Report builder */}
      <div className="card max-w-2xl">
        <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Configurar Relatório
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Título do Relatório</label>
            <input
              className="input"
              value={filters.title}
              onChange={e => setFilters(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo de Relatório</label>
              <select className="input" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
                <option value="GENERAL">Geral (Resumo Executivo)</option>
                <option value="BY_DEPARTMENT">Por Setor</option>
                <option value="BY_CAMPAIGN">Por Campanha</option>
                <option value="HRI">Análise de Risco (HRI)</option>
                <option value="AUDIT">Auditoria Completa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Formato de Exportação</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFilters(f => ({ ...f, format: 'PDF' }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${
                    filters.format === 'PDF'
                      ? 'bg-red-900/30 border-red-800 text-red-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilters(f => ({ ...f, format: 'CSV' }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${
                    filters.format === 'CSV'
                      ? 'bg-green-900/30 border-green-800 text-green-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800">
          <h4 className="text-slate-300 text-sm font-medium mb-3">O relatório incluirá:</h4>
          <ul className="space-y-1.5 text-slate-500 text-sm">
            {[
              'Identificação da organização e período analisado',
              'Resumo executivo com indicadores principais',
              'Lista de campanhas e resultados',
              'Taxa de cliques e reportes por setor',
              'Evolução do Human Risk Index (HRI)',
              'Evidências comportamentais individuais',
              'Metodologia de cálculo do HRI documentada',
              'Data e horário de geração do relatório',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={generateReport}
          disabled={generating}
          className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          {generating ? 'Gerando relatório...' : `Exportar como ${filters.format}`}
        </button>

        <p className="text-slate-600 text-xs mt-3 text-center">
          Os dados são gerados em tempo real a partir do banco de dados. Dados de demonstração são fictícios.
          O uso do AEGIS não garante isoladamente conformidade com LGPD ou ISO 27001.
        </p>
      </div>

      {/* Quick export cards */}
      <div>
        <h3 className="text-white font-semibold mb-4">Exportações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Resumo Executivo', desc: 'Visão geral dos indicadores da organização', icon: FileText, type: 'GENERAL', format: 'PDF' },
            { title: 'Análise por Setor (CSV)', desc: 'Dados detalhados exportáveis para Excel', icon: Building2, type: 'BY_DEPARTMENT', format: 'CSV' },
            { title: 'Relatório de HRI', desc: 'Evolução do risco humano por departamento', icon: Target, type: 'HRI', format: 'PDF' },
          ].map(preset => {
            const Icon = preset.icon;
            return (
              <div key={preset.title} className="card hover:border-slate-700 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-blue-900/30 p-2 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm">{preset.title}</h4>
                    <p className="text-slate-500 text-xs mt-0.5">{preset.desc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => {
                    const nextFilters = { title: preset.title, format: preset.format, type: preset.type };
                    setFilters(nextFilters);
                    downloadReport(nextFilters, `aegis-${preset.type.toLowerCase()}`);
                  }}
                  className="btn-secondary w-full text-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar {preset.format}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

