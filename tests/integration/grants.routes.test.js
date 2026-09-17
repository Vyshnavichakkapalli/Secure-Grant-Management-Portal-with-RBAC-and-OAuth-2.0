const request = require('supertest');
const app = require('../../src/app');
const { resetAndSeedDb, generateTestToken } = require('../helpers');

describe('Grant Management API Integration Tests', () => {
  let grantor1Token, grantor1Id;
  let grantor2Token, grantor2Id;
  let granteeToken, granteeId;
  let adminToken, adminId;

  beforeEach(async () => {
    await resetAndSeedDb();

    // Register Grantor 1
    const g1 = await request(app).post('/api/auth/register').send({
      name: 'Grantor One',
      email: 'grantor1@example.com',
      password: 'Password123!'
    });
    grantor1Id = g1.body.id;
    grantor1Token = generateTestToken(grantor1Id, ['GRANTOR']);

    // Register Grantor 2
    const g2 = await request(app).post('/api/auth/register').send({
      name: 'Grantor Two',
      email: 'grantor2@example.com',
      password: 'Password123!'
    });
    grantor2Id = g2.body.id;
    grantor2Token = generateTestToken(grantor2Id, ['GRANTOR']);

    // Register Grantee
    const ge = await request(app).post('/api/auth/register').send({
      name: 'Grantee Person',
      email: 'grantee@example.com',
      password: 'Password123!'
    });
    granteeId = ge.body.id;
    granteeToken = generateTestToken(granteeId, ['GRANTEE']);

    // Admin token
    adminId = 'admin-id-123';
    adminToken = generateTestToken(adminId, ['ADMIN']);
  });

  describe('POST /api/grants', () => {
    test('should return 401 when creating grant without token', async () => {
      const res = await request(app)
        .post('/api/grants')
        .send({
          title: 'Clean Water Initiative',
          description: 'Funding for water filtration',
          amount: 50000
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 403 when GRANTEE attempts to create a grant', async () => {
      const res = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${granteeToken}`)
        .send({
          title: 'Clean Water Initiative',
          description: 'Funding for water filtration',
          amount: 50000
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    test('should allow GRANTOR to create grant and return 201', async () => {
      const res = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({
          title: 'Clean Water Initiative',
          description: 'Funding for water filtration',
          amount: 50000
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Clean Water Initiative');
      expect(res.body.amount).toBe(50000);
      expect(res.body.grantorId).toBe(grantor1Id);
    });
  });

  describe('GET /api/grants and GET /api/grants/:id', () => {
    let grantId;

    beforeEach(async () => {
      const created = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({
          title: 'AI Research Grant',
          description: 'Advancing open source AI safety',
          amount: 100000
        });
      grantId = created.body.id;
    });

    test('should allow GRANTEE to list all available grants', async () => {
      const res = await request(app)
        .get('/api/grants')
        .set('Authorization', `Bearer ${granteeToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.some(g => g.id === grantId)).toBe(true);
    });

    test('should allow authenticated user to view specific grant by id', async () => {
      const res = await request(app)
        .get(`/api/grants/${grantId}`)
        .set('Authorization', `Bearer ${granteeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(grantId);
      expect(res.body.title).toBe('AI Research Grant');
    });

    test('should return 404 when grant does not exist', async () => {
      const res = await request(app)
        .get('/api/grants/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${granteeToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/grants/:grantId', () => {
    let grantId;

    beforeEach(async () => {
      const created = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({
          title: 'Renewable Energy Fund',
          description: 'Solar microgrids project',
          amount: 75000
        });
      grantId = created.body.id;
    });

    test('should allow the owner GRANTOR to update the grant (200)', async () => {
      const res = await request(app)
        .put(`/api/grants/${grantId}`)
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({
          title: 'Updated Renewable Energy Fund',
          amount: 80000
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Renewable Energy Fund');
      expect(res.body.amount).toBe(80000);
    });

    test('should reject update with 403 when a DIFFERENT GRANTOR attempts to modify it', async () => {
      const res = await request(app)
        .put(`/api/grants/${grantId}`)
        .set('Authorization', `Bearer ${grantor2Token}`)
        .send({
          title: 'Malicious Overwrite Attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/grants/:grantId', () => {
    let grantId;

    beforeEach(async () => {
      const created = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({
          title: 'Grant to Delete',
          description: 'Temporary description',
          amount: 25000
        });
      grantId = created.body.id;
    });

    test('should reject delete with 403 when non-owner GRANTOR attempts to delete', async () => {
      const res = await request(app)
        .delete(`/api/grants/${grantId}`)
        .set('Authorization', `Bearer ${grantor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    test('should allow owner GRANTOR to delete grant (200)', async () => {
      const res = await request(app)
        .delete(`/api/grants/${grantId}`)
        .set('Authorization', `Bearer ${grantor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    test('should allow ADMIN to delete any grant (200)', async () => {
      // Re-create grant
      const created = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({
          title: 'Grant for Admin Delete',
          description: 'Temporary description',
          amount: 30000
        });

      const res = await request(app)
        .delete(`/api/grants/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });
  });
});
