import nodemailer from 'nodemailer';
import Redis from 'ioredis';

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // max sends per IP per window

// Redis client (optional). Provide REDIS_URL in env to enable distributed rate limiting.
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_TLS_URL || null;
let redis: Redis | null = null;
if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL);
    redis.on('error', () => {
      // swallow errors; fall back to in-memory if Redis becomes unavailable
      redis = null;
    });
  } catch (e) {
    redis = null;
  }
}

// Fallback in-memory rate map for single-instance dev
const rateMap: Map<string, { count: number; firstTs: number }> = new Map();

// POST /api/send-email
// Expects JSON { name, email, message }
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }

  // Server-side validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
    res.status(400).json({ error: 'Invalid name' });
    return;
  }
  if (typeof email !== 'string' || !emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }
  if (typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 5000) {
    res.status(400).json({ error: 'Invalid message length' });
    return;
  }

  // Basic content safety filter (avoid disallowed content)
  const blacklist = /(exploit|exploitative|attack|ddos|rootkit|payload|crack|password cracking|bypass|unauthorized|phishing|sql injection|xss)/i;
  if (blacklist.test(message) || blacklist.test(name)) {
    res.status(400).json({ error: 'Message contains disallowed content' });
    return;
  }

  // Sender requested by user (use a verified sender in production)
  const fromAddress = process.env.SENDER_EMAIL || 'no-reply@cloudspace.example';

  // Rate limiting by IP — prefer Redis when configured
  const xf = req.headers?.['x-forwarded-for'];
  const ip = typeof xf === 'string' ? xf.split(',')[0].trim() : req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';

  if (redis) {
    try {
      const key = `send_email:${ip}`;
      const cnt = await redis.incr(key);
      if (cnt === 1) {
        await redis.pexpire(key, RATE_LIMIT_WINDOW_MS);
      }
      if (cnt > RATE_LIMIT_MAX) {
        res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        return;
      }
    } catch (e) {
      // if Redis fails, fall back to in-memory limiter below
      console.warn('Redis rate limiter error, falling back to memory limiter');
    }
  }

  // In-memory fallback limiter (single-instance)
  const entry = rateMap.get(ip) || { count: 0, firstTs: Date.now() };
  const now = Date.now();
  if (now - entry.firstTs > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.firstTs = now;
  }
  entry.count += 1;
  rateMap.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    return;
  }

  // SMTP configuration from env, if provided
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  try {
    let transporter;
    let usingEthereal = false;

    if (smtpHost && smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 587,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
    } else {
      // Fallback: ethereal test account (emails are real but for testing preview)
      usingEthereal = true;
      const testAcct = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAcct.smtp.host,
        port: testAcct.smtp.port,
        secure: testAcct.smtp.secure,
        auth: { user: testAcct.user, pass: testAcct.pass },
      });
    }

    const mail = {
      from: `${name} <${fromAddress}>`,
      to: 'bobclein1@gmail.com',
      subject: `Website contact from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p>From: ${name} &lt;${email}&gt;</p><p>${message.replace(/\n/g, '<br/>')}</p>`,
    };

    const info = await transporter.sendMail(mail as any);

    if (usingEthereal) {
      // return preview URL
      const preview = nodemailer.getTestMessageUrl(info) || null;
      res.status(200).json({ ok: true, preview });
      return;
    }

    res.status(200).json({ ok: true, messageId: info.messageId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to send', details: err?.message || String(err) });
  }
}
