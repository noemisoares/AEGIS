import { prisma } from '../lib/prisma';
import { logEvent } from './eventService';

export const POINT_VALUES: Record<string, number> = {
  THREAT_REPORTED_CORRECT: 20,
  THREAT_IDENTIFIED: 10,
  PILL_COMPLETED: 5,
  CAMPAIGN_PARTICIPATION: 0,
  BONUS: 0,
};

export async function awardPoints(
  userId: string,
  reason: 'THREAT_REPORTED_CORRECT' | 'THREAT_IDENTIFIED' | 'PILL_COMPLETED' | 'CAMPAIGN_PARTICIPATION' | 'BONUS',
  points: number,
  referenceId?: string,
  description?: string
): Promise<{ newTotal: number; pointsAwarded: number }> {
  if (points <= 0) return { newTotal: 0, pointsAwarded: 0 };

  const [transaction, updatedPoints] = await prisma.$transaction([
    prisma.pointTransaction.create({
      data: {
        userId,
        points,
        reason,
        referenceId,
        description,
      },
    }),
    prisma.userPoints.upsert({
      where: { userId },
      create: { userId, totalPoints: points },
      update: { totalPoints: { increment: points } },
    }),
  ]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, departmentId: true },
  });

  await logEvent('POINTS_AWARDED', userId, referenceId, user?.organizationId, user?.departmentId ?? undefined, {
    points,
    reason,
    description,
    newTotal: updatedPoints.totalPoints,
  });

  return { newTotal: updatedPoints.totalPoints, pointsAwarded: points };
}

export async function getUserPoints(userId: string): Promise<{ totalPoints: number; transactions: unknown[] }> {
  const [points, transactions] = await Promise.all([
    prisma.userPoints.findUnique({ where: { userId } }),
    prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return {
    totalPoints: points?.totalPoints ?? 0,
    transactions,
  };
}

