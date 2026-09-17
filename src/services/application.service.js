const ApplicationModel = require('../models/application.model');
const GrantModel = require('../models/grant.model');

class ApplicationService {
  static async submitApplication(grantId, granteeId, { proposal }) {
    if (!proposal || !proposal.trim()) {
      const err = new Error('Proposal text is required');
      err.statusCode = 400;
      throw err;
    }

    const grant = await GrantModel.findById(grantId);
    if (!grant) {
      const err = new Error('Grant not found');
      err.statusCode = 404;
      throw err;
    }

    return ApplicationModel.create({
      grantId,
      granteeId,
      proposal: proposal.trim()
    });
  }

  static async getGrantApplications(grantId, userId, userRoles = []) {
    const grant = await GrantModel.findById(grantId);
    if (!grant) {
      const err = new Error('Grant not found');
      err.statusCode = 404;
      throw err;
    }

    const isAdmin = userRoles.map(r => r.toUpperCase()).includes('ADMIN');
    // Only the GRANTOR who owns the grant (or an ADMIN) can view applications
    if (grant.grantor_id !== userId && !isAdmin) {
      const err = new Error('Forbidden: Only the grantor who owns this grant can view its applications');
      err.statusCode = 403;
      throw err;
    }

    return ApplicationModel.findByGrantId(grantId);
  }

  static async getApplicationById(applicationId, userId, userRoles = []) {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    const isAdmin = userRoles.map(r => r.toUpperCase()).includes('ADMIN');
    const isGrantee = application.grantee_id === userId;
    const isGrantOwner = application.grantor_id === userId;

    if (!isGrantee && !isGrantOwner && !isAdmin) {
      const err = new Error('Forbidden: You are not authorized to view this application');
      err.statusCode = 403;
      throw err;
    }

    return application;
  }
}

module.exports = ApplicationService;
