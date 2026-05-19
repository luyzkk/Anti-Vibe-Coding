# Plano 01: Tracer Bullet — dedup auditada + schema rails_versions + piloto Rails-conventions + E2E mínimo

**Feature:** Stack Knowledge Layer — Rails (v6.3.3) ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~9.5-11.5h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (Batch A T1 + Batch B parcial T2), Plano 03 (Batch C + INDEX final + E2E completo + hardening leve)

---

## O que este plano entrega

Slice end-to-end mínimo do Stack Knowledge Rails: dedup auditada das fontes em `claude-code/knowledge/Rails/` (6 pares duplicados decididos por humano) + schema `rails_versions` opcional no validator + **refactor `detectStack` para contrato multi-stack (D22 — `{ primary, secondary, signalSource, anchorFiles }`)** + regression test do detector Rails (regex já existe em `detect-stack.ts:72`) sobre o novo contrato + piloto T1 transversal `rails-conventions-and-magic.md` extraído com **anti-drift clause obrigatória** + verifier refined no piloto + E2E fixture Rails dummy provando que `runStackKnowledgeInit({ primary: 'rails' })` funciona sem mudança de código (regressão da infra Node v6.3.2). Se fase-06 verde, arquitetura validada e Plano 02 pode escalar para os 13 átomos restantes com segurança.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD aprovado com decisões D2, D3, D10, D12, D13, D17, D18, D20 | `../PRD.md` + `../CONTEXT.md` | pronto |
| Infra Node v6.3.2 (`runStackKnowledgeInit`, `copyKnowledge`, `getStackKnowledgePreface`, telemetria, `MATRIX_FOLDER_VALUES` inclui `'rails'`) | `docs/exec-plans/completed/2026-05-16-stack-knowledge-nodejs-typescript/` | pronto (merged 2026-05-17) |
| Regex `gem 'rails'` em `skills/init/lib/detect-stack.ts:72` | codebase | pronto (RF3 vira regression test, não nova implementação) |
| Fontes Rails em `claude-code/knowledge/Rails/` (9 compass + 13 skill packages + 7 deep-research) | codebase | pronto; 6 pares duplicados serão auditados em fase-01 |
| Compound lesson anti-drift | `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` | pronto (regra cole-literalmente no prompt do extrator em fase-05) |
| Compound lesson verifier refined | `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` | pronto (regra cole-literalmente no prompt do verifier em fase-06) |
| Padrão de E2E tracer | `tests/e2e/stack-knowledge-tracer-bullet.test.ts` (referência Node) + `tests/e2e/init-tracer-bullet.test.ts` (scaffolding tmpdir) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `dedup-report.md` aprovado + decisões de quais fontes manter/deletar (6 pares) | Plano 02 + Plano 03 — extratores leem fonte canônica decidida aqui |
| Schema validator aceita `rails_versions` opcional (regression Node+Rails) | Plano 02 fase-01..08 (todos os átomos novos terão o campo); Plano 03 fase-01..05 idem |
| **Contrato multi-stack `DetectedStack { primary, secondary, signalSource, anchorFiles }` (D22)** | Plano 02 + Plano 03 inteiro — todos os call sites de `detectStack` (run-stack-knowledge-init, write-stack-json, emit-stack-knowledge-events) leem do novo shape |
| Anti-drift clause + verifier refined protocol como cláusula obrigatória (regression D12) | Plano 02 fase-09 (verifier batch A+B); Plano 03 fase-07 (verifier batch C) — copiam o prompt verbatim |
| Piloto `rails-conventions-and-magic.md` + frontmatter validado pelo verifier | Plano 03 fase-06 (INDEX final referencia o piloto na seção `/architecture` + `/design-patterns`) |
| `docs/knowledge/rails/INDEX.md` SKELETON (apenas lista o piloto) | Plano 03 fase-06 (substitui pelo INDEX final consolidado, layout D9) |
| Regression test do detector Rails (fallback Sinatra + Rails legado) sobre contrato multi-stack | Plano 03 fase-09 E2E completo (reusa fixtures para CA-03 + CA-06) |
| E2E `tests/e2e/stack-knowledge-rails-tracer.test.ts` validando CA-02 + CA-09 + CA-11 | Plano 03 fase-09 (estende para CA-01, CA-04, CA-05, CA-07, CA-10) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-dedup-audit.md | `dedup-report.md` (tabela por par — mtime, diff resumido, conteúdo novo vs comum, recomendação justificada) + decisões aprovadas em STATE.md | 2h | — |
| 02 | fase-02-schema-rails-versions.md | Validator (`harness:validate` ou `atoms-rf11-audit.test.ts` análogo) aceita `rails_versions` opcional (array de ranges semver-style); fixture combinada Node+Rails passa | 1.5h | fase-01 |
| 03 | fase-03-detect-stack-multi-stack.md | Refactor `detectStack` para retornar `DetectedStack { primary, secondary, signalSource, anchorFiles }` (D22) + map call sites (run-stack-knowledge-init, write-stack-json, emit-stack-knowledge-events) sem mudar comportamento observable em projeto single-stack | 1.5h | — (paraleliza com fase-02 após fase-01) |
| 04 | fase-04-detector-rails-regression.md | Regression test cobrindo fallback Sinatra (Gemfile sem `gem 'rails'` → `primary: null`) + Rails legado (`gem 'rails', '~> 7.0'` ainda classifica como rails) sobre regex existente em `detect-stack.ts:72`, ajustado para novo contrato D22 | 1h | fase-03 |
| 05 | fase-05-piloto-rails-conventions-and-magic.md | `docs/knowledge/rails/atoms/rails-conventions-and-magic.md` (T1 transversal — CoC, DRY, Zeitwerk, ActiveSupport) com frontmatter completo + corpo ≤200 linhas; INDEX.md skeleton mínimo listando apenas o piloto; prompt do extrator com anti-drift clause literal | 2.5h | fase-01, fase-02 |
| 06 | fase-06-verifier-refined-e-e2e-tracer.md | Subagente verifier roda protocolo refined sobre piloto (≥80% claims rastreáveis em `Padrões sênior` + `Anti-padrões` + `Critérios de decisão`); E2E `tests/e2e/stack-knowledge-rails-tracer.test.ts` prova CA-02 (≤200ms — D24) + CA-09 + CA-11 | 1.5-2h | fase-03, fase-04, fase-05 |

---

## Grafo de Fases

```
fase-01 (dedup audit)
    |
    +-------------------+-------------------+
    |                   |                   |
    v                   v                   v
fase-02 (schema)    fase-03 (multi-stack    fase-05 (piloto)
    |               contract D22)           ^
    |                   |                   | (depende tambem
    +-------------------+                   |  de fase-02)
                        |                   |
                        v                   |
                fase-04 (detector           |
                regression sobre D22)       |
                        |                   |
                        +---------+---------+
                                  |
                                  v
                fase-06 (verifier refined + E2E tracer)
```

**Paralelismo possivel:** após fase-01, fase-02 + fase-03 + fase-05 podem ser estudadas em paralelo (não compartilham arquivos — fase-02 toca validator/test fixtures, fase-03 refatora `detect-stack.ts` + call sites, fase-05 é markdown puro). Em ordem de merge: fase-02 e fase-03 antes de fase-04 (que precisa do novo contrato D22) e fase-05 (que precisa do schema). Fase-06 fecha o ciclo e exige fase-04 (regression test verde) + fase-05 (piloto escrito) + fase-03 (contrato multi-stack pronto — E2E usa `result.primary`).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

Fases 01 e 05 são **content-only** (markdown puro — dedup report + atom piloto): usam checklist de validação de conteúdo + verifier subagente em vez de RED→GREEN. Fases 02, 03, 04 e 06 seguem TDD rigoroso com `bun:test` (cada uma tem cycle explícito na seção Verificação).

**Tracer Bullet deste plano:** fase-06 — o E2E é literalmente o tracer fechando o ciclo (matrix Rails populada → detector D22 → init → projeto recebe knowledge). Se fase-06 verde, arquitetura validada e Planos 02/03 podem escalar com segurança.

---

## Gotchas Conhecidos

Indexados aqui; referenciados nas fases.

- **G1 — Detector Rails JÁ tem a regex, MAS o contrato muda em fase-03:** `skills/init/lib/detect-stack.ts:72` contém `if (/^\s*gem\s+["']rails["']/m.test(gemfile))`. RF3 do PRD passa de "implementar" para "validar via regression test sobre novo contrato D22". Antes de tocar em código, fase-04 deve `Read` o arquivo e CONFIRMAR a regex; fase-03 refatora o **shape de retorno** sem mexer no probe. NÃO reescrever o probe — apenas adicionar test cases que não existam ainda em `detect-stack.test.ts`, ajustando assertions para `result.primary` (não `result.id`).

- **G2 — São 6 pares duplicados, não 8:** CONTEXT D3 menciona "8 pares" mas inspeção real de `claude-code/knowledge/Rails/` mostra 6: `rails-code-review`/`copy`, `rails-migration-safety`/`copy`, `rails-security-review`/`v2`, `rails-stack-conventions`/`v2`, `rails-tdd-slices`/`copy`, `rails-upgrade`/`copy`. Note que dois pares usam sufixo `v2` (não `copy`) — subagente do dedup deve listar todos os pares reais via `ls` no início de fase-01 antes de prosseguir. Não confiar na contagem do CONTEXT.

- **G3 — Anti-drift e verifier refined são REGRESSION-TEST (D12), não guideline:** Plano 04 do Node teve rework loop por não ter aplicado as duas lessons como cláusulas obrigatórias nos prompts. Em fase-05 (extrator) e fase-06 (verifier), os prompts DEVEM incluir os textos das duas compound lessons **literalmente coladas** (não parafraseadas, não resumidas). Se subagente entrega átomo sem o gate, blocker: rework do prompt antes de re-rodar.

- **G4 — Schema `rails_versions` é array de ranges semver-style (D18):** NÃO usar string simples (`'>=7.1'`) nem array de versões literais (`['7.1', '7.2', '8.0']`). Formato correto suporta intervalos compostos: `['>=7.1']` (todos a partir de 7.1), `['>=8.0']` (apenas Rails 8+), `['>=7.1', '<8.0']` (exclusivamente 7.x). Validator em fase-02 aceita o campo OPCIONAL e valida que cada elemento bate em `/^(>=|<=|>|<|=|~>)\s*\d+\.\d+(\.\d+)?$/` (regex permissiva mas formato consistente).

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->
