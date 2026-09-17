const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../../src/middlewares/auth');
const { requireRoles } = require('../../src/middlewares/rbac');
const config = require('../../src/config');

describe('RBAC & Auth Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('authenticateToken', () => {
    test('should return 401 when Authorization header is missing', () => {
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Missing Authorization/i) }));
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when Authorization header does not use Bearer format', () => {
      req.headers['authorization'] = 'Basic 12345';
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Invalid token format/i) }));
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when token is invalid or corrupted', () => {
      req.headers['authorization'] = 'Bearer invalid.token.payload';
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Invalid or expired token/i) }));
      expect(next).not.toHaveBeenCalled();
    });

    test('should populate req.user and call next() on valid token', () => {
      const token = jwt.sign({ userId: 'user-123', roles: ['GRANTOR'] }, config.jwt.secret);
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateToken(req, res, next);
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('user-123');
      expect(req.user.roles).toEqual(['GRANTOR']);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should return 401 when payload does not contain userId', () => {
      const token = jwt.sign({ sub: 'user-123', roles: ['GRANTOR'] }, config.jwt.secret);
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Invalid token payload/i) }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRoles', () => {
    test('should return 401 if req.user is undefined', () => {
      const middleware = requireRoles('ADMIN');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 Forbidden if user lacks required role', () => {
      req.user = { userId: 'user-123', roles: ['GRANTEE'] };
      const middleware = requireRoles('GRANTOR');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringMatching(/Forbidden/i)
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next() if user possesses required role', () => {
      req.user = { userId: 'user-123', roles: ['GRANTOR'] };
      const middleware = requireRoles('GRANTOR');
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should call next() if user has any of multiple allowed roles', () => {
      req.user = { userId: 'user-123', roles: ['GRANTOR'] };
      const middleware = requireRoles('ADMIN', 'GRANTOR');
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
