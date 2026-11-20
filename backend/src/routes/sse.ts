import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Map of SSE clients: clientId -> Response
export const sseClients = new Map<string, Response>();

// GET /api/sse/events - Server-Sent Events stream
router.get('/events', authenticate, (req: AuthRequest, res: Response) => {
  const clientId = `${req.user!.id}-${Date.now()}`;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, timestamp: new Date().toISOString() })}\n\n`);

  // Store client
  sseClients.set(clientId, res);

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(clientId);
    }
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
    console.log(`SSE client disconnected: ${clientId}`);
  });

  console.log(`SSE client connected: ${clientId}, total clients: ${sseClients.size}`);
});

export default router;

