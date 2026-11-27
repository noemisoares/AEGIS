import PDFDocument from 'pdfkit';

export type ReportType = 'GENERAL' | 'BY_DEPARTMENT' | 'BY_CAMPAIGN' | 'HRI' | 'AUDIT' | string;

export interface ReportData {
  organization: { name: string } | null;
  generatedAt: Date;
  generatedBy: string;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    createdAt?: Date;
    template?: { name: string } | null;
    _count: { targets: number; simulationResults: number };
  }>;
  departments: Array<{
    id: string;
    name: string;
    users: Array<{ hriScores: Array<{ score: number }> }>;
    hriHistory?: Array<{ calculatedAt: Date }>;
  }>;
  simulations: Array<{
    sentAt?: Date;
    openedAt?: Date | null;
    clickedAt: Date | null;
    reportedAt: Date | null;
    pillCompletedAt: Date | null;
    campaign: { name: string };
    user: {
      departmentId?: string | null;
      name: string;
      department: { name: string } | null;
    };
  }>;
  reports: Array<{
    id: string;
    createdAt: Date;
    isCorrect: boolean | null;
    user: { name: string; department?: { name: string } | null };
  }>;
  hriData: Array<{
    departmentId: string;
    avgScore: number;
    riskLevel: string;
    calculatedAt: Date;
    department: { name: string };
  }>;
  summary: {
    totalUsers: number;
    totalCampaigns: number;
    totalSimulations: number;
    totalClicks: number;
    totalReports: number;
    clickRate: string;
    reportRate: string;
  };
}

function getRiskLabel(score: number): string {
  if (score < 25) return 'BAIXO';
  if (score < 50) return 'MODERADO';
  if (score < 75) return 'ALTO';
  return 'CRÍTICO';
}

function getCampaignStatusLabel(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'Concluída';
    case 'ACTIVE': return 'Ativa';
    case 'DRAFT': return 'Rascunho';
    case 'PAUSED': return 'Pausada';
    default: return status;
  }
}

function getReportTypeLabel(type: ReportType): string {
  switch (type) {
    case 'BY_DEPARTMENT': return 'Análise por Setor';
    case 'BY_CAMPAIGN': return 'Análise por Campanha';
    case 'HRI': return 'Análise de Risco Humano (HRI)';
    case 'AUDIT': return 'Auditoria Completa';
    default: return 'Geral (Resumo Executivo)';
  }
}

function computeDepartmentMetrics(data: ReportData) {
  return data.departments.map((dept) => {
    const scores = dept.users.map((u) => u.hriScores[0]?.score ?? 50);
    const avgHri = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
    const deptSims = data.simulations.filter(
      (s) => s.user.departmentId === dept.id || s.user.department?.name === dept.name
    );
    const clicks = deptSims.filter((s) => s.clickedAt).length;
    const deptReports = data.reports.filter((r) => r.user.department?.name === dept.name).length;
    const clickRate = deptSims.length > 0 ? ((clicks / deptSims.length) * 100).toFixed(1) : '0.0';
    const reportRate = deptSims.length > 0 ? ((deptReports / deptSims.length) * 100).toFixed(1) : '0.0';

    const dist = {
      low: scores.filter((s) => s < 25).length,
      moderate: scores.filter((s) => s >= 25 && s < 50).length,
      high: scores.filter((s) => s >= 50 && s < 75).length,
      critical: scores.filter((s) => s >= 75).length,
    };

    const lastCalc = dept.hriHistory?.[0]?.calculatedAt ?? data.generatedAt;

    return {
      id: dept.id,
      name: dept.name,
      userCount: dept.users.length,
      avgHri,
      riskLevel: getRiskLabel(avgHri),
      simCount: deptSims.length,
      clicks,
      clickRate,
      reports: deptReports,
      reportRate,
      dist,
      lastCalc,
    };
  });
}

export async function generatePdfReport(
  data: ReportData,
  title: string,
  reportType: ReportType = 'GENERAL'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 45, size: 'A4', bufferPages: true });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Palette
    const primary = '#1e3a5f';
    const secondary = '#2563eb';
    const accent = '#10b981';
    const warning = '#d97706';
    const danger = '#dc2626';
    const textDark = '#111827';
    const textGray = '#6b7280';
    const borderGray = '#e2e8f0';
    const rowAlt = '#f8fafc';

    // Page geometry (A4: 595.28 x 841.89)
    const LEFT = 45;
    const RIGHT = doc.page.width - 45;
    const WIDTH = RIGHT - LEFT;
    const TOP_CONT = 56;
    const BOTTOM_LIMIT = doc.page.height - 70;

    let y = 0;
    let sectionIndex = 1;

    const drawRunningHeader = () => {
      doc.save();
      doc.fillColor(primary).fontSize(8.5).font('Helvetica-Bold').text('AEGIS', LEFT, 22, { lineBreak: false });
      doc.fillColor(textGray).fontSize(8.5).font('Helvetica').text(
        title.length > 68 ? `${title.substring(0, 65)}...` : title,
        LEFT + 40,
        22,
        { width: WIDTH - 40, align: 'right', lineBreak: false }
      );
      doc.moveTo(LEFT, 38).lineTo(RIGHT, 38).strokeColor(borderGray).lineWidth(0.75).stroke();
      doc.restore();
    };

    const startNewPage = () => {
      doc.addPage();
      drawRunningHeader();
      y = TOP_CONT;
    };

    const ensureSpace = (needed: number) => {
      if (y + needed > BOTTOM_LIMIT) {
        startNewPage();
      }
    };

    const drawSectionHeading = (heading: string, minFollowingHeight = 52) => {
      ensureSpace(24 + minFollowingHeight);
      doc.fillColor(primary).fontSize(12.5).font('Helvetica-Bold').text(`${sectionIndex++}. ${heading}`, LEFT, y);
      y += 19;
    };

    // ---- PAGE 1 HEADER BANNER ----
    doc.rect(0, 0, doc.page.width, 64).fill(primary);
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text('AEGIS', LEFT, 15, { lineBreak: false });
    doc.fontSize(9).font('Helvetica').text(
      'Plataforma de Governança Comportamental em Cibersegurança',
      LEFT,
      40,
      { lineBreak: false }
    );
    doc.fontSize(8.5).text(
      `Gerado em: ${data.generatedAt.toLocaleString('pt-BR')}`,
      LEFT,
      28,
      { width: WIDTH, align: 'right', lineBreak: false }
    );

    // ---- TITLE & METADATA ----
    y = 78;
    doc.fillColor(primary).fontSize(15.5).font('Helvetica-Bold').text(title, LEFT, y, { width: WIDTH });
    y = doc.y + 4;
    doc.fillColor(textGray).fontSize(9).font('Helvetica').text(
      `Organização: ${data.organization?.name ?? 'AEGIS Corporation'}   |   Tipo: ${getReportTypeLabel(reportType)}   |   Data: ${data.generatedAt.toLocaleDateString('pt-BR')}`,
      LEFT,
      y,
      { width: WIDTH }
    );
    y = doc.y + 8;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor(secondary).lineWidth(1.5).stroke();
    y += 14;

    // ---- 1. EXECUTIVE SUMMARY ----
    drawSectionHeading('Resumo Executivo', 110);

    const cards = [
      { label: 'Colaboradores Ativos', value: String(data.summary.totalUsers), color: secondary },
      { label: 'Campanhas', value: String(data.summary.totalCampaigns), color: secondary },
      { label: 'Simulações Enviadas', value: String(data.summary.totalSimulations), color: secondary },
      { label: 'Taxa de Cliques', value: `${data.summary.clickRate}%`, color: danger },
      { label: 'Taxa de Reporte', value: `${data.summary.reportRate}%`, color: accent },
      { label: 'Denúncias Registradas', value: String(data.summary.totalReports), color: accent },
    ];

    const cardGap = 10;
    const cardW = (WIDTH - cardGap * 2) / 3;
    const cardH = 46;

    cards.forEach((card, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = LEFT + col * (cardW + cardGap);
      const cy = y + row * (cardH + 8);
      doc.rect(cx, cy, cardW, cardH).fillColor(rowAlt).fill();
      doc.rect(cx, cy, cardW, cardH).strokeColor(borderGray).lineWidth(0.75).stroke();
      doc.fillColor(card.color).fontSize(17).font('Helvetica-Bold').text(card.value, cx + 10, cy + 7, { lineBreak: false });
      doc.fillColor(textGray).fontSize(8.5).font('Helvetica').text(card.label, cx + 10, cy + 29, { lineBreak: false });
    });

    y += 2 * cardH + 8 + 16;

    // ---- 2. CAMPAIGNS ----
    if (reportType === 'GENERAL' || reportType === 'BY_CAMPAIGN' || reportType === 'AUDIT') {
      const rowH = 19;
      const headerH = 20;

      const drawCampaignHeader = () => {
        doc.rect(LEFT, y, WIDTH, headerH).fillColor(primary).fill();
        doc.fillColor('white').fontSize(8.5).font('Helvetica-Bold');
        doc.text('Campanha', LEFT + 6, y + 6, { width: 215, lineBreak: false });
        doc.text('Modelo', LEFT + 225, y + 6, { width: 110, lineBreak: false });
        doc.text('Status', LEFT + 340, y + 6, { width: 65, lineBreak: false });
        doc.text('Alvos', LEFT + 410, y + 6, { width: 40, align: 'right', lineBreak: false });
        doc.text('Simulações', LEFT + 455, y + 6, { width: 45, align: 'right', lineBreak: false });
        y += headerH;
      };

      drawSectionHeading('Campanhas Realizadas', headerH + rowH);
      drawCampaignHeader();

      if (data.campaigns.length === 0) {
        doc.rect(LEFT, y, WIDTH, rowH).fillColor(rowAlt).fill();
        doc.fillColor(textGray).fontSize(8.5).font('Helvetica').text('Nenhuma campanha registrada.', LEFT + 6, y + 5);
        y += rowH;
      } else {
        data.campaigns.forEach((campaign, idx) => {
          if (y + rowH > BOTTOM_LIMIT) {
            startNewPage();
            drawCampaignHeader();
          }

          doc.rect(LEFT, y, WIDTH, rowH).fillColor(idx % 2 === 0 ? 'white' : rowAlt).fill();
          doc.moveTo(LEFT, y + rowH).lineTo(RIGHT, y + rowH).strokeColor(borderGray).lineWidth(0.4).stroke();

          const nameText = campaign.name.length > 42 ? `${campaign.name.substring(0, 39)}...` : campaign.name;
          const tplName = campaign.template?.name ?? '-';
          const tplText = tplName.length > 22 ? `${tplName.substring(0, 19)}...` : tplName;
          const statusColor = campaign.status === 'COMPLETED' ? accent : campaign.status === 'ACTIVE' ? secondary : textGray;

          doc.fillColor(textDark).fontSize(8).font('Helvetica').text(nameText, LEFT + 6, y + 5.5, { width: 215, lineBreak: false });
          doc.fillColor(textGray).text(tplText, LEFT + 225, y + 5.5, { width: 110, lineBreak: false });
          doc.fillColor(statusColor).font('Helvetica-Bold').text(getCampaignStatusLabel(campaign.status), LEFT + 340, y + 5.5, { width: 65, lineBreak: false });
          doc.fillColor(textDark).font('Helvetica').text(String(campaign._count.targets), LEFT + 410, y + 5.5, { width: 40, align: 'right', lineBreak: false });
          doc.text(String(campaign._count.simulationResults), LEFT + 455, y + 5.5, { width: 45, align: 'right', lineBreak: false });
          y += rowH;
        });
      }

      y += 14;
    }

    // ---- 3. HRI BY DEPARTMENT ----
    if (reportType === 'GENERAL' || reportType === 'BY_DEPARTMENT' || reportType === 'HRI' || reportType === 'AUDIT') {
      const deptMetrics = computeDepartmentMetrics(data);
      const rowH = 20;
      const headerH = 20;

      const drawDeptHeader = () => {
        doc.rect(LEFT, y, WIDTH, headerH).fillColor(primary).fill();
        doc.fillColor('white').fontSize(8.5).font('Helvetica-Bold');
        doc.text('Setor', LEFT + 6, y + 6, { width: 170, lineBreak: false });
        doc.text('Colab.', LEFT + 180, y + 6, { width: 45, align: 'right', lineBreak: false });
        doc.text('Cliques', LEFT + 235, y + 6, { width: 55, align: 'right', lineBreak: false });
        doc.text('Reportes', LEFT + 300, y + 6, { width: 55, align: 'right', lineBreak: false });
        doc.text('HRI Médio', LEFT + 365, y + 6, { width: 55, align: 'right', lineBreak: false });
        doc.text('Nível de Risco', LEFT + 430, y + 6, { width: 70, align: 'right', lineBreak: false });
        y += headerH;
      };

      drawSectionHeading('Índice de Risco Humano (HRI) por Setor', headerH + rowH);
      drawDeptHeader();

      deptMetrics.forEach((dept, idx) => {
        if (y + rowH > BOTTOM_LIMIT) {
          startNewPage();
          drawDeptHeader();
        }

        const riskColor = dept.avgHri < 25 ? accent : dept.avgHri < 50 ? warning : danger;

        doc.rect(LEFT, y, WIDTH, rowH).fillColor(idx % 2 === 0 ? 'white' : rowAlt).fill();
        doc.moveTo(LEFT, y + rowH).lineTo(RIGHT, y + rowH).strokeColor(borderGray).lineWidth(0.4).stroke();

        doc.fillColor(textDark).fontSize(8.5).font('Helvetica').text(dept.name, LEFT + 6, y + 6, { width: 170, lineBreak: false });
        doc.text(String(dept.userCount), LEFT + 180, y + 6, { width: 45, align: 'right', lineBreak: false });
        doc.text(`${dept.clicks} (${dept.clickRate}%)`, LEFT + 235, y + 6, { width: 55, align: 'right', lineBreak: false });
        doc.text(`${dept.reports} (${dept.reportRate}%)`, LEFT + 300, y + 6, { width: 55, align: 'right', lineBreak: false });
        doc.font('Helvetica-Bold').text(dept.avgHri.toFixed(1), LEFT + 365, y + 6, { width: 55, align: 'right', lineBreak: false });
        doc.fillColor(riskColor).text(dept.riskLevel, LEFT + 430, y + 6, { width: 70, align: 'right', lineBreak: false });
        y += rowH;
      });

      y += 14;
    }

    // ---- 4. BEHAVIORAL EVIDENCES (AUDIT ONLY) ----
    if (reportType === 'AUDIT' && data.simulations.length > 0) {
      const rowH = 18;
      const headerH = 20;

      const drawSimHeader = () => {
        doc.rect(LEFT, y, WIDTH, headerH).fillColor(primary).fill();
        doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
        doc.text('Colaborador', LEFT + 6, y + 6, { width: 140, lineBreak: false });
        doc.text('Setor', LEFT + 150, y + 6, { width: 95, lineBreak: false });
        doc.text('Campanha', LEFT + 250, y + 6, { width: 135, lineBreak: false });
        doc.text('Clicou', LEFT + 390, y + 6, { width: 38, align: 'center', lineBreak: false });
        doc.text('Reportou', LEFT + 430, y + 6, { width: 40, align: 'center', lineBreak: false });
        doc.text('Pílula', LEFT + 472, y + 6, { width: 32, align: 'center', lineBreak: false });
        y += headerH;
      };

      drawSectionHeading('Evidências Comportamentais (Amostra Recente)', headerH + rowH);
      drawSimHeader();

      const simsToRender = data.simulations.slice(0, 50);
      simsToRender.forEach((sim, idx) => {
        if (y + rowH > BOTTOM_LIMIT) {
          startNewPage();
          drawSimHeader();
        }

        doc.rect(LEFT, y, WIDTH, rowH).fillColor(idx % 2 === 0 ? 'white' : rowAlt).fill();
        doc.moveTo(LEFT, y + rowH).lineTo(RIGHT, y + rowH).strokeColor(borderGray).lineWidth(0.4).stroke();

        const userName = sim.user.name.length > 26 ? `${sim.user.name.substring(0, 23)}...` : sim.user.name;
        const deptName = sim.user.department?.name ?? '-';
        const campName = sim.campaign.name.length > 26 ? `${sim.campaign.name.substring(0, 23)}...` : sim.campaign.name;

        doc.fillColor(textDark).fontSize(7.8).font('Helvetica').text(userName, LEFT + 6, y + 5, { width: 140, lineBreak: false });
        doc.fillColor(textGray).text(deptName, LEFT + 150, y + 5, { width: 95, lineBreak: false });
        doc.text(campName, LEFT + 250, y + 5, { width: 135, lineBreak: false });
        doc.fillColor(sim.clickedAt ? danger : textGray).text(sim.clickedAt ? 'Sim' : 'Não', LEFT + 390, y + 5, { width: 38, align: 'center', lineBreak: false });
        doc.fillColor(sim.reportedAt ? accent : textGray).text(sim.reportedAt ? 'Sim' : 'Não', LEFT + 430, y + 5, { width: 40, align: 'center', lineBreak: false });
        doc.fillColor(sim.pillCompletedAt ? secondary : textGray).text(sim.pillCompletedAt ? 'Sim' : 'Não', LEFT + 472, y + 5, { width: 32, align: 'center', lineBreak: false });
        y += rowH;
      });

      y += 14;
    }

    // ---- 5. METHODOLOGY (kept together) ----
    if (reportType === 'GENERAL' || reportType === 'HRI' || reportType === 'AUDIT') {
      const methodologyHeight = 148;
      drawSectionHeading('Metodologia de Cálculo do HRI', methodologyHeight);

      doc.rect(LEFT, y, WIDTH, 134).fillColor(rowAlt).fill();
      doc.rect(LEFT, y, WIDTH, 134).strokeColor(borderGray).lineWidth(0.75).stroke();

      const items = [
        '• Taxa de Cliques em Simulações (peso 40%): principal indicador de vulnerabilidade.',
        '• Taxa de Reporte de Ameaças (peso 25%): inversamente proporcional — maior reporte reduz o risco.',
        '• Reincidência de Erros (peso 20%): erros repetidos em múltiplas campanhas elevam o risco.',
        '• Conclusão de Pílulas Educativas (peso 10%): conclusão dos microtreinamentos reduz o risco.',
        '• Taxa de Participação (peso 5%): baixa participação indica menor confiança estatística.',
      ];

      let my = y + 10;
      doc.fillColor('#374151').fontSize(8.5).font('Helvetica');
      for (const item of items) {
        doc.text(item, LEFT + 12, my, { width: WIDTH - 24, lineBreak: false });
        my += 15;
      }

      my += 4;
      doc.fillColor(primary).fontSize(8.5).font('Helvetica-Bold').text(
        'Escala: 0–24 (Baixo)  |  25–49 (Moderado)  |  50–74 (Alto)  |  75–100 (Crítico)',
        LEFT + 12,
        my,
        { width: WIDTH - 24, lineBreak: false }
      );
      my += 14;
      doc.fillColor(textGray).fontSize(8).font('Helvetica').text(
        'Janela histórica: últimas 20 simulações por colaborador, com fator de confiança proporcional às observações.',
        LEFT + 12,
        my,
        { width: WIDTH - 24, lineBreak: false }
      );
    }

    // ---- CONSISTENT PAGE FOOTERS & PAGE NUMBERS ----
    const pageRange = doc.bufferedPageRange();
    const totalPages = pageRange.count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      const footerY = doc.page.height - 42;
      doc.moveTo(LEFT, footerY - 6).lineTo(RIGHT, footerY - 6).strokeColor(borderGray).lineWidth(0.6).stroke();
      doc.fillColor(textGray).fontSize(7.5).font('Helvetica').text(
        `AEGIS · Gerado em ${data.generatedAt.toLocaleString('pt-BR')} · O uso do AEGIS não garante isoladamente conformidade com LGPD ou ISO 27001.`,
        LEFT,
        footerY,
        { width: WIDTH - 80, lineBreak: false }
      );
      doc.text(`Página ${i + 1} de ${totalPages}`, LEFT, footerY, {
        width: WIDTH,
        align: 'right',
        lineBreak: false,
      });
    }

    doc.end();
  });
}

function escapeCsvCell(value: string | number | boolean | Date | null | undefined): string {
  if (value === null || value === undefined) return '';
  let str: string;
  if (value instanceof Date) {
    str = value.toLocaleString('pt-BR');
  } else if (typeof value === 'boolean') {
    str = value ? 'Sim' : 'Não';
  } else {
    str = String(value);
  }
  str = str.replace(/\r?\n/g, ' ');
  if (str.includes(';') || str.includes('"') || str.startsWith(' ') || str.endsWith(' ')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(
  headers: string[],
  rows: Array<Array<string | number | boolean | Date | null | undefined>>
): string {
  const lines = [
    headers.map(escapeCsvCell).join(';'),
    ...rows.map((row) => row.map(escapeCsvCell).join(';')),
  ];
  // UTF-8 BOM + CRLF ensures direct opening in Microsoft Excel (PT-BR) with accents and separated columns
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function generateCsvReport(data: ReportData, reportType: ReportType = 'GENERAL'): string {
  const deptMetrics = computeDepartmentMetrics(data);

  switch (reportType) {
    case 'BY_CAMPAIGN': {
      const headers = [
        'Campanha',
        'Modelo',
        'Status',
        'Alvos',
        'Simulações Enviadas',
        'Cliques',
        'Taxa de Cliques (%)',
        'Data de Criação',
      ];
      const rows = data.campaigns.map((c) => {
        const campSims = data.simulations.filter((s) => s.campaign.name === c.name);
        const clicks = campSims.filter((s) => s.clickedAt).length;
        const clickRate = campSims.length > 0 ? ((clicks / campSims.length) * 100).toFixed(1) : '0.0';
        return [
          c.name,
          c.template?.name ?? '-',
          getCampaignStatusLabel(c.status),
          c._count.targets,
          c._count.simulationResults,
          clicks,
          clickRate,
          c.createdAt ? c.createdAt.toLocaleString('pt-BR') : '-',
        ];
      });
      return buildCsv(headers, rows);
    }

    case 'HRI': {
      const headers = [
        'Setor',
        'Colaboradores Ativos',
        'HRI Médio',
        'Nível de Risco',
        'Baixo Risco',
        'Risco Moderado',
        'Alto Risco',
        'Risco Crítico',
        'Último Cálculo',
      ];
      const rows = deptMetrics.map((d) => [
        d.name,
        d.userCount,
        d.avgHri.toFixed(1),
        d.riskLevel,
        d.dist.low,
        d.dist.moderate,
        d.dist.high,
        d.dist.critical,
        d.lastCalc,
      ]);
      return buildCsv(headers, rows);
    }

    case 'AUDIT': {
      const headers = [
        'Colaborador',
        'Setor',
        'Campanha',
        'Enviada em',
        'Aberta em',
        'Clicou',
        'Clicou em',
        'Reportou',
        'Reportou em',
        'Pílula Concluída',
        'Concluída em',
      ];
      const rows = data.simulations.map((sim) => [
        sim.user.name,
        sim.user.department?.name ?? '-',
        sim.campaign.name,
        sim.sentAt ?? null,
        sim.openedAt ?? null,
        Boolean(sim.clickedAt),
        sim.clickedAt ?? null,
        Boolean(sim.reportedAt),
        sim.reportedAt ?? null,
        Boolean(sim.pillCompletedAt),
        sim.pillCompletedAt ?? null,
      ]);
      return buildCsv(headers, rows);
    }

    case 'BY_DEPARTMENT': {
      const headers = [
        'Setor',
        'Colaboradores Ativos',
        'HRI Médio',
        'Nível de Risco',
        'Simulações',
        'Cliques',
        'Taxa de Cliques (%)',
        'Reportes',
        'Taxa de Reporte (%)',
      ];
      const rows = deptMetrics.map((d) => [
        d.name,
        d.userCount,
        d.avgHri.toFixed(1),
        d.riskLevel,
        d.simCount,
        d.clicks,
        d.clickRate,
        d.reports,
        d.reportRate,
      ]);
      return buildCsv(headers, rows);
    }

    case 'GENERAL':
    default: {
      const headers = [
        'Setor',
        'Colaboradores Ativos',
        'HRI Médio',
        'Nível de Risco',
        'Simulações',
        'Cliques',
        'Taxa de Cliques (%)',
        'Reportes',
        'Taxa de Reporte (%)',
      ];
      const rows: Array<Array<string | number | boolean | Date | null | undefined>> = deptMetrics.map((d) => [
        d.name,
        d.userCount,
        d.avgHri.toFixed(1),
        d.riskLevel,
        d.simCount,
        d.clicks,
        d.clickRate,
        d.reports,
        d.reportRate,
      ]);

      const overallAvgHri =
        deptMetrics.length > 0
          ? deptMetrics.reduce((sum, d) => sum + d.avgHri, 0) / deptMetrics.length
          : 50;

      rows.push([
        'TOTAL ORGANIZAÇÃO',
        data.summary.totalUsers,
        overallAvgHri.toFixed(1),
        getRiskLabel(overallAvgHri),
        data.summary.totalSimulations,
        data.summary.totalClicks,
        data.summary.clickRate,
        data.summary.totalReports,
        data.summary.reportRate,
      ]);

      return buildCsv(headers, rows);
    }
  }
}
