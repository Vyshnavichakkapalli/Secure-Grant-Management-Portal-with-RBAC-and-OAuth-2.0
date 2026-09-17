require('dotenv').config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  
  db: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/grant_portal_db',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'grant_portal_db',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secure_grant_portal_jwt_secret_key_2026_x!',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  oauth: {
    provider: process.env.OAUTH_PROVIDER || 'google',
    clientId: process.env.OAUTH_CLIENT_ID || 'mock-client-id',
    clientSecret: process.env.OAUTH_CLIENT_SECRET || 'mock-client-secret',
    redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',
  },

  defaultAdmin: {
    name: process.env.DEFAULT_ADMIN_NAME || 'Portal Administrator',
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@grantportal.com',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPassword123!',
  }
};

module.exports = config;
