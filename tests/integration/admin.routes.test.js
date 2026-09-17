const request = require('supertest');
const app = require('../../src/app');
const { resetAndSeedDb, generateTestToken } = require('../helpers');
const UserModel = require('../../src/models/user.model');

describe('Admin Role Assignment Integration Tests', () => {
  let adminToken;
  let granteeToken;
  let targetUser;

  beforeEach(async () => {
    await resetAndSeedDb();

    // Find seeded admin user
    const adminUser = await UserModel.findWithRolesByEmail('admin@grantportal.com');
    adminToken = generateTestToken(adminUser.id, ['ADMIN']);

    // Register a normal grantee user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Target Grantee',
        email: 'target@example.com',
        password: 'Password123!'
      });
    targetUser = regRes.body;
    granteeToken = generateTestToken(targetUser.id, ['GRANTEE']);
  });

  test('should return 401 when accessing role assignment without token', async () => {
    const res = await request(app)
      .post(`/api/users/${targetUser.id}/roles`)
      .send({ roleName: 'GRANTOR' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('should return 403 when non-admin user attempts role assignment', async () => {
    const res = await request(app)
      .post(`/api/users/${targetUser.id}/roles`)
      .set('Authorization', `Bearer ${granteeToken}`)
      .send({ roleName: 'GRANTOR' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  test('should allow ADMIN to assign GRANTOR role to a user', async () => {
    const res = await request(app)
      .post(`/api/users/${targetUser.id}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleName: 'GRANTOR' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.user.roles).toContain('GRANTOR');

    // Verify user database roles
    const updated = await UserModel.findWithRolesById(targetUser.id);
    expect(updated.roles).toContain('GRANTOR');
  });

  test('should return 400 when roleName is missing', async () => {
    const res = await request(app)
      .post(`/api/users/${targetUser.id}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('should return 404 when target user does not exist', async () => {
    const res = await request(app)
      .post(`/api/users/00000000-0000-0000-0000-000000000000/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleName: 'GRANTOR' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
