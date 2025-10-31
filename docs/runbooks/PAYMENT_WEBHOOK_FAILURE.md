
# Runbook — Payment Webhook Failure

**Scope:** Stripe and NOWPayments webhooks (`/api/webhooks/stripe`, `/api/webhooks/nowpayments`)

## Symptoms
- 4xx/5xx in webhook logs
- Repeated retries from provider
- Missing subscriptions or invoices in DB
- Customers report access not provisioned

## Immediate Actions (Triage)
1. **Check recent errors**
   - Vercel logs for the two routes
   - Sentry issues tagged `webhook` and `stripe` or `nowpayments`
2. **Verify signatures**
   - Stripe: `STRIPE_WEBHOOK_SECRET` correct and not rotated
   - NOWPayments: `NOWPAYMENTS_IPN_SECRET` matches dashboard
3. **Rate limits & WAF**
   - Ensure `WEBHOOK_RATE_LIMIT_*` not too strict
   - If `WEBHOOK_IP_ALLOWLIST` is set, confirm provider IP is included

## Deep Checks
- **Payload shape:** Compare incoming payload to provider docs (versions drift).
- **DB constraints:** Look for unique constraint violations on `external*Id`.
- **Idempotency:** Repeated events must not duplicate rows; confirm `ON CONFLICT` branches.

## Remediation
- Fix env secrets / allowlist, redeploy.
- Reprocess events:
  - Stripe: Replay via Dashboard → Events → “Retry”
  - NOWPayments: Use their IPN re-send option if available or contact support
- If DB has partial state:
  - Manually correct subscription `status` based on provider source of truth.

## Prevention
- Keep webhook secrets in a secure store, rotate every 90 days.
- Maintain allowlist of provider IPs if feasible.
- Monitor with alerts on non-200 webhook responses > 5/min.
