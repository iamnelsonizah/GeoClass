import { Pool, QueryResult, QueryResultRow } from 'pg';

const rawConnectionString = process.env.DATABASE_URL || '';
// Strip any ?sslmode parameter so pg's ssl config overrides properly
const connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]+/g, '');

const globalForDb = global as unknown as { dbPool?: Pool | null };

export const pool: Pool | null = connectionString
  ? (globalForDb.dbPool ||
      new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }))
  : null;

if (process.env.NODE_ENV !== 'production' && pool) {
  globalForDb.dbPool = pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  if (!pool) {
    throw new Error(
      'Database connection is not configured. Please set the DATABASE_URL environment variable.'
    );
  }
  const client = await pool.connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}
