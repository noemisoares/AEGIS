import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logEvent } from '../services/eventService';
import { awardPoints } from '../services/pointsService';
import { calculateAndStoreUserHri } from '../services/hriService';

const router = Router();

// POST /api/threat-reports - Report a threat
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { campaignId, reportType = 'SIMULATION', description } = req.body;
    const userId = req.user!.id;

    // Check if already reported this campaign
    if (campaignId) {
      const existingReport = await prisma.threatReport.findFirst({
        where: { userId, campaignId },
      });

      if (existingReport) {
        res.json({
          message: 'Already reported',
          isDuplicate: true,
          report: existingReport,
          pointsAwarded: 0,
        });
        return;
      }

      // Check if simulation exists and is active
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, status: 'ACTIVE' },
      });

      if (!campaign) {
        res.status(400).json({ error: 'Campaign not found or not active' });
        return;
      }

      // Update simulation result to mark as reported
      await prisma.simulationResult.upsert({
        where: { campaignId_userId: { campaignId, userId } },
        create: {
          campaignId,
          userId,
          status: 'REPORTED',
          sentAt: new Date(),
          reportedAt: new Date(),
        },
        update: {
          reportedAt: new Date(),
          status: 'REPORTED',
        },
      });
    }

    // Create report
    const report = await prisma.threatReport.create({
      data: {
        userId,
        campaignId,
        reportType,
        description,
        isCorrect: campaignId ? true : null, // If reporting a simulation campaign, it's correct
        isDuplicate: false,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true, organizationId: true },
    });

    await logEvent('THREAT_REPORTED', userId, campaignId, user?.organizationId, user?.departmentId ?? undefined, {
      reportId: report.id,
      reportType,
      isCorrect: report.isCorrect,
    });

    // Award points for correct report
    let pointsAwarded = 0;
    let newTotal = 0;

    if (campaignId) {
      // Check if user clicked first (then reporting is 0 extra) or reporting without clicking (correct identification = 20 pts)
      const simulation = await prisma.simulationResult.findUnique({
        where: { campaignId_userId: { campaignId, userId } },
      });

      if (simulation?.clickedAt) {
        // Clicked and then reported — no extra points, they already failed
      } else {
        // Correctly identified and reported without clicking = full reward
        const result = await awardPoints(userId, 'THREAT_REPORTED_CORRECT', 20, report.id, 'Ameaça reportada corretamente');
        pointsAwarded = result.pointsAwarded;
        newTotal = result.newTotal;
      }
    }

    // Update report with points
    await prisma.threatReport.update({
      where: { id: report.id },
      data: { pointsAwarded },
    });

    // Recalculate HRI
    await calculateAndStoreUserHri(userId);

    await logEvent('SIMULATION_REPORTED', userId, campaignId, user?.organizationId, user?.departmentId ?? undefined, {
      reportId: report.id,
      pointsAwarded,
    });

    res.status(201).json({
      report,
      pointsAwarded,
      newTotal,
      message: campaignId
        ? pointsAwarded > 0
          ? `Parabéns! Você identificou corretamente uma ameaça e ganhou ${pointsAwarded} pontos!`
          : 'Reporte registrado. Lembre-se de não clicar em links suspeitos!'
        : 'Ameaça reportada com sucesso!',
    });
  } catch (error) {
    console.error('Threat report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/threat-reports - List reports
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isManager = ['MANAGER', 'SUPER_ADMIN'].includes(req.user!.role);
    const where: Record<string, unknown> = {};

    if (!isManager) {
      where.userId = req.user!.id;
    } else {
      where.user = { organizationId: req.user!.organizationId };
    }

    const reports = await prisma.threatReport.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, departmentId: true, department: { select: { name: true } } } },
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

