
import { ServerClient } from 'postmark';

const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
const FROM = process.env.POSTMARK_FROM_EMAIL;

if (!POSTMARK_TOKEN) { throw new Error('POSTMARK_SERVER_TOKEN is not set'); }
if (!FROM) { throw new Error('POSTMARK_FROM_EMAIL is not set'); }

const client = new ServerClient(POSTMARK_TOKEN);

const APP_NAME = 'Daily Macro Edge';
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  process.env.APP_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export async function sendWelcomeEmail(to: string, opts: { name?: string }) {
  const subj = `Welcome to ${APP_NAME}`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <h2>Welcome${opts.name ? `, ${escapeHtml(opts.name)}` : ''}!</h2>
      <p>You’re all set. Visit your account to explore your plan and manage billing.</p>
      <p><a href="${APP_URL}/account">Open your account</a></p>
      <p style="color:#555;font-size:12px">If you didn’t request this, you can ignore this email.</p>
    </div>`;
  await client.sendEmail({ From: FROM!, To: to, Subject: subj, HtmlBody: html });
}

export async function sendPreRenewalNotice(to: string, opts: { name?: string; plan: string; renewsAt: Date; }) {
  const subj = `${APP_NAME}: Your ${opts.plan} plan renews soon`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <h2>Heads up${opts.name ? `, ${escapeHtml(opts.name)}` : ''} — renewal in 3 days</h2>
      <p>Your <strong>${escapeHtml(opts.plan)}</strong> plan will renew on <strong>${opts.renewsAt.toUTCString()}</strong>.</p>
      <p>You can manage your subscription anytime in the billing portal.</p>
      <p><a href="${APP_URL}/account">Manage billing</a></p>
      <hr />
      <p style="color:#555;font-size:12px">Digital access only. See Terms and Privacy on our site.</p>
    </div>`;
  await client.sendEmail({ From: FROM!, To: to, Subject: subj, HtmlBody: html });
}

export async function sendDunningEmail(to: string, opts: { name?: string; amountCents?: number; reason?: 'failed_payment' | 'card_expiring' | 'invoice_open'; }) {
  const amount = typeof opts.amountCents === 'number' ? `$${(opts.amountCents / 100).toFixed(2)} USD` : 'your invoice';
  const reason =
    opts.reason === 'card_expiring' ? 'Your card appears to be expiring soon.' :
    opts.reason === 'invoice_open' ? 'Your invoice remains open.' :
    'We could not process your last payment.';

  const subj = `${APP_NAME}: Action needed — payment issue`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <h2>Action needed${opts.name ? `, ${escapeHtml(opts.name)}` : ''}</h2>
      <p>${reason}</p>
      <p>Please update your payment method so we can finalize ${amount}.</p>
      <p><a href="${APP_URL}/account">Update payment method</a></p>
      <p style="color:#555;font-size:12px">If you already updated your details, you may ignore this email.</p>
    </div>`;
  await client.sendEmail({ From: FROM!, To: to, Subject: subj, HtmlBody: html });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
