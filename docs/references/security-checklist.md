---
title: "Security Checklist"
source_url: "https://owasp.org/Top10/2025/"
last_verified: "2026-09-01"
---

# Security Checklist

Quick reference for web application security. Use before shipping any feature that handles authentication, user data, or external input.

## Table of Contents

- [Pre-Commit Checks](#pre-commit-checks)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Input Validation](#input-validation)
- [Security Headers](#security-headers)
- [CORS Configuration](#cors-configuration)
- [Data Protection](#data-protection)
- [Dependency Security](#dependency-security)
- [Supply Chain](#supply-chain-a032025)
- [Error Handling](#error-handling)
- [OWASP Top 10 Quick Reference](#owasp-top-10-quick-reference)

## Pre-Commit Checks

- [ ] No secrets in code (`git diff --cached | grep -i "password\|secret\|api_key\|token"`)
- [ ] `.gitignore` covers: `.env`, `.env.local`, `*.pem`, `*.key`
- [ ] `.env.example` uses placeholder values (not real secrets)

## Authentication

- [ ] Passwords hashed with bcrypt (≥12 rounds), scrypt, or argon2
- [ ] Session cookies: `httpOnly`, `secure`, `sameSite: 'lax'`
- [ ] Session expiration configured (reasonable max-age)
- [ ] Rate limiting on login endpoint (≤10 attempts per 15 minutes)
- [ ] Password reset tokens: time-limited (≤1 hour), single-use
- [ ] JWT tokens use RS256 or ES256 (not HS256) when shared across services
- [ ] Account lockout or notification after repeated failures

## Authorization

- [ ] Every protected endpoint checks authentication
- [ ] Every resource access checks ownership/role (prevents IDOR)
- [ ] Admin endpoints require admin role verification
- [ ] API keys scoped to minimum necessary permissions
- [ ] JWT tokens validated: signature, expiration, and issuer

## Input Validation

- [ ] All user input validated at system boundaries (API routes, form handlers)
- [ ] Validation uses allowlists, not denylists
- [ ] String lengths constrained (min/max enforced)
- [ ] Numeric ranges validated
- [ ] Email, URL, and date formats validated with proper libraries
- [ ] File uploads: type restricted, size limited, content verified
- [ ] SQL queries parameterized (no string concatenation)
- [ ] HTML output encoded (rely on framework auto-escaping)
- [ ] URLs validated before redirect (prevent open redirect)

## Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0  (disabled — rely on CSP)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## CORS Configuration

```typescript
// Restrictive (recommended)
cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

// NEVER use in production:
cors({ origin: '*' })  // Allows any origin
```

## Data Protection

- [ ] Sensitive fields excluded from API responses (`passwordHash`, `resetToken`, etc.)
- [ ] Sensitive data not logged (passwords, tokens, full CC numbers)
- [ ] PII encrypted at rest (if required by regulation)
- [ ] HTTPS for all external communication
- [ ] Database backups encrypted

## Dependency Security

```bash
# Audit dependencies
bun audit

# Alternative via npm
npm audit --audit-level=critical

# Check for outdated packages
npx npm-check-updates
```

## Supply Chain (A03:2025)

- [ ] Lockfile versionado no repositorio e usado no CI (`--frozen-lockfile`)
- [ ] Dependencias novas passam pelo portao de pre-adocao (ver `/security`, "Dependency Discipline")
- [ ] Findings de audit triados, nao apenas listados — procedimento de triagem documentado (severidade x alcancabilidade x disponibilidade de fix)
- [ ] Assets de CDN com `integrity` + `crossorigin` (SRI)
- [ ] Actions/steps de CI fixados por SHA, nao por tag movel
- [ ] Token de CI com permissao minima e escopo por job
- [ ] Nenhum script de `postinstall` nao auditado em dependencia direta

## Error Handling

```typescript
// Production: generic error, no internals exposed
res.status(500).json({
  error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' }
});

// NEVER in production:
res.status(500).json({
  error: err.message,
  stack: err.stack,     // Exposes internals
  query: err.sql,       // Exposes database details
});
```

## OWASP Top 10 Quick Reference

Edicao 2025 (ver `source_url` no frontmatter). Numeracao e ordem mudaram frente a edicao 2021: SSRF
deixou de ser categoria propria e foi absorvido em A01, Security Misconfiguration subiu para #2, e
Software Supply Chain Failures entra como categoria nova em #3.

| # | Vulnerability | Prevention |
|---|---|---|
| A01 | Broken Access Control (inclui SSRF) | Auth em todo endpoint, verificacao de ownership, allowlist de URLs de saida |
| A02 | Security Misconfiguration | Security headers, defaults seguros, superficie minima, debug off em producao |
| A03 | Software Supply Chain Failures | Lockfile versionado, audit de dependencias com triagem, artefatos assinados, CI com permissao minima |
| A04 | Cryptographic Failures | HTTPS, hashing forte, sem secrets no codigo |
| A05 | Injection | Queries parametrizadas, validacao de input |
| A06 | Insecure Design | Threat modeling, desenvolvimento orientado a spec |
| A07 | Authentication Failures | Senhas fortes, rate limiting, gestao de sessao |
| A08 | Software or Data Integrity Failures | Verificar updates/dependencias, artefatos assinados |
| A09 | Security Logging and Alerting Failures | Logar eventos de seguranca, nunca logar secrets, alertar sobre anomalias |
| A10 | Mishandling of Exceptional Conditions | Fail-closed, erro generico ao cliente, nenhum caminho de excecao que ignore a checagem de autorizacao |
