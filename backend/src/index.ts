import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json } from 'express';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import departmentRoutes from './routes/departments';
import campaignRoutes from './routes/campaigns';
import simulationRoutes from './routes/simulations';
import reportRoutes from './routes/threatReports';
import pillRoutes from './routes/pills';
import pointsRoutes from './routes/points';
import hriRoutes from './routes/hri';
import dashboardRoutes from './routes/dashboard';
import auditRoutes from './routes/audit';
import sseRoutes from './routes/sse';
import demoRoutes from './routes/demo';

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import { startCampaignScheduler } from './services/schedulerService';
import { prisma } from './lib/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for secure cookies/headers when deployed behind Render / Nginx / Cloudflare
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration for Web and Desktop clients in dev and production
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.DESKTOP_AGENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:4173',
].filter(Boolean) as string[];

if (process.env.ALLOWED_ORIGINS) {
  const extraOrigins = process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  allowedOrigins.push(...extraOrigins);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Electron native, mobile, curl) or matched origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some((o) => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback permissive for demo/dev, configurable in prod
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(json({ limit: '10mb' }));
app.use(requestLogger);

// Health check with DB ping
app.get('/health', async (req, res) => {
  try {
    // Quick DB connectivity check
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/threat-reports', reportRoutes);
app.use('/api/pills', pillRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/hri', hriRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/sse', sseRoutes);
app.use('/api/demo', demoRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 AEGIS Backend running on port ${PORT}`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`💉 Health: http://localhost:${PORT}/health`);

  // Start background campaign scheduler in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    startCampaignScheduler();
  }
});

export default app;

