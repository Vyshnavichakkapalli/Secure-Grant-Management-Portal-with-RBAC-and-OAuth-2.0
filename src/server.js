const app = require('./app');
const config = require('./config');
const { getPool } = require('./db/pool');
const { initRedis } = require('./db/redis');
const { seedDatabase } = require('./db/seed');

async function startServer() {
  try {
    console.log(`Starting Secure Grant Management Portal in ${config.nodeEnv} mode...`);

    // 1. Initialize Redis Cache
    await initRedis();
    console.log('Redis cache initialized.');

    // 2. Verify Database Connection
    const pool = getPool();
    try {
      await pool.query('SELECT 1;');
      console.log('PostgreSQL database connection verified.');
    } catch (dbErr) {
      console.warn('Direct PostgreSQL query check failed or using fallback store:', dbErr.message);
    }

    // 3. Seed Database with default roles and admin
    try {
      await seedDatabase();
      console.log('Database verification and seeding completed.');
    } catch (seedErr) {
      console.warn('Database seeding notice:', seedErr.message);
    }

    // 4. Start HTTP Server
    const server = app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(` Grant Management Portal is running on port ${config.port}`);
      console.log(` Health check available at: http://localhost:${config.port}/health`);
      console.log(` API Endpoints available at: http://localhost:${config.port}/api`);
      console.log(` Default Admin Email: ${config.defaultAdmin.email}`);
      console.log(`=======================================================`);
    });

    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          const p = getPool();
          if (p && typeof p.end === 'function') {
            await p.end();
          }
        } catch (e) {}
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
