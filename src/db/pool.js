const { Pool } = require('pg');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

let poolInstance = null;
let useMemoryStore = process.env.DATABASE_MOCK === 'true' || process.env.NODE_ENV === 'test';

function extractWhere(upperSql) {
  const whereIdx = upperSql.indexOf('WHERE ');
  if (whereIdx === -1) return '';
  const orderIdx = upperSql.indexOf('ORDER BY', whereIdx);
  const groupIdx = upperSql.indexOf('GROUP BY', whereIdx);
  let endIdx = upperSql.length;
  if (orderIdx !== -1) endIdx = Math.min(endIdx, orderIdx);
  if (groupIdx !== -1) endIdx = Math.min(endIdx, groupIdx);
  return upperSql.slice(whereIdx, endIdx);
}

// In-Memory Database Store for testing and offline execution
class MemoryDatabase {
  constructor() {
    this.reset();
  }

  reset() {
    this.roles = [
      { id: '11111111-1111-1111-1111-111111111111', name: 'ADMIN', created_at: new Date() },
      { id: '22222222-2222-2222-2222-222222222222', name: 'GRANTOR', created_at: new Date() },
      { id: '33333333-3333-3333-3333-333333333333', name: 'GRANTEE', created_at: new Date() }
    ];
    this.users = [];
    this.user_roles = [];
    this.grants = [];
    this.applications = [];
  }

  async query(text, params = []) {
    const trimmed = text.trim();
    const upper = trimmed.toUpperCase();
    const where = extractWhere(upper);

    // 0. HEALTH / PING / EXTENSIONS
    if (upper === 'SELECT 1;' || upper === 'SELECT 1') {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }

    // 1. USER_ROLES JOIN QUERY (from roles r JOIN user_roles ur)
    if (upper.includes('FROM ROLES') && upper.includes('USER_ROLES')) {
      const userId = String(params[0]);
      const userRoleLinks = this.user_roles.filter(ur => ur.user_id === userId);
      const rows = userRoleLinks.map(ur => {
        const role = this.roles.find(r => r.id === ur.role_id);
        return role ? { id: role.id, name: role.name } : null;
      }).filter(Boolean);
      return { rows, rowCount: rows.length };
    }

    // 2. ROLES QUERIES
    if (upper.startsWith('SELECT') && upper.includes('FROM ROLES')) {
      if (where.includes('NAME')) {
        const nameParam = String(params[0]).toUpperCase();
        const role = this.roles.find(r => r.name.toUpperCase() === nameParam);
        return { rows: role ? [{ ...role }] : [], rowCount: role ? 1 : 0 };
      }
      if (where.includes('ID')) {
        const idParam = String(params[0]);
        const role = this.roles.find(r => r.id === idParam);
        return { rows: role ? [{ ...role }] : [], rowCount: role ? 1 : 0 };
      }
      return { rows: this.roles.map(r => ({ ...r })), rowCount: this.roles.length };
    }

    if (upper.startsWith('INSERT INTO ROLES')) {
      const name = String(params[0]).toUpperCase();
      let existing = this.roles.find(r => r.name.toUpperCase() === name);
      if (existing) {
        return { rows: [{ ...existing }], rowCount: 1 };
      }
      const newRole = { id: uuidv4(), name, created_at: new Date() };
      this.roles.push(newRole);
      return { rows: [{ ...newRole }], rowCount: 1 };
    }

    // 3. USER_ROLES DIRECT
    if (upper.startsWith('INSERT INTO USER_ROLES')) {
      const [userId, roleId] = params;
      const existing = this.user_roles.find(ur => ur.user_id === userId && ur.role_id === roleId);
      if (!existing) {
        this.user_roles.push({ user_id: userId, role_id: roleId, created_at: new Date() });
      }
      return { rows: [{ user_id: userId, role_id: roleId }], rowCount: 1 };
    }

    if (upper.startsWith('DELETE FROM USER_ROLES')) {
      const [userId, roleId] = params;
      const idx = this.user_roles.findIndex(ur => ur.user_id === userId && ur.role_id === roleId);
      if (idx !== -1) {
        this.user_roles.splice(idx, 1);
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // 4. USERS QUERIES
    if (upper.startsWith('SELECT') && upper.includes('FROM USERS')) {
      if (where.includes('EMAIL')) {
        const emailParam = String(params[0]).toLowerCase();
        const user = this.users.find(u => u.email.toLowerCase() === emailParam);
        return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
      }

      if (where.includes('ID')) {
        const idParam = String(params[0]);
        const user = this.users.find(u => u.id === idParam);
        return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
      }

      return { rows: this.users.map(u => ({ ...u })), rowCount: this.users.length };
    }

    if (upper.startsWith('INSERT INTO USERS')) {
      let name, email, password_hash, oauth_provider, oauth_id;
      if (params.length === 3) {
        [name, email, password_hash] = params;
      } else if (params.length >= 5) {
        [name, email, password_hash, oauth_provider, oauth_id] = params;
      }

      const id = uuidv4();
      const existing = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        if (upper.includes('ON CONFLICT')) {
          return { rows: [{ ...existing }], rowCount: 1 };
        }
        const err = new Error('Key (email)=(' + email + ') already exists.');
        err.code = '23505';
        throw err;
      }

      const newUser = {
        id,
        name,
        email: email.toLowerCase(),
        password_hash: password_hash || null,
        oauth_provider: oauth_provider || null,
        oauth_id: oauth_id || null,
        created_at: new Date(),
        updated_at: new Date()
      };
      this.users.push(newUser);
      return { rows: [{ ...newUser }], rowCount: 1 };
    }

    // 5. GRANTS QUERIES
    if (upper.startsWith('INSERT INTO GRANTS')) {
      const [title, description, amount, grantor_id] = params;
      const newGrant = {
        id: uuidv4(),
        title,
        description,
        amount: parseFloat(amount),
        grantor_id,
        created_at: new Date(),
        updated_at: new Date()
      };
      this.grants.push(newGrant);
      return { rows: [{ ...newGrant }], rowCount: 1 };
    }

    if (upper.startsWith('SELECT') && upper.includes('FROM GRANTS')) {
      if (where.includes('GRANTOR_ID')) {
        const grantorId = String(params[0]);
        const results = this.grants.filter(g => g.grantor_id === grantorId).map(grant => {
          const grantor = this.users.find(u => u.id === grant.grantor_id);
          return {
            ...grant,
            grantor_name: grantor ? grantor.name : null,
            grantor_email: grantor ? grantor.email : null
          };
        });
        return { rows: results, rowCount: results.length };
      }

      if (where.includes('ID')) {
        const id = String(params[0]);
        const grant = this.grants.find(g => g.id === id);
        if (!grant) return { rows: [], rowCount: 0 };
        const grantor = this.users.find(u => u.id === grant.grantor_id);
        return {
          rows: [{
            ...grant,
            grantor_name: grantor ? grantor.name : null,
            grantor_email: grantor ? grantor.email : null
          }],
          rowCount: 1
        };
      }

      // All grants (no WHERE)
      const results = this.grants.map(grant => {
        const grantor = this.users.find(u => u.id === grant.grantor_id);
        return {
          ...grant,
          grantor_name: grantor ? grantor.name : null,
          grantor_email: grantor ? grantor.email : null
        };
      });
      return { rows: results, rowCount: results.length };
    }

    if (upper.startsWith('UPDATE GRANTS')) {
      const [title, description, amount, id] = params;
      const grant = this.grants.find(g => g.id === id);
      if (!grant) return { rows: [], rowCount: 0 };
      if (title !== undefined) grant.title = title;
      if (description !== undefined) grant.description = description;
      if (amount !== undefined) grant.amount = parseFloat(amount);
      grant.updated_at = new Date();
      return { rows: [{ ...grant }], rowCount: 1 };
    }

    if (upper.startsWith('DELETE FROM GRANTS')) {
      const id = String(params[0]);
      const idx = this.grants.findIndex(g => g.id === id);
      if (idx !== -1) {
        const deleted = this.grants.splice(idx, 1);
        return { rows: deleted, rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // 6. APPLICATIONS QUERIES
    if (upper.startsWith('INSERT INTO APPLICATIONS')) {
      const [grant_id, grantee_id, proposal] = params;
      const newApp = {
        id: uuidv4(),
        grant_id,
        grantee_id,
        proposal,
        status: 'submitted',
        created_at: new Date(),
        updated_at: new Date()
      };
      this.applications.push(newApp);
      return { rows: [{ ...newApp }], rowCount: 1 };
    }

    if (upper.startsWith('SELECT') && upper.includes('FROM APPLICATIONS')) {
      if (where.includes('GRANTEE_ID')) {
        const granteeId = String(params[0]);
        const matching = this.applications.filter(a => a.grantee_id === granteeId).map(app => {
          const grant = this.grants.find(g => g.id === app.grant_id);
          return {
            ...app,
            grant_title: grant ? grant.title : null,
            grant_amount: grant ? grant.amount : null
          };
        });
        return { rows: matching, rowCount: matching.length };
      }

      if (where.includes('GRANT_ID')) {
        const grantId = String(params[0]);
        const matching = this.applications.filter(a => a.grant_id === grantId).map(app => {
          const grantee = this.users.find(u => u.id === app.grantee_id);
          return {
            ...app,
            grantee_name: grantee ? grantee.name : null,
            grantee_email: grantee ? grantee.email : null
          };
        });
        return { rows: matching, rowCount: matching.length };
      }

      if (where.includes('ID')) {
        const id = String(params[0]);
        const app = this.applications.find(a => a.id === id);
        if (!app) return { rows: [], rowCount: 0 };
        const grant = this.grants.find(g => g.id === app.grant_id);
        const grantee = this.users.find(u => u.id === app.grantee_id);
        return {
          rows: [{
            ...app,
            grant_title: grant ? grant.title : null,
            grantor_id: grant ? grant.grantor_id : null,
            grantee_name: grantee ? grantee.name : null,
            grantee_email: grantee ? grantee.email : null
          }],
          rowCount: 1
        };
      }

      return { rows: this.applications.map(a => ({ ...a })), rowCount: this.applications.length };
    }

    if (upper.startsWith('UPDATE APPLICATIONS')) {
      const [status, id] = params;
      const app = this.applications.find(a => a.id === id);
      if (!app) return { rows: [], rowCount: 0 };
      app.status = status;
      app.updated_at = new Date();
      return { rows: [{ ...app }], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }
}

const memoryDb = new MemoryDatabase();

function getPool() {
  if (useMemoryStore) {
    return memoryDb;
  }

  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: config.db.url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    poolInstance.on('error', (err) => {
      console.error('Unexpected PostgreSQL client error:', err.message);
    });
  }

  return poolInstance;
}

async function query(text, params = []) {
  const pool = getPool();
  return pool.query(text, params);
}

function setMemoryMode(enable) {
  useMemoryStore = enable;
}

module.exports = {
  getPool,
  query,
  memoryDb,
  setMemoryMode
};
