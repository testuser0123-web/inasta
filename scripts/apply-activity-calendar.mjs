import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) throw new Error('DATABASE_URL_UNPOOLED is required');
const client = new pg.Client({ connectionString });
try {
  await client.connect();
  await client.query(await readFile(new URL('./activity-calendar.sql', import.meta.url), 'utf8'));
  console.log('Activity calendar schema and post history applied.');
} catch {
  console.error('Activity calendar migration failed. Check database access and schema compatibility.');
  process.exitCode = 1;
} finally {
  await client.end();
}
