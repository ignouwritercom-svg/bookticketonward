// Server-only Node runtime. Never imported by application/client components.
import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const mailbox = value => typeof value === 'string' && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
export function transportConfig(env) {
  const transport = env.NOTIFICATIONS_TRANSPORT || 'capture';
  if (!['capture','smtp'].includes(transport)) throw new Error('Invalid notification transport');
  const origin = new URL(env.NOTIFICATIONS_APP_ORIGIN || 'http://localhost:3000');
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/' || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost','127.0.0.1'].includes(origin.hostname)))) throw new Error('Invalid notification origin');
  if (transport === 'capture') return { transport, mode: 'capture', origin: origin.origin, from: 'notifications@example.test' };
  const mode = env.NOTIFICATIONS_SMTP_MODE || 'controlled';
  if (!['controlled','live'].includes(mode)) throw new Error('Invalid SMTP mode');
  if (mode === 'live' && (env.NOTIFICATIONS_LIVE_DELIVERY_ENABLED !== 'true' || env.NODE_ENV !== 'production' || origin.protocol !== 'https:')) throw new Error('Live delivery is disabled');
  const recipient = env.NOTIFICATIONS_TEST_RECIPIENT;
  if (mode === 'controlled' && !mailbox(recipient)) throw new Error('Controlled recipient required');
  const port = Number(env.NOTIFICATIONS_SMTP_PORT);
  if (![465,587].includes(port) || !env.NOTIFICATIONS_SMTP_HOST || !env.NOTIFICATIONS_SMTP_USER || !env.NOTIFICATIONS_SMTP_PASSWORD || !mailbox(env.NOTIFICATIONS_SMTP_FROM)) throw new Error('SMTP configuration missing or invalid');
  return { transport, mode, origin: origin.origin, recipient, from: env.NOTIFICATIONS_SMTP_FROM,
    smtp: { host: env.NOTIFICATIONS_SMTP_HOST, port, secure: port === 465, requireTLS: true,
      auth: { user: env.NOTIFICATIONS_SMTP_USER, pass: env.NOTIFICATIONS_SMTP_PASSWORD },
      tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
      disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false } };
}
export function safeFailure(error) {
  if (error?.code === 'EAUTH') return 'smtp_auth';
  if (error?.code === 'EDNS' || error?.code === 'ECONNREFUSED') return 'transport_unavailable';
  if (error?.code === 'EENVELOPE' || (Number(error?.responseCode) >= 500 && Number(error?.responseCode) < 600)) return 'smtp_rejected';
  // Timeout/socket loss may occur after DATA acceptance; do not retry automatically.
  return 'ambiguous_delivery';
}
export function createTransport(config, captureDirectory) {
  const sender = nodemailer.createTransport(config.transport === 'capture' ? { streamTransport: true, buffer: true, newline: 'unix', disableFileAccess: true, disableUrlAccess: true } : config.smtp);
  return {
    async send(payload, message, token) {
      if (!mailbox(payload.recipient)) return 'recipient_unavailable';
      if (config.mode === 'capture' && !payload.recipient.toLowerCase().endsWith('.test')) return 'recipient_unavailable';
      if (config.mode === 'controlled' && payload.recipient.toLowerCase() !== config.recipient.toLowerCase()) return 'recipient_unavailable';
      let timer;
      try {
        const result = await Promise.race([
          sender.sendMail({ from: config.from, to: payload.recipient, ...message,
            messageId: `<${payload.id}@${new URL(config.origin).hostname}>`, disableFileAccess: true, disableUrlAccess: true }),
          new Promise((_, reject) => { timer = setTimeout(() => { sender.close(); reject(new Error('Delivery deadline')); }, 60000); }),
        ]);
        if (config.transport === 'capture') {
          await mkdir(captureDirectory, { recursive: true });
          await writeFile(path.join(captureDirectory, `${payload.id}-${token}.eml`), result.message, { flag: 'wx', mode: 0o600 });
          return 'captured';
        }
        return result.accepted?.length === 1 && !result.rejected?.length ? 'accepted' : 'smtp_rejected';
      } catch (error) { return safeFailure(error); }
      finally { clearTimeout(timer); }
    },
    close() { sender.close(); },
  };
}
