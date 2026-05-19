<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline em runtime.
O prompt do extrator vive nesta fase como spec, não como código de execução.
-->

# Fase 01: Átomo `performance-and-tuning.md` (T2 — Batch C)

**Plano:** 03 — Batch C + INDEX + E2E + Hardening leve
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-01 (dedup decidida), fase-02 (schema `rails_versions`), fase-04 (piloto como template); Plano 02 fase-09 (verifier refined + audit humano aprovados — Batch A+B estabelece padrão)
**Visual:** false

---

## O que esta fase entrega

Átomo Tier 2 `docs/knowledge/rails/atoms/performance-and-tuning.md` (~150 linhas), condensando o ângulo Rails-specific de performance: N+1 detection com `bullet`, escolha entre `includes`/`preload`/`eager_load` para diferentes shapes de query, threading no Puma (workers vs threads, GVL implications), APM com `scout_apm`/`skylight`, GC tuning para Rails 7.1+/8.x, memory bloat e jemalloc. Cobre o que `/api-design` e `/system-design` tratam como princípios cross-stack mas com APIs e gemas específicas do ecossistema Rails.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/performance-and-tuning.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~150 linhas) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar decisão de dedup aprovada para `rails-stack-conventions`, `rails-expert`, `rails-code-review` (fontes do átomo) |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` o STATE.md global da feature (`f:/Projetos/Anti-Vibe-Coding/docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md`) e extrair a decisão aprovada para os pares duplicados. Para este átomo, importam:

- `rails-stack-conventions` vs `rails-stack-conventions v2` (idiomatic performance patterns, threading guidance)
- `rails-code-review` vs `rails-code-review copy` (N+1 review patterns, query profiling)
- `rails-expert` (sem duplicata — fonte primária para tuning patterns sêniores)

Se STATE.md NÃO tem bloco `## Dedup decisions (Plano 01 fase-01)` aprovado para esses 3 itens, **BLOQUEAR a fase** e escalar para o orquestrador. Anti-drift começa pela fonte certa.

### Passo 2: Frontmatter exato (8 campos base + `rails_versions`, verbatim com piloto)

```yaml
---
topic: performance-and-tuning
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/PATTERNS.md
  - claude-code/knowledge/Rails/rails-expert/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/rails-code-review/PITFALLS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-cb73df7d-c2b5-45b7-826c-358b9bafed4d_text_markdown.md
tier: 2
triggers: [performance, N+1, includes, preload, eager_load, bullet, scout_apm, skylight, threading, puma, GC tuning, memory bloat, jemalloc]
related_skills: [/api-design, /system-design, /infrastructure]
updated: 2026-05-18
rails_versions: ['>=7.1']
---
```

**Notas sobre o frontmatter:**

- `sources:` listam paths absolutos a partir de `claude-code/knowledge/Rails/` (RF14). O extrator confirma que cada arquivo existe via `Read` antes de escrever.
- Substituir nomes de pasta pelos lados canônicos decididos no Plano 01 fase-01. Se `rails-stack-conventions v2` foi escolhido, ajustar o path.
- `triggers` ≤ 13 keywords coerentes com o conteúdo — palavras que dev sr Rails digitaria em busca de tuning. Sem inventar termos.
- `related_skills:` lista as 3 skills cross-stack que mais consomem este átomo via INDEX (D9). NÃO listar todas as 7.
- `rails_versions: ['>=7.1']` cobre `bullet`, `includes/preload/eager_load`, Puma threading model, GC tuning padrão. Sem padrões Rails-8-exclusivos significativos (Solid Queue é tópico de outro átomo).

### Passo 3: Corpo seguindo skeleton fixo do piloto

Seções obrigatórias na ordem (verbatim com piloto `rails-conventions-and-magic`):

1. `# Performance & Tuning` (título H1)
2. `## Quando consultar` — 3-5 bullets de cenário (use-case framing — editorial, não rastreável)
3. `## Padrões sênior` — 5-7 patterns (sub-seções `### Pattern: {nome}` com Problema / Padrão / Quando usar / Quando NÃO usar)
4. `## Anti-padrões` — 3-5 armadilhas com correção
5. `## Critérios de decisão` — tabela "se X, então Y"
6. `## Referências externas` — skills relacionadas + paths das fontes (audit trail RF14)

**NÃO incluir** seção API-only mode (somente átomos de controller/security a têm — G7 do Plano 02).

### Passo 4: Patterns recomendados (guia editorial — extrator expande de 1 linha em sub-seção completa)

Mínimo 5, máximo 7 — extrair do source canônico decidido no Plano 01. Lista Rails-native:

- **Pattern: `includes` vs `preload` vs `eager_load` para evitar N+1** — Problema: query no controller dispara N consultas extras ao iterar associações; Padrão: `includes(:author)` (Rails decide separate ou JOIN), `preload(:author)` (força separate query — evita JOIN cardinality blow-up), `eager_load(:author)` (força LEFT OUTER JOIN — necessário quando filtra por coluna da associação); Quando usar `eager_load`: filtragem no WHERE por campo do associado; Quando NÃO usar: associação acessada em loop sobre milhares de registros sem filtro — `preload` é mais barato.
- **Pattern: `bullet` gem para detecção em dev** — Problema: N+1 escapa para staging/produção; Padrão: adicionar `gem 'bullet'` em group `:development`, configurar `Bullet.enable = true` em `config/environments/development.rb`, ativar `Bullet.alert/console/rails_logger` — bullet alerta toda vez que detecta N+1 ou eager-load desnecessário; Quando usar: todo projeto Rails em desenvolvimento; Quando NÃO usar: produção (overhead) ou test (use `should_eager_load`/`should_not_eager_load` matchers para regression).
- **Pattern: Threading model do Puma (workers vs threads)** — Problema: scaling do servidor web sob carga real; Padrão: workers = CPUs disponíveis (forking, isola memória), threads = 5 (default) ou ajustado por IO-bound ratio; GVL libera durante IO mas não durante CPU — threads acima de 5 raramente trazem ganho em apps CPU-bound; Quando usar mais threads: app majoritariamente IO-bound (calls externas, DB queries lentas); Quando NÃO usar: app CPU-bound (rendering pesado, gem com extension C lockando GVL) — mais workers > mais threads.
- **Pattern: APM com `scout_apm` ou `skylight`** — Problema: latência mediana boa mas P99 ruim sem visibilidade; Padrão: instrumentação automática de controllers/jobs/queries com sampling configurável; foco em traces P95+ que mostram onde o tempo realmente é gasto (DB? view rendering? external call?); Quando usar: qualquer app em produção com >100 req/min; Quando NÃO usar: apps com volume baixíssimo onde logs ad-hoc cobrem — APM custa $.
- **Pattern: GC tuning para Rails 7.1+/8.x** — Problema: pausas de GC visíveis em P99; Padrão: `RUBY_GC_HEAP_INIT_SLOTS=600000` + variantes `_GROWTH_FACTOR`, `_OLDMALLOC_LIMIT` ajustadas por benchmark; Ruby 3.3+ tem `YJIT` (`--yjit` flag) que reduz CPU em 10-30% para apps Rails típicos; Quando usar YJIT: Rails 7.1+ com Ruby 3.3+ — gate de regressão (rodar load test antes de ligar em produção); Quando NÃO usar GC tuning manual: app pequeno (<1k req/min) — defaults do Ruby 3.x já são bons.
- **Pattern: Memory bloat e `jemalloc`** — Problema: workers do Puma crescem em memória sem release (problema clássico do malloc do glibc fragmentando heap); Padrão: linkar processo Ruby com `jemalloc` (`LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2 bundle exec puma`) ou compilar Ruby com `--with-jemalloc`; reduz RSS em 20-40% para workloads com object churn alto; Quando usar: produção com >2 workers e workload sustentado; Quando NÃO usar: dev/test (não vale a complexidade de setup).
- **Pattern: Query profiling com `EXPLAIN ANALYZE`** — Problema: query lenta sem saber se falta índice ou se planejador escolhe scan; Padrão: `Post.where(...).explain` no console + `EXPLAIN ANALYZE` no Postgres para ver tempo real de execução vs estimado; identificar `Seq Scan` em tabelas grandes → adicionar índice; identificar `Nested Loop` em joins → considerar `eager_load` ou refazer query; Quando usar: toda query que aparece nos top-10 do APM ou >100ms em log; Quando NÃO usar: query trivial (≤2ms) — gastar tempo em outra coisa.

Extrator pode escolher 5-7 destes. Se source canônico cobrir todos os 7, priorizar os 6 com maior densidade na fonte.

### Passo 5: Anti-padrões (3-5 armadilhas com correção)

Exemplos Rails-specific (extrator escolhe os que estão na fonte):

- **Anti-pattern: `.includes` sem `references` quando filtra por coluna da associação** — Sintoma: `Post.includes(:author).where("authors.name = ?", q)` gera 2 queries em vez de JOIN, ou warning de "MissingAttributeError"; Correção: `.includes(:author).references(:authors)` ou trocar por `.eager_load(:author)`.
- **Anti-pattern: cache de query em loop sem `each_slice`** — Sintoma: `User.where(active: true).each { |u| ... }` carrega todos os users em memória; Correção: `.find_each` (batch 1000 default) ou `find_in_batches { |batch| ... }` — controla footprint de RAM.
- **Anti-pattern: usar `bullet` em produção** — Sintoma: latência aumenta 30%+ por inspeção de todas as queries; Correção: gem em group `:development` apenas; em test, usar `should_eager_load` matchers para regression assertion.
- **Anti-pattern: aumentar Puma threads sem benchmark** — Sintoma: dev assume "mais threads = mais throughput" e seta `RAILS_MAX_THREADS=32`; resultado: GVL contention, P99 piora; Correção: começar com 5 threads, instrumentar APM, ajustar com dados reais — apps CPU-bound preferem mais workers + menos threads.
- **Anti-pattern: cache miss invalida heat em produção** — Sintoma: deploy invalida Solid Cache, P99 dispara nas primeiras horas; Correção: warmup script roda queries quentes pós-deploy + cache key versioning (`v2:user:#{id}`) evita big-bang invalidation.

### Passo 6: Critérios de decisão (tabela "se X então Y")

| Cenário | Escolha |
|---|---|
| N+1 detectado em dev sem filtro por coluna do associado | `preload(:assoc)` |
| N+1 detectado em dev com filtro por coluna do associado | `eager_load(:assoc)` |
| App IO-bound (calls externas dominam) | Aumentar threads do Puma (até ~10) |
| App CPU-bound (rendering/parsing pesado) | Aumentar workers, manter 5 threads |
| Produção com >2 workers e memory bloat | Linkar `jemalloc` |
| Rails 7.1+ com Ruby 3.3+, app maduro | YJIT (`--yjit`) com gate de load test |
| Query top-10 do APM com Seq Scan | Adicionar índice + re-`EXPLAIN ANALYZE` |
| Iteração sobre coleção grande | `.find_each` (batch 1000) |

### Passo 7: Referências externas

- Skill: `/api-design` para princípios cross-stack de N+1, pagination, query optimization
- Skill: `/system-design` para cache layer, capacity planning, latência P99
- Skill: `/infrastructure` para tuning de servidor web, OS-level memory mgmt
- Source canônica (audit trail RF14): paths absolutos listados em `sources:` no frontmatter

### Passo 8: Comando para invocar extrator (referência para /execute-plan)

`/execute-plan` spawna o subagente extrator com prompt incluindo anti-drift LITERAL (texto da compound lesson `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` colado verbatim). Substituir nomes de pasta canônica pelos decididos no STATE.md antes de spawnar. Output: arquivo markdown completo em `docs/knowledge/rails/atoms/performance-and-tuning.md`.

---

## Gotchas

- **G1 do plano (cap 200 ln):** Performance é tema denso (threading + GC + APM + queries). Alvo 145-160. Se exceder, cortar GC tuning detalhado (mover para nota em `rails-conventions-and-magic`) ou condensar EXPLAIN ANALYZE.
- **G2 do plano (anti-drift literal):** prompt do extrator inclui texto da compound lesson sobre verdade-fora-da-fonte verbatim. Plano 04 do Node teve rework por não ter colado.
- **G4 do plano (`rails_versions`):** `['>=7.1']` — sem padrões Rails-8-exclusivos significativos neste átomo. YJIT é Ruby version, não Rails version — não restringir átomo a Rails 8 por causa de YJIT.
- **G10 do plano (fonte canônica via STATE.md):** Read STATE.md ANTES de chamar extrator. Se `rails-code-review v2` foi decidido, usar em todos os paths.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é markdown puro — sem ciclo RED→GREEN. Checklist de validação:

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/performance-and-tuning.md`
- [ ] Frontmatter contém todos os 8 campos base na ordem: `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`
- [ ] Campo opcional `rails_versions: ['>=7.1']` presente
- [ ] `topic: performance-and-tuning` (literal, kebab-case, igual ao filename sem `.md`)
- [ ] `stack: rails`, `layer: backend`, `tier: 2`, `updated: 2026-05-18`
- [ ] Cada path em `sources:` aponta para arquivo que existe em `claude-code/knowledge/Rails/{pasta-canonica}/...`
- [ ] Corpo tem as 5 seções na ordem: Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas
- [ ] Pelo menos 5 patterns em "Padrões sênior" com sub-seções Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] Pelo menos 3 anti-padrões com correção
- [ ] `wc -l docs/knowledge/rails/atoms/performance-and-tuning.md` retorna entre 130 e 200 (alvo ~150)
- [ ] `grep -c '\[A DEFINIR\]' docs/knowledge/rails/atoms/performance-and-tuning.md` retorna 0
- [ ] Triggers contém pelo menos: `performance`, `N+1`, `bullet`, `threading`, `puma`, `scout_apm`
- [ ] `bun run harness:validate` (ou `atoms-rf11-audit.test.ts` análogo) passa sobre o novo átomo

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/performance-and-tuning.md` exit 0
- `wc -l docs/knowledge/rails/atoms/performance-and-tuning.md` retorna número entre 130 e 200
- `grep -c '\[A DEFINIR\]' docs/knowledge/rails/atoms/performance-and-tuning.md` retorna 0
- Frontmatter parseável como YAML; ordem dos 8 campos base idêntica ao piloto
- `bun run harness:validate` passa

**Por humano:**

- Subagente verifier refined (fase-07) reporta ≥80% das 5 claims auditadas das seções `Padrões sênior` + `Anti-padrões` + `Critérios de decisão` como rastreáveis.
- Leitor sênior Rails reconhece os patterns como decisões de produção (não bullets de tutorial — ex: thread sizing é justificado por GVL/IO ratio, não "use 5 porque é o default").

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->
