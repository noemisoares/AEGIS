import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/pills - List educational pills
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pills = await prisma.educationalPill.findMany({
      where: { isGlobal: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(pills);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/pills/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pill = await prisma.educationalPill.findUnique({
      where: { id: req.params.id },
    });
    if (!pill) {
      res.status(404).json({ error: 'Pill not found' });
      return;
    }
    res.json(pill);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

