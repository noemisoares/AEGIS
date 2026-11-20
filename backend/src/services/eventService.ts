import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { sseClients } from '../routes/sse';

export type EventTypeName =
  | 'CAMPAIGN_CREATED'
  | 'CAMPAIGN_STARTED'
  | 'CAMPAIGN_COMPLETED'
  | 'SIMULATION_SENT'
  | 'SIMULATION_OPENED'
  | 'SIMULATION_CLICKED'
  | 'SIMULATION_REPORTED'
  | 'PILL_SHOWN'
  | 'PILL_COMPLETED'
  | 'THREAT_REPORTED'
  | 'POINTS_AWARDED'
  | 'HRI_UPDATED'
  | 'USER_LOGIN'
  | 'USER_CREATED';

export async function logEvent(
  eventType: EventTypeName,
  userId?: string,
  campaignId?: string,
  organizationId?: string,
  departmentId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const event = await prisma.eventLog.create({
      data: {
        eventType,
        userId,
        campaignId,
        organizationId,
        departmentId,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });

    // Broadcast to SSE clients
    broadcastEvent({
      id: event.id,
      type: eventType,
      userId,
      campaignId,
      organizationId,
      departmentId,
      metadata,
      createdAt: event.createdAt,
    });
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}

export function broadcastEvent(data: Record<string, unknown>): void {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  for (const [clientId, clientRes] of sseClients.entries()) {
    try {
      (clientRes as Response).write(message);
    } catch {
      sseClients.delete(clientId);
    }
  }
}

