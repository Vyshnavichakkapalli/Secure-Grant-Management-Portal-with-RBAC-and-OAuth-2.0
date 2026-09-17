const GrantService = require('../services/grant.service');
const ApplicationService = require('../services/application.service');
const { serializeGrant, serializeApplication } = require('../views/serializers');

class GrantController {
  static async createGrant(req, res, next) {
    try {
      const { title, description, amount } = req.body;
      const grantorId = req.user.userId;

      const newGrant = await GrantService.createGrant(grantorId, { title, description, amount });
      return res.status(201).json(serializeGrant(newGrant));
    } catch (err) {
      next(err);
    }
  }

  static async getAllGrants(req, res, next) {
    try {
      const grants = await GrantService.getAllGrants();
      return res.status(200).json(grants.map(serializeGrant));
    } catch (err) {
      next(err);
    }
  }

  static async getGrantById(req, res, next) {
    try {
      const { id } = req.params;
      const grant = await GrantService.getGrantById(id);
      return res.status(200).json(serializeGrant(grant));
    } catch (err) {
      next(err);
    }
  }

  static async updateGrant(req, res, next) {
    try {
      const { id } = req.params;
      const { title, description, amount } = req.body;
      const userId = req.user.userId;
      const userRoles = req.user.roles;

      const updated = await GrantService.updateGrant(id, userId, userRoles, { title, description, amount });
      return res.status(200).json(serializeGrant(updated));
    } catch (err) {
      next(err);
    }
  }

  static async deleteGrant(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRoles = req.user.roles;

      const result = await GrantService.deleteGrant(id, userId, userRoles);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async applyForGrant(req, res, next) {
    try {
      const { id: grantId } = req.params;
      const { proposal } = req.body;
      const granteeId = req.user.userId;

      const application = await ApplicationService.submitApplication(grantId, granteeId, { proposal });
      return res.status(201).json(serializeApplication(application));
    } catch (err) {
      next(err);
    }
  }

  static async getGrantApplications(req, res, next) {
    try {
      const { id: grantId } = req.params;
      const userId = req.user.userId;
      const userRoles = req.user.roles;

      const applications = await ApplicationService.getGrantApplications(grantId, userId, userRoles);
      return res.status(200).json(applications.map(serializeApplication));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = GrantController;
