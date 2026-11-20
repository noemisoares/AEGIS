import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getUserPoints } from '../services/pointsService';

const router = Router();

// GET /api/points/me - Current user's points
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await getUserPoints(req.user!.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/points/leaderboard - Org leaderboard (managers)
router.get('/leaderboard', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const leaderboard = await prisma.userPoints.findMany({
      where: {
        user: {
          organizationId: req.user!.organizationId,
          status: 'ACTIVE',
          role: 'COLLABORATOR',
        },
      },
      include: {
        user: {
          select: { id: true, name: true, department: { select: { name: true } } },
        },
      },
      orderBy: { totalPoints: 'desc' },
      take: 20,
    });

    res.json(leaderboard.map((entry, idx) => ({
      rank: idx + 1,
      userId: entry.userId,
      name: entry.user.name,
      department: entry.user.department?.name,
      totalPoints: entry.totalPoints,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

