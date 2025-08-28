const { Pool } = require('pg');

const env = process.env.NODE_ENV || 'development';

// Prefer DATABASE_URL when provided; otherwise build from discrete vars
function buildConfigFromVars() {
  const isProd = env === 'production';

  const host = isProd
    ? (process.env.DB_HOST || process.env.DB_HOSTLOCAL || 'localhost')
    : (process.env.DB_HOSTLOCAL || process.env.DB_HOST || 'localhost');

  const port = Number(isProd
    ? (process.env.DB_PORT || process.env.DB_PORTLOCAL || 5432)
    : (process.env.DB_PORTLOCAL || process.env.DB_PORT || 5432));

  const user = process.env.DB_USERNAME || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'postgres';

  const cfg = {
    host,
    port,
    user,
    password,
    database,
    // ssl: { rejectUnauthorized: false }, // Activez en prod si requis
  };

  return cfg;
}

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // ssl: { rejectUnauthorized: false }, // Activez en prod si requis
  });
} else {
  const cfg = buildConfigFromVars();
  if (!cfg.host) {
    console.warn('[db] Avertissement: hôte DB non défini, utilisation de localhost');
  }
  pool = new Pool(cfg);
}

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
  process.exit(-1);
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
