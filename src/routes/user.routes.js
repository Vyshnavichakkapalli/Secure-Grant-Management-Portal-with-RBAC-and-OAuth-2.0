const express = require('express');
const UserController = require('../controllers/user.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRoles } = require('../middlewares/rbac');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// Current user profile
router.get('/me', UserController.getMe);

// Admin-only role assignment
router.post('/:userId/roles', requireRoles('ADMIN'), UserController.assignRole);

module.exports = router;
