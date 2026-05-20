# Plano 02: MH-2 PLAN.md / fase.md templates estilo Andre

**Feature:** populate-plan-andre-port ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~6h
**Depende de:** Plano 01 (lista canonica + EXCLUDED reduzido + parity test esqueleto)
**Desbloqueia:** Plano 05 (fase-01 estende o parity test com golden snapshot baseado nestes tpls)

---

## O que este plano entrega

Templates estaticos `.tpl` em `skills/init/assets/templates/exec-plan/` para o PLAN.md root (11
secoes obrigatorias = 10 do Andre + Observability) e cada fase, alem do renderer de
`populate-plan-generator.ts` refatorado para consumi-los via interpolacao de variaveis `{{VAR}}`.
Step 91 continua PURO (zero LLM) — apenas FS read + replace.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status apos Plano 01 |
|-------|-------------|----------------------|
| `EXCLUDED_FROM_POPULATION_V2` reduzido (so `docs/COMPOUND_ENGINEERING.md`) | Plano 01 fase-01 | pronto |
| `CanonicalDoc` estendido com `'docs/PRODUCT_SENSE.md'` e `'README.md'` | Plano 01 fase-01 | pronto |
| `TEMPLATE_MANIFEST` com entries para `ARCHITECTURE.md`, `AGENTS.md`, `.claude/CLAUDE.md` | Plano 01 fase-01 | pronto |
| `EXCLUDED_FROM_POPULATION_V2` exportado (consumivel por testes) | Plano 01 fase-02 | pronto |
| `tests/e2e/populate-plan-parity.test.ts` (esqueleto + 2 asserts MH-1) | Plano 01 fase-02 | pronto |
| `EXEC_PLAN_SECTIONS_FULL` exportado em `skills/lib/exec-plan-sections.ts` (10 nomes) | feature anterior | pronto |
| `TEMPLATES_ROOT` em `skills/init/lib/template-manifest.ts:90` | feature anterior | pronto |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| `skills/init/assets/templates/exec-plan/PLAN.md.tpl` (11 secoes + 3 opcionais) | Plano 05 fase-01 (golden snapshot do PLAN.md gerado) |
| `skills/init/assets/templates/exec-plan/fase.md.tpl` (4 sub-blocos por fase) | Plano 05 fase-01 (golden snapshot por fase) |
| `renderPlanIndex`/`renderPhase` lendo tpl (async) | Step 91 (ja chama `generatePopulatePlanV2` — contrato externo nao muda) |
| 2 sub-asserts novos em `tests/e2e/populate-plan-parity.test.ts` (11 obrigatorias + 3 opcionais marcadas) | Plano 05 fase-01 (estende com snapshot diff) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-plan-md-tpl.md | `skills/init/assets/templates/exec-plan/PLAN.md.tpl` com 11 obrigatorias + 3 opcionais como `<!-- opcional -->` | 1.5h | — |
| 02 | fase-02-fase-md-tpl.md | `skills/init/assets/templates/exec-plan/fase.md.tpl` com 4 sub-blocos como marcadores | 1h | — |
| 03 | fase-03-refatorar-renderer.md | `renderPlanIndex`/`renderPhase` async, le tpl, faz `applyVars` — testes existentes adaptados | 2h | fase-01, fase-02 |
| 04 | fase-04-parity-assert-secoes.md | 2 sub-asserts em `populate-plan-parity.test.ts`: 11 obrigatorias + 3 opcionais marcadas (CA-03) | 1.5h | fase-03 |

---

## Grafo de Fases

```
fase-01 (PLAN.md.tpl)   fase-02 (fase.md.tpl)
        |                       |
        +---------- + ----------+
                    |
                    v
        fase-03 (refatorar-renderer)
                    |
                    v
        fase-04 (parity-assert-secoes)
```

**Paralelismo possivel:** fase-01 e fase-02 sao independentes (arquivos disjuntos:
`PLAN.md.tpl` vs `fase.md.tpl`). fase-03 entra apos ambas. fase-04 entra apos fase-03 (precisa
do renderer ja consumindo o tpl para o assert valer).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

Por fase:

- **fase-01:** sem teste RED isolado. Tpl estatico — validacao acontece na integracao via fase-04
  do mesmo plano. Anotacao: `RED/GREEN: N/A — tpl estatico, validado por integracao em fase-04`.
- **fase-02:** idem fase-01. Tpl estatico, validado em fase-04 e indiretamente em fase-03 via
  testes do generator.
- **fase-03:** TDD reverso suave — `populate-plan-generator.test.ts` ja existe e cobre o
  comportamento atual. A refatoracao pode quebrar 1-2 expectations que checam strings hardcoded
  (ex: "Glossario", "Como executar"). Atualizar essas expectations e manter suite verde define
  GREEN.
- **fase-04:** RED puro. Adicionar 2 testes ao parity. Se a fase-03 nao tiver mergeado ainda, o
  teste falha com mensagem clara apontando secoes ausentes (validar a transicao RED→GREEN no
  commit ou em pull-request review).

**Tracer Bullet deste plano:** N/A — Tracer Bullet global da feature ja foi Plano 01 (fase-01 +
fase-02). Plano 02 entra na coluna "Aderencia ao Andre".

---

## Gotchas Conhecidos

- **G1 (`TEMPLATES_ROOT` ja existe):** `skills/init/lib/template-manifest.ts:90` exporta
  `TEMPLATES_ROOT = path.join(import.meta.dir, '..', 'assets', 'templates')`. NAO duplicar a
  constante em `populate-plan-generator.ts`. Criar variavel local `TPL_DIR =
  path.join(TEMPLATES_ROOT, 'exec-plan')` ou equivalente; documentar com Comment Provenance.
- **G2 (Step 91 PURO — D11 do PRD):** o renderer le `.tpl` via `fs.readFile` e faz `replaceAll`.
  ZERO chamada de LLM. Nao introduzir prompt building, embeddings, agente, etc. nesta camada — o
  conteudo dos blocos LLM (`{{INSTRUCAO_LLM_BLOCK}}`) e string pre-renderizada pelos helpers
  existentes (`renderLLMInstructionBlock`).
- **G3 (10 base = `EXEC_PLAN_SECTIONS_FULL` — evitar drift):** o tpl deve listar as 10 primeiras
  secoes na ordem EXATA do array `EXEC_PLAN_SECTIONS_FULL` (`skills/lib/exec-plan-sections.ts`).
  Em fase-03, o helper deve ler o tpl e (em modo debug) verificar essa ordem; em fase-04 o teste
  E2E valida case-sensitive. Se a lista do Andre mudar, atualizar o array primeiro — nunca o tpl
  isolado.
- **G4 (3 opcionais sem H2 vazio — CA-03):** Follow-up Plans / Final Report / Pre-GO ficam no
  tpl como `<!-- opcional: NOME — descricao -->`, NAO como `## NOME` com corpo vazio. O parity
  test (fase-04) rejeita H2 sem marcacao de comentario.
- **G5 (`{{VAR}}` escape):** mustache-style. Se algum texto literal precisar conter `{{` ou
  `}}` (improvavel em PLAN.md), documentar no topo do tpl. `applyVars` usa `replaceAll(`{{KEY}}`,
  value)` — sem `}` extras nao colide.
- **G6 (async cascade):** tornar `renderPlanIndex`/`renderPhase` async (precisam ler tpl)
  propaga `await` para o unico caller `generatePopulatePlanV2` (ja async). Sem impacto em
  callers externos — assinatura de `generatePopulatePlanV2` permanece igual.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
