const ApplicationService = require('../services/application.service');
const { serializeApplication } = require('../views/serializers');

class ApplicationController {
  static async getApplicationById(req, res, next) {
    try {
      const applicationId = req.params.app_id || req.params.id;
      const userId = req.user.userId;
      const userRoles = req.user.roles;

      const application = await ApplicationService.getApplicationById(applicationId, userId, userRoles);
      return res.status(200).json(serializeApplication(application));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ApplicationController;
