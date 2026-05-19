---
title: "Stack Knowledge Layer — Rails (v6.3.3)"
mode: full
status: active
created: 2026-05-18
---

# Exec Plan: Stack Knowledge Layer — Rails (v6.3.3)

**PRD:** ./PRD.md
**CONTEXT:** ./CONTEXT.md (21 decisões)
**Reuses infra from:** [2026-05-16-stack-knowledge-nodejs-typescript](../../completed/2026-05-16-stack-knowledge-nodejs-typescript/)
**Planos:** 3 planos, 25 fases total
**Created:** 2026-05-18

---

## Goal

Adicionar camada de knowledge sênior **Rails-native** (14 átomos + INDEX em `docs/knowledge/rails/`) seguindo o trilho da v6.3.2, reusando 100% da infra Node (`runStackKnowledgeInit`, `copyKnowledge`, `getStackKnowledgePreface`, telemetria, `MATRIX_FOLDER_VALUES` já inclui `'rails'`). Único delta de código: regression test do detector Rails (regex já presente em `detect-stack.ts:72`) + schema `rails_versions` opcional. Trabalho real: dedup auditada de fontes + escrita de 14 átomos com anti-drift + verifier refined + audit humano em 3 átomos.

## Scope

- **Plugin matrix:** `docs/knowledge/rails/INDEX.md` (layout por skill cross-stack + tier, D9) + 14 átomos em `atoms/*.md` (frontmatter completo com novo campo `rails_versions` opcional, corpo ≤200 linhas, anti-drift absoluto).
- **Skill `/init`:** ZERO mudança de código (regression validada). Apenas regression test cobrindo fallback Sinatra (Gemfile sem `gem 'rails'` → `unknown`).
- **Schema validation:** `harness:validate` reconhece `rails_versions` opcional, mantém átomos Node existentes válidos (CA-10).
- **7 skills cross-stack:** ZERO mudança. Consumem `.claude/knowledge/INDEX.md` via `getStackKnowledgePreface()` agnóstico de stack.
- **Quality gate:** anti-drift desde Plano01 fase-05 (extrator) + verifier refined desde fase-06 (audit só de Padrões sênior + Anti-padrões + Critérios de decisão) + audit humano Luiz em 3 átomos (AR fundamentals, Hotwire, ActionCable — D14, D19).
- **Dedup:** Plano01 fase-01 audita 6 pares duplicados em `claude-code/knowledge/Rails/` (rails-code-review, rails-migration-safety, rails-security-review v2, rails-stack-conventions v2, rails-tdd-slices copy, rails-upgrade copy). Relatório commitado.
- **Out of scope:** outras stacks (Python, Go, Laravel), drift detection automática, update flow para projetos instalados, ActionText/ActionMailbox dedicados (absorvidos em action-mailer-and-mailbox), Rails Engines, GraphQL, frontend full-SPA, Sorbet/RBS, Capistrano/Heroku como átomo dedicado (ver PRD §Won't Have).

## Assumptions

- **Infra Node 100% reusável:** `runStackKnowledgeInit`, `copyKnowledge` (5-status), `getStackKnowledgePreface`, telemetria `stack_detected`+`knowledge_copied`, `MATRIX_FOLDER_VALUES`, `STACK_ID_TO_MATRIX_FOLDER['rails']`, `--refresh-knowledge` — todos stack-agnostic e já testados em v6.3.2.
- **Detector Rails JÁ atualizado:** regex `/^\s*gem\s+["']rails["']/m` está em `skills/init/lib/detect-stack.ts:72` (linha 72 do probeRails). RF3 vira **validação por regression test**, não nova implementação. Plano01 fase-04 adiciona test cobrindo fallback Sinatra (após refactor multi-stack D22 em fase-03).
- **Fontes em `claude-code/knowledge/Rails/`** permanecem inaltadas durante execução. Frontmatter `sources:` aponta para elas (audit trail RF14).
- **Pares duplicados em fonte:** 6 pares (não 8 como CONTEXT D3 sugere) — `rails-code-review`/`copy`, `rails-migration-safety`/`copy`, `rails-security-review`/`v2`, `rails-stack-conventions`/`v2`, `rails-tdd-slices`/`copy`, `rails-upgrade`/`copy`. Dedup auditada cobre todos.
- **Anti-drift + verifier refined são REGRESSION-TEST** (D12). Lessons em `docs/compound/2026-05-16-{verifier-protocol-technical-sections-only,extrator-subagente-injeta-verdades-fora-do-source}.md` viram cláusula obrigatória nos prompts dos subagentes desde Plano01 fase-05.
- **`harness:validate` aceita campo NOVO sem code change:** valida no Plano01 fase-02 com test fixture combinada (Node atoms + Rails atoms).

## Risks

- **Verifier false-positive entrega "tudo OK" sem checar (Alto, Média prob):** mitigação = verifier refined protocol obrigatório desde Plano01 + audit humano Luiz em 3 átomos antes de aprovar batch (CA-08, D19).
- **Compressão excessiva perde nuance (~13.8k → ~1.7k linhas, 8× compressão) (Médio):** mitigação = piloto `rails-conventions-and-magic` no Plano01 valida antes de escalar; hard cap 200 linhas por átomo.
- **Schema `rails_versions` quebra átomos Node (Alto, Baixa prob):** mitigação = RF4 + CA-10, campo OPCIONAL, fixture explícita Node+Rails atoms no Plano01 fase-02.
- **Dedup auditada decide pela versão errada (Médio):** mitigação = subagente entrega tabela com diff resumido + recomendação justificada (D20); dev aprova linha-por-linha em STATE.md; `dedup-report.md` commitado para audit trail.
- **Volume real ~13.8k linhas tenta inflar átomos >200 (Médio, Alta prob):** mitigação = verifier rejeita átomo > 200; conteúdo excedente vira follow-up backlog v6.3.4+.
- **Conteúdo Rails-native difere tanto do Node que skills cross-stack não acham átomo via INDEX (Alto, Baixa prob):** mitigação = D9 INDEX organizado por skill cross-stack; E2E em Plano03 fase-09 valida `/security` → encontra `security-csrf-and-brakeman`.
- **Compass artifacts contradizem skill packages (Médio):** mitigação = D2 skill packages = autoridade primária; nota em "Critérios de decisão" do átomo.
- **`active-storage` mal classificado como T3 cria fricção (Baixo):** mitigação = RF13 flag de revisão no batch B do Plano03 fase-05; pode subir para T2 sem custo de re-extração.
- **Detector update introduz regressão para Rails atípicos (Médio, Baixa prob):** mitigação = CA-06 fallback gracioso para `unknown`; telemetria registra anchor encontrado mesmo no fallback.
- **Hardening leve perde finding crítico (Médio, Baixa prob):** mitigação = content auditors cobrem onde há risco real (markdown drift); delta de código é ~5 linhas em `detect-stack.ts` + schema — risco genuíno baixo.

## Execution Steps

### Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Tracer Bullet — dedup + schema + multi-stack contract + piloto + E2E mínimo | 6 | ~9.5-11.5h | — |
| 02 | Batch A (5 T1 restantes) + Batch B parcial (3 T2) + verifier + audit humano | 9 | ~14-16h | 01 |
| 03 | Batch C (2 T2 + 3 T3) + INDEX final + RF11 + E2E completo + hardening leve | 10 | ~12.5-14.5h | 02 |

**Total:** 25 fases, ~36-42h.

### Grafo de Dependências

```
Plano 01 (Tracer)
    |
    v
Plano 02 (Batch A T1 + B parcial T2)
    |
    v
Plano 03 (Batch C + INDEX + E2E + Hardening)
```

**Paralelismo:** sequencial. Plano02 precisa de schema+piloto+anti-drift protocol validados no Plano01. Plano03 consolida INDEX referenciando todos os átomos dos planos 01+02 e executa E2E final. Dentro de cada plano, fases de extração de átomo são paralelizáveis entre si (mesma fase de subagentes em paralelo via /execute-plan), mas verifier+audit são sequenciais ao final.

### Tracer Bullet

- **Plano:** 01
- **Fases:** fase-01 a fase-06 (slice end-to-end completo, sem outros átomos)
- **Descrição:** dedup audit + schema `rails_versions` no validator + refactor multi-stack contract D22 (`DetectedStack { primary, secondary, signalSource, anchorFiles }`) + regression test do detector Rails sobre novo contrato + piloto `rails-conventions-and-magic.md` extraído com anti-drift + verifier refined sobre piloto + E2E com fixture Rails dummy provando que `runStackKnowledgeInit({ primary: 'rails' })` funciona sem mudança de código (CA-02 happy ≤200ms D24 + CA-09 graceful + CA-11 regressão Node). Valida arquitetura, protocolos de qualidade e infra antes de investir em 13 átomos restantes.

### Resumo por Plano

#### Plano 01 — Tracer Bullet (6 fases, ~9.5-11.5h)
> Slice end-to-end mínimo: dedup auditada de fontes + schema validator + refactor multi-stack contract D22 + piloto T1 transversal + E2E. Valida infra Node funciona com Rails sem code change, e estabelece anti-drift + verifier refined como regression desde aqui.

Fases planejadas (criadas pelo subagente no Step 9):
- fase-01: Dedup auditada dos pares duplicados em `claude-code/knowledge/Rails/` (subagente compara, gera `dedup-report.md`, dev aprova linha-por-linha em STATE.md)
- fase-02: Schema `rails_versions` opcional adicionado ao validator (`harness:validate`) + regression test combinada Node+Rails atoms
- fase-03: Refactor `detectStack` para contrato multi-stack D22 (`DetectedStack { primary, secondary, signalSource, anchorFiles }`) + map call sites (run-stack-knowledge-init, write-stack-json, emit-stack-knowledge-events) sem mudar comportamento observable
- fase-04: Regression test do detector Rails sobre novo contrato D22 (cobertura fallback Sinatra — Gemfile sem `gem 'rails'` → `primary: null`); confirmar regex `/^\s*gem\s+["']rails["']/m` em `detect-stack.ts:72`
- fase-05: Extração do piloto `rails-conventions-and-magic.md` (T1 transversal — CoC, DRY, Zeitwerk, ActiveSupport) com anti-drift clause OBRIGATÓRIA no prompt do subagente extrator
- fase-06: Verifier refined sobre piloto (audit APENAS Padrões sênior + Anti-padrões + Critérios de decisão) + E2E fixture Rails dummy (`Gemfile` com `gem 'rails'`) → `/init` → `.claude/knowledge/` contém piloto (CA-02 ≤200ms D24 + CA-09 + CA-11)

#### Plano 02 — Batch A T1 + Batch B parcial T2 (9 fases, ~14-16h)
> 5 átomos T1 restantes (todo Rails dev sr precisa) + 3 átomos T2 (apps de médio porte). Extração paralelizável; verifier+audit humano sequenciais ao final do batch. Segue D7 (API-only mode embutido em controllers/security) e D21 (rspec-and-minitest com snippets duplos framework-agnostic).

Fases planejadas:
- fase-01: `active-record-fundamentals.md` (T1 — flagged CA-08 audit humano)
- fase-02: `active-record-migrations-safety.md` (T1 — strong migrations, zero-downtime, postgres-specific)
- fase-03: `action-controller-and-routing.md` (T1 — inclui seção API-only mode D7)
- fase-04: `security-csrf-and-brakeman.md` (T1 — strong params, CSRF, mass-assignment, Brakeman, CSP; inclui API-only D7)
- fase-05: `rspec-and-minitest.md` (T1 — layout snippets duplos D21)
- fase-06: `action-view-and-hotwire.md` (T2 — flagged CA-08 audit humano)
- fase-07: `active-job-and-solid-queue.md` (T2 — Solid Queue default Rails 8, Sidekiq fallback)
- fase-08: `caching-with-rails.md` (T2 — Solid Cache default Rails 8, Russian doll)
- fase-09: Verifier refined sobre batch A+B parcial + audit humano Luiz dos 2 átomos flagged (`active-record-fundamentals` + `action-view-and-hotwire`) — assinatura `Aprovado por Luiz em YYYY-MM-DD` em STATE.md

#### Plano 03 — Batch C + INDEX + RF11 + E2E + Hardening (10 fases, ~12.5-14.5h)
> 2 T2 restantes + 3 T3 + INDEX final consolidado (layout D9 por skill cross-stack + tier) + RF11 standalone ANTES do E2E (D23 — CA-04 GREEN imediato sem RED cross-phase) + E2E completo cobrindo CA-01..CA-11 + hardening leve com content auditors. Inclui flag de revisão de tier para `active-storage` (RF13), warning Rails legado em fase dedicada (RF11) e preview de keywords (RF12).

Fases planejadas:
- fase-01: `performance-and-tuning.md` (T2 — N+1, includes/preload/eager_load, bullet, scout_apm, threading)
- fase-02: `deployment-with-kamal.md` (T2 — Kamal 2 default Rails 8, Docker, asset compilation; nota Capistrano)
- fase-03: `action-cable-and-realtime.md` (T3 — flagged CA-08 audit humano; channels, Solid Cable)
- fase-04: `action-mailer-and-mailbox.md` (T3 — absorve ActionText/ActionMailbox per D16)
- fase-05: `active-storage.md` (T3 + flag revisão tier RF13 — dev decide se sobe para T2 após escrita)
- fase-06: INDEX.md final consolidado (layout D9 — seções "Para /security", "Para /api-design", etc. + mapa por tier)
- fase-07: Verifier refined sobre batch C + audit humano Luiz de `action-cable-and-realtime` — assinatura STATE.md
- fase-08: RF11 — warning Rails legado <7.1 ANTES do E2E (D23 — helper `extractRailsVersionWarning` em `format-knowledge-preview.ts` + 5 testes unit + caller integration; CA-04 GREEN imediato sem RED cross-phase)
- fase-09: E2E completo CA-01..CA-11 (fixtures: Rails moderno 8.x, Sinatra CA-03, legacy 7.0 CA-04 com warning [já GREEN via fase-08], monorepo Rails+Node CA-07, Node-only CA-11); CA-02 perf assertion ≤200ms (D24)
- fase-10: Hardening leve com content auditors (anti-drift D15) — security-auditor + code-smell-detector sobre delta de código (~10 linhas — RF11 helper + D22 refactor + schema validator), content audit de frontmatter completo 14/14 e cap 200 linhas (D25 hard cap + TODO.md backlog v6.3.4+); polish RF12 (preview keywords no `/init`)

---

## Review Checklist

- [ ] 14 átomos escritos em `docs/knowledge/rails/atoms/*.md`, todos com frontmatter completo (8 campos base + `rails_versions` quando aplicável)
- [ ] Nenhum átomo > 200 linhas (hard cap, verifier rejeita)
- [ ] Zero placeholders `[A DEFINIR]` em qualquer átomo
- [ ] INDEX.md ≤ 100 linhas, layout D9 (por skill cross-stack + por tier)
- [ ] Schema `rails_versions` opcional aceito por `harness:validate`; átomos Node continuam válidos (CA-10)
- [ ] Detector Rails fallback Sinatra coberto por regression test (CA-03, CA-06)
- [ ] CA-08 cumprido: verifier refined audit ≥80% claims rastreáveis em `Padrões sênior` + `Anti-padrões` + `Critérios de decisão`
- [ ] CA-08 humano: Luiz assinou aprovação dos 3 átomos (`active-record-fundamentals`, `action-view-and-hotwire`, `action-cable-and-realtime`) em STATE.md
- [ ] Dedup report commitado em `plano01/dedup-report.md` com decisões aprovadas pelo dev
- [ ] E2E completo passa: CA-01, CA-02 (≤200ms D24), CA-03, CA-04 (GREEN imediato via fase-08 D23), CA-05, CA-06, CA-07, CA-09, CA-10, CA-11
- [ ] Anti-drift clause + verifier refined protocol citados nos prompts dos subagentes desde Plano01 fase-05/06 (D12)
- [ ] D22 contrato multi-stack aplicado em todos os call sites (`runStackKnowledgeInit`, `writeStackJson`, `emitStackKnowledgeEvents`)
- [ ] D25 hard cap 200 linhas verificado em todos os 14 átomos + backlog v6.3.4+ em `TODO.md` para conteúdo excedente
- [ ] Telemetria `stack_detected` e `knowledge_copied` emitida para Rails sem instrumentação adicional

---

## Validation Log

### Plano 01 — Tracer Bullet (2026-05-19)

- `bun test tests/e2e/stack-knowledge-rails-tracer.test.ts` -> **4 passed, 0 failed**
- `bun test skills/init/lib/detect-stack.test.ts` -> **16 passed, 0 failed** (8 originais + 4 D22 fase-03 + 4 regression fase-04)
- `bun test skills/init/lib/atoms-frontmatter-schema.test.ts` -> **6 passed, 0 failed**
- `bun test` global -> **EXIT=0** (zero regressoes)
- **CA-02 measured:** durationMs medio 6.97ms / max 10.39ms (5 amostras, 1 atomo) — folga ~20x do limite D24 (200ms). Extrapolacao linear para 14 atomos ~98ms (ainda dentro de SLA).
- **CA-09:** preface vazio confirmado quando `.claude/knowledge/` ausente.
- **CA-11:** Node atoms continuam sendo copiados em projeto TS puro (sem Gemfile) — `type-system-idioms.md` presente, `rails-conventions-and-magic.md` ausente como esperado.
- **Verifier refined:** taxa 100% claims rastreaveis (38/38 — meta >=80% D12). Report em `plano01/verifier-report-fase06.md`.
- **Anti-drift clause + verifier refined protocol** aplicados como regression desde Plano01 (D12) — prompts dos subagentes contiveram blocos verbatim dos compound lessons 2026-05-16-{extrator-subagente-injeta-verdades-fora-do-source,verifier-protocol-technical-sections-only}.md.
- **Piloto:** 108 linhas / 5 H2 / 9 frontmatter fields / rails_versions=['>=7.1'] valido.
- **Dedup:** 6 pares auditados, decisao uniforme (manter sem sufixo, deletar copy/v2 em Plano03 fase-09).

### Plano 02 — Batch A T1 + Batch B parcial T2 (2026-05-18)

- **8 atomos extraidos** em 3 batches paralelos (fases 01-03 / 04-05 / 06-08) via subagentes isolados — sizing real ~7-8h paralelo (estimado 14-16h sequencial).
- **Verifier refined batch:** 8/8 PASS (1 subagente paralelo por atomo, 5 claims auditadas cada). Taxa global **40/40 = 100%** rastreabilidade (meta D12 era >=80%). Replica exatamente a taxa do piloto Plano 01 fase-06.
- **Audit humano CA-08:** 2/2 OK — `active-record-fundamentals` (T1) + `action-view-and-hotwire` (T2) aprovados por Luiz em 2026-05-18 (3/3 claims cross-check rastreaveis em ambos).
- **Linhas:** 1100 total / 8 atomos (media 137 ln; max 198 — rspec-and-minitest com D21 dual snippets). Nenhum atingiu hard cap 200.
- **Anti-drift retornou dividendos:** 4 cortes documentados (AR Encryption, Turbo Stream broadcast, Russian doll syntax, parallelize TDD) — fontes nao sustentavam claims. Confirmado por Luiz como decisao correta. Reservados para v6.3.4+.
- **GT batch1 (DI-Plano02):** specs listavam sources inexistentes (`PATTERNS.md`, `PITFALLS.md`, `BACKENDS.md`, `REVIEW_CHECKLIST.md`) em pastas que so tem `SKILL.md` + `references/`. Subagentes corrigiram via Glob+ls antes de fixar frontmatter. Spec do Plano 03 deve evitar listar paths sem `ls` previo.
- **Compass artifacts removidos por irrelevancia (grep zero matches):** wf-9d10f3ac (API Design, nao caching/migrations), wf-fd78fcce (sem termos seguranca), wf-61b9b080 (sem TDD). Substituidos: wf-8afc0f40 (segurança 90 matches), wf-a0aa55c4 (Brakeman 38 matches), wf-1d48ebbc (HTTP caching), wf-cb73df7d (TDD 201 matches).
- **Decisao validada D7:** API-only mode como secao scaffolding embedded (6 H2 em vez de 5) nao confundiu o verifier — protocolo refined explicitamente exclui essa secao do audit.
- **Decisao validada D21:** rspec-and-minitest framework-agnostic com snippets duplos por pattern (sem secoes separadas) — verifier auditou pattern statement como claim, snippets como ilustracao.
- **Decisao validada D13:** `rails_versions` opcional. Atomos mainstream usam `['>=7.1']`; Solid Queue/Solid Cache contextualizados como Rails 8+ no corpo (sem split de atomo). Plano 03 `deployment-with-kamal` usara `['>=8.0']`.

---

## Compound Opportunity

(preenchido durante execução; capturar lições novas via /lessons-learned)

Candidates a observar:
- Dedup auditado de fontes duplicadas — formato do relatório serve para outras stacks (Python, Go) reusando o mesmo padrão
- Anti-drift + verifier refined aplicados desde piloto (não apenas em batch final) — validar se reduz rework comparado ao Node v6.3.2
- Schema evolutivo de frontmatter (`rails_versions` opcional) — padrão para próximas stacks com versionamento crítico (Python 3.x, Go 1.x)

---

## Lessons Captured

(preenchido após merge via /iterate ou /lessons-learned)

Referências entrando como regression desde Plano01:
- `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` → anti-drift clause no prompt do extrator (fase-05+)
- `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` → verifier audita APENAS Padrões sênior + Anti-padrões + Critérios de decisão (fase-06+)

---

## Exit Criteria

- 14 átomos + INDEX.md em `docs/knowledge/rails/` commitados, todos validados por verifier refined + 3 com audit humano assinado por Luiz
- `dedup-report.md` commitado em `plano01/` com decisões aprovadas pelo dev
- Schema `rails_versions` no validator + regression test combinada Node+Rails passando
- E2E suite cobrindo CA-01..CA-11 passando (fixtures Rails moderno, Sinatra, legacy, monorepo, Node-only)
- Hardening leve sem findings críticos não tratados
- `bun run harness:validate` passa sobre toda a subárvore `docs/knowledge/`
- STATE.md marca todos os planos como completed

---

## Decisões do PRD Aplicadas

| Decisão | Onde se aplica |
|---------|---------------|
| D3 (dedup auditada com relatório) | Plano01 fase-01 |
| D4 (Rails-native, não cross-stack symmetry) | Estrutura de átomos em todos os planos |
| D7 (API-only mode embutido) | Plano02 fase-03 + fase-04 |
| D8 (3 planos) | Esta estrutura |
| D9 (INDEX por skill + tier) | Plano03 fase-06 |
| D10 (regex `gem 'rails'` no Gemfile) | Plano01 fase-04 (regression test do existente sobre contrato D22) |
| D11 (tier classification T1/T2/T3) | Distribuição nos planos 01/02/03 |
| D12 (anti-drift + verifier refined regression) | Plano01 fase-05 (introduz extrator); fase-06 (introduz verifier); Plano02 fase-09; Plano03 fase-07 |
| D13/D18 (schema `rails_versions` array semver-style) | Plano01 fase-02 |
| D14/D19 (CA-08 audit humano em 3 átomos) | Plano02 fase-09 (AR fundamentals + Hotwire); Plano03 fase-07 (ActionCable) |
| D15 (hardening leve content auditors) | Plano03 fase-10 |
| D16 (Won't Have v6.3.3) | Excluído de todo o escopo |
| D17 (piloto rails-conventions-and-magic) | Plano01 fase-05 |
| D20 (dedup report tabela mtime+diff+recomendação) | Plano01 fase-01 |
| D21 (rspec-and-minitest layout snippets duplos) | Plano02 fase-05 |
| **D22 (contrato multi-stack `DetectedStack`)** | Plano01 fase-03 (refactor) + fase-04 (regression test) — ripple em todos call sites |
| **D23 (RF11 promovido para fase dedicada ANTES do E2E)** | Plano03 fase-08 (RF11 standalone — CA-04 GREEN imediato) |
| **D24 (CA-02 perf relax 100ms → 200ms para CI Windows)** | Plano01 fase-06 (E2E tracer) + Plano03 fase-09 (E2E completo) |
| **D25 (hard cap 200 linhas + TODO.md backlog v6.3.4+)** | Plano03 fase-10 (hardening verifica + cria backlog) |
| RF11 (warning Rails legado <7.1) | **Plano03 fase-08 (fase dedicada per D23)** |
| RF12 (preview keywords no `/init`) | Plano03 fase-10 (polish) |
| RF13 (active-storage flag de revisão tier) | Plano03 fase-05 |
| RF14 (frontmatter `sources:` audit trail) | Todas as fases de extração |

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-05-18 a partir de PRD.md + CONTEXT.md (21 decisões) -->
