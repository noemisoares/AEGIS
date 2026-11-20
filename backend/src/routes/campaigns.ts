import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { logEvent } from '../services/eventService';
import { calculateAndStoreHri } from '../services/hriService';

const router = Router();

// GET /api/campaigns
router.get('/', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const where: Record<string, unknown> = { organizationId: req.user!.organizationId };
    if (status) where.status = status;

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        template: { select: { id: true, name: true, category: true, difficulty: true } },
        _count: { select: { targets: true, simulationResults: true, threatReports: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/campaigns/:id
router.get('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: {
        template: true,
        targets: {
          include: { campaign: false },
        },
        simulationResults: {
          include: {
            user: { select: { id: true, name: true, email: true, departmentId: true, department: { select: { name: true } } } },
          },
        },
        threatReports: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/campaigns - Create campaign
router.post(
  '/',
  authenticate,
  requireManager,
  [
    body('name').isLength({ min: 2 }),
    body('templateId').isString().notEmpty(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, description, templateId, scheduledAt, targetAll = false, targetUserIds = [], targetDepartmentIds = [] } = req.body;

    try {
      const campaign = await prisma.campaign.create({
        data: {
          name,
          description,
          templateId,
          organizationId: req.user!.organizationId,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          targetAll,
          createdById: req.user!.id,
        },
      });

      await logEvent('CAMPAIGN_CREATED', req.user!.id, campaign.id, req.user!.organizationId, undefined, {
        campaignName: name,
      });

      res.status(201).json(campaign);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/campaigns/:id/start - Start campaign
router.post('/:id/start', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      res.status(400).json({ error: 'Campaign cannot be started in its current status' });
      return;
    }

    const { targetUserIds = [], targetDepartmentIds = [] } = req.body;

    // Determine target users
    let userIds: string[] = targetUserIds;

    if (campaign.targetAll || (targetDepartmentIds.length === 0 && targetUserIds.length === 0)) {
      // Target all active collaborators
      const allUsers = await prisma.user.findMany({
        where: {
          organizationId: req.user!.organizationId,
          status: 'ACTIVE',
          role: 'COLLABORATOR',
        },
        select: { id: true },
      });
      userIds = allUsers.map(u => u.id);
    } else if (targetDepartmentIds.length > 0) {
      // Target users by department
      const deptUsers = await prisma.user.findMany({
        where: {
          organizationId: req.user!.organizationId,
          departmentId: { in: targetDepartmentIds },
          status: 'ACTIVE',
          role: 'COLLABORATOR',
        },
        select: { id: true },
      });
      userIds = [...new Set([...userIds, ...deptUsers.map(u => u.id)])];
    }

    // Update campaign status
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });

    // Create campaign targets and simulation results
    const now = new Date();
    
    await prisma.$transaction(async (tx) => {
      for (const userId of userIds) {
        // Upsert campaign target
        await tx.campaignTarget.upsert({
          where: { campaignId_userId: { campaignId: campaign.id, userId } },
          create: { campaignId: campaign.id, userId, sentAt: now },
          update: { sentAt: now },
        });

        // Upsert simulation result
        await tx.simulationResult.upsert({
          where: { campaignId_userId: { campaignId: campaign.id, userId } },
          create: {
            campaignId: campaign.id,
            userId,
            status: 'SENT',
            sentAt: now,
          },
          update: { sentAt: now, status: 'SENT' },
        });
      }
    });

    await logEvent('CAMPAIGN_STARTED', req.user!.id, campaign.id, req.user!.organizationId, undefined, {
      campaignName: campaign.name,
      targetCount: userIds.length,
    });

    // Log individual simulation sent events
    for (const userId of userIds.slice(0, 20)) { // limit broadcast spam
      await logEvent('SIMULATION_SENT', userId, campaign.id, req.user!.organizationId, undefined, {});
    }

    res.json({
      ...updatedCampaign,
      targetCount: userIds.length,
    });
  } catch (error) {
    console.error('Campaign start error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/campaigns/:id/complete - Complete campaign
router.post('/:id/complete', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId, status: 'ACTIVE' },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Active campaign not found' });
      return;
    }

    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });

    await logEvent('CAMPAIGN_COMPLETED', req.user!.id, campaign.id, req.user!.organizationId, undefined, {
      campaignName: campaign.name,
    });

    // Recalculate HRI for all affected departments
    const affectedUsers = await prisma.simulationResult.findMany({
      where: { campaignId: campaign.id },
      include: { user: { select: { departmentId: true } } },
    });

    const deptIds = [...new Set(affectedUsers.map(r => r.user.departmentId).filter(Boolean) as string[])];
    
    for (const deptId of deptIds) {
      await calculateAndStoreHri(deptId, campaign.id);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/campaigns/:id/results - Campaign results summary
router.get('/:id/results', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: { template: true },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const results = await prisma.simulationResult.findMany({
      where: { campaignId: campaign.id },
      include: {
        user: {
          select: { id: true, name: true, departmentId: true, department: { select: { name: true } } },
        },
      },
    });

    const total = results.length;
    const sent = results.filter(r => r.sentAt).length;
    const opened = results.filter(r => r.openedAt).length;
    const clicked = results.filter(r => r.clickedAt).length;
    const reported = results.filter(r => r.reportedAt).length;
    const pillCompleted = results.filter(r => r.pillCompletedAt).length;

    // By department
    const byDept: Record<string, { name: string; total: number; clicked: number; reported: number }> = {};
    for (const r of results) {
      const deptId = r.user.departmentId ?? 'unknown';
      const deptName = r.user.department?.name ?? 'Unknown';
      if (!byDept[deptId]) byDept[deptId] = { name: deptName, total: 0, clicked: 0, reported: 0 };
      byDept[deptId].total++;
      if (r.clickedAt) byDept[deptId].clicked++;
      if (r.reportedAt) byDept[deptId].reported++;
    }

    res.json({
      campaign: { id: campaign.id, name: campaign.name, status: campaign.status },
      summary: {
        total,
        sent,
        opened,
        clicked,
        reported,
        pillCompleted,
        clickRate: total > 0 ? ((clicked / total) * 100).toFixed(1) : '0',
        reportRate: total > 0 ? ((reported / total) * 100).toFixed(1) : '0',
        openRate: total > 0 ? ((opened / total) * 100).toFixed(1) : '0',
      },
      byDepartment: Object.values(byDept),
      results,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/campaigns/templates
router.get('/templates/list', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const templates = await prisma.phishingTemplate.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { organizationId: req.user!.organizationId },
        ],
      },
      include: { pills: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'asc' },
    });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

