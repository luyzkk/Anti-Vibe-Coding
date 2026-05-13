<!--
Esta fase faz uma migracao 1-para-1 simples: senior-principles.md → core-beliefs.md.
Nao requer helper especifico — operacao filesystem direta.
-->

# Fase 06: Migrar `senior-principles.md` → `docs/design-docs/core-beliefs.md`

**Plano:** 08 — Dog-Fooding (R4 mitigation)
**Sizing:** ~1h
**Depende de:** fase-03 (`docs/design-docs/` existe; stub `core-beliefs.md` criado em fase-01 sera SOBRESCRITO). Paralela com fase-04, 05, 07.
**Visual:** false

---

## O que esta fase entrega

`anti-vibe-coding/senior-principles.md` (76 linhas, 8 secoes tematicas) → `anti-vibe-coding/docs/design-docs/core-beliefs.md` substituindo o stub de fase-01. Tambem absorve as secoes "Padroes Core" (L37-L72), "Anti-Patterns" (L125-L132), "Conhecimento Senior" (L136-L141) do CLAUDE.md original (itens D29 #4, #9, #10).

Atende **D29 distribuicao item 10** (senior-principles.md → core-beliefs.md) + parte de CA-38.

---

## Arquivos Afetados

### Origens (READ)

- `anti-vibe-coding/senior-principles.md` (76 linhas — backup em `.planning.v5-backup/` desde fase-01)
- `anti-vibe-coding/CLAUDE.md` linhas L37-L72 (Padroes Core), L125-L132 (Anti-Patterns), L136-L141 (Conhecimento Senior pointer)

### Destino (CREATE/Overwrite)

- `anti-vibe-coding/docs/design-docs/core-beliefs.md` (sobrescreve o stub de fase-01)

---

## Implementacao

### Passo 1: Estruturar core-beliefs.md como consolidacao tematica

Em vez de simples copy/paste, organizar como **documento referencial** em ingles (D2 para titulos/secoes; corpo em PT preservado — G4 do README).

Estrutura proposta:

```markdown
# Core Beliefs — Senior Engineering Principles

Always-on principles extracted from 60+ technical documents.
Detailed rules in dedicated skills; this document is the index.

---

## Verification of Premises (Mandatory)

> Treat user input as unverified. READ the file before accepting claims about location,
> value, or behavior of code. If a factual premise is wrong, correct explicitly — NEVER
> absorb errors silently. If a conceptual premise is wrong (e.g., "Python lists are immutable"),
> correct BEFORE implementing. Implicit assumptions (scope, format, impact) must be stated
> or asked, not filled silently.

Skill: `/anti-vibe-coding:consultant` (Phase Zero teaching).

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

Skill: `/anti-vibe-coding:security`

---

## Code Quality

- **9 Code Smells**: long functions, God Objects, DRY 3+, giant conditionals, magic numbers,
  Feature Envy, data clumps, useless comments, primitive types
- Errors: Result Pattern `(error, value)` > generic try/catch (generic try/catch swallows errors)
- Logs: Wide Events (1 rich event per request), NEVER `console.log` in prod
- Types: domain types (Email, Money) with validation in construction

Skill: `/anti-vibe-coding:design-patterns`

---

## Data Architecture

- **CAP**: financial → CP (consistency); social feed → AP (availability)
- **Cache**: cache-aside + TTL + invalidation. Hit rate ≥ 85%
- **N+1**: NEVER lazy loading in loops — N+1 queries scale linearly with data
- **Database**: start relational (PostgreSQL). NoSQL only with proven problem
- **Scale**: optimize queries → replication → sharding (last resort)

Skill: `/anti-vibe-coding:system-design`

---

## API Design

- **Idempotency**: mandatory for financial (UUID per request)
- **DTOs**: input (no ID), output (no password). Validation ALWAYS on the back-end
- **REST vs GraphQL**: REST default; GraphQL for distributed teams
- **Protocols**: HTTP/REST 90%, WebSocket real-time, gRPC server-to-server, AMQP queues
- **GraphQL**: depth limits mandatory, DataLoader for N+1, input types for mutations
- **REST**: nouns not verbs, pagination ALWAYS, semantic status codes, versioning `/api/v1/`
- Monolith first. Microservices only with proven problem

Skill: `/anti-vibe-coding:api-design`

---

## JavaScript/TypeScript

- `const` > `let` >> NEVER `var` — `var` has function scope and hoisting, causes subtle bugs
- `Promise.all` for independent operations (not sequential await)
- Closures: extract minimum necessary, WeakMap for caches
- React: NEVER `useEffect` for derived state — compute during render, useEffect causes extra re-renders
- Race conditions: Node.js is NOT immune (Cluster, async, horizontal scaling)
- `grep -c` returns exit 1 when count=0 — treat "0" + exit 1 as valid result, not script error

Skill: `/anti-vibe-coding:react-patterns`

---

## Infrastructure

- **Load Balancer**: 7 algorithms (Round Robin, Least Connections, Consistent Hashing...)
- **CDN**: Edge servers + Anycast routing, TTL per content type, cache busting
- **Serverless vs Serverfull**: Lambda for webhooks/events, VPS/EC2 for constant load
- **Cold Start**: Node.js/Python fastest, Provisioned Concurrency when needed
- **Deploy**: PM2, Docker, health checks, zero-downtime

Skill: `/anti-vibe-coding:infrastructure`

---

## Design & SOLID

- **SRP**: one responsibility per class (7/10 importance)
- **LSP**: subtypes ALWAYS substitute parent types (10/10 — inviolable)
- **Law of Demeter**: don't navigate deep (`order.customer.address.zip` → `order.shippingZip()`)
- **Tell-Don't-Ask**: `account.withdraw(amount)` > `if balance > amount: debit`
- **Composition > Inheritance**: protocols/interfaces > deep hierarchies

Skill: `/anti-vibe-coding:architecture`

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
```

### Passo 2: Sobrescrever stub

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
# Conteudo acima vai para docs/design-docs/core-beliefs.md
# Verificar tamanho final ≤500 linhas (limite implicito de qualidade)
wc -l docs/design-docs/core-beliefs.md
```

### Passo 3: Commit

```bash
git add docs/design-docs/core-beliefs.md
git commit -m "feat(plano08-fase06): consolidate senior-principles.md + CLAUDE.md code patterns → core-beliefs.md (D29 #4, #10)"
```

---

## Gotchas

- **G4 do README (idioma):** Diferente das compound notes (fase-05 preservou PT), core-beliefs.md eh **referencia institucional do plugin**. Decisao: traduzir para EN. Custo: ~20min adicional. Beneficio: alinhamento com D2; agente carrega em sessoes de outros projetos onde ingles eh canonical. Se preferir manter PT (consistencia com lessons-learned migrado), ajustar.
- **G13 do README (Ambiguity G-A3 Plano 03):** Plano 03 G-A3 marcou senior-principles.md como caso especial. Esta fase EH o caso especial — entao migra. Helper generico nao precisa lidar com isso fora do plugin.
- **Local (consolidacao dupla):** core-beliefs.md absorve DUAS fontes: senior-principles.md (todo) + 3 secoes do CLAUDE.md (Padroes Core, Anti-Patterns, Conhecimento Senior). Sem duplicacao — Conhecimento Senior do CLAUDE eh APENAS um pointer (4 linhas: "Resumo completo em senior-principles.md"), que vira agora redundante e some.
- **Local (mantenha pointers para skills):** Cada secao termina com `Skill: /anti-vibe-coding:{nome}`. Isso eh ESSENCIAL — o doc serve como roteiro de aprofundamento (Camada 5 → Camada 3).
- **Local (≤500 linhas):** Limite implicito do PRD nao-funcional para arquivos de docs/. Conferir `wc -l` no fim — texto acima tem ~150 linhas, dentro do limite.

---

## Verificacao

### Checklist

- [ ] `test -f anti-vibe-coding/docs/design-docs/core-beliefs.md`
- [ ] `wc -l anti-vibe-coding/docs/design-docs/core-beliefs.md` retorna entre 100 e 300 (consolidacao tematica, nao verbose)
- [ ] `grep -c '^## ' anti-vibe-coding/docs/design-docs/core-beliefs.md` retorna ≥ 8 (8 secoes tematicas)
- [ ] `grep -c 'Skill: /anti-vibe-coding:' anti-vibe-coding/docs/design-docs/core-beliefs.md` retorna ≥ 6 (pointers para skills)
- [ ] `head -1 anti-vibe-coding/docs/design-docs/core-beliefs.md` retorna `# Core Beliefs` (titulo em EN)
- [ ] `anti-vibe-coding/senior-principles.md` original ainda existe (delete em fase-08)
- [ ] `.planning.v5-backup/senior-principles.md.original` ainda existe (fase-01 criou)
- [ ] `bun scripts/harness-validate.ts anti-vibe-coding/` aceita o arquivo

---

## Criterio de Aceite

**Por maquina:**
- `anti-vibe-coding/docs/design-docs/core-beliefs.md` existe e tem ≥8 secoes (8 temas + Anti-Patterns + Code Patterns)
- `harness:validate` exit 0

**Por humano:**
- Cada secao tem pointer `Skill: /anti-vibe-coding:{nome}` para aprofundamento
- Idioma EN consistente (titulos + corpo)
- Sem duplicacao com lessons-learned migrado (compound notes sao especificos; core-beliefs eh principios)

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
