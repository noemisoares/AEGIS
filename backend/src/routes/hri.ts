import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { calculateAndStoreHri, getRiskLevel } from '../services/hriService';

const router = Router();

// GET /api/hri/departments - HRI by department
router.get('/departments', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      where: { organizationId: req.user!.organizationId },
      include: {
        users: {
          where: { status: 'ACTIVE', role: 'COLLABORATOR' },
          include: {
            hriScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
          },
        },
        hriHistory: {
          orderBy: { calculatedAt: 'desc' },
          take: 10,
        },
      },
    });

    const result = departments.map(dept => {
      const userScores = dept.users.map(u => u.hriScores[0]?.score ?? 50);
      const avgScore = userScores.length > 0
        ? userScores.reduce((a, b) => a + b, 0) / userScores.length
        : 50;

      return {
        id: dept.id,
        name: dept.name,
        userCount: dept.users.length,
        avgHri: Math.round(avgScore * 10) / 10,
        riskLevel: getRiskLevel(avgScore),
        history: dept.hriHistory.reverse(),
        distribution: {
          low: userScores.filter(s => s < 25).length,
          moderate: userScores.filter(s => s >= 25 && s < 50).length,
          high: userScores.filter(s => s >= 50 && s < 75).length,
          critical: userScores.filter(s => s >= 75).length,
        },
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/hri/users/:userId - Individual HRI
router.get('/users/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (req.user!.role === 'COLLABORATOR' && req.user!.id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const scores = await prisma.hriScore.findMany({
      where: { userId },
      orderBy: { calculatedAt: 'desc' },
      take: 20,
    });

    res.json({
      userId,
      currentScore: scores[0]?.score ?? null,
      riskLevel: scores[0]?.riskLevel ?? null,
      history: scores.reverse(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/hri/recalculate - Recalculate HRI for org
router.post('/recalculate', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      where: { organizationId: req.user!.organizationId },
      select: { id: true },
    });

    for (const dept of departments) {
      await calculateAndStoreHri(dept.id);
    }

    res.json({ success: true, message: `HRI recalculated for ${departments.length} departments` });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

