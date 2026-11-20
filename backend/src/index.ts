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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.DESKTOP_AGENT_URL || 'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:4173',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
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
});

export default app;

