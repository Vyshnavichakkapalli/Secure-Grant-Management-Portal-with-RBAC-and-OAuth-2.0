const jwt = require('jsonwebtoken');
const config = require('../src/config');
const { memoryDb } = require('../src/db/pool');
const { seedDatabase } = require('../src/db/seed');

async function resetAndSeedDb() {
  memoryDb.reset();
  await seedDatabase();
}

function generateTestToken(userId, roles = []) {
  return jwt.sign({ userId, roles }, config.jwt.secret, { expiresIn: '1h' });
}

module.exports = {
  resetAndSeedDb,
  generateTestToken
};
