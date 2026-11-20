import { prisma } from '../lib/prisma';
import { logEvent } from './eventService';
import { awardPoints } from './pointsService';

export interface HriFactors {
  clickRate: number;         // % of simulations where user clicked
  reportRate: number;        // % of simulations correctly reported
  pillCompletionRate: number; // % of pills completed after errors
  recidivism: number;        // repeated clicks across campaigns (0-1)
  participationRate: number; // % of campaigns participated in
  observationCount: number;  // number of data points
}

export function calculateHriScore(factors: HriFactors): number {
  // HRI Formula (0-100, higher = more risk)
  // 
  // Weights (documented rationale):
  // - clickRate (40%): The most direct indicator of vulnerability to phishing
  // - reportRate (25%): Inversely weighted — reporting reduces risk
  // - recidivism (20%): Repeated mistakes significantly increase risk
  // - pillCompletionRate (10%): Inversely weighted — completing learning reduces risk
  // - participationRate (5%): Low participation means less data = moderate uncertainty

  if (factors.observationCount < 1) {
    return 50; // Neutral score when no data
  }

  // Normalize observation confidence (reduces impact when few data points)
  const confidence = Math.min(1, factors.observationCount / 5);

  const clickComponent = factors.clickRate * 40;
  const reportComponent = (1 - factors.reportRate) * 25;
  const recidivismComponent = factors.recidivism * 20;
  const pillComponent = (1 - factors.pillCompletionRate) * 10;
  const participationComponent = (1 - factors.participationRate) * 5;

  const rawScore = clickComponent + reportComponent + recidivismComponent + pillComponent + participationComponent;

  // Apply confidence adjustment: low data points regress toward 50
  const adjustedScore = rawScore * confidence + 50 * (1 - confidence);

  return Math.max(0, Math.min(100, adjustedScore));
}

export function getRiskLevel(score: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  if (score < 25) return 'LOW';
  if (score < 50) return 'MODERATE';
  if (score < 75) return 'HIGH';
  return 'CRITICAL';
}

export async function calculateUserHri(userId: string): Promise<{ score: number; riskLevel: string; factors: HriFactors }> {
  const simulations = await prisma.simulationResult.findMany({
    where: { userId },
    orderBy: { sentAt: 'desc' },
    take: 20, // Consider last 20 simulations for rolling window
  });

  const total = simulations.length;
  if (total === 0) {
    const factors: HriFactors = {
      clickRate: 0,
      reportRate: 0,
      pillCompletionRate: 0,
      recidivism: 0,
      participationRate: 0,
      observationCount: 0,
    };
    return { score: 50, riskLevel: 'MODERATE', factors };
  }

  const clicks = simulations.filter(s => s.clickedAt).length;
  const reports = simulations.filter(s => s.reportedAt).length;
  const pillsCompleted = simulations.filter(s => s.pillCompletedAt).length;
  const pillsNeeded = simulations.filter(s => s.pillShownAt).length;

  // Recidivism: users who clicked in multiple campaigns
  const clickedCampaigns = simulations.filter(s => s.clickedAt).map(s => s.campaignId);
  const uniqueClickedCampaigns = new Set(clickedCampaigns).size;
  const totalCampaigns = new Set(simulations.map(s => s.campaignId)).size;
  const recidivism = totalCampaigns > 1 ? uniqueClickedCampaigns / totalCampaigns : (clicks > 0 ? 1 : 0);

  const factors: HriFactors = {
    clickRate: total > 0 ? clicks / total : 0,
    reportRate: total > 0 ? reports / total : 0,
    pillCompletionRate: pillsNeeded > 0 ? pillsCompleted / pillsNeeded : 1,
    recidivism,
    participationRate: 1, // All are participations since we only count sent simulations
    observationCount: total,
  };

  const score = calculateHriScore(factors);
  const riskLevel = getRiskLevel(score);

  return { score, riskLevel, factors };
}

export async function calculateAndStoreUserHri(userId: string): Promise<void> {
  const { score, riskLevel, factors } = await calculateUserHri(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, departmentId: true },
  });

  await prisma.hriScore.create({
    data: {
      userId,
      score,
      riskLevel: riskLevel as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
      clickRate: factors.clickRate,
      reportRate: factors.reportRate,
      pillCompletionRate: factors.pillCompletionRate,
      recidivism: factors.recidivism,
      participationRate: factors.participationRate,
      observationCount: factors.observationCount,
    },
  });

  await logEvent(
    'HRI_UPDATED',
    userId,
    undefined,
    user?.organizationId,
    user?.departmentId ?? undefined,
    { score, riskLevel }
  );
}

export async function calculateAndStoreHri(departmentId: string, campaignId?: string): Promise<void> {
  const users = await prisma.user.findMany({
    where: { departmentId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (users.length === 0) return;

  const scores: number[] = [];
  
  for (const user of users) {
    await calculateAndStoreUserHri(user.id);
    const { score } = await calculateUserHri(user.id);
    scores.push(score);
  }

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const riskLevel = getRiskLevel(avgScore);

  await prisma.hriHistory.create({
    data: {
      departmentId,
      campaignId,
      avgScore,
      riskLevel: riskLevel as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
      userCount: users.length,
    },
  });
}

