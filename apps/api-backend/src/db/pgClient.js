let Pool = null;
try {
  Pool = require('pg').Pool;
} catch (e) {
  Pool = null;
}

let pool = null;

function getPool() {
  if (pool) return pool;
  if (!Pool) return null;

  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString && !process.env.POSTGRES_HOST) {
    return null; // Fallback a in-memory mode si no hay credenciales de BD
  }

  pool = new Pool({
    connectionString: connectionString || undefined,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'metahub_db',
    max: 10,
    idleTimeoutMillis: 30000
  });

  return pool;
}

module.exports = {
  getPool,
  query: async (text, params) => {
    const p = getPool();
    if (!p) throw new Error('Database pool not configured');
    return p.query(text, params);
  }
};
