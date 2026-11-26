import request from 'supertest';
import app from '../index';
import { prisma } from '../lib/prisma';
import { calculateHriScore, getRiskLevel } from '../services/hriService';
import { processScheduledCampaigns } from '../services/schedulerService';

describe('AEGIS Cybersecurity Behavioral Platform Tests', () => {
  let managerToken = '';
  let collaboratorToken = '';
  let activeCampaignId = '';

  beforeAll(async () => {
    // Authenticate as Manager (Juliana CISO)
    const mgrRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'juliana.ciso@aegiscorp.demo', password: 'aegis@2024' });
    managerToken = mgrRes.body.token;

    // Authenticate as Collaborator (Carlos Silva)
    const colRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carlos.silva@aegiscorp.demo', password: 'aegis@colaborador' });
    collaboratorToken = colRes.body.token;
  });

  describe('1. Authentication & RBAC', () => {
    it('should authenticate manager successfully with valid credentials', async () => {
      expect(managerToken).toBeDefined();
      expect(managerToken.length).toBeGreaterThan(20);
    });

    it('should authenticate collaborator with appropriate role', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${collaboratorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('COLLABORATOR');
    });

    it('should prevent collaborator from accessing manager-only endpoints', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${collaboratorToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow manager to access SOC dashboard overview', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(res.body).toHaveProperty('simulations');
      expect(res.body.users.total).toBe(100);
    });
  });

  describe('2. HRI (Human Risk Index) Mathematical Formula & Logic', () => {
    it('should calculate higher risk for high click rate and zero reports', () => {
      const risky = calculateHriScore({
        clickRate: 0.9,
        reportRate: 0.0,
        pillCompletionRate: 0.2,
        recidivism: 0.8,
        participationRate: 1.0,
        observationCount: 10,
      });
      expect(risky).toBeGreaterThan(60);
      expect(['HIGH', 'CRITICAL']).toContain(getRiskLevel(risky));
    });

    it('should calculate low risk for vigilant collaborators (high report, 0 clicks)', () => {
      const vigilant = calculateHriScore({
        clickRate: 0.0,
        reportRate: 1.0,
        pillCompletionRate: 1.0,
        recidivism: 0.0,
        participationRate: 1.0,
        observationCount: 10,
      });
      expect(vigilant).toBeLessThan(25);
      expect(getRiskLevel(vigilant)).toBe('LOW');
    });

    it('should normalize score to neutral 50 when observation count is 0', () => {
      const empty = calculateHriScore({
        clickRate: 0,
        reportRate: 0,
        pillCompletionRate: 0,
        recidivism: 0,
        participationRate: 0,
        observationCount: 0,
      });
      expect(empty).toBe(50);
    });
  });

  describe('3. Phishing Simulations, Pill Delivery, Threat Reporting & Points', () => {
    it('should list active simulation for collaborator', async () => {
      const res = await request(app)
        .get('/api/simulations/active')
        .set('Authorization', `Bearer ${collaboratorToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const sims = res.body;
      if (sims.length > 0) {
        activeCampaignId = sims[0].campaign.id;
      }
    });

    it('should record click on simulation and return immediate educational pill', async () => {
      if (!activeCampaignId) return;

      const clickRes = await request(app)
        .post(`/api/simulations/${activeCampaignId}/interact`)
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ action: 'clicked' });

      expect(clickRes.status).toBe(200);
      expect(clickRes.body).toHaveProperty('pill');
      expect(clickRes.body.pill).not.toBeNull();
      expect(clickRes.body.pill).toHaveProperty('whatWentWrong');
      expect(clickRes.body.pill).toHaveProperty('correctAction');
    });

    it('should award points upon completing educational pill without deducting points for error', async () => {
      if (!activeCampaignId) return;

      const userBefore = await request(app)
        .get('/api/points/me')
        .set('Authorization', `Bearer ${collaboratorToken}`);
      const initialPoints = userBefore.body.totalPoints;

      const pillRes = await request(app)
        .post(`/api/simulations/${activeCampaignId}/pill-complete`)
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ pillId: 'demo-pill-credential_phishing', timeSpent: 60 });

      expect(pillRes.status).toBe(200);

      const userAfter = await request(app)
        .get('/api/points/me')
        .set('Authorization', `Bearer ${collaboratorToken}`);

      expect(userAfter.body.totalPoints).toBeGreaterThanOrEqual(initialPoints);
    });

    it('should award +20 points when threat is correctly reported and prevent duplicate points', async () => {
      // Create a fresh test campaign
      const templates = await request(app)
        .get('/api/campaigns/templates/list')
        .set('Authorization', `Bearer ${managerToken}`);
      const templateId = templates.body[0].id;

      const campRes = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Campanha de Teste Automatizado',
          templateId,
        });

      const campId = campRes.body.id;

      // Start campaign
      await request(app)
        .post(`/api/campaigns/${campId}/start`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ targetAll: true });

      // First report: should award points
      const reportRes1 = await request(app)
        .post('/api/threat-reports')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ campaignId: campId, reportType: 'SIMULATION' });

      expect(reportRes1.status).toBe(201);
      expect(reportRes1.body.pointsAwarded).toBe(20);

      // Duplicate report: should prevent additional points
      const reportRes2 = await request(app)
        .post('/api/threat-reports')
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ campaignId: campId, reportType: 'SIMULATION' });

      expect(reportRes2.status).toBe(200);
      expect(reportRes2.body.isDuplicate).toBe(true);
      expect(reportRes2.body.pointsAwarded).toBe(0);
    });
  });

  describe('4. Audit Reports & Consistency', () => {
    it('should generate audit report in CSV format', async () => {
      const res = await request(app)
        .post('/api/audit/reports/generate')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ title: 'Relatório Teste CSV', format: 'CSV', type: 'GENERAL' });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('AEGIS');
      expect(res.text).toContain('RESUMO EXECUTIVO');
      expect(res.text).toContain('HRI POR SETOR');
    });

    it('should generate audit report in PDF format', async () => {
      const res = await request(app)
        .post('/api/audit/reports/generate')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ title: 'Relatório Teste PDF', format: 'PDF', type: 'GENERAL' });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/pdf');
    });
  });

  describe('5. Automated Scheduling & Threat Review Workflow', () => {
    it('should respond to /health with database connected status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('connected');
    });

    it('should automatically process and trigger scheduled campaigns due for dispatch', async () => {
      // Fetch a template
      const templates = await request(app)
        .get('/api/campaigns/templates/list')
        .set('Authorization', `Bearer ${managerToken}`);
      const templateId = templates.body[0].id;

      // Create a campaign scheduled in the past (ready for auto-dispatch)
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      const campRes = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Campanha Agendada Automatizada',
          templateId,
          scheduledAt: pastDate.toISOString(),
          targetAll: true,
          isRecurring: true,
        });

      expect(campRes.status).toBe(201);
      const scheduledCampId = campRes.body.id;

      // Manually set status to SCHEDULED (in case the API initialized it based on date check)
      await prisma.campaign.update({
        where: { id: scheduledCampId },
        data: { status: 'SCHEDULED', scheduledAt: pastDate },
      });

      // Run scheduler process
      const processed = await processScheduledCampaigns();
      expect(processed).toBeGreaterThanOrEqual(1);

      // Verify campaign is now ACTIVE
      const updated = await prisma.campaign.findUnique({
        where: { id: scheduledCampId },
      });
      expect(updated?.status).toBe('ACTIVE');
      expect(updated?.startedAt).not.toBeNull();
    });

    it('should allow SOC manager to update threat report review status', async () => {
      // Find an existing threat report
      const reportsRes = await request(app)
        .get('/api/threat-reports')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(reportsRes.status).toBe(200);
      expect(reportsRes.body.length).toBeGreaterThan(0);
      const reportId = reportsRes.body[0].id;

      // Update status to CONFIRMED
      const patchRes = await request(app)
        .patch(`/api/threat-reports/${reportId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'CONFIRMED', isCorrect: true });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.status).toBe('CONFIRMED');
      expect(patchRes.body.isCorrect).toBe(true);
    });
  });
});
