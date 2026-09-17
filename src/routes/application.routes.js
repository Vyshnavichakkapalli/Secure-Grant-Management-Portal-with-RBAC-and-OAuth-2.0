const express = require('express');
const ApplicationController = require('../controllers/application.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRoles } = require('../middlewares/rbac');

const router = express.Router();

// All application routes require authentication
router.use(authenticateToken);

// View specific application (Grantee applicant, parent Grantor, or Admin)
router.get('/:app_id', requireRoles('GRANTEE', 'GRANTOR', 'ADMIN'), ApplicationController.getApplicationById);

module.exports = router;
