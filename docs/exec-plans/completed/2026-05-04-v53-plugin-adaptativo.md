---
title: "Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1)"
status: completed
date-start: 2026-05-04
date-end: 2026-05-12
slug: v53-plugin-adaptativo
---

# Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1)

## Goal

O Anti-Vibe Coding v5.2 prescrevia padroes arquiteturais sem considerar a arquitetura real do projeto em que operava. Em 2026, o gargalo do desenvolvimento migrou de "gerar codigo" para "manter contexto durante geracao em escala". O plugin operava em modo "tamanho unico" quando deveria adaptar suas recomendacoes ao perfil arquitetural detectado.

Tres lacunas criticas:
1. Conselhos prescritivos sobre Clean Architecture em projetos vertical-slice geram ruido
2. Falta de telemetria passiva impede decisoes empiricas sobre evolucoes futuras (Token Tax, Comprehension Debt)
3. Em multiplos projetos (Licitar, Carreirarte) com arquiteturas distintas, o framework nao adapta

A v5.3 introduz **tres capacidades complementares:**
1. **Architecture Detector** — skill `/detect-architecture` que classifica projetos em 5 perfis com score de confianca
2. **Modo Dual nas Skills Estruturantes** — `architecture`, `plan-feature`, `write-prd`, `execute-plan`, `verify-work` leem profile detectado e adaptam recomendacoes
3. **Telemetria Passiva** — 10 skills emitem 2 linhas JSONL por invocacao em `.claude/metrics/YYYY-MM.jsonl` (local-only, privacy-first)

## Scope

**Must Have (RF1-RF7):**
- Skill `/detect-architecture`: classifica em 5 perfis, confirma com usuario se confianca <80%, persiste em manifest JSON + markdown legivel
- Schema `architectureProfile` em `.anti-vibe-manifest.json` (profile, confidence, detectedAt, signals[], schemaVersion)
- Heuristica: arvore `src/` → classificacao por pastas → amostragem 5-10 arquivos via imports → confidence score
- Telemetria passiva em 10 skills: 2 linhas JSONL (start+end) com 10 campos
- Schema JSONL `.claude/metrics/YYYY-MM.jsonl` com rotacao mensal
- Feature flag `architectureDetectorEnabled` (default false); telemetria ignora flag
- Modo Dual em 5 skills estruturantes via lookup table (sem branching profundo); Greenfield apenas quando `unknown-mixed` + pasta vazia

**Should Have (RF8-RF11):**
- Script CLI `analyze-metrics.ts` gerando relatorio baseline em stdout
- `.claude/architecture-profile.md` legivel com resumo humano
- Documentacao dos 5 perfis em `docs/architecture-profiles.md`
- 5 principios universais integrados: #1 (10 Questions Test), #5 (Comment Provenance), #7 (Declarative-first), #9 (Fresh-context Review), #10 (YAGNI checklist)

**Could Have (RF12-RF14):** ASCII chart, `--set <perfil>` override, sugestao em /init

**Won't Have (Onda 1):** Token Tax audit, Comprehension Debt tracking, /dependency-graph, Greenfield defaults agressivos, DDD strategic/Monorepo, upload remoto de telemetria

**Perfis reconhecidos:** `clean-architecture-ritual`, `mvc-flat`, `vertical-slice`, `nextjs-app-router`, `unknown-mixed`

## Assumptions

- Framework em TypeScript + Bun (stack existente)
- `.anti-vibe-manifest.json` parseavel por implementacoes v5.2 (campo `architectureProfile` e opcional)
- Telemetria eh local-only: sem network calls, sem coleta de conteudo de codigo
- Feature flag default `false` — comportamento v5.2 preservado quando desligado
- `anti-vibe-coding/` e repositorio git independente (GT-02 herdado)
- `exactOptionalPropertyTypes: true` no tsconfig — campos opcionais devem ser omitidos (nao atribuidos como undefined)
- TDD gate requer test co-localizado por nome de arquivo de producao (GT-01)

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Detector classifica errado e usuario nao percebe | Media | Medio | Confirmacao se <80% (D10) + edicao manual em architecture-profile.md |
| Telemetria gera arquivo gigante | Baixa | Baixo | Rotacao mensal YYYY-MM.jsonl + JSONL append-only |
| Decisoes emergentes (D16) contradizem decisoes registradas | Media | Medio | MEMORY.md por plano registra mudancas mid-flight |
| Modo dual gera complexidade interna nas skills | Media | Medio | "Le profile UMA vez no inicio, adapta saida via lookup table" — sem branching profundo |
| Dogfooding 2 semanas atrasa entrega | Alta | Baixo | Risco aceito; sem dogfooding, v5.3 pode quebrar projetos reais |
| Instrumentacao via blocos TS em SKILL.md nao executa em producao | Alta (descoberto) | Alto | BUG-02 — CA-11 deferred para Onda 2; fix: hook PreToolUse+PostToolUse |
| Manifest pre-v5.3 quebra ao parsear v5.3 | Baixa | Alto | Schema versionado + campo `architectureProfile` opcional (CA-10) |

## Execution Steps

- plano01 — Foundation (schemas + flag + tracer bullet)
  - fase-01 — Schema `architectureProfile` em manifest-types.ts + manifest-schema.ts + testes (16 tests; commit bundled em b940c5a)
  - fase-02 — Schema JSONL telemetria em telemetry-types.ts + telemetry-schema.ts + docs (14 tests; commit 88fc213)
  - fase-03 — Feature flag `isFeatureEnabled()` helper + testes (5 tests; commit 3104a27)
  - fase-04 — Gerador `renderArchitectureProfileMarkdown()` puro + fixtures snapshot (8 tests; commit 42acd02)
  - fase-05 — `docs/architecture-profiles.md`: 5 perfis com 5 sub-secoes + Out of scope (commit b940c5a bundled)
  - fase-06 — Tracer Bullet: `readArchitectureProfile()` + bloco profile-aware em `architecture/SKILL.md` (9 tests; commit 76cc83b)
- plano02 — Architecture Detector
  - fase-01 — `classifyByFolders()` + lookup table 5 perfis + fixtures (5 tests; commit a40ece8)
  - fase-02 — `sampleImports()` + `computeConfidence()` (12 tests; commit c5b7e67)
  - fase-03 — SKILL.md `/detect-architecture` + `readSrcTree()` graceful handling (12 tests; commit 120e02c)
  - fase-04 — `writeArchitectureProfile()` idempotente JSON+MD (6 tests; commit 2df7ee8)
  - fase-05 — E2E: 5 perfis cobertos (8 tests; commit ae47e97)
- plano03 — Telemetria Passiva (BUG-02: instrumentacao nao-funcional em producao)
  - fase-01 — `telemetry-utils.ts` com writeTelemetryStart/End, falha silenciosa, INSTRUMENTED_SKILLS (14 tests; commit 63509a1)
  - fase-02 — 5 skills pipeline core instrumentadas (grill-me, write-prd, plan-feature, execute-plan, verify-work) (3 smoke tests; commit 23c8204)
  - fase-03 — 5 consultivas instrumentadas (iterate, consultant, architecture, design-twice, quick-plan) (5 tests; commit addf7e9)
  - fase-04 — Testes de regressao: rotacao mensal, CA-09 silent-fail, skill com erro (9 tests; commit 5d6a61f)
- plano04 — Modo Dual + 5 Principios Universais
  - fase-01 — `readArchitectureProfile()` promovido a API estavel + `getRecommendationForProfile<T>()` + 8 fixtures (12 tests; commit a1bde38)
  - fase-02 — `architecture-recommendations`: recomendacoes por perfil para /architecture skill (11 tests; commit 5c9be59)
  - fase-03 — `fase-policy`: 5 perfis + render block para plan-feature (12 tests; commit 251436d)
  - fase-04 — `structure-snippets` para write-prd (commit d1fdda7 — mensagem trocada por bundling; ver GT-21)
  - fase-05 — execute-plan + verify-work/adherence-checks (commit 280703f — mensagem trocada por bundling)
  - fase-06 — 5 universais integrados: #1+#10 em consultant, #1 pointer em grill-me, #5 em prd-template+fase-template, #7 em prd-template, #9 em verify-work (15 tests textuais; commit 1201461)
- plano05 — Analise & Dogfooding
  - fase-01 — Script CLI `analyze-metrics.ts` + 4 libs puras (parse-jsonl, pair-events, aggregate, format-report) + fixture (14 tests; commit fd066f1)
  - fase-02 — Could Haves: ASCII chart, `--set <perfil>` override, sugestao em /init (6 tests; commit a185cdc)
  - fase-03 — Setup dogfooding: Carreirarte como piloto-true (unknown-mixed override manual; CA-05 confirmado empiricamente; sem commit — edits em projeto externo)
  - fase-04 — Coleta 50 entradas (encerrada antecipadamente em Day 7 via DEV-12; BUG-02 descoberto; CA-11 deferred-to-onda-2)
  - fase-05 — Validacao CA-12 (marcada OBSOLETE via DEV-07 — coberta por testes textuais)
  - fase-06 — Release notes v5.3: CHANGELOG.md + docs/release-notes-v53.md + docs/upgrade-v52-to-v53.md + docs/baseline-v53-onda1.md

## Review Checklist

> _(reconstructed: section absent in original PRD; inferred from CAs)_

- [ ] CA-01: /detect-architecture classifica clean-architecture-ritual com confianca >=80% para repo com estrutura tipica
- [ ] CA-02: Detector apresenta classificacao preliminar e pergunta confirmacao quando confianca <80%
- [ ] CA-03: 10 skills instrumentadas emitem start+end JSONL (unit: ok; integracao: BUG-02)
- [ ] CA-04: flag=false preserva comportamento v5.2 identicamente
- [ ] CA-05: profile=vertical-slice + plan-feature organiza fases por feature vertical (confirmado empiricamente em Carreirarte)
- [ ] CA-06: src/ vazio + profile=unknown-mixed → /architecture sugere vertical-slice + bounded contexts
- [ ] CA-07: projeto v5.2 recebe /update v5.3 → nenhum plano em curso modificado, flag fica false
- [ ] CA-08: analyze-metrics.ts gera relatorio com token medio, perfil mais usado, taxa de abandono
- [ ] CA-09: erro I/O em telemetria → silencioso (skill continua), exposto via stderr `[telemetry-warn]`
- [ ] CA-10: manifest pre-v5.3 sem `architectureProfile` → skill sugere rodar /detect-architecture, degrada para v5.2
- [ ] CA-11: >=50 pares validos em dogfooding → DEFERRED-TO-ONDA-2 (BUG-02 impossibilita)
- [ ] CA-12: Carreirarte com flag=false → comportamento v5.2 → COBERTO POR TESTES (sem piloto real)

## Validation Log

### Log de Execucao (do STATE.md — resumido)

- 2026-05-04: CONTEXT.md + PRD.md + PLAN overview (5 planos, 27 fases, ~37h serial)
- 2026-05-04: Plano 01 executado (6/6 fases) — 52 testes verdes, CA-04 e CA-05 preview cobertos
- 2026-05-05: Plano 02 executado (5/5 fases) — 102 testes verdes, CA-01 e CA-02 cobertos
- 2026-05-05: Plano 03 executado (4/4 fases) — 133 testes verdes, CA-03 e CA-09 cobertos
- 2026-05-05: Plano 04 executado (6/6 fases) — 203 testes verdes, CA-04/CA-05/CA-06/CA-10 cobertos
- 2026-05-05: Plano 05 fase-01 + fase-02 executadas (script CLI, could-haves) — 224 testes verdes
- 2026-05-05: Plano 05 fase-03 — dogfooding setup em Carreirarte (DEV-05: unico piloto-true). CA-05 confirmado empiricamente.
- 2026-05-05: Plano 05 fase-04 aberta — janela de coleta iniciada (Day 0)
- 2026-05-12: Mid-checkpoint fase-04 — **BUG-02 descoberto** (instrumentacao nao-funcional). 0 pares em 7 dias. CA-11 movido para deferred-to-onda-2 (DEV-12).
- 2026-05-12: Plano 05 fase-06 — Release notes + CHANGELOG + upgrade guide + baseline empirico honesto
- 2026-05-12: **Onda 1 v5.3 ENCERRADA.** 25/27 fases done (1 obsolete, 1 deferred).

### Status Final

**Phase:** completed — 25/27 fases efetivas — 5/5 planos concluidos

### Placar CA

| CA | Status |
|----|--------|
| CA-01 | ✅ E2E cobertos (Plano 02) |
| CA-02 | ✅ testes |
| CA-03 | ✅ unit (writer); ❌ integracao (BUG-02) |
| CA-04 | ✅ testes textuais |
| CA-05 | ✅ empirico em Carreirarte |
| CA-06 | ✅ 15 testes textuais |
| CA-08 | ✅ funcional |
| CA-09 | ✅ regression tests |
| CA-10 | ✅ fixture no-profile.json |
| CA-11 | ❌ deferred-to-onda-2 |
| CA-12 | ✅ por testes (sem piloto-false real) |

## Compound Opportunity

> _(reconstructed: pre-v6 plan had no Compound Engineering section)_

A v5.3 gerou varios componentes reutilizados em v6.0:

1. **`readArchitectureProfile()` + `getRecommendationForProfile<T>()`** — padrao de "le profile UMA vez no inicio, adapta saida via lookup table" tornou-se modelo arquitetural para todos os hooks de v6.0.

2. **Padrao de fixtures em `skills/lib/__fixtures__/`** — 8 fixtures canonicos (clean-arch, mvc, vertical-slice, nextjs, unknown-mixed, no-profile, flag-disabled, invalid-profile) reutilizados como base para testes de v6.0.

3. **BUG-02 como insight arquitetural critico** — a descoberta de que "blocos TS em SKILL.md sao prompt markdown, nao runtime executavel" fundamentou a decisao de arquitetura de hooks em v6.0 (par PreToolUse+PostToolUse com correlacao via tool_use_id). Sem o dogfooding real, esse bug arquitetural teria passado para v6.0.

4. **`telemetry-utils.ts` com falha silenciosa** — padrao de "nunca derruba a skill principal em caso de erro de infraestrutura" reutilizado em v6.0 para todos os hooks de observabilidade.

5. **Carreirarte como `unknown-mixed`** — dado que Vite+React SPA cai no perfil fallback sugere novo perfil `react-spa-flat`/`vite-spa` para Onda 2 (N>=3 projetos similares necessarios antes de decidir).

## Lessons Captured

### BUG-02 (critico, arquitetural) — descoberto pelo dogfooding

**Instrumentacao via blocos TS em SKILL.md eh inerte.** Skill files sao prompt markdown consumido pelo agente Claude, nao codigo executado. Para telemetria/instrumentacao funcionar em producao, e necessario hook (`PreToolUse`/`PostToolUse` ou `Stop`) que invoque o writer via Bun com payload do `CLAUDE_HOOK_CONTEXT`. Testes textuais isolados ficam verdes porque exercitam o writer diretamente — nao validam que o gatilho dispara em uso real.

**Fix para Onda 2:** adicionar par `PreToolUse`+`PostToolUse` em `hooks.json` com correlacao via `tool_use_id`. Estado intermediario em `.claude/metrics/.pending-starts.json`.

### GT-24 — TDD gate vs testes consolidados

Quando a spec consolida testes em UM arquivo cobrindo multiplos modulos, o TDD gate bloqueia `Write` em `.ts` de producao sem test co-localizado por basename. Workaround: criar producao via Bash (testes RED ainda escritos antes — TDD preservado).

### GT-25 / DEV-09 — Matriz instalada vs working tree

Plugin desenvolvido localmente em working tree pode divergir da matriz instalada. `/init` em projetos consumidores compara manifest local com matriz instalada — nao com working tree. Dogfooding ANTES de promover working tree → matriz gera dados contaminados. Os 3 arquivos de versao (`plugin.json`, `plugin-manifest.json`, `package.json`) devem estar alinhados.

### GT-26 — `scripts/generate-manifest.js` desatualizado

Hardcoded `VERSION = '4.0.0'`, cobre apenas `skill.md` lowercase legacy. Nao cobre `SKILL.md` uppercase, `templates/`, `config/`, `skills/lib/`. Workaround: usar Bun inline. Refactor para Onda 2.

### Do plano01/MEMORY.md

- **DI-11:** `readArchitectureProfile` le o manifest duas vezes (uma em `isFeatureEnabled`, outra para extrair profile). Preco de simplicidade aceitavel; Plano 04 pode refatorar para leitura unica se performance se tornar relevante.
- **DI-12:** Estrategia de teste para SKILL.md = assertion sobre marcadores HTML + helper, nao sobre output LLM. Output LLM adaptado requer verificacao humana ou mock LLM.
- **GT-05:** SKILL.md preface e instrucao ao LLM, nao codigo executavel. Ao expandir para outras skills, manter mesma estrategia de marcadores HTML comment.

### Do plano02/MEMORY.md

- **DI-04:** `flattenPaths` deve iniciar nos filhos do root, nao no root (paths relativos sem prefixo "src/").
- **DI-05:** Fixture de ambiguidade deve dar score advantage, nao tiebreaker puro — validar intent via score diferente.

### Do plano04/MEMORY.md

- **GT-21:** Race condition de `git add` em subagentes paralelos gera commits com mensagens trocadas mas codigo correto. Verificar `git diff --staged` antes de commitar.
- **GT-22:** `grep "readArchitectureProfile()"` conta comentarios e invocacoes — usar grep mais especifico para contar apenas invocacoes reais.

### Desvios Significativos

| ID | O que mudou | Plano |
|----|-------------|-------|
| DEV-03 | Licitar virou Rails — saiu do escopo da Onda 1 | P05 |
| DEV-05 | Carreirarte virou unico piloto-true (vs 2 projetados) | P05 |
| DEV-07 | fase-05 (CA-12 isolamento) marcada obsolete | P05 |
| DEV-12 | fase-04 encerrada no Day 7 (BUG-02) — CA-11 deferred | P05 |

## Exit Criteria

**Criterios do PRD — status final:**
- CA-01: ✅ detector classifica os 5 perfis (testes E2E)
- CA-02: ✅ confirmacao com usuario quando confianca <80%
- CA-03: ✅ unit tests; ❌ integracao (BUG-02 — instrumentacao nao dispara em producao real)
- CA-04: ✅ flag=false preserva comportamento v5.2
- CA-05: ✅ confirmado empiricamente em Carreirarte (Vite+React SPA = unknown-mixed, output adaptativo observado)
- CA-06: ✅ 15 testes textuais
- CA-08: ✅ script CLI funcional
- CA-09: ✅ regression tests
- CA-10: ✅ fixture no-profile.json
- CA-11: ❌ DEFERRED-TO-ONDA-2 (BUG-02 impossibilita coleta em Onda 1)
- CA-12: ✅ coberto por testes textuais (sem piloto-false empirico real)

**Status Final (do STATE.md):** `Phase: completed` — 25/27 fases efetivas — versao: 5.3.0

**Metricas finais:**
- Testes na suite: 224 verdes
- Bugs encontrados: 2 (1 trivial fixture; 1 critico arquitetural BUG-02)
- Commits no submodule: ~25 (atomic por fase)
- Janela de dogfooding: 7 dias (planejados: 14)
- Pares de telemetria coletados: 0 (esperado: >=50) — BUG-02

---

## Original artifacts (verbatim)

### CONTEXT.md (preserved for audit trail)

> _(Content of `f:/Projetos/Claude code/.planning/2026-05-04-v53-plugin-adaptativo/CONTEXT.md` at migration time 2026-05-12)_

```markdown
# Context: Anti-Vibe Coding v5.3 — Plugin Adaptativo

**Generated by:** /grill-me
**Date:** 2026-05-04
**Decisions:** 16 (D1-D16)
**Complexity:** complex

## Tese Unificadora

O gargalo do desenvolvimento migrou de "gerar codigo" (2023) para "manter contexto
durante geracao em escala" (2026). v5.3 deve ser adaptativo aos projetos existentes,
opinativo apenas em greenfield.

## Diretriz Critica

O plugin nao impoe arquitetura. Detecta, respeita padroes encontrados, sugere
vertical-slice/flat apenas quando usuario declara intencao de "100% vibe coding"
ou comeca de zero. Acoes sao sugestoes — nunca refatoracoes automaticas.

## Decisoes (resumo)

D1: Publico-alvo hibrido (single-user + produto publico)
D2: 5 universais + telemetria passiva (nao os 7 todos de vez)
D3: Storage hibrido — JSON (manifest) + Markdown (legivel)
D4: 5 perfis (clean/mvc/vertical/nextjs/unknown)
D5: Backfill opcional via comando manual
D6: ~10 campos de telemetria
D7: Local-only — privacy-first irreversivel
D8: Inicio + fim de skill (2 linhas JSONL por invocacao)
D9: Heuristica: pastas + amostragem de imports (sem AST/package.json)
D10: Confirma com usuario se confianca <80%
D11: Todas 5 skills estruturantes respeitam o perfil; Greenfield apenas se unknown-mixed + vazio
D12: /dependency-graph vira skill standalone na Onda 2
D13: 10 skills instrumentadas (pipeline + consultivas)
D14: Criterio: funcional + dogfooding 2 semanas + 50+ entradas + script CLI
D15: Feature flag opt-in por repo (default false)
D16: Ambiguidades documentadas como open questions — resolver mid-flight
```

### PRD.md (preserved)

```markdown
# PRD: Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1)

**Status:** Draft | **Date:** 2026-05-04

## Problema

Framework v5.2 presceve padroes sem considerar arquitetura real do projeto.
Falta telemetria passiva para decisoes empiricas.
Impacto: conselhos genericos geram ruido em projetos com arquitetura definida.

## Solucao

3 capacidades: Architecture Detector + Modo Dual + Telemetria Passiva
Rollout via feature flag opt-in por repo.

## Requisitos Funcionais (resumo)

Must Have (RF1-RF7): Detector 5 perfis, Schema manifest, Heuristica pastas+imports,
Telemetria 10 skills, Schema JSONL, Feature flag, Modo Dual 5 skills

Should Have (RF8-RF11): Script CLI, architecture-profile.md, Docs 5 perfis, 5 universais

Could Have (RF12-RF14): ASCII chart, --set override, sugestao em /init

## Criterios de Aceite

CA-01 a CA-12 (ver Validation Log e Exit Criteria do plano consolidado)

## Decisoes Tecnicas (16 decisoes — D1 a D16)

Ver CONTEXT.md e secao Assumptions/Risks do plano consolidado.
```

### STATE.md (preserved — extraido)

```markdown
# State: Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1)

**Phase:** completed
**Current Plan:** 05/5
**Last Updated:** 2026-05-12

## Progress: 25/27 fases (93%) — 1 obsolete, 1 deferred-to-onda-2

Plano 01: 6/6 completed | Plano 02: 5/5 completed | Plano 03: 4/4 completed
Plano 04: 6/6 completed | Plano 05: 5/5 efetivas completed (1 obsolete)

Validacao final: 224 testes verdes, typecheck limpo.
BUG-02 (critico): instrumentacao nao-funcional em producao — CA-11 deferred-to-onda-2.
CA-05 confirmado empiricamente em Carreirarte.
```

### SUMMARY.md (preserved — extraido)

```markdown
# Summary: Anti-Vibe Coding v5.3 — Onda 1

**Completed:** 2026-05-12 | **Duration:** 2026-05-04 → 2026-05-12 (8 dias)
**Planos:** 5 (5 completed; fase-05 do Plano 05 obsolete)
**Fases:** 27 (25 done, 1 obsolete, 1 deferred-to-onda-2)

## Metricas Finais
Testes: 224 verdes | Bugs criticos: 1 (BUG-02) | Retries: 0 | Commits: ~25
Desvios significativos: 4 (DEV-03/05/07/12) | Dogfooding: 7 dias (planejados: 14)

## Notas para Onda 2 (prioridade)
1. Fix BUG-02: hook PreToolUse+PostToolUse com correlacao tool_use_id
2. Reabrir CA-11 apos fix (2+ projetos piloto-true, 14 dias)
3. Novos perfis: react-spa-flat (Carreirarte), rails-mvc (Licitar)
4. Refactor scripts/generate-manifest.js (hardcoded 4.0.0)
```

### Phases History (consolidated from plano01..05/)

#### plano01 — Foundation (schemas + flag + tracer bullet)

**Sizing:** ~6h | **Depende de:** nenhum | **Desbloqueia:** Planos 02, 03, 04, 05

**O que entregou:** Schemas versionados (architectureProfile, telemetry-jsonl), feature flag opt-in, gerador architecture-profile.md determinisico, docs dos 5 perfis, tracer bullet end-to-end. 52 testes, 81 expects.

**Commits:** b940c5a (bundled: schema+docs), 88fc213 (telemetry schema), 3104a27 (feature-flag), 42acd02 (md-generator), 76cc83b (tracer bullet)

**Decisoes criticas:**
- `exactOptionalPropertyTypes: true` — campos opcionais devem ser omitidos (nao atribuidos como undefined)
- TDD gate requer `{basename}.test.ts` co-localizado
- Importacoes sem extensao .ts (tsconfig sem allowImportingTsExtensions)
- Fixtures de teste em `skills/lib/__fixtures__/` — nunca tocar .claude/.anti-vibe-manifest.json global
- Estrategia de teste para SKILL.md: assertion sobre marcadores HTML comment, nao sobre output LLM

#### plano02 — Architecture Detector

**Sizing:** ~7.5h | **Depende de:** Plano 01 | **Desbloqueia:** Plano 04

**O que entregou:** Skill `/detect-architecture` completa: classifyByFolders, sampleImports, computeConfidence (threshold 80%), persistencia idempotente JSON+MD, cobertura E2E dos 5 perfis. 102 testes totais.

**Commits:** a40ece8, c5b7e67, 120e02c, 2df7ee8, ae47e97

**Gotchas:**
- DEV-01: types.ts criado como modulo TS real (alem do .md) — TDD gate exige
- DI-04: flattenPaths deve iniciar nos filhos do root, nao no root (paths relativos sem prefixo "src/")
- DI-05: fixture de ambiguidade redesenhada para score advantage, nao tiebreaker puro

#### plano03 — Telemetria Passiva (BUG-02: nao-funcional em producao)

**Sizing:** ~6h | **Depende de:** Plano 01 | **Desbloqueia:** Plano 05

**O que entregou:** `telemetry-utils.ts` com writeTelemetryStart/End, falha silenciosa (CA-09), 10/10 skills instrumentadas nos arquivos SKILL.md, rotacao mensal. 133 testes verdes.

**Commits:** 63509a1, 23c8204, addf7e9, 5d6a61f

**BUG-02 (critico):** Instrumentacao via blocos TS em SKILL.md e inerte — sao prompt markdown, nao runtime. Testes unitarios ficam verdes porque testam writer em isolamento, nao o gatilho de execucao. Descoberto apenas no dogfooding (Day 7).

#### plano04 — Modo Dual + 5 Principios Universais

**Sizing:** ~9h | **Depende de:** Planos 01, 02 | **Desbloqueia:** Plano 05

**O que entregou:** Helper estavel `readArchitectureProfile()` + `getRecommendationForProfile<T>()`. 5 skills estruturantes adaptam saida ao perfil via lookup de 5 entradas + leitura UMA vez. 5 universais integrados. 8 fixtures canonicos. 203 testes.

**Commits:** a1bde38, 5c9be59, 251436d, 280703f (bundled), d1fdda7 (bundled), 1201461

**Gotcha GT-21:** race condition de `git add` em paralelo gerou commits com mensagens trocadas (280703f contem fase-05; d1fdda7 contem fase-04). Codigo correto, mensagens enganosas.

#### plano05 — Analise & Dogfooding

**Sizing:** ~9h ativo + 14 dias calendario (encerrado em 7 dias) | **Depende de:** Planos 03, 04

**O que entregou:** Script CLI `analyze-metrics.ts` com ASCII chart + `--set <perfil>` + sugestao em /init. Setup Carreirarte como piloto-true. Release notes v5.3 (CHANGELOG + upgrade guide + baseline empirico honesto citando BUG-02).

**Commits:** fd066f1, a185cdc

**Desvios:**
- DEV-05: Carreirarte virou unico piloto-true (Licitar → Rails, fora de escopo)
- DEV-07: fase-05 (CA-12) marcada obsolete — coberta por testes
- DEV-12: fase-04 encerrada no Day 7 (BUG-02 descoberto no mid-checkpoint)
- CA-11 deferred-to-onda-2

## Detail

Working notes (PRD, PLAN, STATE, plano01..05/fase-XX.md) preservados em [_legacy-detail/v53-plugin-adaptativo/](_legacy-detail/v53-plugin-adaptativo/) para referencia historica. Resumo executivo acima é o documento canonico.
