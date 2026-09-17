const { query } = require('../db/pool');

class ApplicationModel {
  static async create({ grantId, granteeId, proposal }) {
    const res = await query(
      `INSERT INTO applications (grant_id, grantee_id, proposal, status)
       VALUES ($1, $2, $3, 'submitted')
       RETURNING id, grant_id, grantee_id, proposal, status, created_at, updated_at;`,
      [grantId, granteeId, proposal]
    );
    return res.rows[0];
  }

  static async findById(id) {
    const res = await query(
      `SELECT a.id, a.grant_id, a.grantee_id, a.proposal, a.status, a.created_at, a.updated_at,
              g.title as grant_title, g.grantor_id,
              u.name as grantee_name, u.email as grantee_email
       FROM applications a
       JOIN grants g ON g.id = a.grant_id
       JOIN users u ON u.id = a.grantee_id
       WHERE a.id = $1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findByGrantId(grantId) {
    const res = await query(
      `SELECT a.id, a.grant_id, a.grantee_id, a.proposal, a.status, a.created_at, a.updated_at,
              u.name as grantee_name, u.email as grantee_email
       FROM applications a
       JOIN users u ON u.id = a.grantee_id
       WHERE a.grant_id = $1
       ORDER BY a.created_at DESC;`,
      [grantId]
    );
    return res.rows;
  }

  static async findByGranteeId(granteeId) {
    const res = await query(
      `SELECT a.id, a.grant_id, a.grantee_id, a.proposal, a.status, a.created_at, a.updated_at,
              g.title as grant_title, g.amount as grant_amount
       FROM applications a
       JOIN grants g ON g.id = a.grant_id
       WHERE a.grantee_id = $1
       ORDER BY a.created_at DESC;`,
      [granteeId]
    );
    return res.rows;
  }

  static async updateStatus(id, status) {
    const res = await query(
      `UPDATE applications
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, grant_id, grantee_id, proposal, status, created_at, updated_at;`,
      [status, id]
    );
    return res.rows[0] || null;
  }
}

module.exports = ApplicationModel;
