---
title: "v6.3.1 — Adaptive Coaching: Honesty & Wire-up"
mode: full
status: active
created: 2026-05-15
---

# Exec Plan: v6.3.1 — Adaptive Coaching: Honesty & Wire-up

**PRD:** ./PRD.md
**Planos:** 2 planos, 7 fases total
**Dependência:** v6.3.0 Adaptive Coaching (completed)

## Goal

- Fechar as 4 divergências PRD↔ship identificadas no verify-work pós-merge da v6.3.0: (1) AST honesty quebrada em `capabilities-writer.ts`, (2) `tool-registry-inspector` cego em agents reais (`tools:` vs `allowed-tools:`), (3) `/parity-audit` inerte no harness (sem script + sem Bash em allowed-tools), (4) schema `parity-gaps-v1` drifted em 3 campos. Cumprir CAs atrasadas da v6.3.0 (CA-05 use crossing, CA-08 stale warning, CA-11 tolerâncias removidas).

## Scope

- **Em escopo:** AST real via `@typescript-eslint/parser`; dual-field parser com deprecation warning; `scripts/parity-audit.ts` pure-fn (padrão GT-3/DEC-4); schema v2 com shapes ricos em mcps/builtin_tools/subagents; `gap-rules.crossCapabilitiesWithUsage`; stale wire-up nas 6 skills profile-aware; migração de `/architecture` + `/detect-architecture` ao bloco `profile-aware-preface` + remoção das 2 tolerâncias em `harness-validate.ts`.
- **Fora de escopo:** preencher slots `language`/`framework` (D2 ADR-0020, reservados v6.5/v6.6); expandir profiles além de `nextjs-app-router` + `mvc-flat` (D3); substituir LLM-fallback de `mvc-flat` por AST; migração automática v1→v2 em projetos cliente (parity-gaps.json é gitignored); remover schema v1 nesta versão (deprecação apenas, remoção em v6.4).

## Assumptions

- Pasta `docs/exec-plans/active/2026-05-15-v6.3.1-coaching-honesty/` é PASTA_ATIVA fixa para todos artefatos
- v6.3.0 SUMMARY.md em `docs/exec-plans/completed/2026-05-14-v6.3.0-adaptive-coaching/SUMMARY.md` é fonte de verdade dos 4 defeitos
- `scripts/preface-simulate.ts` (Plano 05 fase-03 da v6.3.0) é o template arquitetural pure-fn para `scripts/parity-audit.ts` — DEC-4 já validada
- Convenção Claude Code canônica: agents=`tools:`, skills=`allowed-tools:` (referência: `.claude/prd-v5/11-new-agents.md:31`)
- `@typescript-eslint/parser` ^7.0.0 compatível com TS 5.4 (devDep atual)
- `parity-gaps.json` é gitignored (D8 da v6.3.0) — sem consumidor externo persistido, bump v1→v2 é livre
- `skills/lib/stale-detector.ts` existe — fase 06 é wire-up only, sem implementação nova

## Risks

- AST parser não cobre edge cases (re-exports `export {GET} from './x'`, JSX inline em .tsx) — Médio. Mitigação: testes RED por caso; não-cobertos vão para `coverage_gaps`.
- Deprecation warning poluindo stderr em projetos com muitos agents legacy — Baixo. Mitigação: cache Set, 1× por agent.
- Schema v2 quebrar projetos com parity-gaps.json v1 persistido manualmente — Muito baixo (gitignored). Migration note no header v2.
- AST traversal lento em projetos >200 route.ts — Baixo. Benchmark em fase-01; cache não necessário em v6.3.1 (regen manual via `/init --refresh`).
- CA-11 (migrar /architecture + /detect-architecture) maior que estimado — Médio. Could Have, pushable para v6.3.2; tolerâncias inofensivas até migração final.
- `@typescript-eslint/parser` ^7.0.0 quebrar compat TS 5.4 — Médio. Pinar versão; smoke typecheck na fase-01.
- Plano 02 (Should/Could) pulado por prazo — Baixo. Plano 01 (Must) já entrega valor verificado.

## Execution Steps

### Plano 01 — Honesty & Wire-up Core (Must Have) — ~7-8h

> Fecha os 4 defeitos críticos PRD↔ship verificados em fresh-context. Independente.

| Fase | Entregável | RED→GREEN | Sizing |
|---|---|---|---|
| 01 | AST real (`@typescript-eslint/parser`) em `capabilities-writer.ts:discoverNextjsAppRouterCapabilities` (RF-MH-01) | 3 cases: `function GET`, `async function GET`, `const GET = async () =>` | 2h |
| 02 | Dual-field parser + deprecation warning em `tool-registry-inspector.ts:readSubagents` (RF-MH-02) | 2 cases: `tools:` canônico; `allowed-tools:` legacy com warning único | 1.5h |
| 03 | `scripts/parity-audit.ts` pure-fn + entry `package.json` + SKILL.md ganha `Bash` em allowed-tools (RF-MH-03) | 2 cases: happy-path (manifest present); partial (manifest missing) | 2h |
| 04 | Schema v2 (`parity-gaps-v2.schema.json`) + `parity-gaps-writer.ts` migração + v1 deprecated (RF-MH-04) | 2 cases: writer output valida v2; v1 fixture marcada deprecated | 2h |

**Tracer Bullet:** fase-01. Prova RF-MH-02 do PRD original — promessa "AST-first" cumprida end-to-end com `source: 'ast', confidence: 1.0` honesto.

**Gate Plano 01:** `bun run typecheck` + `bun run harness:validate` + `bun run test` (0 regressão nas 6 skills v6.3.0: security/api-design/system-design/design-patterns/decision-registry/lessons-learned).

### Plano 02 — Use Crossing & Tolerance Cleanup (Should/Could) — ~3-4h

> Cumprimentos atrasados de CAs da v6.3.0. Depende de Plano 01 (snapshot rico necessário para CA-05).

| Fase | Entregável | RED→GREEN | Sizing |
|---|---|---|---|
| 05 | `gap-rules.crossCapabilitiesWithUsage(capabilities, projectRoot)` — Grep imports/rotas (RF-SH-01, CA-05) | 2 cases: capability usada (no gap); declared-not-used (gap severity:nice) | 1.5h |
| 06 | Wire-up `isStale(capabilities.generated_at)` nas 6 skills profile-aware (RF-SH-02, CA-08) | 1 case: capabilities >24h → warning stderr não-bloqueante | 1h |
| 07 | Migrar `/architecture` + `/detect-architecture` ao `<!-- profile-aware-preface:start -->` (`readPrefaceContext`) + remover 2 tolerâncias em `scripts/harness-validate.ts:618-636` (RF-CH-01, CA-11) | 1 case: `harness:validate` passa sem tolerâncias | 1.5h |

**Gate Plano 02:** `harness:validate` OK SEM as 2 tolerâncias + entrada `[6.3.1]` em CHANGELOG + addendum em ADR-0020 (ou ADR-0021 novo).

### Grafo de Dependências

```
Plano 01 (Must — bloqueante)
    │
    ▼
Plano 02 (Should/Could — pushable v6.3.2)
```

**Paralelismo:** Plano 02 fase-07 (CA-11) é o único cumprimento que NÃO depende de Plano 01; poderia ser pulado em paralelo se necessário. Fases 05-06 dependem de schema v2 (Plano 01 fase-04) para shapes ricos.

### Decisões do PRD Aplicadas

| Decisão (PRD) | Onde se aplica |
|---|---|
| D1 — AST real com `@typescript-eslint/parser`, enum `'ast' \| 'llm'` intacto | Plano 01 fase-01 |
| D2 — Dual-read com precedência `tools:` + deprecation warning 1× por agent | Plano 01 fase-02 |
| D3 — `scripts/parity-audit.ts` pure-fn (padrão GT-3/DEC-4 da v6.3.0) | Plano 01 fase-03 |
| D4 — Bump v1→v2 com shape rico em 3 campos | Plano 01 fase-04 |
| D5 — v1 schema deprecated em v6.3.1, remover em v6.4 | Plano 01 fase-04 |
| D6 — 2 planos × 3-4 fases (verify-work gate entre Must e Should/Could) | Estrutura global |

## Review Checklist

- [ ] CA-01: `app/api/foo/route.ts` com `export async function GET(){}` → capability `source:'ast', confidence:1.0`, `handler` com linha AST
- [ ] CA-02: `export const POST = async () => {}` (arrow) → detectada com `source:'ast'` (regression positiva — regex original missava)
- [ ] CA-03: agent com `tools: Read, Grep, Glob` → `allowed_tools === ['Read','Grep','Glob']`
- [ ] CA-04: agent com `allowed-tools: Read` → `allowed_tools === ['Read']` + stderr 1 linha `[deprecation]`
- [ ] CA-05: `bun run parity:audit` com manifest válido → exit 0 + `parity-gaps.json` válido v2
- [ ] CA-06: `parity-gaps.json` produzido pelo writer valida contra schema v2 nos 3 campos drifted
- [ ] CA-07: projeto SEM manifest → exit 0 + `tool_registry_snapshot.source:'partial'` + warning
- [ ] CA-08: capability sem referência grep-able → gap `severity:'nice'` + `suggestion: "declared but not referenced"`
- [ ] CA-09: `capabilities.json` com `generated_at` há 25h → 6 skills profile-aware emitem warning stderr
- [ ] CA-10: `/architecture` + `/detect-architecture` migrados → `harness:validate` passa sem tolerâncias `:618-636`
- [ ] CA-11 (regression v6.3.0): `bun run test` mantém 0 regressões nas 6 skills profile-aware
- [ ] CA-12 (regression v6.3.0 CA-09): `readPrefaceContext` sem manifest → `{ profile: null, language: null, framework: null, confidence: null }`
- [ ] CA-13 (regression schema): fixtures v1 antigas marcadas deprecated, não breaking

## Validation Log

<!-- preencher durante execucao: comando + resultado -->

## Compound Opportunity

<!-- preencher ao /iterate: o que merece virar compound note? -->

Candidatos prováveis: AST migration recipe (regex → @typescript-eslint/parser), schema version bump checklist (gitignored artifacts), dual-field deprecation pattern (precedência canônica + warning único cached).

## Lessons Captured

<!-- preencher ao /iterate: links para docs/compound/ -->

## Exit Criteria

- [ ] `bun run typecheck` limpo
- [ ] `bun run harness:validate` OK (com tolerâncias removidas após Plano 02 fase-07)
- [ ] `bun run test` 0 regressão nas 6 skills v6.3.0
- [ ] Suites adicionadas: AST writer (≥3), dual-field parser (≥2), parity-audit script (≥2), schema v2 (≥2), gap-rules use crossing (≥2), stale wire-up (≥1), tolerance removal
- [ ] `CHANGELOG.md` ganha `[6.3.1]` referenciando 7 items + 4 decisões
- [ ] v6.3.0 `SUMMARY.md` ganha nota de rodapé linkando esta pasta
- [ ] ADR-0020 addendum "v6.3.1 — AST honored, dual-field tolerance, schema v2" (ou ADR-0021)
- [ ] Compound note em `docs/compound/` se lição emergir

<!-- Gerado por /plan-feature em 2026-05-15 -->
