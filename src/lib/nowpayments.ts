
import crypto from 'crypto';

const NOWPAYMENTS_API = 'https://api.nowpayments.io/v1';
const API_KEY = process.env.NOWPAYMENTS_API_KEY;
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

if (!API_KEY) { throw new Error('NOWPAYMENTS_API_KEY is not set'); }
if (!IPN_SECRET) { throw new Error('NOWPAYMENTS_IPN_SECRET is not set'); }

export type NowPaymentsCreateInvoiceInput = {
  price_amount: number;
  price_currency?: 'usd' | 'USD';
  order_id: string;
  order_description?: string;
  success_url: string;
  cancel_url: string;
};

export type NowPaymentsInvoiceResponse = { id: number; status: string; invoice_url: string; };

export async function createNowPaymentsInvoice(input: NowPaymentsCreateInvoiceInput) {
  const res = await fetch(`${NOWPAYMENTS_API}/invoice`, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      price_amount: input.price_amount,
      price_currency: (input.price_currency || 'USD').toUpperCase(),
      order_id: input.order_id,
      order_description: input.order_description || 'Daily Macro Edge subscription',
      success_url: input.success_url,
      cancel_url: input.cancel_url,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NOWPayments invoice error: ${res.status} ${text}`);
  }
  return (await res.json()) as NowPaymentsInvoiceResponse;
}

export function verifyNowPaymentsSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const hmac = crypto.createHmac('sha512', IPN_SECRET as string);
  hmac.update(rawBody, 'utf8');
  const digest = hmac.digest('hex');
  return digest === signature.toLowerCase();
}
