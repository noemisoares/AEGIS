import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/overview - Main dashboard metrics
router.get('/overview', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId;
    const { startDate, endDate } = req.query;

    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const [
      totalUsers,
      activeUsers,
      campaigns,
      simulationResults,
      threatReports,
      events,
    ] = await Promise.all([
      prisma.user.count({ where: { organizationId: orgId, role: 'COLLABORATOR' } }),
      prisma.user.count({ where: { organizationId: orgId, role: 'COLLABORATOR', status: 'ACTIVE' } }),
      prisma.campaign.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, status: true, startedAt: true, endedAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.simulationResult.findMany({
        where: { campaign: { organizationId: orgId } },
        select: { sentAt: true, openedAt: true, clickedAt: true, reportedAt: true, pillCompletedAt: true },
      }),
      prisma.threatReport.findMany({
        where: { user: { organizationId: orgId } },
        select: { id: true, createdAt: true, isCorrect: true },
      }),
      prisma.eventLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const totalSims = simulationResults.length;
    const totalClicks = simulationResults.filter(s => s.clickedAt).length;
    const totalReports = threatReports.length;
    const totalPillsCompleted = simulationResults.filter(s => s.pillCompletedAt).length;
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
    const completedCampaigns = campaigns.filter(c => c.status === 'COMPLETED').length;

    res.json({
      users: { total: totalUsers, active: activeUsers },
      campaigns: {
        total: campaigns.length,
        active: activeCampaigns,
        completed: completedCampaigns,
        list: campaigns.slice(0, 10),
      },
      simulations: {
        total: totalSims,
        clicked: totalClicks,
        reported: totalReports,
        pillsCompleted: totalPillsCompleted,
        clickRate: totalSims > 0 ? ((totalClicks / totalSims) * 100).toFixed(1) : '0',
        reportRate: totalSims > 0 ? ((totalReports / totalSims) * 100).toFixed(1) : '0',
        pillCompletionRate: totalClicks > 0 ? ((totalPillsCompleted / totalClicks) * 100).toFixed(1) : '0',
      },
      recentEvents: events.map(e => ({
        id: e.id,
        type: e.eventType,
        userId: e.userId,
        campaignId: e.campaignId,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/behavior - Behavior trends
router.get('/behavior', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId;

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      include: {
        simulationResults: {
          select: { sentAt: true, clickedAt: true, reportedAt: true, pillCompletedAt: true },
        },
        _count: { select: { targets: true } },
      },
      orderBy: { startedAt: 'asc' },
    });

    const trend = campaigns.map(c => {
      const total = c.simulationResults.length;
      const clicked = c.simulationResults.filter(r => r.clickedAt).length;
      const reported = c.simulationResults.filter(r => r.reportedAt).length;
      const pillsDone = c.simulationResults.filter(r => r.pillCompletedAt).length;

      return {
        campaignId: c.id,
        campaignName: c.name,
        date: c.startedAt,
        total,
        clicked,
        reported,
        pillsDone,
        clickRate: total > 0 ? ((clicked / total) * 100).toFixed(1) : '0',
        reportRate: total > 0 ? ((reported / total) * 100).toFixed(1) : '0',
      };
    });

    res.json(trend);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/sectors - Data by sector/department
router.get('/sectors', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId;

    const departments = await prisma.department.findMany({
      where: { organizationId: orgId },
      include: {
        users: {
          where: { status: 'ACTIVE' },
          include: {
            simulationResults: {
              select: { clickedAt: true, reportedAt: true, pillCompletedAt: true },
            },
            hriScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
          },
        },
        hriHistory: { orderBy: { calculatedAt: 'desc' }, take: 5 },
      },
    });

    const sectors = departments.map(dept => {
      const allSims = dept.users.flatMap(u => u.simulationResults);
      const total = allSims.length;
      const clicked = allSims.filter(s => s.clickedAt).length;
      const reported = allSims.filter(s => s.reportedAt).length;
      const pillsDone = allSims.filter(s => s.pillCompletedAt).length;

      const scores = dept.users.map(u => u.hriScores[0]?.score ?? 50);
      const avgHri = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;

      return {
        id: dept.id,
        name: dept.name,
        userCount: dept.users.length,
        simulations: { total, clicked, reported, pillsDone },
        clickRate: total > 0 ? ((clicked / total) * 100).toFixed(1) : '0',
        reportRate: total > 0 ? ((reported / total) * 100).toFixed(1) : '0',
        avgHri: Math.round(avgHri * 10) / 10,
        hriHistory: dept.hriHistory.reverse(),
      };
    });

    res.json(sectors);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

