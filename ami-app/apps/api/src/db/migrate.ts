import fs from 'fs';
import path from 'path';
import { pool, logDatabaseStatus } from './connection';

async function runMigrations() {
  console.log('[MIGRATE] Starting database migrations...');
  logDatabaseStatus();

  const migrations = [
    '001_schema.sql',
    '002_hypertables.sql',
  ];

  const client = await pool.connect();

  try {
    for (const migrationFile of migrations) {
      const filePath = path.join(__dirname, 'migrations', migrationFile);
      console.log(`[MIGRATE] Reading migration file: ${migrationFile}`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Migration file not found at: ${filePath}`);
      }

      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`[MIGRATE] Executing ${migrationFile}...`);
      await client.query(sql);
      console.log(`[MIGRATE] Successfully executed: ${migrationFile}`);
    }

    console.log('[MIGRATE] All migrations completed successfully.');
  } catch (error: any) {
    console.error('[MIGRATE] Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

export { runMigrations };
