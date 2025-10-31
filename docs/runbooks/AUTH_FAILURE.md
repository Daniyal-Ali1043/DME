
# Runbook — Authentication Failures

## Symptoms
- Users cannot sign in (magic link or Google)
- Session immediately invalidates
- 401 from protected routes

## Immediate Actions
1. **Check environments**
   - `NEXTAUTH_SECRET` set and consistent
   - Provider credentials (Google OAuth, SMTP) valid
2. **Cookie domain / HTTPS**
   - Ensure HTTPS in production; `secure` cookies enforced
3. **Logs / Sentry**
   - Look for CSRF or cookie parsing issues

## Fixes
- Rotate `NEXTAUTH_SECRET` and redeploy
- Reissue OAuth credentials if revoked
- Verify callback URLs match provider console

## Prevention
- Add health checks on `/api/auth/session`
- Monitor auth error rate
