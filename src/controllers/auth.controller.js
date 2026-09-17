const AuthService = require('../services/auth.service');
const OAuthService = require('../services/oauth.service');

class AuthController {
  static async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const user = await AuthService.register({ name, email, password });
      
      // Contract specification: Response (201): { "id": "...", "name": "...", "email": "..." }
      return res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });
      
      // Contract specification: Response (200): { "accessToken": "<jwt_string>" }
      return res.status(200).json({
        accessToken: result.accessToken
      });
    } catch (err) {
      next(err);
    }
  }

  static async oauthRedirect(req, res, next) {
    try {
      const provider = req.params.provider || 'google';
      const authUrl = OAuthService.getAuthorizationUrl(provider);
      return res.redirect(authUrl);
    } catch (err) {
      next(err);
    }
  }

  static async oauthCallback(req, res, next) {
    try {
      const provider = req.params.provider || 'google';
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({ error: 'Missing authorization code in query parameter' });
      }

      const result = await OAuthService.handleCallback(code, provider);
      return res.status(200).json({
        accessToken: result.accessToken,
        user: result.user
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
