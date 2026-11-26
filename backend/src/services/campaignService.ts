import { prisma } from '../lib/prisma';
import { logEvent } from './eventService';
import { calculateAndStoreHri } from './hriService';

export interface StartCampaignOptions {
  targetAll?: boolean;
  targetUserIds?: string[];
  targetDepartmentIds?: string[];
  initiatedByUserId?: string;
}

/**
 * Core business logic to start a phishing simulation campaign.
 * Can be triggered manually via API or automatically by the scheduler.
 */
export async function startCampaign(
  campaignId: string,
  organizationId: string,
  options: StartCampaignOptions = {}
): Promise<{ success: boolean; targetCount: number; campaignName: string }> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
    throw new Error(`Campaign cannot be started in its current status: ${campaign.status}`);
  }

  const { targetUserIds = [], targetDepartmentIds = [], targetAll = campaign.targetAll, initiatedByUserId } = options;

  let userIds: string[] = targetUserIds;

  if (targetAll || (targetDepartmentIds.length === 0 && targetUserIds.length === 0)) {
    // Target all active collaborators in the organization
    const allUsers = await prisma.user.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        role: 'COLLABORATOR',
      },
      select: { id: true },
    });
    userIds = allUsers.map((u) => u.id);
  } else if (targetDepartmentIds.length > 0) {
    // Target users by department
    const deptUsers = await prisma.user.findMany({
      where: {
        organizationId,
        departmentId: { in: targetDepartmentIds },
        status: 'ACTIVE',
        role: 'COLLABORATOR',
      },
      select: { id: true },
    });
    userIds = [...new Set([...userIds, ...deptUsers.map((u) => u.id)])];
  }

  const now = new Date();

  // Atomically update campaign status and target records
  await prisma.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'ACTIVE',
        startedAt: now,
      },
    });

    for (const userId of userIds) {
      await tx.campaignTarget.upsert({
        where: { campaignId_userId: { campaignId: campaign.id, userId } },
        create: { campaignId: campaign.id, userId, sentAt: now },
        update: { sentAt: now },
      });

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

  // Log campaign started event
  await logEvent('CAMPAIGN_STARTED', initiatedByUserId, campaign.id, organizationId, undefined, {
    campaignName: campaign.name,
    targetCount: userIds.length,
    automated: !initiatedByUserId,
  });

  // Broadcast simulation sent events for real-time agents
  for (const userId of userIds.slice(0, 20)) {
    await logEvent('SIMULATION_SENT', userId, campaign.id, organizationId, undefined, {});
  }

  return {
    success: true,
    targetCount: userIds.length,
    campaignName: campaign.name,
  };
}
