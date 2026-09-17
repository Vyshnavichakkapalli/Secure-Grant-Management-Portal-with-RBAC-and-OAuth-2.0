const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Unauthorized: Invalid token format, must be Bearer <token>' });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Validate decoded payload schema
    if (!decoded.userId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }

    req.user = {
      userId: decoded.userId,
      roles: Array.isArray(decoded.roles) ? decoded.roles : []
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

module.exports = {
  authenticateToken
};
