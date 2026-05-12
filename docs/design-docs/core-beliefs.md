# Core Beliefs — Senior Engineering Principles

Always-on principles extracted from 60+ technical documents.
Detailed rules in dedicated skills; this document is the index.

**Guiding principles:** type-safety end-to-end (API → Database → UI), monitoring and observability
on critical operations, KISS, YAGNI, zero clutter, functional programming when applicable.

---

## Verification of Premises (Mandatory)

> Treat user input as unverified. READ the file before accepting claims about location,
> value, or behavior of code. If a factual premise is wrong, correct explicitly — NEVER
> absorb errors silently. If a conceptual premise is wrong (e.g., "Python lists are immutable"),
> correct BEFORE implementing. Implicit assumptions (scope, format, impact) must be stated
> or asked, not filled silently.

- Silently agreeing with something wrong is not being helpful — it is being negligent.

Skill: /anti-vibe-coding:consultant (Phase Zero teaching).

---

## Security (Mandatory)

- Passwords: bcrypt/Argon2 (NEVER MD5/SHA1 — broken, reversible in seconds via rainbow tables)
- Public IDs: UUIDs (NEVER sequential without auth — enables enumeration attacks)
- Secrets: `.env` + `.gitignore` (NEVER hardcoded — one accidental commit exposes credentials permanently in git history)
- Inputs: sanitize EVERYTHING (ORM, not raw SQL — SQL injection is OWASP Top 10)
- Sensitive comparisons: constant-time (`crypto.timingSafeEqual`) — normal comparison leaks timing
- Regex: avoid nested quantifiers (ReDoS → exponential backtracking that hangs the server)
- Webhooks: ALWAYS validate HMAC signature — no validation = anyone can forge requests
- Auth: RBAC default, centralized middleware, IDOR prevention
- Auth methods: PKCE for SPAs, httpOnly cookies for refresh tokens, NEVER localStorage (XSS-vulnerable)
- API security: 3-tier rate limit, CSRF tokens, WAF, restrictive CORS

Skill: /anti-vibe-coding:security

---

## Code Quality

- **9 Code Smells**: long functions, God Objects, DRY 3+, giant conditionals, magic numbers,
  Feature Envy, data clumps, useless comments, primitive types
- Errors: Result Pattern `(error, value)` > generic try/catch (generic try/catch swallows errors)
- Logs: Wide Events (1 rich event per request), NEVER `console.log` in prod
- Types: domain types (Email, Money) with validation in construction

Skill: /anti-vibe-coding:design-patterns

---

## Data Architecture

- **CAP**: financial → CP (consistency); social feed → AP (availability)
- **Cache**: cache-aside + TTL + invalidation. Hit rate ≥ 85%
- **N+1**: NEVER lazy loading in loops — N+1 queries scale linearly with data
- **Database**: start relational (PostgreSQL). NoSQL only with proven problem
- **Scale**: optimize queries → replication → sharding (last resort)

Skill: /anti-vibe-coding:system-design

---

## API Design

- **Idempotency**: mandatory for financial (UUID per request)
- **DTOs**: input (no ID), output (no password). Validation ALWAYS on the back-end
- **REST vs GraphQL**: REST default; GraphQL for distributed teams
- **Protocols**: HTTP/REST 90%, WebSocket real-time, gRPC server-to-server, AMQP queues
- **GraphQL**: depth limits mandatory, DataLoader for N+1, input types for mutations
- **REST**: nouns not verbs, pagination ALWAYS, semantic status codes, versioning `/api/v1/`
- Monolith first. Microservices only with proven problem

Skill: /anti-vibe-coding:api-design

---

## JavaScript/TypeScript

- `const` > `let` >> NEVER `var` — `var` has function scope and hoisting, causes subtle bugs
- `Promise.all` for independent operations (not sequential await)
- Closures: extract minimum necessary, WeakMap for caches
- React: NEVER `useEffect` for derived state — compute during render, useEffect causes extra re-renders
- Race conditions: Node.js is NOT immune (Cluster, async, horizontal scaling)
- `grep -c` returns exit 1 when count=0 — treat "0" + exit 1 as valid result, not script error

Skill: /anti-vibe-coding:react-patterns

---

## Infrastructure

- **Load Balancer**: 7 algorithms (Round Robin, Least Connections, Consistent Hashing...)
- **CDN**: Edge servers + Anycast routing, TTL per content type, cache busting
- **Serverless vs Serverfull**: Lambda for webhooks/events, VPS/EC2 for constant load
- **Cold Start**: Node.js/Python fastest, Provisioned Concurrency when needed
- **Deploy**: PM2, Docker, health checks, zero-downtime

Skill: /anti-vibe-coding:infrastructure

---

## Design & SOLID

- **SRP**: one responsibility per class (7/10 importance)
- **LSP**: subtypes ALWAYS substitute parent types (10/10 — inviolable)
- **Law of Demeter**: don't navigate deep (`order.customer.address.zip` → `order.shippingZip()`)
- **Tell-Don't-Ask**: `account.withdraw(amount)` > `if balance > amount: debit`
- **Composition > Inheritance**: protocols/interfaces > deep hierarchies

Skill: /anti-vibe-coding:architecture

---

## Anti-Patterns (NEVER do)

- Fat Controllers or Fat Models (>100 lines)
- Direct DB connection without repository/ORM layer
- Coupling business rules in Views or Controllers
- Ignoring edge cases and error handling
- Skipping tests "to save time"
- Generating code without understanding context

---

## Code Patterns (from CLAUDE.md)

### Naming
- Concrete > abstract: `retryAfterMs` > `timeout`
- NEVER vague names: `data`, `item`, `list`, `info`
- `SNAKE_CAPS` constants, `camelCase` functions, `kebab-case` files

### Code Style
- ALWAYS early return
- Prefer hash-lists over switch-case
- **WHY comments:** always allowed — provenance, decision, workaround, bug ref, external constraint
- **WHAT comments:** forbidden — obvious comment of what code already says
- NEVER remove WHY comments when refactoring — they carry intent code doesn't capture
- Public exported functions: docstring with intent + 1 usage example

### TypeScript
- Strict mode. Use `unknown` and narrow with type guards (`any` disables all type-safety)
- Almost never `as`
- ALWAYS named exports
- Prefer `type` over `interface`
- Prefer `await/async` over `.then()`

---

> **Auto-loaded rules** in `.claude/rules/` detect violations on file edits.
