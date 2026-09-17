const bcrypt = require('bcryptjs');
const { query } = require('./pool');
const config = require('../config');

async function seedDatabase() {
  try {
    // 1. Seed Roles
    const roles = ['ADMIN', 'GRANTOR', 'GRANTEE'];
    for (const roleName of roles) {
      await query(
        `INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;`,
        [roleName]
      );
    }

    // 2. Check if default admin exists
    const adminEmail = config.defaultAdmin.email.toLowerCase();
    const existingAdmin = await query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1);`,
      [adminEmail]
    );

    let adminUserId;
    if (existingAdmin.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(config.defaultAdmin.password, salt);

      const insertAdmin = await query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email;`,
        [config.defaultAdmin.name, adminEmail, hashedPassword]
      );

      adminUserId = insertAdmin.rows[0].id;
    } else {
      adminUserId = existingAdmin.rows[0].id;
    }

    // 3. Ensure Admin has ADMIN role
    const adminRoleResult = await query(
      `SELECT id FROM roles WHERE name = 'ADMIN';`
    );

    if (adminRoleResult.rows.length > 0) {
      const adminRoleId = adminRoleResult.rows[0].id;
      await query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING;`,
        [adminUserId, adminRoleId]
      );
    }

    return true;
  } catch (error) {
    console.error('Database seeding error:', error);
    throw error;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Database seeding completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
