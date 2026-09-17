const jwt = require('jsonwebtoken');
const AuthService = require('../../src/services/auth.service');
const { resetAndSeedDb } = require('../helpers');
const config = require('../../src/config');

describe('AuthService Unit Tests', () => {
  beforeEach(async () => {
    await resetAndSeedDb();
  });

  test('should successfully register a new user with default role GRANTEE', async () => {
    const newUser = await AuthService.register({
      name: 'Jane Grantee',
      email: 'jane.grantee@example.com',
      password: 'StrongPassword123!'
    });

    expect(newUser).toBeDefined();
    expect(newUser.id).toBeDefined();
    expect(newUser.name).toBe('Jane Grantee');
    expect(newUser.email).toBe('jane.grantee@example.com');
    expect(newUser.roles).toContain('GRANTEE');
    expect(newUser.password_hash).toBeUndefined();
  });

  test('should reject registration when required fields are missing', async () => {
    await expect(AuthService.register({ name: 'Jane', email: '' }))
      .rejects.toThrow('Name, email, and password are required');
  });

  test('should reject registration with duplicate email', async () => {
    await AuthService.register({
      name: 'First User',
      email: 'duplicate@example.com',
      password: 'Password123!'
    });

    await expect(AuthService.register({
      name: 'Second User',
      email: 'duplicate@example.com',
      password: 'Password456!'
    })).rejects.toThrow('A user with this email already exists');
  });

  test('should successfully log in with valid credentials and return accessToken', async () => {
    await AuthService.register({
      name: 'Login User',
      email: 'login@example.com',
      password: 'Password123!'
    });

    const result = await AuthService.login({
      email: 'login@example.com',
      password: 'Password123!'
    });

    expect(result).toHaveProperty('accessToken');
    expect(typeof result.accessToken).toBe('string');

    // Verify JWT payload schema strictly conforms to Requirement 6:
    // { "userId": "...", "roles": ["ROLE_NAME"], "iat": ..., "exp": ... }
    const decoded = jwt.decode(result.accessToken);
    expect(decoded).toHaveProperty('userId');
    expect(decoded).toHaveProperty('roles');
    expect(Array.isArray(decoded.roles)).toBe(true);
    expect(decoded.roles).toContain('GRANTEE');
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });

  test('should reject login with wrong password', async () => {
    await AuthService.register({
      name: 'User',
      email: 'wrongpw@example.com',
      password: 'CorrectPassword123!'
    });

    await expect(AuthService.login({
      email: 'wrongpw@example.com',
      password: 'WrongPassword'
    })).rejects.toThrow('Invalid email or password');
  });

  test('should reject login with non-existent email', async () => {
    await expect(AuthService.login({
      email: 'nonexistent@example.com',
      password: 'SomePassword'
    })).rejects.toThrow('Invalid email or password');
  });

  test('should reject login when credentials are missing', async () => {
    await expect(AuthService.login({ email: '', password: '' }))
      .rejects.toThrow('Email and password are required');
  });
});
