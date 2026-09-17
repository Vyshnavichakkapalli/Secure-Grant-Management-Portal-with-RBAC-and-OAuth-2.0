const request = require('supertest');
const app = require('../../src/app');
const { resetAndSeedDb } = require('../helpers');

describe('Auth API Routes Integration Tests', () => {
  beforeEach(async () => {
    await resetAndSeedDb();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user and return HTTP 201 without password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Smith',
          email: 'alice@example.com',
          password: 'SecurePassword123!'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'Alice Smith');
      expect(res.body).toHaveProperty('email', 'alice@example.com');
      expect(res.body.password).toBeUndefined();
      expect(res.body.password_hash).toBeUndefined();
    });

    test('should return 400 when missing required registration fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Incomplete'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 409 when registering duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'User One',
          email: 'dup@example.com',
          password: 'Password123!'
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'User Two',
          email: 'dup@example.com',
          password: 'Password456!'
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bob Jones',
          email: 'bob@example.com',
          password: 'MyPassword123!'
        });
    });

    test('should log in successfully and return 200 with accessToken', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'MyPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
    });

    test('should return 401 when password is incorrect', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'IncorrectPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('OAuth 2.0 Flow Endpoints', () => {
    test('GET /api/auth/google should redirect to Google OAuth URL', async () => {
      const res = await request(app).get('/api/auth/google');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('accounts.google.com');
      expect(res.headers.location).toContain('client_id=');
    });

    test('GET /api/auth/google/callback should return 400 when code is missing', async () => {
      const res = await request(app).get('/api/auth/google/callback');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('GET /api/auth/google/callback with valid code should exchange and return accessToken', async () => {
      const res = await request(app).get('/api/auth/google/callback?code=mock_code_oauthuser');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('oauthuser@example.com');
      expect(res.body.user.roles).toContain('GRANTEE');
    });
  });
});
