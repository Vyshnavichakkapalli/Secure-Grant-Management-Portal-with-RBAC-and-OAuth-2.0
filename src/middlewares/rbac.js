/**
 * Role-Based Access Control (RBAC) Middleware
 * Verifies that the authenticated user possesses at least one of the required roles.
 */

function requireRoles(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map(r => String(r).toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const userRoles = Array.isArray(req.user.roles) 
      ? req.user.roles.map(r => String(r).toUpperCase()) 
      : [];

    const hasPermission = normalizedAllowed.some(role => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to access this resource',
        requiredRoles: allowedRoles,
        userRoles: req.user.roles
      });
    }

    next();
  };
}

module.exports = {
  requireRoles
};
