const { query } = require('../db/pool');

class GrantModel {
  static async create({ title, description, amount, grantorId }) {
    const res = await query(
      `INSERT INTO grants (title, description, amount, grantor_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, amount, grantor_id, created_at, updated_at;`,
      [title, description, amount, grantorId]
    );
    return res.rows[0];
  }

  static async findById(id) {
    const res = await query(
      `SELECT g.id, g.title, g.description, g.amount, g.grantor_id, g.created_at, g.updated_at,
              u.name as grantor_name, u.email as grantor_email
       FROM grants g
       LEFT JOIN users u ON u.id = g.grantor_id
       WHERE g.id = $1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findAll() {
    const res = await query(
      `SELECT g.id, g.title, g.description, g.amount, g.grantor_id, g.created_at, g.updated_at,
              u.name as grantor_name, u.email as grantor_email
       FROM grants g
       LEFT JOIN users u ON u.id = g.grantor_id
       ORDER BY g.created_at DESC;`
    );
    return res.rows;
  }

  static async findByGrantorId(grantorId) {
    const res = await query(
      `SELECT g.id, g.title, g.description, g.amount, g.grantor_id, g.created_at, g.updated_at,
              u.name as grantor_name, u.email as grantor_email
       FROM grants g
       LEFT JOIN users u ON u.id = g.grantor_id
       WHERE g.grantor_id = $1
       ORDER BY g.created_at DESC;`,
      [grantorId]
    );
    return res.rows;
  }

  static async update(id, { title, description, amount }) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const newTitle = title !== undefined ? title : existing.title;
    const newDescription = description !== undefined ? description : existing.description;
    const newAmount = amount !== undefined ? amount : existing.amount;

    const res = await query(
      `UPDATE grants
       SET title = $1, description = $2, amount = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, title, description, amount, grantor_id, created_at, updated_at;`,
      [newTitle, newDescription, newAmount, id]
    );
    return res.rows[0];
  }

  static async delete(id) {
    const res = await query(
      `DELETE FROM grants WHERE id = $1 RETURNING id;`,
      [id]
    );
    return res.rows[0] || null;
  }
}

module.exports = GrantModel;
