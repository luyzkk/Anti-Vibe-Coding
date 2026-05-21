# Plano 04: Step 7 — Generate Populate Plans (CORE)

**Feature:** init-refactor-v7 ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~9h
**Depende de:**
- **Plano 01** — registry com 10 nomes (stub na posicao 7 — `generate-populate-plans`); `StepContext.legacy?` / `stack?` opcionais (DV-4); `ctx.stack` populado pelo Step 2 real (fase-02).
- **Plano 02** — `skills/_shared/legacy-manifest-schema.ts` (Zod `LegacyManifest` tipado, DR-5); `.claude/legacy-manifest.json` escrito no disco pelo Step 4. Step 7 le do disco (alternativa: futuramente do `ctx.legacyManifest`).
- **Plano 03** — apenas semantico/indireto: o disco precisa ter os 16 placeholders pra que o caminho `dst` do `TEMPLATE_MANIFEST` seja a "fonte da verdade" dos doc canonicos populaveis. NAO ha dependencia de runtime entre Step 5 e Step 7 — sao steps separados no registry, e o gerador le `TEMPLATE_MANIFEST` (constante TS), nao o disco.

**Desbloqueia:**
- **Plano 05** — e2e final cobre CA-01 (16 PLAN.md em `docs/exec-plans/active/`), CA-04 (Rails → `app/views`/`app/assets` no FRONTEND.md), CA-07 (10 secoes obrigatorias por PLAN.md gerado), DR-2 (abort com stack=null).

---

## O que este plano entrega

Substitui o stub do **Step 7** (`07-generate-populate-plans`) por um step real que reescreve
`skills/init/lib/populate-plan-generator.ts` (atual 569 linhas — DELETADO e SUBSTITUIDO) com
um renderer no **formato Andre** (10 secoes H2 obrigatorias por PLAN.md), **16 instrucoes
hardcoded por doc canonico** (D18 do CONTEXT — 12 baseline Andre + 4 extras AVC), e injecao
**stack-aware** dos paths nas Waves (Node `src/` vs Rails `app/views`). Apos `runInit([])`
em fixture Node greenfield, o disco contem 16 pastas `docs/exec-plans/active/{YYYY-MM-DD}-populate-{slug}/PLAN.md`
prontas para o `/execute-plan` consumir. Em projeto com stack nao reconhecida, o step
**aborta com `AbortError code=20`** (DR-2, override do RF-11) com mensagem instruindo
`/anti-vibe-coding:detect-architecture`.

> **Nota de naming:** o PRD se refere ao step como "Step 5" (numeracao original 8-steps).
> Apos DV-1 + DV-3, o pipeline final tem 10 steps e este vira **Step 7** — o arquivo eh
> `skills/init/lib/steps/07-generate-populate-plans.ts` e o `id` registrado eh
> `'generate-populate-plans'`. Todas as referencias ao "Step 5 do PRD" significam este Step 7.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Registry com 10 nomes (Step 7 stub) | Plano 01 fase-04 (`registry.ts`) | pendente (Plano 01) |
| Stub `generatePopulatePlansStep` em `steps/07-generate-populate-plans.ts` (id-only) | Plano 01 fase-04 | pendente (Plano 01) |
| `ctx.stack` populado pelo Step 2 real (`DetectedStack` com `primary: StackId \| null`) | Plano 01 fase-02 (`02-detect-legacy-and-stack.ts`) | pendente (Plano 01) |
| `ctx.legacy` populado pelo Step 2 real (opcional para enriquecer Waves) | Plano 01 fase-02 | pendente (Plano 01) |
| `StepContext.legacy?` / `stack?` opcionais (DV-4 soft typing) | Plano 01 fase-02 (`steps/types.ts`) | pendente (Plano 01) |
| `LegacyManifest` Zod schema + tipo exportado de `skills/_shared/legacy-manifest-schema.ts` | Plano 02 fase-01 | pendente (Plano 02) |
| `.claude/legacy-manifest.json` escrito pelo Step 4 (consumivel via fs OR ja-no-ctx) | Plano 02 fase-03 | pendente (Plano 02) |
| Tracer e2e verde (10 steps, exit 0) | Plano 01 fase-06 (`tests/e2e/init-v7-tracer-bullet.test.ts`) | pendente (Plano 01) |
| Contratos `Step`, `StepContext`, `StepReport`, `AbortError` | `skills/init/lib/steps/types.ts` + `steps/abort-error.ts` (existente, DT-01) | pronto |
| Lib `detect-stack.ts` (multi-stack D22, `StackId`, `DetectedStack`) | `skills/init/lib/detect-stack.ts` (existente) | pronto |
| Constante `TEMPLATE_MANIFEST` (36 entries — fonte estatica dos 16 docs populaveis) | `skills/init/lib/template-manifest.ts` (existente) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `07-generate-populate-plans.ts` REAL com summary contendo `plansGenerated`, `stackPrimary`, `legacyArtifactsFound`, `docsSkipped` (NFR Observabilidade) | Plano 05 (e2e final CA-01 — `plansGenerated === 16` em fixture Node) |
| Reescrita de `skills/init/lib/populate-plan-generator.ts` com export `renderPopulatePlan(doc, instructions, stack, legacy)` | Plano 05 (e2e final pode parsear conteudo dos 16 PLAN.md via reuso direto do renderer); testes unit deste plano |
| Tabela canonica `POPULATE_INSTRUCTIONS_BY_DOC` (16 entries, D18) exportada do generator | Plano 05 (parity test com TEMPLATE_MANIFEST); harness-validate gate futuro (R3) |
| Comportamento `stack=null → AbortError code=20` (DR-2) | Plano 05 (e2e final valida abort em fixture sem package.json/Gemfile) |
| `registry.ts` com 1 import trocado (stub → real) | Plano 05 fase-final (registry com 7+ steps reais) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-andre-template-renderer.md` | Renderer puro `renderAndrePlan(input): string` em `populate-plan-generator.ts` — emite as 10 secoes H2 obrigatorias (CA-07) a partir de input estruturado. Sem stack/instrucoes — pura formatacao | 2h | — |
| 02 | `fase-02-instructions-table-16-docs.md` | Tabela `POPULATE_INSTRUCTIONS_BY_DOC` com 16 entries (D18) + funcao `buildWavesForDoc(doc, stack)` que retorna Wave 1 (paths stack-aware Node vs Rails) e Wave 2 (secoes a escrever) por doc canonico | 2h | fase-01 (tipo `AndrePlanInput` ja existe) |
| 03 | `fase-03-generator-pipeline.md` | Funcao orquestradora `generatePopulatePlans(ctx, opts): Promise<GenerateResult>` em `populate-plan-generator.ts` — itera os 16 docs, monta input via fase-02, renderiza via fase-01, escreve em disco com slug + data | 2h | fase-01, fase-02 |
| 04 | `fase-04-step-07-and-DR-2.md` | `skills/init/lib/steps/07-generate-populate-plans.ts` REAL invocando `generatePopulatePlans`; `AbortError code=20` quando `ctx.stack.primary === null` (DR-2); registry wire (stub → real); summary multilinha com 4 metricas NFR | 1.5h | fase-03 |
| 05 | `fase-05-e2e-fixtures-and-acceptance.md` | E2E em `tests/e2e/` com 3 fixtures (Node greenfield, Rails greenfield, sem-stack) validando CA-01 (16 plans), CA-04 (Rails paths), CA-07 (10 secoes), DR-2 (abort) | 1.5h | fase-04 |

---

## Grafo de Fases

```
fase-01 (andre-template-renderer — renderer puro)
    |
    v
fase-02 (instructions-table-16-docs — buildWavesForDoc stack-aware)
    |
    v
fase-03 (generator-pipeline — orquestra renderer + tabela + writer)
    |
    v
fase-04 (step-07-real + DR-2 abort + registry wire)
    |
    v
fase-05 (e2e — CA-01 + CA-04 + CA-07 + DR-2)
```

**Paralelismo possivel:** Praticamente nenhum. fase-01 estabelece o tipo `AndrePlanInput` que
fase-02 consome; fase-03 depende de ambas; fase-04 wire-up; fase-05 valida ponta-a-ponta.
Ordem rigida e necessaria — cada fase mantem a anterior verde antes de comecar.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A — Plano 01 fase-06 e o tracer global. O e2e da fase-05
deste plano expande o tracer com Step 7 real (verifica que apos `runInit([])` o disco contem
16 pastas `{date}-populate-*` cada uma com PLAN.md valido), mas nao reexecuta o tracer global —
extende cobertura.

**Estrategia TDD por fase:**
- **fase-01:** renderer puro e o caso ideal pra TDD — input fixo + snapshot do markdown.
  RED escreve teste com plan de exemplo (3 Waves, 5 risks), GREEN emite as 10 secoes.
- **fase-02:** `buildWavesForDoc('docs/FRONTEND.md', stack='rails')` → expect arr contem
  `app/views`. RED falha porque a tabela esta vazia. GREEN preenche 16 entries.
- **fase-03:** teste integrado — chama `generatePopulatePlans` com ctx mock (stack=node),
  espera 16 PlanFile saidos. RED falha porque generator nao itera. GREEN itera.
- **fase-04:** RED: teste em `07-generate-populate-plans.test.ts` espera `AbortError code=20`
  quando `ctx.stack.primary === null`. GREEN: step lanca AbortError com mensagem instrucional.
- **fase-05:** e2e em fixture real chamando `runInit([])` em `tmp/` (Node greenfield), depois
  verifica que `docs/exec-plans/active/` contem 16 pastas com PLAN.md valido.

---

## Gotchas Conhecidos

- **G1 (568 linhas do generator atual sao APAGADAS):** `skills/init/lib/populate-plan-generator.ts`
  atual (569 linhas) e um renderer V2 do PRD `populate-plan-andre-port` que emite UM PLAN.md
  com N fases. O novo gerador emite **16 PLAN.md separados** — semantica diferente. fase-01
  COMECA o arquivo do zero (apaga conteudo). NAO tentar incrementar — o codigo atual confunde
  o objetivo. **Fazer `git rm` do arquivo antes da fase-01** ou sobrescrever inteiro via Write.
  Linhagem preservada via commits separados (cleanup ANTES da nova logica — alinha com "Limpar
  Antes de Construir" do CLAUDE.md global).

- **G2 (assets/templates/exec-plan/PLAN.md.tpl + fase.md.tpl podem ser reaproveitados?):**
  Os tpls em `skills/init/assets/templates/exec-plan/` foram desenhados pro renderer V2 (1 PLAN
  com N fases). Para o novo formato (16 PLAN.md cada um com 10 secoes hardcoded), o renderer
  e suficientemente simples para NAO precisar de tpl externo — fase-01 emite as 10 secoes
  via template literal TS. **Decisao recomendada:** deletar os 2 tpls em fase-01 (junto com
  o cleanup do generator). Documentar como DI da fase. Alternativa: mantem os tpls como
  referencia/documentacao mas o codigo nao le mais deles (orfaos).

- **G3 (paths stack-aware via expressao, nao via template):** Wave 1 dos planos deve mostrar
  paths reais por stack. NAO usar template literal `${stack === 'rails' ? 'app/views' : 'src/'}`
  dentro da string final do PLAN.md — usar `buildWavesForDoc(doc, stack)` que retorna
  `ReadonlyArray<{ path: string; note?: string }>` ja resolvido. O renderer formata. Separa
  responsabilidades: a tabela de instrucoes sabe da semantica, o renderer sabe da estrutura.

- **G4 (Plano 04 NAO popula conteudo dos placeholders Plano 03):** Importante reforco: o
  Step 5/Plano 03 cria placeholders em `docs/` (ex: `docs/SECURITY.md` vazio com title H1).
  Step 7/Plano 04 NAO toca nesses placeholders. Apenas escreve em
  `docs/exec-plans/active/{date}-populate-{slug}/PLAN.md` — um plano POR doc, na pasta de
  exec-plans, NAO no doc canonico em si. A populacao dos placeholders e feita posteriormente
  via `/anti-vibe-coding:execute-plan <path-do-plan-md>` (manual). Confundir as duas coisas
  duplica trabalho e quebra D15 do CONTEXT.

- **G5 (DR-2 override do RF-11):** O PRD RF-11 originalmente dizia que `copy-knowledge` (Step 9)
  pula gracioso quando stack desconhecida. **DR-2 do PLAN.md inverte isso para o Step 7:**
  generate-populate-plans ABORTA se `ctx.stack.primary === null` porque sem stack os Waves
  ficam invalidos (paths genericos `src/` nao representam projeto Rails real, e vice-versa).
  Mensagem do AbortError: `"Stack not detected — run /anti-vibe-coding:detect-architecture
  before /init. Detected primary: null."`. **Code=20** (novo — codes 10 e 11 ja usados pelo
  reentry-gate / detect-legacy do Plano 01).

- **G6 (data nos slugs e fixa para o run):** Os 16 PLAN.md sao escritos em
  `docs/exec-plans/active/{YYYY-MM-DD}-populate-{slug}/`. Usar **uma unica data por run**
  capturada no inicio de `generatePopulatePlans` via `new Date().toISOString().slice(0, 10)`.
  NAO chamar `Date.now()` 16 vezes — risco de virada de meia-noite a meio-run produzir slugs
  inconsistentes. Injetar via `opts.clock?: () => Date` para testes determinism. Padrao
  ja usado em `datePathSafe()` do gerador antigo (linha 50).

- **G7 (idempotencia — plans SOBRESCREVEM, placeholders NAO):** NFR Idempotencia do PRD:
  re-run preserva placeholders editados (Step 5/Plano 03 — skip-if-exists), MAS os 16 PLAN.md
  gerados SOBREESCREVEM o conteudo anterior (D10: "Plans re-gerados sobrescrevem planos
  anteriores"). Justificativa: o usuario nao edita esses PLAN.md — eles sao input pro
  /execute-plan. Re-gerar sobrescreve para refletir mudancas de stack/legacy detectadas no
  re-run. NOTA: o gate de re-entrada do Plano 01 fase-03 (DR-1) ja bloqueia re-run completo;
  esta semantica de sobrescrita so importa para testes / `--force` futuro.

- **G8 (16 slugs canonicos — tabela e fonte da verdade):** Slug derivado do `dst` do
  TEMPLATE_MANIFEST: `AGENTS.md` → `agents-md`; `docs/SECURITY.md` → `docs-security-md`;
  `.claude/CLAUDE.md` → `claude-claude-md`. Algoritmo: `dst.replaceAll('/', '-').replace(/\.md$/, '-md').toLowerCase()`.
  fase-02 define a tabela canonica e testes verificam string equality (G3 do PRD risco —
  desincronia entre TEMPLATE_MANIFEST e POPULATE_INSTRUCTIONS_BY_DOC quebra build).

- **G9 (16 docs vs 36 entries do TEMPLATE_MANIFEST):** TEMPLATE_MANIFEST tem 36 entradas
  (Plano 03 G5). Apenas 16 sao "populaveis" por LLM via plano individual (D18). Os outros 20
  sao scripts estaticos, indices vazios, COMPOUND_ENGINEERING.md (meta), README de smoke-flows,
  TODO.md (formato fixo), etc. Filtrar via `EXCLUDED_FROM_POPULATION_V2` (existente) + lista
  positiva D18 — se diferenca entre os dois conjuntos, falha de teste (parity gate inverso).

- **G10 (Zod do manifest e opcional para Step 7 — graceful):** Se `.claude/legacy-manifest.json`
  nao existir (greenfield: Step 4 sempre escreve, mas Step 7 pode rodar standalone em testes),
  o generator NAO aborta — segue com `legacy: []`. Os planos gerados sao validos sem legacy.
  Validacao Zod aplica APENAS se o arquivo existe e e malformado — nesse caso, log warning e
  continua (nao aborta). Diferente da DR-2 (stack=null aborta hard).

- **G11 (NFR Performance < 2s):** 16 docs × ~5KB de markdown × pure-TS = trivial. Sem LLM.
  Sem fetch. Apenas `readFile` do manifest (opcional) + 16 `writeFile`. Teste de perf em
  fase-05: medir tempo do step com `performance.now()`, falhar se > 2000ms.

- **G12 (test.skip nao se aplica aqui):** Diferente do Plano 01 fase-05 que skipou e2e
  obsoletos (`ca13-dry-run-parity.test.ts`), este plano CRIA testes novos — sem skip
  necessario. Mas se um teste e2e do Plano 03 ainda referenciar o gerador antigo
  (`generatePopulatePlanV2`), pode quebrar em fase-04 — auditar antes de wire-up.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
