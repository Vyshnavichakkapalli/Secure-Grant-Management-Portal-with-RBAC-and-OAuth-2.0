const { query } = require('../db/pool');

class RoleModel {
  static async findAll() {
    const res = await query('SELECT id, name, created_at FROM roles ORDER BY name ASC;');
    return res.rows;
  }

  static async findByName(name) {
    const res = await query('SELECT id, name, created_at FROM roles WHERE UPPER(name) = UPPER($1);', [name]);
    return res.rows[0] || null;
  }

  static async findById(id) {
    const res = await query('SELECT id, name, created_at FROM roles WHERE id = $1;', [id]);
    return res.rows[0] || null;
  }

  static async create(name) {
    const res = await query(
      'INSERT INTO roles (name) VALUES (UPPER($1)) RETURNING id, name, created_at;',
      [name]
    );
    return res.rows[0];
  }
}

module.exports = RoleModel;
