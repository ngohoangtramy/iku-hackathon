import { Pool, PoolConfig, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

function maskConnectionString(url?: string): string {
  if (!url) return 'UNDEFINED';
  return url.replace(/:([^:@]+)@/, ':****@');
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[DB] WARNING: DATABASE_URL environment variable is not defined.');
}

const isProduction = process.env.NODE_ENV === 'production';
const requiresSsl = connectionString?.includes('sslmode=require') || isProduction || true;

const poolConfig: PoolConfig = {
  connectionString: connectionString || 'postgres://localhost:5432/ami_dev',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
};

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log('[DB] Executed query:', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error: any) {
    const duration = Date.now() - start;
    console.error('[DB] Query error:', {
      message: error.message,
      query: text,
      duration,
    });
    throw error;
  }
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

export function logDatabaseStatus() {
  console.log(`[DB] Connection initialized for: ${maskConnectionString(connectionString)}`);
}
