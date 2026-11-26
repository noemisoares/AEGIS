import { prisma } from '../lib/prisma';
import { startCampaign } from './campaignService';

let schedulerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

/**
 * Checks for scheduled campaigns ready to be dispatched
 * and automatically triggers them.
 */
export async function processScheduledCampaigns(): Promise<number> {
  if (isProcessing) return 0;
  isProcessing = true;

  try {
    const now = new Date();

    // 1. Process one-off scheduled campaigns
    const scheduledCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
      take: 10,
    });

    let processedCount = 0;

    for (const campaign of scheduledCampaigns) {
      try {
        console.log(`[Scheduler] Auto-starting scheduled campaign: "${campaign.name}" (${campaign.id})`);
        await startCampaign(campaign.id, campaign.organizationId, { targetAll: campaign.targetAll });
        processedCount++;
      } catch (err: any) {
        console.error(`[Scheduler] Failed to auto-start campaign ${campaign.id}:`, err.message);
      }
    }

    // 2. Process weekly recurring campaigns
    // Check active recurring campaigns that have reached 7 days duration to auto-complete and schedule next week
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const expiredRecurring = await prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        isRecurring: true,
        startedAt: { lte: oneWeekAgo },
      },
      take: 5,
    });

    for (const campaign of expiredRecurring) {
      try {
        console.log(`[Scheduler] Auto-completing weekly recurring campaign: "${campaign.name}" (${campaign.id})`);
        
        // Mark current as completed
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'COMPLETED', endedAt: now },
        });

        // Pick next template in rotation
        const templates = await prisma.phishingTemplate.findMany({
          where: {
            OR: [{ isGlobal: true }, { organizationId: campaign.organizationId }],
          },
          select: { id: true },
        });

        if (templates.length > 0) {
          const currentIdx = templates.findIndex((t) => t.id === campaign.templateId);
          const nextTemplate = templates[(currentIdx + 1) % templates.length];

          const nextWeekDate = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now or next scheduled slot
          const nextCampaignName = `${campaign.name.replace(/\s*\(Semana \d+\)/, '')} (Semana Automática)`;

          // Create next recurring campaign
          const nextCampaign = await prisma.campaign.create({
            data: {
              name: nextCampaignName,
              description: 'Campanha gerada automaticamente pelo agendador semanal do AEGIS',
              status: 'SCHEDULED',
              templateId: nextTemplate.id,
              organizationId: campaign.organizationId,
              scheduledAt: nextWeekDate,
              targetAll: true,
              isRecurring: true,
            },
          });

          console.log(`[Scheduler] Scheduled next recurring campaign: "${nextCampaign.name}" (${nextCampaign.id}) for ${nextWeekDate.toISOString()}`);
        }
      } catch (err: any) {
        console.error(`[Scheduler] Error handling recurring cycle for ${campaign.id}:`, err.message);
      }
    }

    return processedCount;
  } catch (err: any) {
    console.error('[Scheduler] Error checking scheduled campaigns:', err.message);
    return 0;
  } finally {
    isProcessing = false;
  }
}

/**
 * Starts the background campaign scheduler loop.
 * Runs check every 30 seconds.
 */
export function startCampaignScheduler(intervalMs = 30000): void {
  if (schedulerInterval) return;

  console.log('⏰ AEGIS Automated Campaign Scheduler initialized (interval: 30s)');
  
  // Initial check on boot
  processScheduledCampaigns();

  schedulerInterval = setInterval(() => {
    processScheduledCampaigns();
  }, intervalMs);
}

/**
 * Stops the scheduler loop (useful for graceful shutdown and tests).
 */
export function stopCampaignScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('⏰ AEGIS Campaign Scheduler stopped');
  }
}
