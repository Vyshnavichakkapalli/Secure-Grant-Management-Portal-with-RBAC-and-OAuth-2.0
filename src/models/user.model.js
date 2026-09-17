const { query } = require('../db/pool');

class UserModel {
  static async create({ name, email, passwordHash = null, oauthProvider = null, oauthId = null }) {
    const res = await query(
      `INSERT INTO users (name, email, password_hash, oauth_provider, oauth_id)
       VALUES ($1, LOWER($2), $3, $4, $5)
       RETURNING id, name, email, oauth_provider, oauth_id, created_at, updated_at;`,
      [name, email, passwordHash, oauthProvider, oauthId]
    );
    return res.rows[0];
  }

  static async findByEmail(email) {
    const res = await query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1);`,
      [email]
    );
    return res.rows[0] || null;
  }

  static async findById(id) {
    const res = await query(
      `SELECT id, name, email, oauth_provider, oauth_id, created_at, updated_at
       FROM users WHERE id = $1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async getUserRoles(userId) {
    const res = await query(
      `SELECT r.id, r.name
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1;`,
      [userId]
    );
    return res.rows.map(row => row.name);
  }

  static async assignRole(userId, roleId) {
    await query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING;`,
      [userId, roleId]
    );
    return true;
  }

  static async removeRole(userId, roleId) {
    await query(
      `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2;`,
      [userId, roleId]
    );
    return true;
  }

  static async findWithRolesById(id) {
    const user = await this.findById(id);
    if (!user) return null;
    const roles = await this.getUserRoles(id);
    return { ...user, roles };
  }

  static async findWithRolesByEmail(email) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const roles = await this.getUserRoles(user.id);
    return { ...user, roles };
  }
}

module.exports = UserModel;
