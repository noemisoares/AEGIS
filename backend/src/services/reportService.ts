import PDFDocument from 'pdfkit';

interface ReportData {
  organization: { name: string } | null;
  generatedAt: Date;
  generatedBy: string;
  campaigns: Array<{ id: string; name: string; status: string; _count: { targets: number; simulationResults: number } }>;
  departments: Array<{ id: string; name: string; users: Array<{ hriScores: Array<{ score: number }> }> }>;
  simulations: Array<{ clickedAt: Date | null; reportedAt: Date | null; pillCompletedAt: Date | null; campaign: { name: string }; user: { name: string; department: { name: string } | null } }>;
  reports: Array<{ id: string; createdAt: Date; isCorrect: boolean | null; user: { name: string } }>;
  hriData: Array<{ departmentId: string; avgScore: number; riskLevel: string; calculatedAt: Date; department: { name: string } }>;
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

export async function generatePdfReport(data: ReportData, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Colors
    const primary = '#1e3a5f';
    const secondary = '#2563eb';
    const accent = '#10b981';
    const danger = '#ef4444';
    const textGray = '#6b7280';

    // ---- HEADER ----
    doc.rect(0, 0, doc.page.width, 80).fill(primary);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('AEGIS', 50, 20);
    doc.fontSize(10).font('Helvetica').text('Plataforma de Governança Comportamental em Cibersegurança', 50, 48);
    doc.fillColor('white').fontSize(10).text(`Gerado em: ${data.generatedAt.toLocaleString('pt-BR')}`, 350, 48);
    doc.moveDown(2);

    // ---- TITLE ----
    doc.fillColor(primary).fontSize(18).font('Helvetica-Bold').text(title, 50, 100);
    doc.fillColor(textGray).fontSize(10).font('Helvetica').text(
      `Organização: ${data.organization?.name ?? 'AEGIS Corporation'} | Período: ${data.generatedAt.toLocaleDateString('pt-BR')}`,
      50, 125
    );

    doc.moveTo(50, 145).lineTo(545, 145).strokeColor(secondary).lineWidth(2).stroke();
    doc.moveDown(2);

    // ---- EXECUTIVE SUMMARY ----
    doc.fillColor(primary).fontSize(14).font('Helvetica-Bold').text('1. Resumo Executivo', 50, 160);
    doc.moveDown(0.5);

    const summaryY = 185;
    const cards = [
      { label: 'Colaboradores', value: data.summary.totalUsers, color: secondary },
      { label: 'Campanhas', value: data.summary.totalCampaigns, color: secondary },
      { label: 'Simulações', value: data.summary.totalSimulations, color: secondary },
      { label: 'Taxa de Cliques', value: `${data.summary.clickRate}%`, color: danger },
      { label: 'Taxa de Reporte', value: `${data.summary.reportRate}%`, color: accent },
      { label: 'Reportes', value: data.summary.totalReports, color: accent },
    ];

    cards.forEach((card, i) => {
      const x = 50 + (i % 3) * 165;
      const y = summaryY + Math.floor(i / 3) * 70;
      doc.rect(x, y, 150, 55).fillColor('#f8fafc').fill();
      doc.rect(x, y, 150, 55).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.fillColor(card.color).fontSize(20).font('Helvetica-Bold').text(String(card.value), x + 10, y + 8);
      doc.fillColor(textGray).fontSize(9).font('Helvetica').text(card.label, x + 10, y + 36);
    });

    // ---- CAMPAIGNS ----
    doc.addPage();
    doc.fillColor(primary).fontSize(14).font('Helvetica-Bold').text('2. Campanhas Realizadas', 50, 50);
    doc.moveDown(0.5);

    // Table header
    doc.rect(50, 75, 495, 20).fillColor(primary).fill();
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    doc.text('Nome da Campanha', 55, 81);
    doc.text('Status', 310, 81);
    doc.text('Alvos', 390, 81);
    doc.text('Simulações', 440, 81);

    let yPos = 95;
    for (const campaign of data.campaigns.slice(0, 15)) {
      const bg = yPos % 20 === 15 ? '#f8fafc' : 'white';
      doc.rect(50, yPos, 495, 18).fillColor(bg).fill();
      doc.fillColor('#111827').fontSize(8).font('Helvetica').text(campaign.name.substring(0, 45), 55, yPos + 5);
      
      const statusColor = campaign.status === 'COMPLETED' ? accent : campaign.status === 'ACTIVE' ? secondary : textGray;
      doc.fillColor(statusColor).text(campaign.status, 310, yPos + 5);
      doc.fillColor('#111827').text(String(campaign._count.targets), 390, yPos + 5);
      doc.text(String(campaign._count.simulationResults), 440, yPos + 5);
      yPos += 18;
    }

    // ---- HRI BY DEPARTMENT ----
    doc.addPage();
    doc.fillColor(primary).fontSize(14).font('Helvetica-Bold').text('3. Índice de Risco Humano por Setor', 50, 50);
    doc.moveDown(0.5);

    doc.rect(50, 75, 495, 20).fillColor(primary).fill();
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    doc.text('Setor', 55, 81);
    doc.text('Colaboradores', 250, 81);
    doc.text('HRI Médio', 350, 81);
    doc.text('Nível de Risco', 430, 81);

    yPos = 95;
    for (const dept of data.departments) {
      const scores = dept.users.map(u => u.hriScores[0]?.score ?? 50);
      const avgHri = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
      const riskLevel = avgHri < 25 ? 'BAIXO' : avgHri < 50 ? 'MODERADO' : avgHri < 75 ? 'ALTO' : 'CRÍTICO';
      const riskColor = avgHri < 25 ? accent : avgHri < 50 ? '#f59e0b' : danger;

      doc.rect(50, yPos, 495, 20).fillColor(yPos % 40 === 15 ? '#f8fafc' : 'white').fill();
      doc.fillColor('#111827').fontSize(9).font('Helvetica').text(dept.name, 55, yPos + 6);
      doc.text(String(dept.users.length), 250, yPos + 6);
      doc.text(avgHri.toFixed(1), 350, yPos + 6);
      doc.fillColor(riskColor).font('Helvetica-Bold').text(riskLevel, 430, yPos + 6);
      yPos += 20;
    }

    // ---- FOOTER ----
    doc.addPage();
    doc.fillColor(primary).fontSize(14).font('Helvetica-Bold').text('4. Metodologia HRI', 50, 50);
    doc.moveDown(0.5);
    doc.fillColor('#374151').fontSize(10).font('Helvetica').text(
      `O Índice de Risco Humano (HRI) é calculado com base nos seguintes fatores:

• Taxa de Cliques em Simulações (peso 40%): Principal indicador de vulnerabilidade.
• Taxa de Reporte de Ameaças (peso 25%): Indicador inversamente proporcional — maior reporte = menor risco.
• Reincidência de Erros (peso 20%): Erros repetidos em múltiplas campanhas elevam significativamente o risco.
• Taxa de Conclusão de Pílulas (peso 10%): Colaboradores que concluem os microtreinamentos reduzem seu risco.
• Taxa de Participação (peso 5%): Baixa participação indica dados insuficientes.

Escala: 0–24 (Baixo Risco) | 25–49 (Moderado) | 50–74 (Alto) | 75–100 (Crítico)

Nota: O HRI considera uma janela histórica das últimas 20 simulações por colaborador,
com fator de confiança proporcional ao número de observações disponíveis.`,
      50, 75, { width: 495, lineGap: 4 }
    );

    doc.fillColor(textGray).fontSize(8).text(
      `Este relatório foi gerado automaticamente pela plataforma AEGIS em ${data.generatedAt.toLocaleString('pt-BR')}.
Os dados apresentados são fictícios e destinam-se exclusivamente a fins de demonstração.
O uso do AEGIS não garante, isoladamente, conformidade com LGPD ou ISO 27001.`,
      50, doc.page.height - 80, { width: 495 }
    );

    doc.end();
  });
}

export function generateCsvReport(data: ReportData): string {
  const rows: string[] = [];

  // Headers
  rows.push('AEGIS - Relatório de Auditoria Comportamental');
  rows.push(`Gerado em,${data.generatedAt.toISOString()}`);
  rows.push(`Organização,${data.organization?.name ?? 'AEGIS Corporation'}`);
  rows.push('');

  // Summary
  rows.push('=== RESUMO EXECUTIVO ===');
  rows.push('Métrica,Valor');
  rows.push(`Total de Colaboradores,${data.summary.totalUsers}`);
  rows.push(`Total de Campanhas,${data.summary.totalCampaigns}`);
  rows.push(`Total de Simulações,${data.summary.totalSimulations}`);
  rows.push(`Total de Cliques,${data.summary.totalClicks}`);
  rows.push(`Total de Reportes,${data.summary.totalReports}`);
  rows.push(`Taxa de Cliques,${data.summary.clickRate}%`);
  rows.push(`Taxa de Reporte,${data.summary.reportRate}%`);
  rows.push('');

  // Campaigns
  rows.push('=== CAMPANHAS ===');
  rows.push('Nome,Status,Alvos,Simulações');
  for (const c of data.campaigns) {
    rows.push(`"${c.name}",${c.status},${c._count.targets},${c._count.simulationResults}`);
  }
  rows.push('');

  // Department HRI
  rows.push('=== HRI POR SETOR ===');
  rows.push('Setor,Colaboradores,HRI Médio,Nível de Risco');
  for (const dept of data.departments) {
    const scores = dept.users.map(u => u.hriScores[0]?.score ?? 50);
    const avgHri = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
    const riskLevel = avgHri < 25 ? 'BAIXO' : avgHri < 50 ? 'MODERADO' : avgHri < 75 ? 'ALTO' : 'CRÍTICO';
    rows.push(`"${dept.name}",${dept.users.length},${avgHri.toFixed(1)},${riskLevel}`);
  }
  rows.push('');

  // Simulations detail
  rows.push('=== SIMULAÇÕES ===');
  rows.push('Colaborador,Setor,Campanha,Clicou,Reportou,Pílula Concluída');
  for (const sim of data.simulations.slice(0, 200)) {
    rows.push(
      `"${sim.user.name}","${sim.user.department?.name ?? '-'}","${sim.campaign.name}",${sim.clickedAt ? 'SIM' : 'NÃO'},${sim.reportedAt ? 'SIM' : 'NÃO'},${sim.pillCompletedAt ? 'SIM' : 'NÃO'}`
    );
  }

  return rows.join('\n');
}

