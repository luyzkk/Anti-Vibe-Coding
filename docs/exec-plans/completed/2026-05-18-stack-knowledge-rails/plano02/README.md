# Plano 02: Batch A T1 (5 átomos) + Batch B parcial T2 (3 átomos) + verifier refined + audit humano CA-08

**Feature:** Stack Knowledge Layer — Rails (v6.3.3) ([PLAN overview](../PLAN.md))
**Fases:** 9
**Sizing total:** ~14-16h
**Depende de:** Plano 01 (dedup auditada commitada, schema `rails_versions` ativo, anti-drift+verifier refined como regression, piloto `rails-conventions-and-magic` validado pelo verifier)
**Desbloqueia:** Plano 03 (Batch C T2+T3 restantes + INDEX final consolidado + E2E completo CA-01..CA-11 + hardening leve)

---

## O que este plano entrega

8 átomos populados em `docs/knowledge/rails/atoms/` (5 T1 restantes + 3 T2 backend-heavy), todos seguindo verbatim o frontmatter e o skeleton do piloto do Plano 01, cap ≤ 200 linhas cada, com **anti-drift clause literal** no prompt do extrator e **verifier refined** auditando apenas Padrões sênior + Anti-padrões + Critérios de decisão. Gate humano CA-08: Luiz revisa pessoalmente `active-record-fundamentals` (T1) e `action-view-and-hotwire` (T2) — assinatura `Aprovado por Luiz em YYYY-MM-DD` em STATE.md global da feature. Se fase-09 verde, batch A+B parcial fica disponível como input para o INDEX final do Plano 03.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Dedup auditada commitada — quais lados dos 6 pares `rails-X` vs `rails-X copy`/`v2` são canônicos | Plano 01 fase-01 (`dedup-report.md` + decisões aprovadas em STATE.md global) | bloqueia fases 01-08 (cada extrator precisa saber qual pasta é fonte canônica) |
| Schema validator aceita `rails_versions` opcional (array de ranges semver-style) | Plano 01 fase-02 | bloqueia fases 01-08 (cada átomo terá o campo) |
| Anti-drift clause como cláusula obrigatória nos prompts do extrator (texto literal da compound lesson `2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`) | Plano 01 fase-04 (introduziu no piloto) | bloqueia fases 01-08 (regression D12) |
| Verifier refined protocol como cláusula obrigatória nos prompts do verifier (texto literal da compound lesson `2026-05-16-verifier-protocol-technical-sections-only.md`) | Plano 01 fase-05 (introduziu no piloto) | bloqueia fase-09 (regression D12) |
| Piloto `rails-conventions-and-magic.md` como template de frontmatter (8 campos base + `rails_versions`) e skeleton (5 ou 6 seções) | Plano 01 fase-04 | bloqueia fases 01-08 (cada átomo copia formato verbatim) |
| Regression test do detector Rails (CA-03 fallback Sinatra, CA-04 Rails legado) | Plano 01 fase-03 | informacional — não bloqueia, mas valida ambiente |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 8 átomos populados em `docs/knowledge/rails/atoms/` (active-record-fundamentals, active-record-migrations-safety, action-controller-and-routing, security-csrf-and-brakeman, rspec-and-minitest, action-view-and-hotwire, active-job-and-solid-queue, caching-with-rails) — total 8/14 do matrix Rails | Plano 03 fase-06 (INDEX final consolidado precisa de slug/tier/triggers/related_skills dos 14 átomos para gerar seções "Para /security", "Para /api-design", etc.) |
| Padrão **8 verifiers refined em paralelo + audit humano de átomos flagged** como gate de batch (fase-09) | Plano 03 fase-07 (replica o protocolo para Batch C — 2 T2 + 3 T3 + audit humano de `action-cable-and-realtime`) |
| Frontmatter `rails_versions: ['>=8.0']` exemplificado para padrões Rails 8 exclusivos (Solid Queue, Solid Cache) | Plano 03 fase-02 (`deployment-with-kamal` usa `['>=8.0']` para Kamal 2 default) |
| Layout do átomo `rspec-and-minitest` com snippets duplos framework-agnostic (D21) | Referência editorial para futuros átomos cross-framework em outras stacks (Python pytest vs unittest, etc.) — fora do escopo desta feature mas serve de compound futuro |
| Lista de claims que falharam verifier v1 (se houver) + correção aplicada | Plano 03 MEMORY.md (input para calibrar prompt do extrator no Batch C) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-active-record-fundamentals.md | átomo T1 `active-record-fundamentals.md` (~150 ln) — querying, callbacks, validations, associations, encryption, multiple DBs. **FLAGGED CA-08 audit humano** (D14, D19) | 1.5h | Plano 01 (todos blocos acima) |
| 02 | fase-02-active-record-migrations-safety.md | átomo T1 `active-record-migrations-safety.md` (~140 ln) — strong migrations, zero-downtime, postgres-specific | 1.5h | Plano 01 |
| 03 | fase-03-action-controller-and-routing.md | átomo T1 `action-controller-and-routing.md` (~150 ln) — strong params, sessions, before_actions, route constraints. **Inclui seção API-only mode** (D7) | 1.5h | Plano 01 |
| 04 | fase-04-security-csrf-and-brakeman.md | átomo T1 `security-csrf-and-brakeman.md` (~150 ln) — strong params, CSRF, mass-assignment, SQL injection, Brakeman, CSP. **Inclui API-only mode** (D7) | 1.5h | Plano 01 |
| 05 | fase-05-rspec-and-minitest.md | átomo T1 `rspec-and-minitest.md` (~160 ln) — **layout padrões framework-agnostic + snippets duplos RSpec/Minitest** (D21) | 2h | Plano 01 |
| 06 | fase-06-action-view-and-hotwire.md | átomo T2 `action-view-and-hotwire.md` (~150 ln) — layouts/partials, Turbo Frames/Streams, Stimulus, form helpers. **FLAGGED CA-08 audit humano** (D14, D19) | 1.5h | Plano 01 |
| 07 | fase-07-active-job-and-solid-queue.md | átomo T2 `active-job-and-solid-queue.md` (~140 ln) — Solid Queue default Rails 8, Sidekiq fallback, retries, idempotency. `rails_versions: ['>=8.0']` para padrões Solid Queue (D13) | 1.5h | Plano 01 |
| 08 | fase-08-caching-with-rails.md | átomo T2 `caching-with-rails.md` (~140 ln) — Solid Cache default Rails 8, fragment caching, Russian doll, HTTP caching. `rails_versions: ['>=8.0']` para padrões Solid Cache (D13) | 1.5h | Plano 01 |
| 09 | fase-09-verifier-refined-e-audit-humano.md | 8 invocações de verifier refined em paralelo (1 por átomo, audit ≥80% das claims das 3 seções técnicas rastreáveis) + audit humano Luiz dos 2 átomos flagged (`active-record-fundamentals` + `action-view-and-hotwire`) com assinatura em STATE.md global | 2.5h | fase-01..08 |

**Soma:** 14.5h (range planejado 14-16h, dentro do alvo).

---

## Grafo de Fases

```
                Plano 01 (tracer)
                       |
       +----+----+----+----+----+----+----+----+
       |    |    |    |    |    |    |    |
       v    v    v    v    v    v    v    v
   fase-01 fase-02 fase-03 fase-04 fase-05 fase-06 fase-07 fase-08
   (AR    (AR     (Action (Sec    (Test) (Hotw.) (Jobs+ (Cache+
   fund.) migr.)  Ctrl)   CSRF)         flagged) Solid  Solid
   flagged                                       Queue) Cache)
       |    |    |    |    |    |    |    |
       +----+----+----+----+----+----+----+----+
                       |
                       v
              fase-09 (verifier refined batch + audit humano)
```

**Paralelismo possivel:** fases 01-05 (Batch A T1) podem ser executadas em paralelo por 5 subagentes extratores independentes — nenhuma compartilha arquivos (cada uma escreve um átomo diferente em `atoms/`). Fases 06-08 (Batch B parcial T2) também paralelizam entre si. O `/execute-plan` pode disparar até 8 subagentes simultâneos após o gate do Plano 01 (não recomendado por orçamento de tokens — o padrão real é despachar batches de 3-4 em paralelo). Fase-09 é sequencial e fecha o ciclo, pois depende dos 8 átomos escritos para rodar o verifier refined.

---

## TDD Strategy

```
Ciclo por fase (content-only):
1. PLAN: extrator lê fonte canônica + frontmatter alvo + skeleton fixo
2. WRITE: subagente extrator escreve o átomo com anti-drift clause literal no prompt
3. CHECK: checklist de validação de conteúdo (wc -l ≤ 200, frontmatter 8 campos + rails_versions, zero placeholders, harness:validate passa)
4. GATE (fase-09): subagente verifier refined audita só seções técnicas; humano audita 2 átomos flagged
```

Fases 01-08 são **content-only** (markdown puro): usam checklist de validação de conteúdo em vez de RED→GREEN. Cada fase tem cycle explícito na seção Verificação. Fase-09 é gate de qualidade (subagente verifier + audit humano) cujo veredito é registrado em `plano02/MEMORY.md` como DI-1.

**Tracer Bullet deste plano:** N/A — o tracer vive no Plano 01 fase-05 (já validou arquitetura matrix → init → projeto → skill end-to-end com piloto). Plano 02 é escala em conteúdo, não em arquitetura.

---

## Gotchas Conhecidos

Indexados aqui; referenciados nas fases.

- **G1 — Cap de 200 linhas é HARD:** o verifier refined da fase-09 (e o `harness:validate`) rejeita átomo > 200. Conteúdo excedente NÃO infla outra seção — vira backlog `v6.3.4+ (Rails knowledge expansion)`. Alvos por fase: 140-160 linhas. Se um extrator entrega 195+, sinalizar risco e considerar condensar exemplos.

- **G2 — Anti-drift como REGRESSION-TEST (D12), não guideline:** o prompt de cada extrator (fases 01-08) DEVE incluir o **texto LITERAL** da compound lesson `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` (cole verbatim no prompt, não parafraseie). Sem o gate, blocker — Plano 04 do Node teve rework loop por não ter aplicado.

- **G3 — Verifier refined audita APENAS Padrões sênior + Anti-padrões + Critérios de decisão (D12):** a fase-09 cola o **texto LITERAL** da compound lesson `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` no prompt do verifier. Auditar `Quando consultar` ou `Referências externas` ou `API-only mode` (callout) gera false-positive de "claim genérica não tem fonte" — esses são scaffolding editorial, não claims técnicas.

- **G4 — Frontmatter `rails_versions` é array de ranges semver-style (D18):** padrões Rails 8 exclusivos (Solid Queue na fase-07, Solid Cache na fase-08) ganham `rails_versions: ['>=8.0']`. Padrões disponíveis desde 7.1 (callbacks, validations, strong params) ganham `rails_versions: ['>=7.1']`. Para padrões universais (raríssimo nesses átomos — ex: idiomas Ruby muito antigos), o campo é omitido. Validator em fase-02 do Plano 01 aceita o campo OPCIONAL.

- **G5 — `rspec-and-minitest` (fase-05) tem layout único:** D21 dita padrões framework-agnostic com snippets duplos por padrão (cada padrão expõe snippet RSpec + snippet Minitest sem duplicar a explicação). NÃO criar seções separadas "RSpec" / "Minitest". Verifier audita só os padrões abstratos + decisões — os snippets duplos contam como ilustração, não como claim técnica rastreável.

- **G6 — Fonte canônica vem da decisão do Plano 01:** cada extrator DEVE primeiro `Read` o STATE.md global da feature, extrair a decisão de dedup aprovada (ex: `rails-code-review` é canônico → `rails-code-review copy` foi deletado) e usar APENAS o lado canônico em `sources:`. Se STATE.md não tem decisão aprovada para um par que afeta este átomo, BLOQUEAR a fase e escalar para o orquestrador.

- **G7 — API-only mode (D7) é SEÇÃO embutida, não átomo dedicado:** fases 03 (`action-controller-and-routing`) e 04 (`security-csrf-and-brakeman`) ganham uma seção `## API-only mode` entre `## Critérios de decisão` e `## Referências externas`. A seção lista 2-3 deltas (sem ActionView/cookies → JSON renderers; CSRF skip + token auth via Authorization header). Verifier audita apenas os Padrões sênior do átomo, não a callout API-only (que é editorial — equivalente a "Quando consultar").

- **G8 — Frontmatter `sources:` paths absolutos (RF14):** todos os 8 átomos listam paths absolutos das fontes canônicas em `claude-code/knowledge/Rails/{pasta-canônica}/{arquivo}.md`. Sem o caminho ABSOLUTO, o audit trail RF14 quebra e a fase-09 verifier não consegue ler a fonte para rastrear claims. Padrão (verbatim): `- claude-code/knowledge/Rails/rails-stack-conventions/PATTERNS.md`. Compass artifacts entram com nome completo do arquivo: `- claude-code/knowledge/Rails/compass_artifact_wf-0deebe76-e4fd-426f-889d-0698b640ee56_text_markdown.md`.

<!--
Princípio universal #5 — Comment Provenance.
Comentários em código gerado deste plano seguem: autor + papel, YYYY-MM-DD, razão/decisão.
Markdown puro: sem código TS novo neste plano (apenas conteúdo em docs/knowledge/rails/atoms/).
-->

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->
