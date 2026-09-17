const express = require('express');
const GrantController = require('../controllers/grant.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRoles } = require('../middlewares/rbac');

const router = express.Router();

// All grant routes require authentication
router.use(authenticateToken);

// Grant listing and details (GRANTEE, GRANTOR, ADMIN)
router.get('/', requireRoles('GRANTEE', 'GRANTOR', 'ADMIN'), GrantController.getAllGrants);
router.get('/:id', requireRoles('GRANTEE', 'GRANTOR', 'ADMIN'), GrantController.getGrantById);

// Grant creation (GRANTOR only)
router.post('/', requireRoles('GRANTOR'), GrantController.createGrant);

// Grant updating (Only the GRANTOR who owns the grant)
router.put('/:id', requireRoles('GRANTOR'), GrantController.updateGrant);

// Grant deletion (Only the GRANTOR who owns the grant or an ADMIN)
router.delete('/:id', requireRoles('GRANTOR', 'ADMIN'), GrantController.deleteGrant);

// Application submission for a grant (GRANTEE only)
router.post('/:id/apply', requireRoles('GRANTEE'), GrantController.applyForGrant);

// View applications for a grant (Only the GRANTOR who owns the grant or an ADMIN)
router.get('/:id/applications', requireRoles('GRANTOR', 'ADMIN'), GrantController.getGrantApplications);

module.exports = router;
