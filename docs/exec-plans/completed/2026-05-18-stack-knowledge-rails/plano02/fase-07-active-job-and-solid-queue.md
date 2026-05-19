<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only. Padrões Solid Queue exigem Rails 8 — refletido em rails_versions.
-->

# Fase 07: Átomo `active-job-and-solid-queue.md` (T2)

**Plano:** 02 — Batch A T1 + Batch B parcial T2
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-01 (dedup), fase-02 (schema), fase-04 (piloto)
**Visual:** false

---

## O que esta fase entrega

Átomo Tier 2 `docs/knowledge/rails/atoms/active-job-and-solid-queue.md` (~140 linhas), condensando ActiveJob abstraction, Solid Queue (default Rails 8 — `rails_versions: ['>=8.0']`), Sidekiq como fallback para Rails 7.x, retry strategy (`retry_on` vs `discard_on`), idempotency via Idempotency-Key. Cobre o ângulo Rails-specific (queue adapters, perform_later, ActiveJob serialization) que `/infrastructure` cobre como princípio cross-stack de async workload + queue management.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/active-job-and-solid-queue.md` | Create | Átomo completo (~140 linhas) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar dedup (sem par duplicado direto — `rails-background-jobs` é solo) |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` STATE.md global. `rails-background-jobs` não tem par duplicado, mas o átomo cita `rails-stack-conventions` para padrões idiomáticos AJ — confirmar canônico. Sem decisão aprovada para `rails-stack-conventions`, **BLOQUEAR**.

### Passo 2: Frontmatter exato

```yaml
---
topic: active-job-and-solid-queue
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-background-jobs/PATTERNS.md
  - claude-code/knowledge/Rails/rails-background-jobs/PITFALLS.md
  - claude-code/knowledge/Rails/rails-stack-conventions/BACKENDS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-1d48ebbc-37c7-489c-a0ac-802e2133c81c_text_markdown.md
tier: 2
triggers: [active job, solid queue, sidekiq, background job, perform_later, retry_on, discard_on, idempotency, queue adapter, job serialization]
related_skills: [/infrastructure, /system-design, /api-design]
updated: 2026-05-18
rails_versions: ['>=7.1']
---
```

**Nota crítica:** o frontmatter usa `['>=7.1']` para o átomo inteiro (ActiveJob existe desde 4.2). Padrões específicos **Solid Queue** dentro do corpo do átomo são marcados explicitamente como **Rails 8+** no texto (callout: "Solid Queue: default Rails 8+ apenas. Em Rails 7.x usar Sidekiq + Redis"). NÃO criar campo `rails_versions: ['>=8.0']` no nível do átomo — isso excluiria toda a parte ActiveJob 7.x.

### Passo 3: Corpo seguindo skeleton fixo do piloto

**Seções (5 — sem API-only):**

1. `# Active Job and Solid Queue` (título)
2. `## Quando consultar`
3. `## Padrões sênior`
4. `## Anti-padrões`
5. `## Critérios de decisão`
6. `## Referências externas`

### Passo 4: Patterns recomendados (guia editorial)

Mínimo 5, máximo 7:

- **Pattern: ActiveJob como abstração + adapter por env** — Problema: lock-in em backend específico (Sidekiq, Resque); Padrão: `class MyJob < ApplicationJob; def perform(...); end; end` + `config.active_job.queue_adapter = :solid_queue` (prod) / `:test` (test); Quando NÃO usar: jobs muito hot path (>1000/s sustained) — backend direto (Sidekiq) elimina camada de serialização.

- **Pattern: Solid Queue (default Rails 8+)** — Problema: dependência de Redis para Sidekiq; Padrão: Rails 8 inclui Solid Queue (DB-backed via separate connection); zero Redis para apps < ~100 jobs/s. Setup: `bin/rails solid_queue:install:migrations; bin/rails db:migrate`; Quando usar: app Rails 8 sem Redis pré-existente; Quando NÃO usar: app com hot Sidekiq estabelecido (custo de migração alto); throughput sustained > ~500 jobs/s (Solid Queue scaling tem limites de DB).

- **Pattern: Sidekiq + Redis (Rails 7.x fallback)** — Problema: Rails 7.x não tem Solid Queue built-in; Padrão: `gem 'sidekiq'` + `config.active_job.queue_adapter = :sidekiq` + `bundle exec sidekiq -C config/sidekiq.yml`; Quando usar: Rails 7.x ou app já tem Redis; Quando NÃO usar: app Rails 8 greenfield — preferir Solid Queue (default + zero infra extra).

- **Pattern: `retry_on` vs `discard_on`** — Problema: falhas transitórias vs permanentes tratadas igual; Padrão: `retry_on Net::OpenTimeout, wait: :polynomially_longer, attempts: 5` para transientes; `discard_on ActiveJob::DeserializationError` para deserialization (job órfão referenciando record deletado); Quando NÃO usar retry: erros que dependem de fix de código (NoMethodError) — deixar exceção subir + alerta.

- **Pattern: Idempotency via Idempotency-Key** — Problema: job pode rodar 2× (queue retry, network duplicate); Padrão: passar `idempotency_key:` (UUID) no `perform_later`; no `perform`, primeiro lookup `IdempotencyRecord.find_or_create_by(key: key)` — se já existia, return early; Quando usar: side effects externos (cobrança, email, webhook); Quando NÃO usar: ops idempotentes naturalmente (UPDATE `set status = 'done'`).

- **Pattern: Serialização de argumentos — IDs, não records** — Problema: `MyJob.perform_later(user)` serializa o record inteiro (frágil + stale data); Padrão: passar `user.id` e re-fetch dentro do `perform`: `def perform(user_id); user = User.find(user_id); ... end`; Quando NÃO usar: dados primitivos (strings, ints, hashes) — passar direto.

- **Pattern: Job priorities + queues separadas** — Problema: job lento (email batch) bloqueia job crítico (payment); Padrão: `queue_as :critical` / `queue_as :default` / `queue_as :low`; worker dedicated por queue (`sidekiq -q critical -q default`); Quando NÃO usar: queue volume baixa — fila única é mais simples.

### Passo 5: Anti-padrões (3-5 armadilhas)

- **Anti-pattern: Passar AR record como argumento (`MyJob.perform_later(@user)`)** — Sintoma: GlobalID lookup pode falhar se record deletado; Correção: passar `@user.id` + re-fetch.
- **Anti-pattern: Sem retry strategy** — Sintoma: falha transitória (timeout) descarta job + perde trabalho; Correção: `retry_on Net::OpenTimeout, wait: :polynomially_longer, attempts: 3`.
- **Anti-pattern: Job longo (>5min) sem checkpoint** — Sintoma: kill do worker no deploy perde progresso; Correção: dividir em sub-jobs com checkpoints persistidos (state na DB).
- **Anti-pattern: Side effect side externos sem idempotency** — Sintoma: retry envia 2 emails ou cobra 2×; Correção: idempotency key + lookup early.

### Passo 6: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Rails 8 greenfield, < 100 jobs/s | Solid Queue (default) |
| Rails 7.x ou Redis pré-existente | Sidekiq |
| Job > 1000 jobs/s sustained | Sidekiq direto (sem ActiveJob) |
| Side effect externo (email, billing) | Idempotency key + lookup |
| Falha transitória (timeout, 5xx) | `retry_on` |
| Falha permanente (deserialization) | `discard_on` |
| Argumentos do `perform` | IDs, não records |
| Job crítico vs batch | Queues separadas + worker dedicated |

### Passo 7: Referências externas

- Skill: `/infrastructure` para queue management cross-stack (RabbitMQ, SQS, etc.)
- Skill: `/system-design` para async workload, throughput, backpressure
- Skill: `/api-design` para idempotency cross-link (`Idempotency-Key` header)
- Source: paths absolutos listados em `sources:`

### Passo 8: Comando para invocar extrator (anti-drift literal)

````
Você é um subagente extrator isolado.
Tarefa: escrever `docs/knowledge/rails/atoms/active-job-and-solid-queue.md` seguindo template
piloto + Passo 2 da fase-07.

ATENÇÃO ESPECÍFICA:
- Solid Queue é Rails 8+ default. Cite explicitamente "Rails 8+" no texto dos patterns que dependem dela.
- Sidekiq é fallback Rails 7.x. Não tratar como inferior — é a opção sólida em ecossistemas existentes.

REGRA DE FIDELIDADE (anti-drift — copy verbatim da compound lesson
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`):

> "REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente
> na fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
> gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará tempo
> no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou re-leia
> o source para confirmar."

OUTPUT: arquivo gravado em `docs/knowledge/rails/atoms/active-job-and-solid-queue.md`. Cap ≤ 200 ln; alvo ~140.
````

---

## Gotchas

- **G1 (cap 200):** Solid Queue + Sidekiq + Idempotency em um átomo é denso. Manter 6 patterns + 4 anti-padrões. Se exceder, cortar "Job priorities + queues separadas" (pattern menos crítico).
- **G2 (anti-drift):** números de throughput (~100 jobs/s para Solid Queue, ~1000/s para Sidekiq) DEVEM estar na fonte. Se source não cita números, descrever qualitativamente ("ideal para volumes moderados" vs "alto throughput").
- **G4 (rails_versions):** átomo inteiro é `['>=7.1']` (ActiveJob universal). Padrões Solid Queue exclusivos são marcados como "Rails 8+" no texto. NÃO usar `['>=8.0']` no frontmatter — exclui ActiveJob+Sidekiq do escopo.
- **G6 (fonte canônica):** `rails-background-jobs` solo; `rails-stack-conventions` precisa de decisão.
- **G8 (paths absolutos):** sources a partir de `claude-code/knowledge/Rails/`.

---

## Verificacao

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/active-job-and-solid-queue.md`
- [ ] Frontmatter 8 campos + `rails_versions: ['>=7.1']`
- [ ] `topic: active-job-and-solid-queue`, `stack: rails`, `layer: backend`, `tier: 2`
- [ ] `sources:` apontam para arquivos existentes
- [ ] 5 seções (sem API-only)
- [ ] ≥5 patterns; pelo menos 1 menciona "Solid Queue" + Rails 8 no texto
- [ ] ≥3 anti-padrões
- [ ] Triggers contém: `active job`, `solid queue`, `sidekiq`, `perform_later`, `idempotency`
- [ ] `wc -l` entre 120 e 200 (alvo ~140)
- [ ] `grep -c '\[A DEFINIR\]'` retorna 0
- [ ] `bun run harness:validate` passa

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/active-job-and-solid-queue.md` exit 0
- `wc -l` retorna entre 120 e 200
- `grep -i 'solid queue' docs/knowledge/rails/atoms/active-job-and-solid-queue.md` retorna ≥3 matches
- `grep -i 'sidekiq' docs/knowledge/rails/atoms/active-job-and-solid-queue.md` retorna ≥2 matches
- `grep -c '\[A DEFINIR\]'` retorna 0
- `bun run harness:validate` passa

**Por humano:**

- Não flagged CA-08 humano. Verifier refined da fase-09 valida.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
