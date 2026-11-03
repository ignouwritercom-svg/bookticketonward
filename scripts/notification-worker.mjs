// Run explicitly. No mail is sent by an HTTP handler or detached response task.
import { loadEnvConfig } from '@next/env';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { transportConfig, createTransport } from './notifications/transport.mjs';
import { processOne } from './notifications/runner.mjs';

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production', { info() {}, error() {} });
let client, transport;
let stop = false;
process.on('SIGINT', () => { stop = true; });
process.on('SIGTERM', () => { stop = true; });
try {
  const config = transportConfig(process.env);
  const url = new URL(process.env.NOTIFICATIONS_DATABASE_URL || '');
  if (!['postgres:','postgresql:'].includes(url.protocol) || [...url.searchParams.keys()].some(key => key.startsWith('ssl'))) throw new Error('Invalid worker database configuration');
  const ca = process.env.NOTIFICATIONS_DATABASE_CA_FILE ? await readFile(process.env.NOTIFICATIONS_DATABASE_CA_FILE, 'utf8') : undefined;
  client = new pg.Client({ connectionString: url.href, ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, connectionTimeoutMillis: 10000, query_timeout: 15000, statement_timeout: 12000 });
  client.on('error', () => { stop = true; });
  await client.connect();
  const identity = (await client.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0];
  if (!identity || identity.rolsuper || identity.rolbypassrls) throw new Error('Use the dedicated worker login');
  await client.query('set role booking_notification_worker');
  transport = createTransport(config, `test-results/notifications-capture-${randomUUID()}`);
  let processed = 0;
  do {
    const worked = await processOne(client, transport, config);
    if (worked) processed++;
    if (!worked && !process.argv.includes('--watch')) break;
    if (!worked) await new Promise(resolve => setTimeout(resolve, 5000));
  } while (!stop && (process.argv.includes('--watch') || processed < 100));
  console.log(`Notification worker completed: ${processed} jobs handled. Check the protected log for outcomes.`);
} catch {
  console.error('Notification worker stopped safely. Check configuration, database migration and protected notification log. No raw provider or connection error is logged.');
  process.exitCode = 1;
} finally {
  transport?.close();
  await client?.end().catch(() => {});
}
