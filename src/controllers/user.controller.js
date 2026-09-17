const UserModel = require('../models/user.model');
const RoleModel = require('../models/role.model');

class UserController {
  static async assignRole(req, res, next) {
    try {
      const { userId } = req.params;
      const { roleName } = req.body;

      if (!roleName) {
        return res.status(400).json({ error: 'roleName is required in request body' });
      }

      const targetUser = await UserModel.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const normalizedRoleName = roleName.trim().toUpperCase();
      let role = await RoleModel.findByName(normalizedRoleName);
      if (!role) {
        // If valid standard role, create it or error
        if (['ADMIN', 'GRANTOR', 'GRANTEE'].includes(normalizedRoleName)) {
          role = await RoleModel.create(normalizedRoleName);
        } else {
          return res.status(400).json({ error: `Invalid role name: ${roleName}` });
        }
      }

      await UserModel.assignRole(userId, role.id);
      const updatedUser = await UserModel.findWithRolesById(userId);

      return res.status(200).json({
        message: `Role ${normalizedRoleName} successfully assigned to user`,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          roles: updatedUser.roles
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res, next) {
    try {
      const user = await UserModel.findWithRolesById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;
