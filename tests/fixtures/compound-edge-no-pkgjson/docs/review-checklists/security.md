# Security Checklist

- Authenticated and privileged actions have explicit authorization checks.
- Tokens, secrets, raw credentials, and provider identifiers are never exposed in browser payloads or logs.
- Webhooks verify signatures and reject replay or malformed payloads where applicable.
- File uploads validate type, size, object keys, and post-upload ownership.
- Redirects, CORS, CSP, cookies, and session settings match the deployment environment.
- New agent or API access is scoped, audited, and rate-limited.
