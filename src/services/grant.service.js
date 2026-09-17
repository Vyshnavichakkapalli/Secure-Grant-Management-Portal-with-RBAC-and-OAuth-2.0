const GrantModel = require('../models/grant.model');

class GrantService {
  static async createGrant(grantorId, { title, description, amount }) {
    if (!title || !description || amount === undefined || amount === null) {
      const err = new Error('Title, description, and amount are required');
      err.statusCode = 400;
      throw err;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      const err = new Error('Amount must be a positive number');
      err.statusCode = 400;
      throw err;
    }

    return GrantModel.create({
      title: title.trim(),
      description: description.trim(),
      amount: parsedAmount,
      grantorId
    });
  }

  static async getAllGrants() {
    return GrantModel.findAll();
  }

  static async getGrantById(id) {
    const grant = await GrantModel.findById(id);
    if (!grant) {
      const err = new Error('Grant not found');
      err.statusCode = 404;
      throw err;
    }
    return grant;
  }

  static async updateGrant(id, userId, userRoles, { title, description, amount }) {
    const grant = await GrantModel.findById(id);
    if (!grant) {
      const err = new Error('Grant not found');
      err.statusCode = 404;
      throw err;
    }

    // Strict ownership verification: only the creator GRANTOR can update
    if (grant.grantor_id !== userId) {
      const err = new Error('Forbidden: Only the grantor who created this grant can update it');
      err.statusCode = 403;
      throw err;
    }

    let parsedAmount;
    if (amount !== undefined) {
      parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        const err = new Error('Amount must be a positive number');
        err.statusCode = 400;
        throw err;
      }
    }

    return GrantModel.update(id, {
      title: title !== undefined ? title.trim() : undefined,
      description: description !== undefined ? description.trim() : undefined,
      amount: parsedAmount
    });
  }

  static async deleteGrant(id, userId, userRoles = []) {
    const grant = await GrantModel.findById(id);
    if (!grant) {
      const err = new Error('Grant not found');
      err.statusCode = 404;
      throw err;
    }

    const isAdmin = userRoles.map(r => r.toUpperCase()).includes('ADMIN');
    const isOwner = grant.grantor_id === userId;

    if (!isOwner && !isAdmin) {
      const err = new Error('Forbidden: Only the grantor owner or an ADMIN can delete this grant');
      err.statusCode = 403;
      throw err;
    }

    await GrantModel.delete(id);
    return { message: 'Grant deleted successfully', id };
  }
}

module.exports = GrantService;
