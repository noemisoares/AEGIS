import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { calculateAndStoreHri } from '../services/hriService';
import { awardPoints } from '../services/pointsService';

const router = Router();

// POST /api/demo/reset - Reset demo data (requires confirmation)
router.post('/reset', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'RESET_DEMO_DATA') {
      res.status(400).json({ error: 'Confirmation required: send { "confirm": "RESET_DEMO_DATA" }' });
      return;
    }

    const orgId = req.user!.organizationId;

    // Delete all simulation data for this org
    await prisma.$transaction([
      prisma.hriHistory.deleteMany({ where: { department: { organizationId: orgId } } }),
      prisma.hriScore.deleteMany({ where: { user: { organizationId: orgId } } }),
      prisma.pillCompletion.deleteMany({ where: { user: { organizationId: orgId } } }),
      prisma.threatReport.deleteMany({ where: { user: { organizationId: orgId } } }),
      prisma.simulationResult.deleteMany({ where: { campaign: { organizationId: orgId } } }),
      prisma.campaignTarget.deleteMany({ where: { campaign: { organizationId: orgId } } }),
      prisma.campaign.deleteMany({ where: { organizationId: orgId, isDemo: false } } as never),
      prisma.pointTransaction.deleteMany({ where: { user: { organizationId: orgId } } }),
      prisma.userPoints.deleteMany({ where: { user: { organizationId: orgId } } }),
      prisma.eventLog.deleteMany({ where: { organizationId: orgId } }),
    ]);

    // Reset user points
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });

    for (const user of users) {
      await prisma.userPoints.create({ data: { userId: user.id, totalPoints: 0 } });
    }

    res.json({ success: true, message: 'Demo data reset successfully' });
  } catch (error) {
    console.error('Demo reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/demo/simulate-campaign/:campaignId - Simulate behavioral events for a campaign
router.post('/simulate-campaign/:campaignId', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const orgId = req.user!.organizationId;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId: orgId, status: 'ACTIVE' },
      include: {
        template: { include: { pills: true } },
        targets: { include: { campaign: false } },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Active campaign not found' });
      return;
    }

    const userIds = campaign.targets.map(t => t.userId);
    if (userIds.length === 0) {
      res.status(400).json({ error: 'Campaign has no targets' });
      return;
    }

    const pill = campaign.template.pills[0];
    const now = new Date();
    let clickCount = 0;
    let reportCount = 0;
    let pillCompletedCount = 0;

    // Simulate realistic behaviors
    for (const userId of userIds) {
      const rand = Math.random();
      
      // 30% click phishing link
      if (rand < 0.30) {
        const clickTime = new Date(now.getTime() - Math.random() * 3600000);
        await prisma.simulationResult.update({
          where: { campaignId_userId: { campaignId, userId } },
          data: {
            openedAt: new Date(clickTime.getTime() - 60000),
            clickedAt: clickTime,
            status: 'CLICKED',
            pillShownAt: pill ? new Date(clickTime.getTime() + 5000) : undefined,
          },
        });
        clickCount++;

        // 70% of clickers complete the pill
        if (pill && Math.random() < 0.70) {
          const pillTime = new Date(clickTime.getTime() + 180000);
          await prisma.simulationResult.update({
            where: { campaignId_userId: { campaignId, userId } },
            data: { pillCompletedAt: pillTime, status: 'COMPLETED' },
          });

          await prisma.pillCompletion.upsert({
            where: { userId_pillId_campaignId: { userId, pillId: pill.id, campaignId } },
            create: { userId, pillId: pill.id, campaignId, timeSpent: 120 },
            update: {},
          });

          await awardPoints(userId, 'PILL_COMPLETED', 5, `${pill.id}-${campaignId}`, 'Pílula educativa concluída');
          pillCompletedCount++;
        }
      } else if (rand < 0.65) {
        // 35% report correctly without clicking
        const openTime = new Date(now.getTime() - Math.random() * 3600000);
        const reportTime = new Date(openTime.getTime() + 30000);

        await prisma.simulationResult.update({
          where: { campaignId_userId: { campaignId, userId } },
          data: {
            openedAt: openTime,
            reportedAt: reportTime,
            status: 'REPORTED',
          },
        });

        const existingReport = await prisma.threatReport.findFirst({ where: { userId, campaignId } });
        if (!existingReport) {
          await prisma.threatReport.create({
            data: { userId, campaignId, reportType: 'SIMULATION', isCorrect: true, pointsAwarded: 20 },
          });
          await awardPoints(userId, 'THREAT_REPORTED_CORRECT', 20, campaignId, 'Ameaça reportada corretamente');
          reportCount++;
        }
      } else {
        // 35% just opened without action
        await prisma.simulationResult.update({
          where: { campaignId_userId: { campaignId, userId } },
          data: {
            openedAt: new Date(now.getTime() - Math.random() * 7200000),
            status: 'OPENED',
          },
        });
      }
    }

    // Recalculate HRI for affected departments
    const affectedUsers = await prisma.simulationResult.findMany({
      where: { campaignId },
      include: { user: { select: { departmentId: true } } },
    });
    const deptIds = [...new Set(affectedUsers.map(r => r.user.departmentId).filter(Boolean) as string[])];
    for (const deptId of deptIds) {
      await calculateAndStoreHri(deptId, campaignId);
    }

    res.json({
      success: true,
      message: 'Behavioral simulation complete',
      stats: {
        total: userIds.length,
        clicked: clickCount,
        reported: reportCount,
        pillCompleted: pillCompletedCount,
      },
    });
  } catch (error) {
    console.error('Demo simulate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/demo/status - Demo environment status
router.get('/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId;

    const [userCount, campaignCount, simCount, reportCount] = await Promise.all([
      prisma.user.count({ where: { organizationId: orgId } }),
      prisma.campaign.count({ where: { organizationId: orgId } }),
      prisma.simulationResult.count({ where: { campaign: { organizationId: orgId } } }),
      prisma.threatReport.count({ where: { user: { organizationId: orgId } } }),
    ]);

    res.json({
      isDemoMode: process.env.DEMO_MODE === 'true',
      organization: orgId,
      stats: { userCount, campaignCount, simCount, reportCount },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

