# Security Review Checklist

Mirrored from `agents/security-auditor.md`. Verify before merging security-sensitive changes.

## Cryptography and Hashing
- [ ] No `md5` or `sha1` used for passwords (CRITICAL)
- [ ] Passwords hashed with bcrypt/Argon2/scrypt
- [ ] Password hashing takes ≥100ms (adequate work factor)
- [ ] No manual secret concatenation — use HMAC

## Secrets and Credentials
- [ ] No `API_KEY`, `SECRET`, `PASSWORD`, `TOKEN` hardcoded in source files
- [ ] `.env` is in `.gitignore`
- [ ] `.env.example` exists without real values
- [ ] No credential leaks in git history (`git log -S "API_KEY"`)

## IDs and Data Exposure
- [ ] No sequential numeric IDs in public routes without auth middleware
- [ ] Public APIs use UUIDs
- [ ] No `console.log` with sensitive data (password, token, secret)
- [ ] API responses do not expose stack traces

## Input Validation
- [ ] No manually concatenated SQL (SQL injection risk)
- [ ] No `innerHTML` without sanitization (XSS risk)
- [ ] No complex nested regex quantifiers (ReDoS risk)
- [ ] Back-end validation exists (not only front-end)
- [ ] No `eval()`, `Function()`, `exec()` (code injection)

## Authentication
- [ ] Password/token comparison uses constant-time
- [ ] 2FA implemented (TOTP, not SMS)
- [ ] Rate limiting on login endpoints

## Authorization
- [ ] Centralized RBAC/ABAC middleware (no scattered role checks in handlers)
- [ ] Queries filtered by `userId` (no IDOR)
- [ ] No `req.body.role` or `req.body.isAdmin` (self-promotion)
- [ ] JWT has `expiresIn` / `exp` field (CRITICAL)
- [ ] Refresh tokens in httpOnly cookies

## Webhooks
- [ ] Webhook endpoints validate HMAC signature

## API Security
- [ ] Rate limiting on login, signup, reset-password (CRITICAL if absent)
- [ ] CSRF protection configured for cookie-based APIs
- [ ] CORS does not use wildcard for authenticated APIs
