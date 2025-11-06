// backend/src/config/mailer.js
import nodemailer from "nodemailer";

/** Read and normalize SMTP config (defaults tailored for Gmail). */
function getSmtpConfig() {
  const {
    SMTP_HOST = "smtp.gmail.com",
    SMTP_PORT = "465",
    SMTP_SECURE, // "true"/"false" or undefined
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM,
  } = process.env;

  const port = Number(SMTP_PORT || 465);
  const secure = SMTP_SECURE != null ? String(SMTP_SECURE) === "true" : port === 465;

  // Gmail app passwords are 16 chars with NO spaces; trim just in case
  const pass = (SMTP_PASS || "").replace(/\s+/g, "");

  return {
    host: SMTP_HOST,
    port,
    secure,
    auth: SMTP_USER && pass ? { user: SMTP_USER, pass } : undefined,
    from: MAIL_FROM || SMTP_USER || "no-reply@example.com",
  };
}

export function makeTransport() {
  const cfg = getSmtpConfig();

  // If no creds, use dev "console" transport (no real send, just logs)
  if (!cfg.auth?.user || !cfg.auth?.pass) {
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.auth,
  });
}

/** Optional: call this once on boot to confirm SMTP is usable. */
export async function verifySmtp() {
  try {
    const t = makeTransport();
    await t.verify();
    console.log("📧 SMTP connection OK");
    return { ok: true };
  } catch (e) {
    console.warn("📧 SMTP verify FAILED:", e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Send reset email. Returns { ok: true } or { ok: false, error }.
 * Does NOT throw, so your controller can always return 200 to the client.
 */
export async function sendResetEmail({ to, resetUrl }) {
  const cfg = getSmtpConfig();
  const transporter = makeTransport();

  // Gmail: From should be the same account as SMTP_USER to avoid auth issues
  let from = cfg.from;
  if (/smtp\.gmail\.com/i.test(cfg.host) && cfg.auth?.user) {
    const display = /^\s*([^<]+)</.test(cfg.from) ? cfg.from.match(/^\s*([^<]+)/)[1].trim() : "GIS App";
    from = `${display} <${cfg.auth.user}>`;
  }

  const html = `
    <p>We received a request to reset your password.</p>
    <p><a href="${resetUrl}">Reset your password</a> (valid for 15 minutes)</p>
    <p>If you didn't request this, you can ignore this email.</p>
  `;
  const text = `Reset your password: ${resetUrl} (valid for 15 minutes)`;

  try {
    const info = await transporter.sendMail({ from, to, subject: "Password reset instructions", html, text });

    // Ethereal/stream transports: show preview in logs
    if (nodemailer.getTestMessageUrl && nodemailer.getTestMessageUrl(info)) {
      console.log("📧 Preview URL:", nodemailer.getTestMessageUrl(info));
    } else if (info?.message) {
      console.log("Reset email output:\n", info.message.toString());
    }

    return { ok: true };
  } catch (e) {
    console.error("sendResetEmail failed:", e.message);
    return { ok: false, error: e.message };
  }
}