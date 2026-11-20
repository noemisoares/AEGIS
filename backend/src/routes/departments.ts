import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/departments
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      where: { organizationId: req.user!.organizationId },
      include: {
        _count: { select: { users: true } },
        hriHistory: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = departments.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description,
      userCount: d._count.users,
      latestHri: d.hriHistory[0]?.avgScore ?? null,
      riskLevel: d.hriHistory[0]?.riskLevel ?? null,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/departments
router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const dept = await prisma.department.create({
      data: { name, description, organizationId: req.user!.organizationId },
    });
    res.status(201).json(dept);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/departments/:id/stats
router.get('/:id/stats', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const [users, hriHistory, simulations] = await Promise.all([
      prisma.user.findMany({
        where: { departmentId: id, organizationId: req.user!.organizationId },
        include: {
          hriScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
          points: true,
        },
      }),
      prisma.hriHistory.findMany({
        where: { departmentId: id },
        orderBy: { calculatedAt: 'desc' },
        take: 12,
      }),
      prisma.simulationResult.findMany({
        where: {
          user: { departmentId: id },
        },
        orderBy: { sentAt: 'desc' },
        take: 100,
      }),
    ]);

    const totalSims = simulations.length;
    const clicks = simulations.filter(s => s.clickedAt).length;
    const reports = simulations.filter(s => s.reportedAt).length;
    const pillsCompleted = simulations.filter(s => s.pillCompletedAt).length;

    res.json({
      departmentId: id,
      userCount: users.length,
      avgHri: users.reduce((sum, u) => sum + (u.hriScores[0]?.score ?? 50), 0) / (users.length || 1),
      hriHistory: hriHistory.reverse(),
      simulations: { total: totalSims, clicks, reports, pillsCompleted },
      clickRate: totalSims > 0 ? (clicks / totalSims) * 100 : 0,
      reportRate: totalSims > 0 ? (reports / totalSims) * 100 : 0,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        hri: u.hriScores[0]?.score ?? null,
        riskLevel: u.hriScores[0]?.riskLevel ?? null,
        points: u.points?.totalPoints ?? 0,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

