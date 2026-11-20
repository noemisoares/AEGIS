import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logEvent } from '../services/eventService';
import { awardPoints } from '../services/pointsService';
import { calculateAndStoreUserHri } from '../services/hriService';

const router = Router();

// POST /api/simulations/:campaignId/interact - Record simulation interaction
// This is the endpoint the desktop agent calls when user opens/clicks simulation
router.post('/:campaignId/interact', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const { action } = req.body; // 'opened' | 'clicked'
    const userId = req.user!.id;

    const simulation = await prisma.simulationResult.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });

    if (!simulation) {
      res.status(404).json({ error: 'Simulation not found for this user' });
      return;
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId },
      include: { template: { include: { pills: true } } },
    });

    if (!campaign || campaign.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Campaign is not active' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    let eventType: 'SIMULATION_OPENED' | 'SIMULATION_CLICKED' = 'SIMULATION_OPENED';

    if (action === 'opened' && !simulation.openedAt) {
      updateData.openedAt = new Date();
      updateData.status = 'OPENED';
      eventType = 'SIMULATION_OPENED';
    } else if (action === 'clicked') {
      if (!simulation.openedAt) updateData.openedAt = new Date();
      if (!simulation.clickedAt) {
        updateData.clickedAt = new Date();
        updateData.status = 'CLICKED';
      }
      eventType = 'SIMULATION_CLICKED';
    } else {
      res.json({ message: 'No update needed' });
      return;
    }

    const updated = await prisma.simulationResult.update({
      where: { campaignId_userId: { campaignId, userId } },
      data: updateData,
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true, organizationId: true },
    });

    await logEvent(eventType, userId, campaignId, user?.organizationId, user?.departmentId ?? undefined, {
      action,
    });

    // If clicked, find the associated pill and return it
    let pill = null;
    if (action === 'clicked') {
      const pillRecord = campaign.template.pills[0] ?? null;
      
      if (pillRecord) {
        // Mark pill as shown
        await prisma.simulationResult.update({
          where: { campaignId_userId: { campaignId, userId } },
          data: { pillShownAt: new Date() },
        });
        
        await logEvent('PILL_SHOWN', userId, campaignId, user?.organizationId, user?.departmentId ?? undefined, {
          pillId: pillRecord.id,
        });
        
        pill = pillRecord;
      }

      // Recalculate HRI after a click event
      await calculateAndStoreUserHri(userId);
    }

    res.json({ simulation: updated, pill });
  } catch (error) {
    console.error('Simulation interact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/simulations/:campaignId/pill-complete - Mark pill as completed
router.post('/:campaignId/pill-complete', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const { pillId, timeSpent } = req.body;
    const userId = req.user!.id;

    // Check simulation exists
    const simulation = await prisma.simulationResult.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });

    if (!simulation || !simulation.pillShownAt) {
      res.status(400).json({ error: 'No pill was shown for this simulation' });
      return;
    }

    if (simulation.pillCompletedAt) {
      res.json({ message: 'Pill already completed', alreadyCompleted: true });
      return;
    }

    // Mark pill as completed
    await prisma.simulationResult.update({
      where: { campaignId_userId: { campaignId, userId } },
      data: { pillCompletedAt: new Date(), status: 'COMPLETED' },
    });

    // Record pill completion
    const existing = await prisma.pillCompletion.findFirst({
      where: { userId, pillId, campaignId },
    });

    if (!existing) {
      await prisma.pillCompletion.create({
        data: { userId, pillId, campaignId, timeSpent },
      });
    }

    // Award points for completing the pill
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true, organizationId: true },
    });

    await logEvent('PILL_COMPLETED', userId, campaignId, user?.organizationId, user?.departmentId ?? undefined, {
      pillId,
      timeSpent,
    });

    // Award points (only if not already awarded for this pill+campaign)
    const { newTotal, pointsAwarded } = await awardPoints(
      userId,
      'PILL_COMPLETED',
      5,
      `${pillId}-${campaignId}`,
      'Pílula educativa concluída'
    );

    // Recalculate HRI
    await calculateAndStoreUserHri(userId);

    res.json({ success: true, pointsAwarded, newTotal });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/simulations/active - Get active simulations for current user (desktop agent)
router.get('/active', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const activeSims = await prisma.simulationResult.findMany({
      where: {
        userId,
        campaign: { status: 'ACTIVE' },
        clickedAt: null,
        reportedAt: null,
      },
      include: {
        campaign: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                subject: true,
                bodyText: true,
                bodyHtml: true,
                senderName: true,
                senderEmail: true,
                difficulty: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    res.json(activeSims);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

