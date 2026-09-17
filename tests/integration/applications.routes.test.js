const request = require('supertest');
const app = require('../../src/app');
const { resetAndSeedDb, generateTestToken } = require('../helpers');

describe('Applications API Integration Tests', () => {
  let grantor1Token, grantor1Id;
  let grantor2Token, grantor2Id;
  let grantee1Token, grantee1Id;
  let grantee2Token, grantee2Id;
  let grantId;

  beforeEach(async () => {
    await resetAndSeedDb();

    // Register Grantor 1
    const g1 = await request(app).post('/api/auth/register').send({
      name: 'Owner Grantor',
      email: 'owner@example.com',
      password: 'Password123!'
    });
    grantor1Id = g1.body.id;
    grantor1Token = generateTestToken(grantor1Id, ['GRANTOR']);

    // Register Grantor 2
    const g2 = await request(app).post('/api/auth/register').send({
      name: 'Other Grantor',
      email: 'other_grantor@example.com',
      password: 'Password123!'
    });
    grantor2Id = g2.body.id;
    grantor2Token = generateTestToken(grantor2Id, ['GRANTOR']);

    // Register Grantee 1
    const ge1 = await request(app).post('/api/auth/register').send({
      name: 'Grantee Applicant',
      email: 'applicant1@example.com',
      password: 'Password123!'
    });
    grantee1Id = ge1.body.id;
    grantee1Token = generateTestToken(grantee1Id, ['GRANTEE']);

    // Register Grantee 2
    const ge2 = await request(app).post('/api/auth/register').send({
      name: 'Other Grantee',
      email: 'applicant2@example.com',
      password: 'Password123!'
    });
    grantee2Id = ge2.body.id;
    grantee2Token = generateTestToken(grantee2Id, ['GRANTEE']);

    // Create Grant by Grantor 1
    const grantRes = await request(app)
      .post('/api/grants')
      .set('Authorization', `Bearer ${grantor1Token}`)
      .send({
        title: 'Community Health Program',
        description: 'Funding medical outreach clinics',
        amount: 60000
      });
    grantId = grantRes.body.id;
  });

  describe('POST /api/grants/:grantId/apply', () => {
    test('should return 401 if unauthenticated', async () => {
      const res = await request(app)
        .post(`/api/grants/${grantId}/apply`)
        .send({ proposal: 'My Community Clinic Proposal' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 403 if a GRANTOR attempts to apply', async () => {
      const res = await request(app)
        .post(`/api/grants/${grantId}/apply`)
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({ proposal: 'Grantor attempting application' });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    test('should allow GRANTEE to submit proposal and return 201', async () => {
      const res = await request(app)
        .post(`/api/grants/${grantId}/apply`)
        .set('Authorization', `Bearer ${grantee1Token}`)
        .send({ proposal: 'Detailed medical outreach proposal with budget breakdown.' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.grantId).toBe(grantId);
      expect(res.body.granteeId).toBe(grantee1Id);
      expect(res.body.status).toBe('submitted');
      expect(res.body.proposal).toContain('Detailed medical outreach');
    });

    test('should return 400 when proposal is missing or empty', async () => {
      const res = await request(app)
        .post(`/api/grants/${grantId}/apply`)
        .set('Authorization', `Bearer ${grantee1Token}`)
        .send({ proposal: '' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/grants/:grantId/applications', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/grants/${grantId}/apply`)
        .set('Authorization', `Bearer ${grantee1Token}`)
        .send({ proposal: 'Applicant 1 Proposal' });
    });

    test('should allow the owner GRANTOR to view submissions for their grant (200)', async () => {
      const res = await request(app)
        .get(`/api/grants/${grantId}/applications`)
        .set('Authorization', `Bearer ${grantor1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].grantId).toBe(grantId);
      expect(res.body[0].proposal).toBe('Applicant 1 Proposal');
    });

    test('should return 403 when a DIFFERENT GRANTOR attempts to view applications', async () => {
      const res = await request(app)
        .get(`/api/grants/${grantId}/applications`)
        .set('Authorization', `Bearer ${grantor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/applications/:app_id', () => {
    let applicationId;

    beforeEach(async () => {
      const appRes = await request(app)
        .post(`/api/grants/${grantId}/apply`)
        .set('Authorization', `Bearer ${grantee1Token}`)
        .send({ proposal: 'Applicant 1 Proposal' });
      applicationId = appRes.body.id;
    });

    test('should allow the GRANTEE who submitted it to view the application (200)', async () => {
      const res = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', `Bearer ${grantee1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(applicationId);
      expect(res.body.proposal).toBe('Applicant 1 Proposal');
    });

    test('should allow the owner GRANTOR to view the application (200)', async () => {
      const res = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', `Bearer ${grantor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(applicationId);
    });

    test('should reject with 403 when ANOTHER GRANTEE attempts to view it', async () => {
      const res = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', `Bearer ${grantee2Token}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    test('should reject with 403 when ANOTHER GRANTOR attempts to view it', async () => {
      const res = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', `Bearer ${grantor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });
});
