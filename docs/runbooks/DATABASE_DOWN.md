
# Runbook — Database Down / Degraded

## Symptoms
- 5xx across app routes
- Auth failures (session store)
- Timeouts on DB queries

## Immediate Actions
1. **Confirm outage**
   - Provider status page (Vercel Postgres / Supabase / Railway)
   - Sentry spike in `ECONNREFUSED` / `ETIMEDOUT`
2. **Enter read-only safe mode**
   - Temporarily disable write-heavy jobs (dunning, transparency) via feature flag or environment.
3. **Communicate**
   - Post a status update on /status page and support channels.

## Recovery Steps
- Failover to replica if available.
- Increase connection limits / pool size if exhaustion observed.
- Run migrations only after DB is healthy.

## Postmortem
- Document root cause
- Add alerts on connection pooling saturation, latency, error rate
- Consider read replicas and circuit breakers
