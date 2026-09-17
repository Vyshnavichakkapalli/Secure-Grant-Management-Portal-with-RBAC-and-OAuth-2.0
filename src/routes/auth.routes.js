const express = require('express');
const AuthController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// OAuth routes for Google and generic providers
router.get('/google', AuthController.oauthRedirect);
router.get('/google/callback', AuthController.oauthCallback);
router.get('/:provider', AuthController.oauthRedirect);
router.get('/:provider/callback', AuthController.oauthCallback);

module.exports = router;
