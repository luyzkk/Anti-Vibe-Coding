<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, sem comentário inline em runtime.
Toca apenas docs/knowledge/rails/INDEX.md (substitui skeleton mínimo do Plano 01 fase-04).
-->

# Fase 06: INDEX.md final consolidado (layout D9 — por skill cross-stack + por tier)

**Plano:** 03 — Batch C + INDEX + E2E + Hardening leve
**Sizing:** 1.5h
**Depende de:** fase-01 (performance-and-tuning), fase-02 (deployment-with-kamal), fase-03 (action-cable-and-realtime), fase-04 (action-mailer-and-mailbox), fase-05 (active-storage) — TODOS os 14 átomos finais precisam existir para consolidar slugs/tiers/related_skills
**Visual:** false

---

## O que esta fase entrega

Arquivo `docs/knowledge/rails/INDEX.md` final consolidado (≤100 linhas), substituindo o skeleton mínimo gerado no Plano 01 fase-04. Layout D9: 7 seções "Para /skill" (uma por cross-stack skill que consome knowledge — `/security`, `/api-design`, `/system-design`, `/design-patterns`, `/architecture`, `/infrastructure`, `/tdd-workflow`) + 3 seções "Por Tier" (T1, T2, T3). Roteia agentes seguindo skills cross-stack diretamente para o átomo Rails relevante em UMA leitura — núcleo do contrato com `getStackKnowledgePreface` (zero acoplamento de skill com nome de arquivo). Tier de `active-storage` reflete decisão RF13 da fase-05 (T2 promovido ou T3 mantido).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/INDEX.md` | Modify | Substituir skeleton mínimo (apenas piloto listado) pelo INDEX final consolidado de 14 átomos com layout D9 |
| `docs/knowledge/rails/atoms/*.md` | Read | Ler frontmatter de cada um dos 14 átomos para extrair `topic`, `tier`, `triggers`, `related_skills`, descrição curta |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar decisão RF13 (tier final de `active-storage`) — atualiza tabela "Por Tier" |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/plano03/MEMORY.md` | Read | Confirmar decisão RF13 registrada em DI-N |

---

## Implementacao

### Passo 1: Validar inputs (TODOS os 14 átomos existem)

`Read` cada um dos 14 átomos esperados em `docs/knowledge/rails/atoms/`:

T1 (6):
- `active-record-fundamentals.md` (Plano 02 fase-01)
- `active-record-migrations-safety.md` (Plano 02 fase-02)
- `action-controller-and-routing.md` (Plano 02 fase-03)
- `security-csrf-and-brakeman.md` (Plano 02 fase-04)
- `rails-conventions-and-magic.md` (Plano 01 fase-04 — piloto)
- `rspec-and-minitest.md` (Plano 02 fase-05)

T2 (4 default ou 5 se active-storage promovido):
- `action-view-and-hotwire.md` (Plano 02 fase-06)
- `active-job-and-solid-queue.md` (Plano 02 fase-07)
- `caching-with-rails.md` (Plano 02 fase-08)
- `performance-and-tuning.md` (Plano 03 fase-01)
- `deployment-with-kamal.md` (Plano 03 fase-02)
- (`active-storage.md` se RF13 PROMOVIDO)

T3 (3 default ou 2 se active-storage promovido):
- `action-cable-and-realtime.md` (Plano 03 fase-03)
- `action-mailer-and-mailbox.md` (Plano 03 fase-04)
- `active-storage.md` (Plano 03 fase-05 — RF13 default OU 2 se PROMOVIDO)

Se algum arquivo NÃO existe, **BLOQUEAR a fase** — escalar para o orquestrador identificar qual fase de extração falhou ou está pendente.

### Passo 2: Extrair metadata de cada átomo

Para cada átomo, ler frontmatter e extrair:
- `topic` (slug)
- `tier`
- `triggers` (top-3 mais representativos para descrição curta)
- `related_skills` (lista de skills cross-stack — input para mapping)

Manter mapa em memória:

```
{
  'active-record-fundamentals': { tier: 1, related_skills: [/api-design, /architecture, /design-patterns], desc: 'querying, callbacks, validations, associations, encryption, multiple DBs' },
  'active-record-migrations-safety': { tier: 1, related_skills: [/api-design, /infrastructure], desc: 'strong migrations, zero-downtime, postgres-specific' },
  ...
}
```

### Passo 3: Construir layout D9 (template para INDEX.md)

```markdown
# Rails Knowledge — Index

Knowledge sênior Rails-native (Rails 7.1+/8.x). 14 átomos cobrindo Active Record, Action Pack, Hotwire, Solid Trifecta, deployment com Kamal, security, performance e testing.

Skills cross-stack consomem este INDEX via `getStackKnowledgePreface()` antes do corpo genérico — agente segue o roteamento aqui e abre o átomo Rails relevante em UMA leitura.

---

## Por Skill Cross-Stack

### Para /security
- **security-csrf-and-brakeman** (T1) — strong params, CSRF, mass-assignment, SQL injection, Brakeman, CSP
- **action-controller-and-routing** (T1) — sessions, before_actions, route constraints, API-only auth
- **active-storage** (T{2|3}) — signed URLs, content-type validation, file size limits

### Para /api-design
- **action-controller-and-routing** (T1) — RESTful, API-only mode, versioning, strong params
- **active-record-fundamentals** (T1) — querying, includes vs preload vs eager_load, scopes
- **active-record-migrations-safety** (T1) — schema evolution sem downtime para APIs em produção

### Para /system-design
- **caching-with-rails** (T2) — Solid Cache (Rails 8 default), fragment caching, Russian doll, HTTP caching
- **performance-and-tuning** (T2) — N+1, threading no Puma, scout_apm, GC tuning, jemalloc
- **action-cable-and-realtime** (T3) — Solid Cable (Rails 8 default), Turbo Streams broadcast, fan-out

### Para /design-patterns
- **rails-conventions-and-magic** (T1) — CoC, DRY, Zeitwerk, ActiveSupport core extensions
- **active-record-fundamentals** (T1) — callbacks como observer; service objects vs callbacks
- **action-view-and-hotwire** (T2) — Turbo Frames/Streams, Stimulus como decoradores

### Para /architecture
- **rails-conventions-and-magic** (T1) — Zeitwerk autoloading, ActiveSupport, metaprogramming pragmático
- **active-record-fundamentals** (T1) — STI, polymorphic associations, multiple databases
- **action-mailer-and-mailbox** (T3) — boundaries entre app e ingress externa de email

### Para /infrastructure
- **deployment-with-kamal** (T2) — Kamal 2 (Rails 8 default), Docker, traefik proxy, asset compilation
- **active-job-and-solid-queue** (T2) — Solid Queue (Rails 8 default), Sidekiq fallback, retries, idempotency
- **active-record-migrations-safety** (T1) — zero-downtime migrations, strong_migrations gem

### Para /tdd-workflow
- **rspec-and-minitest** (T1) — factories vs fixtures, system tests com Capybara, snippets duplos RSpec/Minitest

---

## Por Tier

### Tier 1 — Todo Rails dev sênior precisa (6 átomos)
- `active-record-fundamentals.md` — querying, callbacks, validations, associations, encryption, multiple DBs
- `active-record-migrations-safety.md` — strong migrations, zero-downtime, postgres-specific
- `action-controller-and-routing.md` — strong params, sessions, before_actions, route constraints, API-only
- `security-csrf-and-brakeman.md` — strong params, CSRF, mass-assignment, Brakeman, CSP
- `rails-conventions-and-magic.md` — CoC, DRY, Zeitwerk, ActiveSupport core extensions
- `rspec-and-minitest.md` — Rails testing strategy, factories vs fixtures, system tests

### Tier 2 — Comum em apps de médio porte ({4|5} átomos)
- `action-view-and-hotwire.md` — layouts, Turbo Frames/Streams, Stimulus, form helpers
- `active-job-and-solid-queue.md` — Solid Queue (Rails 8 default), Sidekiq fallback, retries
- `caching-with-rails.md` — Solid Cache (Rails 8 default), fragment caching, Russian doll, HTTP caching
- `performance-and-tuning.md` — N+1, threading, scout_apm, GC tuning
- `deployment-with-kamal.md` — Kamal 2, Docker, asset compilation
- (`active-storage.md` — se RF13 PROMOVIDO em fase-05)

### Tier 3 — Niche / opcional ({2|3} átomos)
- `action-cable-and-realtime.md` — channels, Solid Cable, Turbo Streams broadcast
- `action-mailer-and-mailbox.md` — outbound mailer, inbound mailbox routing, ActionText absorvido
- (`active-storage.md` — se RF13 MANTIDO em fase-05)

---

Cobertura Rails 7.1+/8.x. Padrões Rails-8-exclusivos marcados com `rails_versions: ['>=8.0']` no frontmatter do átomo (Solid Queue, Solid Cache, Solid Cable, Kamal 2 default).
```

### Passo 4: Aplicar decisão RF13 (active-storage tier)

Antes de finalizar o INDEX, **Read** `STATE.md` global da feature para confirmar decisão registrada em `## Decisão RF13 (active-storage tier)`:

- **Se PROMOVIDO para T2:**
  - Tabela "Por Tier" → "Tier 2" inclui `active-storage.md`
  - Tabela "Por Tier" → "Tier 3" remove `active-storage.md`
  - Tabela "Por Skill" → `/security` mantém `active-storage` com `(T2)` no marker

- **Se MANTIDO T3:**
  - Tabela "Por Tier" → "Tier 3" inclui `active-storage.md`
  - Tabela "Por Tier" → "Tier 2" não inclui
  - Tabela "Por Skill" → `/security` mantém `active-storage` com `(T3)` no marker

Substituir os placeholders `{2|3}`, `{4|5}`, `{2|3}` no template do Passo 3 pelos valores corretos.

### Passo 5: Validar cap de 100 linhas e cobertura completa

- `wc -l docs/knowledge/rails/INDEX.md` retorna ≤ 100
- Cada um dos 14 átomos aparece em pelo menos UMA das seções "Para /skill"
- Cada um dos 14 átomos aparece em UMA das 3 seções "Por Tier" (exclusivo: T1 OU T2 OU T3)
- As 7 skills cross-stack têm seção dedicada (mesmo que com apenas 1 átomo)

Se um átomo aparece em múltiplas seções "Para /skill" (caso comum — ex: `active-record-fundamentals` aparece em `/api-design` + `/architecture` + `/design-patterns`), listar em todas. Não duplica frontmatter, só roteamento.

### Passo 6: Confirmar paths absolutos no INDEX

Cada referência `**slug**` no INDEX é o filename do átomo SEM `.md` e SEM path completo. O INDEX é lido por agentes via `getStackKnowledgePreface()` em runtime — eles encontram o átomo via convenção (`.claude/knowledge/atoms/{slug}.md`).

NÃO incluir paths absolutos no INDEX (`docs/knowledge/rails/atoms/...` é o local do plugin matrix, NÃO o local final no projeto do dev — `.claude/knowledge/atoms/` é o destino).

---

## Gotchas

- **G1 do plano (cap):** INDEX cap é 100 linhas (RF1 do PRD), não 200 (que é cap de átomo). Layout D9 com 7 skills + 3 tiers + título + cabeçalho cabem em ~75 linhas. Se exceder 100, condensar descrições curtas (manter 1 linha por átomo).
- **G6 do plano (INDEX consolida 14 slugs):** fase-06 NÃO pode rodar antes de fase-01..05. Read TODOS os 14 átomos antes de escrever o INDEX. Verificação no Passo 1 é blocker.
- **G7 do plano (RF13):** decisão de tier de `active-storage` afeta tanto a seção "Por Tier" (em qual tier listar) quanto o marker `(T2)` vs `(T3)` na seção "Para /security". Read STATE.md + MEMORY.md ANTES de finalizar.
- **Local — links relativos vs absolutos:** INDEX usa apenas slugs (`**security-csrf-and-brakeman**`), não paths. Skills cross-stack resolvem via convenção em runtime. Se incluir path, quebra agnosticismo de stack.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é markdown puro. Checklist de validação:

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/INDEX.md` (substituído skeleton mínimo do Plano 01)
- [ ] Cabeçalho `# Rails Knowledge — Index` presente
- [ ] Parágrafo introdutório explica que knowledge é Rails 7.1+/8.x e que skills consomem via preface
- [ ] Seção `## Por Skill Cross-Stack` com 7 sub-seções (uma por skill): `/security`, `/api-design`, `/system-design`, `/design-patterns`, `/architecture`, `/infrastructure`, `/tdd-workflow`
- [ ] Seção `## Por Tier` com 3 sub-seções: Tier 1 (6 átomos), Tier 2 (4 ou 5 átomos dependendo RF13), Tier 3 (2 ou 3 átomos dependendo RF13)
- [ ] Cada um dos 14 átomos aparece em pelo menos UMA sub-seção "Para /skill"
- [ ] Cada um dos 14 átomos aparece em EXATAMENTE UMA sub-seção "Por Tier"
- [ ] `active-storage` no tier que reflete decisão RF13 (T2 OU T3 — confirmar via STATE.md)
- [ ] `wc -l docs/knowledge/rails/INDEX.md` retorna ≤ 100 linhas (cap RF1)
- [ ] Nenhum path absoluto/relativo no INDEX (só slugs em **bold**)
- [ ] `grep -c '\[A DEFINIR\]' docs/knowledge/rails/INDEX.md` retorna 0
- [ ] `bun run harness:validate` passa sobre o INDEX

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/INDEX.md` exit 0
- `wc -l docs/knowledge/rails/INDEX.md` retorna número ≤ 100
- `grep -c '\[A DEFINIR\]' docs/knowledge/rails/INDEX.md` retorna 0
- `grep -c "^### Para /" docs/knowledge/rails/INDEX.md` retorna 7 (7 sub-seções de skill)
- `grep -c "^### Tier " docs/knowledge/rails/INDEX.md` retorna 3
- Todos os 14 slugs (`active-record-fundamentals`, ..., `active-storage`) aparecem pelo menos 2x cada (1x em "Por Skill", 1x em "Por Tier")
- `bun run harness:validate` passa

**Por humano:**

- Leitor sênior Rails pode invocar `/security` em projeto Rails populado e seguir o INDEX direto para `security-csrf-and-brakeman` SEM precisar abrir átomo "errado" (validação de roteamento).
- Tier de `active-storage` reflete decisão RF13 documentada em STATE.md.
- Estrutura D9 (skill + tier) intuitiva para dev sr Rails — sem fricção.

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->
