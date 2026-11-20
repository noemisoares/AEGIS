import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();

// GET /api/users - List users (managers only)
router.get('/', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { departmentId, status, role, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { organizationId: req.user!.organizationId };
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          department: { select: { id: true, name: true } },
          points: { select: { totalPoints: true } },
          hriScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
        },
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.user.count({ where }),
    ]);

    const usersOut = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      jobTitle: u.jobTitle,
      status: u.status,
      departmentId: u.departmentId,
      departmentName: u.department?.name,
      totalPoints: u.points?.totalPoints ?? 0,
      currentHri: u.hriScores[0]?.score ?? null,
      riskLevel: u.hriScores[0]?.riskLevel ?? null,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));

    res.json({ data: usersOut, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Collaborators can only see their own profile
    if (req.user!.role === 'COLLABORATOR' && req.user!.id !== id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { id, organizationId: req.user!.organizationId },
      include: {
        department: true,
        points: true,
        hriScores: { orderBy: { calculatedAt: 'desc' }, take: 10 },
        pointTransactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle,
      status: user.status,
      departmentId: user.departmentId,
      departmentName: user.department?.name,
      totalPoints: user.points?.totalPoints ?? 0,
      hriHistory: user.hriScores,
      recentTransactions: user.pointTransactions,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users - Create user (managers only)
router.post(
  '/',
  authenticate,
  requireManager,
  [
    body('email').isEmail().normalizeEmail(),
    body('name').isLength({ min: 2 }),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['MANAGER', 'COLLABORATOR']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, name, password, role, jobTitle, departmentId } = req.body;

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ error: 'Email already in use' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role,
          jobTitle,
          departmentId,
          organizationId: req.user!.organizationId,
        },
      });

      await prisma.userPoints.create({ data: { userId: user.id } });

      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/users/:id/activity - User activity history
router.get('/:id/activity', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (req.user!.role === 'COLLABORATOR' && req.user!.id !== id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const [simulations, reports, pillCompletions, transactions] = await Promise.all([
      prisma.simulationResult.findMany({
        where: { userId: id },
        include: { campaign: { select: { id: true, name: true } } },
        orderBy: { sentAt: 'desc' },
        take: 20,
      }),
      prisma.threatReport.findMany({
        where: { userId: id },
        include: { campaign: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.pillCompletion.findMany({
        where: { userId: id },
        include: { pill: { select: { id: true, title: true } } },
        orderBy: { completedAt: 'desc' },
        take: 20,
      }),
      prisma.pointTransaction.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    res.json({ simulations, reports, pillCompletions, transactions });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

