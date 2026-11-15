import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = env.SMTP_USER && env.SMTP_PASS
  ? nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })
  : null;

export function isMailerConfigured() {
  return Boolean(transporter && env.SMTP_FROM);
}

export function buildEmailTemplate(content, preheader = '') {
  const safeContent = String(content || '').trim();
  const safePreheader = escapeHtml(preheader).replace(/&#039;/g, '&apos;');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZAVIKOO</title></head>
<body style="margin:0;background:#eeeae2;font-family:Georgia,'Times New Roman',serif;color:#211f1a;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eeeae2;"><tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fdfbf7;border:1px solid #d8d1c4;">
      <tr><td align="center" style="padding:36px 32px 24px;border-bottom:1px solid #ded8cc;">
        <div style="font-size:30px;letter-spacing:7px;font-weight:700;color:#211f1a;">ZAVIKOO</div>
        <div style="margin-top:8px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#9a7838;">Custom Atelier</div>
      </td></tr>
      <tr><td style="padding:38px 42px 34px;font-size:16px;line-height:1.75;color:#403d36;">
        ${safeContent}
      </td></tr>
      <tr><td style="padding:22px 42px;background:#211f1a;text-align:center;font-family:Arial,sans-serif;font-size:12px;line-height:1.8;color:#d9d0be;">
        <strong style="color:#fff;font-size:13px;letter-spacing:2px;">ZAVIKOO</strong><br>
        Thoughtful essentials, made personal.<br>
        <span style="color:#a9a18f;">Karachi, Pakistan</span>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export async function sendEmail({ to, subject, text, html }) {
  if (!transporter || !env.SMTP_FROM) {
    throw new Error('SMTP is not configured.');
  }
  const brandedHtml = html?.includes('data-zavikoo-email-template') ? html : buildEmailTemplate(html, text ? String(text).replace(/\s+/g, ' ').slice(0, 120) : subject);
  return transporter.sendMail({ from: env.SMTP_FROM, to, subject, text, html: brandedHtml });
}

export function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character]));
}

