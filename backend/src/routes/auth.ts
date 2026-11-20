import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { body, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logEvent } from '../services/eventService';

const router = Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { department: true, points: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const secret = process.env.JWT_SECRET || 'aegis-secret';
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
        secret,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any }
      );

      await logEvent('USER_LOGIN', user.id, undefined, user.organizationId, undefined, {
        email: user.email,
      });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          jobTitle: user.jobTitle,
          departmentId: user.departmentId,
          departmentName: user.department?.name,
          organizationId: user.organizationId,
          totalPoints: user.points?.totalPoints ?? 0,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        department: true,
        points: true,
        hriScores: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      jobTitle: user.jobTitle,
      departmentId: user.departmentId,
      departmentName: user.department?.name,
      organizationId: user.organizationId,
      totalPoints: user.points?.totalPoints ?? 0,
      currentHri: user.hriScores[0]?.score ?? null,
      riskLevel: user.hriScores[0]?.riskLevel ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

