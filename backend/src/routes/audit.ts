import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { generatePdfReport, generateCsvReport } from '../services/reportService';

const router = Router();

// GET /api/audit/reports - List reports
router.get('/reports', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reports = await prisma.report.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/audit/reports/generate - Generate a report
router.post('/reports/generate', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, type = 'GENERAL', format = 'PDF', filters = {} } = req.body;
    const orgId = req.user!.organizationId;

    // Gather data for report
    const org = await prisma.organization.findUnique({ where: { id: orgId } });

    const [campaigns, departments, simResults, reports, hriData] = await Promise.all([
      prisma.campaign.findMany({
        where: { organizationId: orgId },
        include: { template: true, _count: { select: { targets: true, simulationResults: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.department.findMany({
        where: { organizationId: orgId },
        include: {
          users: {
            where: { status: 'ACTIVE' },
            include: {
              hriScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
            },
          },
          hriHistory: { orderBy: { calculatedAt: 'desc' }, take: 5 },
        },
      }),
      prisma.simulationResult.findMany({
        where: { campaign: { organizationId: orgId } },
        include: {
          user: { select: { id: true, name: true, departmentId: true, department: { select: { name: true } } } },
          campaign: { select: { name: true } },
        },
        orderBy: { sentAt: 'desc' },
        take: 500,
      }),
      prisma.threatReport.findMany({
        where: { user: { organizationId: orgId } },
        include: {
          user: { select: { id: true, name: true, department: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.hriHistory.findMany({
        where: { department: { organizationId: orgId } },
        include: { department: { select: { name: true } } },
        orderBy: { calculatedAt: 'desc' },
        take: 50,
      }),
    ]);

    const reportData = {
      organization: org,
      generatedAt: new Date(),
      generatedBy: req.user!.id,
      campaigns,
      departments,
      simulations: simResults,
      reports,
      hriData,
      summary: {
        totalUsers: departments.reduce((acc, d) => acc + d.users.length, 0),
        totalCampaigns: campaigns.length,
        totalSimulations: simResults.length,
        totalClicks: simResults.filter(r => r.clickedAt).length,
        totalReports: reports.length,
        clickRate: simResults.length > 0
          ? ((simResults.filter(r => r.clickedAt).length / simResults.length) * 100).toFixed(1)
          : '0',
        reportRate: simResults.length > 0
          ? ((reports.length / simResults.length) * 100).toFixed(1)
          : '0',
      },
    };

    if (format === 'CSV') {
      const csv = generateCsvReport(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="aegis-report-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      const pdfBuffer = await generatePdfReport(reportData, title || 'Relatório AEGIS');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="aegis-report-${Date.now()}.pdf"`);
      res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
