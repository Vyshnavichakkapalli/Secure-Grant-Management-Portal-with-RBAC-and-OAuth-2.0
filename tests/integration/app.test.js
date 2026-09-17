const request = require('supertest');
const app = require('../../src/app');
const { resetAndSeedDb, generateTestToken } = require('../helpers');
const GrantService = require('../../src/services/grant.service');
const ApplicationService = require('../../src/services/application.service');

describe('App Level & Edge Case Tests', () => {
  let userToken, userId;

  beforeEach(async () => {
    await resetAndSeedDb();

    const reg = await request(app).post('/api/auth/register').send({
      name: 'App User',
      email: 'appuser@example.com',
      password: 'Password123!'
    });
    userId = reg.body.id;
    userToken = generateTestToken(userId, ['GRANTEE']);
  });

  test('GET /health returns 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('timestamp');
  });

  test('Undefined route returns 404', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/users/me returns current user profile', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.email).toBe('appuser@example.com');
  });

  test('POST /api/users/:userId/roles with invalid role returns 400', async () => {
    const adminToken = generateTestToken('admin-1', ['ADMIN']);
    const res = await request(app)
      .post(`/api/users/${userId}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleName: 'SUPERUSER_INVALID' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  describe('GrantService Edge Cases', () => {
    test('createGrant with missing fields or negative amount throws 400', async () => {
      await expect(GrantService.createGrant(userId, { title: '', description: '', amount: 100 }))
        .rejects.toThrow('Title, description, and amount are required');

      await expect(GrantService.createGrant(userId, { title: 'T', description: 'D', amount: -50 }))
        .rejects.toThrow('Amount must be a positive number');
    });

    test('updateGrant with negative amount throws 400', async () => {
      const grant = await GrantService.createGrant(userId, { title: 'T', description: 'D', amount: 500 });
      await expect(GrantService.updateGrant(grant.id, userId, ['GRANTOR'], { amount: -10 }))
        .rejects.toThrow('Amount must be a positive number');
    });

    test('deleteGrant on nonexistent grant throws 404', async () => {
      await expect(GrantService.deleteGrant('00000000-0000-0000-0000-000000000000', userId, ['ADMIN']))
        .rejects.toThrow('Grant not found');
    });
  });

  describe('ApplicationService Edge Cases', () => {
    test('submitApplication on nonexistent grant throws 404', async () => {
      await expect(ApplicationService.submitApplication('00000000-0000-0000-0000-000000000000', userId, { proposal: 'Text' }))
        .rejects.toThrow('Grant not found');
    });

    test('getGrantApplications on nonexistent grant throws 404', async () => {
      await expect(ApplicationService.getGrantApplications('00000000-0000-0000-0000-000000000000', userId, ['GRANTOR']))
        .rejects.toThrow('Grant not found');
    });

    test('getApplicationById on nonexistent application throws 404', async () => {
      await expect(ApplicationService.getApplicationById('00000000-0000-0000-0000-000000000000', userId, ['ADMIN']))
        .rejects.toThrow('Application not found');
    });
  });
});
