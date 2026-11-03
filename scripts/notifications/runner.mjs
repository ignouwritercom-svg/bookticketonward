import { renderNotification } from './templates.mjs';

// Transport/DB injection allows isolated tests without any credentials or network.
export async function processOne(database, transport, config) {
  const claim = (await database.query('select booking_private.notification_claim($1,$2) result', [config.mode, config.recipient ?? null])).rows[0].result;
  if (!claim) return false;
  const payload = (await database.query('select booking_private.notification_payload($1,$2) result', [claim.id, claim.token])).rows[0].result;
  if (!payload) return true; // Lease lost: never send using a stale token.
  const outcome = payload.cancel || await transport.send(payload, renderNotification(payload, config.origin), claim.token);
  const completed = (await database.query('select booking_private.notification_finish($1,$2,$3) result', [claim.id, claim.token, outcome])).rows[0].result;
  if (!completed) throw new Error('Job completion uncertain; inspect the protected log');
  return true;
}
