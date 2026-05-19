<!-- 2026-05-18 (Luiz/dev): INDEX final consolidado Plano03 fase-06. Layout D9 (por skill + por tier). RF13 active-storage PROMOVIDO T2. -->

# Rails Knowledge — Index

Knowledge senior Rails-native (Rails 7.1+/8.x). 14 atomos cobrindo Active Record, Action Pack, Hotwire, Solid Trifecta, deployment com Kamal, security, performance e testing.

Skills cross-stack consomem este INDEX via `getStackKnowledgePreface()` antes do corpo generico — agente segue o roteamento aqui e abre o atomo Rails relevante em UMA leitura.

---

## Por Skill Cross-Stack

### Para /security
- **security-csrf-and-brakeman** (T1) — strong params, CSRF, mass-assignment, SQL injection, Brakeman, CSP
- **action-controller-and-routing** (T1) — sessions, before_actions, route constraints, API-only auth
- **active-storage** (T2) — signed URLs, content-type validation, file size limits, CVE-2022-21831

### Para /api-design
- **action-controller-and-routing** (T1) — RESTful, API-only mode, versioning, strong params
- **active-record-fundamentals** (T1) — querying, includes vs preload vs eager_load, scopes
- **security-csrf-and-brakeman** (T1) — parametrized queries, permit!, OWASP Rails checklist
- **active-storage** (T2) — direct uploads, variants, signed URL expiry para APIs
- **active-job-and-solid-queue** (T2) — async jobs em fluxos de API, idempotency

### Para /system-design
- **caching-with-rails** (T2) — Solid Cache (Rails 8 default), fragment caching, Russian doll, HTTP caching
- **performance-and-tuning** (T2) — N+1, threading no Puma, scout_apm, GC tuning, jemalloc
- **deployment-with-kamal** (T2) — Kamal 2 (Rails 8 default), healthcheck, zero-downtime
- **action-cable-and-realtime** (T3) — Solid Cable (Rails 8 default), Turbo Streams broadcast, fan-out

### Para /design-patterns
- **rails-conventions-and-magic** (T1) — CoC, DRY, Zeitwerk, ActiveSupport core extensions
- **active-record-fundamentals** (T1) — callbacks como observer; service objects vs callbacks
- **rspec-and-minitest** (T1) — test doubles, shared contexts, test design patterns
- **action-view-and-hotwire** (T2) — Turbo Frames/Streams, Stimulus como decoradores

### Para /architecture
- **active-record-migrations-safety** (T1) — zero-downtime migrations, schema evolution sem downtime
- **rails-conventions-and-magic** (T1) — Zeitwerk autoloading, ActiveSupport, metaprogramming pragmatico
- **active-record-fundamentals** (T1) — STI, polymorphic associations, multiple databases
- **action-view-and-hotwire** (T2) — boundaries entre UI reativa e server-side
- **action-mailer-and-mailbox** (T3) — boundaries entre app e ingress externa de email

### Para /infrastructure
- **active-record-migrations-safety** (T1) — strong_migrations gem, backfill seguro, postgres-specific
- **security-csrf-and-brakeman** (T1) — encrypted credentials, CSP headers, infra-level security
- **active-job-and-solid-queue** (T2) — Solid Queue (Rails 8 default), Sidekiq fallback, retries
- **caching-with-rails** (T2) — cache store configuration, Redis vs Solid Cache tradeoffs
- **deployment-with-kamal** (T2) — Docker, traefik proxy, asset compilation, secrets

### Para /tdd-workflow
- **rspec-and-minitest** (T1) — factories vs fixtures, system tests com Capybara, snippets duplos RSpec/Minitest
- **action-mailer-and-mailbox** (T3) — mailer previews, mailbox routing tests, ActionText fixtures

---

## Por Tier

### Tier 1 — Todo Rails dev senior precisa (6 atomos)
- `active-record-fundamentals` — querying, callbacks, validations, associations, encryption, multiple DBs
- `active-record-migrations-safety` — strong migrations, zero-downtime, postgres-specific
- `action-controller-and-routing` — strong params, sessions, before_actions, route constraints, API-only
- `security-csrf-and-brakeman` — strong params, CSRF, mass-assignment, Brakeman, CSP
- `rails-conventions-and-magic` — CoC, DRY, Zeitwerk, ActiveSupport core extensions
- `rspec-and-minitest` — Rails testing strategy, factories vs fixtures, system tests

### Tier 2 — Comum em apps de medio porte (6 atomos)
- `action-view-and-hotwire` — layouts, Turbo Frames/Streams, Stimulus, form helpers
- `active-job-and-solid-queue` — Solid Queue (Rails 8 default), Sidekiq fallback, retries
- `caching-with-rails` — Solid Cache (Rails 8 default), fragment caching, Russian doll, HTTP caching
- `performance-and-tuning` — N+1, threading, scout_apm, GC tuning
- `deployment-with-kamal` — Kamal 2, Docker, asset compilation
- `active-storage` — signed URLs, direct uploads, variants, CVE-2025-24293 (CVSS 9.8)

### Tier 3 — Niche / opcional (2 atomos)
- `action-cable-and-realtime` — channels, Solid Cable, Turbo Streams broadcast
- `action-mailer-and-mailbox` — outbound mailer, inbound mailbox routing, ActionText absorvido

---

Cobertura Rails 7.1+/8.x. Padroes Rails-8-exclusivos marcados com `rails_versions: ['>=8.0']` no frontmatter do atomo (Solid Queue, Solid Cache, Solid Cable, Kamal 2 default).
