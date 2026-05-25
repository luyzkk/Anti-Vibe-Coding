# Plan: Compound Engineering Skill Port (Opção C — Híbrida)

**PRD:** ./PRD.md
**Context:** ./CONTEXT.md
**Planos:** 3 planos, 12 fases total
**Created:** 2026-05-23

---

## Goal

Portar a skill `compound-engineering` do André Prado para o plugin Anti-Vibe-Coding como skill user-invocable independente, mantendo `init` como dono do scaffold greenfield (consumidor via `getCompoundManifest()`). Resolver bug de schema-mismatch em `compound/README.md.tpl` (M1), aplicar os 3 patches do André (P1/P2/P3) e adicionar decision gate invocável como ritual pós-feature.

## Scope

**In scope:** 4 subcomandos (`install | check | gate | migrate`), `git mv` de 9 templates + 2 libs canônicas, fix de schema, patches AGENTS.md/new-plan.tpl, 3 regras `--strict`, completion signal.

**Out of scope:** refactor de `lessons-learned`, migração de templates não-compound do init (SECURITY/RELIABILITY/CODE_STYLE), enum fechado para `category`, hash-match sweep, reescrita automática de notas brownfield. Ver `PRD.md > Out of Scope` (WH-01..WH-07).

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Fundação + Bug Fix | 3 | ~3h | — |
| 02 | Reestruturação Física + Goldens | 3 | ~5h | Plano 01 |
| 03 | Subcomandos + Patches | 6 | ~9h | Plano 02 |

**Total:** 12 fases, ~17h.

---

## Grafo de Dependencias

```
Plano 01 (Fundação + Bug Fix)
   │
   ▼
Plano 02 (git mv + Goldens)
   │
   ▼
Plano 03 (Subcomandos + Patches)
```

**Paralelismo possivel:** Nenhum entre planos. Dentro do Plano 03, fase-04 (`migrate`) e fase-05 (patches P1/P2) podem ir em paralelo se executados por subagentes independentes — ambas dependem apenas de fase-01 (`install`). Sequencial recomendado para reduzir contexto.

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-02-tracer-bullet-manifest-roundtrip
**Descricao:** `init` lê `getCompoundManifest()` da skill nova `compound-engineering`, manifest retorna paths AINDA em `skills/init/assets/templates/`. Prova end-to-end: (a) skill nova existe e expõe API pura, (b) cross-skill import funciona em runtime, (c) init consegue substituir hardcode por função pura. Zero `git mv`, zero risco a goldens — o slice mais fino possível que valida a arquitetura D7/D21.

---

## Resumo por Plano

### Plano 01: Fundação + Bug Fix

> Cria infraestrutura mínima da skill compound-engineering (stub + manifest) sem mexer em paths físicos. Inclui Tracer Bullet (manifest roundtrip via init) e o bug fix MH-01 isolado que pode ir pra produção sozinho.

Fases:
- **fase-01-skill-stub-e-manifest**: cria `skills/compound-engineering/SKILL.md` (user-invocable, telemetria copiada literal de `lessons-learned/SKILL.md` por R10), `lib/manifest.ts` com `getCompoundManifest(): Array<{src, dst}>` retornando os 10 paths atuais (D7, D21). Testes unitários da função pura.
- **fase-02-tracer-bullet-manifest-roundtrip**: refatora `skills/init/lib/template-manifest.ts` para consumir os 10 entries compound via `getCompoundManifest()` (mantém ordem, paths idênticos). Adiciona test que prova roundtrip. Goldens E2E permanecem verdes (CA-03).
- **fase-03-fix-schema-readme**: corrige `skills/init/assets/templates/docs/compound/README.md.tpl` substituindo bloco de exemplo `date/author/decision` por `title/category/tags/created` (D3, MH-01, CA-01). Commit isolado deployável standalone.

### Plano 02: Reestruturação Física + Goldens

> Move arquivos físicos via `git mv` (preserva linhagem D15), substitui conteúdo dos templates pela versão literal do André + nossos fixes, atualiza imports cross-skill (D19), regenera goldens E2E (D16). Plano de **alto risco de regressão** (R2/R7) — fica isolado em PR próprio.

Fases:
- **fase-01-git-mv-templates-conteudo-andre**: `git mv` de 9 arquivos `.tpl` de `skills/init/assets/templates/` para `skills/compound-engineering/assets/`. Reescreve conteúdo pela versão literal do André (D14: descarta atual). Reescreve `compound-check.ts.tpl` com P3 inlinado. Atualiza `getCompoundManifest()` pros novos paths absolutos (D21).
- **fase-02-git-mv-libs-canonicas-imports**: `git mv` de `compound-files-collector.ts/.test.ts` e `compound-frontmatter.ts/.test.ts` de `skills/init/lib/` para `skills/compound-engineering/lib/` (D19). Atualiza imports cross-skill em `compound-writer.ts` e `compound-imported-writer.ts` (CA-15). Valida CA-17 via grep (one-way dependency).
- **fase-03-regenerar-goldens-e2e-init**: regenera `tests/e2e/__golden__/init-greenfield.tree.json` + `init-greenfield.stdout.txt` refletindo nova origem dos templates. Roda `bun test` full suite. Diff visível no PR (D16, RNF-05).

### Plano 03: Subcomandos + Patches

> Implementa a funcionalidade exposta pela skill: 4 subcomandos (install/check/gate/migrate), 2 patches idempotentes (P1/P2), completion signal e edge cases.

Fases:
- **fase-01-subcommand-install**: implementa `compound-engineering install [--force]` em `skills/compound-engineering/lib/installer.ts`. Skip-by-default (D17-A), `--force` opt-in, nunca toca `docs/compound/*.md` (CA-06, CA-04, CA-05). Stack-agnostic (D11, CA-20).
- **fase-02-subcommand-check-strict**: implementa `compound-engineering check [--strict]`. Default mantém comportamento atual (CA-09, RNF-01). `--strict` ativa 3 regras P3: AGENTS link, plan-generator sections, active-plan hygiene (CA-10).
- **fase-03-subcommand-gate-skill-tool**: implementa `compound-engineering gate` em `lib/gate.ts`. Detecta plano ativo (CA-18 zero, CA-19 multiplos). 3 perguntas via AskUserQuestion. Delega `lessons-learned add` via Skill tool nativa (D20, CA-16). Atualiza `## Lessons Captured` do plano (CA-07, CA-08).
- **fase-04-subcommand-migrate-nao-destrutivo**: implementa `compound-engineering migrate` em `lib/migrate.ts`. Detecta schema antigo em `docs/compound/README.md` (presença de `date/author/decision`), reescreve não-destrutivamente (CA-13). Escaneia notas, gera `migration-report.md` SEM reescrever (CA-14, RNF-04).
- **fase-05-patches-p1-p2-idempotentes**: implementa `lib/patch-agents.ts` (P1) com regex multi-padrão D23 (CA-11, CA-12). Implementa `lib/patch-new-plan.ts` (P2) injetando 4 seções antes de `## Exit Criteria`. Ambos idempotentes (RNF-02).
- **fase-06-completion-signal-edge-cases**: adiciona `renderCompletionSignal()` no output do `gate` (SH-07). Telemetria fim correto em todos subcomandos. Testes edge: CA-18/19/20. `bun test && bun run lint` verde.

---

## Risks

- **R1** (CONTEXT) — brownfield Carreirarte v3 com muitas notas inconsistentes; relatório longo.
  - Mitigação: relatório agrupa por tipo (Plano 03 fase-04). CH-02 (`--fix-readme-only`) opcional fica como Could Have.
- **R2** (CONTEXT) — refactor de init pra `getCompoundManifest()` afeta goldens E2E.
  - Mitigação: Plano 01 fase-02 mantém paths idênticos (Tracer Bullet sem mexer em paths físicos). Goldens regeneram em Plano 02 fase-03, em commit isolado.
- **R3** (CONTEXT) — patches AGENTS.md duplicam link em edge cases.
  - Mitigação: D23 regex multi-padrão + test fixtures cobrindo paths relativos/absolutos (Plano 03 fase-05). CA-11/CA-12 cobrem.
- **R4** (CONTEXT) — gate em projeto com múltiplos planos ativos.
  - Mitigação: CA-19 via AskUserQuestion (Plano 03 fase-03).
- **R7** (CONTEXT) — `git mv` quebra refs internos em tests/scripts.
  - Mitigação: grep prévio obrigatório no Plano 02 fase-01 antes do `git mv` — atualizar tudo no mesmo commit (D15).
- **R8** (CONTEXT) — cross-skill import circular.
  - Mitigação: CA-17 validação via grep em Plano 02 fase-02 (compound-engineering NÃO importa nada de init).
- **R9** (CONTEXT) — Skill tool de Claude muda interface.
  - Mitigação: invocação encapsulada em `lib/invoke-lessons-learned.ts` (helper substituível).
- **R10** (CONTEXT) — telemetria boilerplate incompleta em `compound-engineering/SKILL.md`.
  - Mitigação: copiar bloco literal de `skills/lessons-learned/SKILL.md` como base (Plano 01 fase-01).
- **R11** (novo) — fase-02 do Plano 01 (Tracer Bullet) refatora `template-manifest.ts` sem mudar paths; risco de bug sutil na ordem de iteração afetando golden de scaffold.
  - Mitigação: test de invariante (ordem dos 10 entries compound preservada antes/depois) na própria fase.

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D1 (Opção C híbrida — escopo completo v1) | Estrutura dos 3 planos |
| D2 (templates em `skills/compound-engineering/assets/`) | Plano 02 fase-01 |
| D3 (schema canônico `title/category/tags/created` literal André) | Plano 01 fase-03 (template) + Plano 02 fase-01 (Andre version) |
| D4 (gate via subcomando) | Plano 03 fase-03 |
| D5 (gate delega `lessons-learned add`) | Plano 03 fase-03 |
| D6 (migrate não-destrutivo) | Plano 03 fase-04 |
| D7 (`getCompoundManifest()` como contrato init↔skill) | Plano 01 fase-01 + fase-02 |
| D8 (3 patches P1/P2/P3 todos na v1) | Plano 03 fase-05 (P1/P2) + Plano 02 fase-01 (P3 inlinado) |
| D9 (`category` continua string livre) | Plano 02 fase-01 (template) |
| D10 (gate atualiza `## Lessons Captured`) | Plano 03 fase-03 |
| D11 (stack-agnostic sem `package.json`) | Plano 03 fase-01 (CA-20) |
| D12 (regras novas opt-in via `--strict`) | Plano 03 fase-02 |
| D13 (`capture-guide.md` skill knowledge) | Plano 01 fase-01 (em `references/`, não em `assets/`) |
| D14 (conteúdo literal André) | Plano 02 fase-01 |
| D15 (`git mv` preserva linhagem) | Plano 02 fase-01 + fase-02 |
| D16 (goldens regeneram na fase do `git mv`) | Plano 02 fase-03 |
| D17-A (skip-by-default + `--force`) | Plano 03 fase-01 |
| D18 (outros docs init fora do escopo) | Restrição em todos os planos |
| D19 (split libs por responsabilidade) | Plano 02 fase-02 |
| D20 (cross-skill via Skill tool) | Plano 03 fase-03 |
| D21 (`src` absoluto, `dst` relativo) | Plano 01 fase-01 + Plano 02 fase-01 |
| D22 (`argument-hint` padrão `lessons-learned`) | Plano 01 fase-01 |
| D23 (P1 regex multi-padrão) | Plano 03 fase-05 |
| D24 (dogfooding tratamento normal) | Plano 03 fase-01 (sem blocklist) |
| D25 (init NÃO chama subskill install) | Plano 01 fase-02 |

---

## Assumptions

- Bun ≥1.0 disponível como runtime (já requirement do plugin).
- Skill tool de Claude permanece com interface atual (`Skill({ skill, args })`) durante o ciclo de desenvolvimento.
- `skills/lessons-learned/SKILL.md` permanece estável (RT-02) — gate invoca via comando, nunca importa lib.
- Estrutura `docs/exec-plans/active/{date}-{slug}/` (v6) consolidada — gate parseia plano ativo a partir dessa convenção.
- `js-yaml` continua disponível para parse de frontmatter (já no projeto).
- AGENTS.md do target tem (ou pode ter) seção `## Read Before Major Changes`. Se não tiver, P1 cai para append final (D23).

---

## Review Checklist

A ser preenchido durante execução. Itens iniciais a verificar:
- [ ] Cada fase tem critério de verificação explícito (no respectivo `fase-NN-*.md`)
- [ ] CAs do PRD mapeados em pelo menos uma fase
- [ ] Imports cross-skill validados (CA-17 grep)
- [ ] Goldens E2E regenerados visíveis em diff do PR (D16)
- [ ] Backward compat verificada (CA-09 `compound:check` sem `--strict` continua passando)
- [ ] Telemetria writeTelemetryStart/End presente em todos subcomandos
- [ ] Completion signal YAML no output do `gate` (SH-07)

## Validation Log

_(Preenchido durante `/execute-plan` e `/iterate` — vazio inicialmente.)_

## Compound Opportunity

_(Preenchido ao final pelo `/compound-engineering gate` desta própria feature — meta — vazio inicialmente.)_

## Lessons Captured

**Gate executado:** 2026-05-25 via `/anti-vibe-coding:compound-engineering gate` (dogfooding D24).

### Licao priorizada para captura formal

- **Titulo:** "Grep cross-skill amplo: incluir `skills/` `tests/` `scripts/` em refactors de renomeacao/mocao"
- **Origem:** `BUG-fase02-grep-escopo-incompleto` (Plano 02 fase-03 retroativo) — callsite orfao em `tests/lessons-learned-v6.test.ts` escapou de grep limitado a `skills/`.
- **Status:** Pendente em `docs/compound/` — Skill tool nativa bloqueada (`disable-model-invocation`); requer invocacao manual: `/anti-vibe-coding:lessons-learned add "Grep cross-skill amplo: incluir skills/ tests/ scripts/ em refactors de renomeacao/mocao"`

### Outras licoes candidatas (do SUMMARY)

- TDD gate em tipos puros (`GT-fase01-tdd-gate-tipos-puros`) — manter tipos INLINE evita arquivo de testes vazio.
- `git mv` + content replace = estrategia 2-commits para preservar linhagem (`GT-fase01-git-mv-conteudo-diferente-dois-commits`).
- Spec frequentemente diverge de API real — validar antes de implementar (DIs fase-04 `parseFrontmatter` e fase-06 `completion-signal`).

### Achados operacionais do proprio gate (meta — input para captura futura)

- **OP-01 (PR-based Exit Criteria + main-direct landing):** Item "PR descricao lista os 3 patches aplicados" pressupunha workflow de feature-branch + PR. 32 commits desta feature foram direto em `main`. Exit Criteria deveria condicionar: "se houver PR, descricao lista patches; senao, registrar em SUMMARY/CHANGELOG."
- **OP-02 (D20/CA-16 quebrado por `disable-model-invocation`):** `gate` foi desenhado para invocar `lessons-learned add` via Skill tool nativa. Em ambientes com flag `disable-model-invocation` ativa para `lessons-learned`, a invocacao falha — gate degrada para "registrar pendencia e instruir invocacao manual". Premissa do PRD precisa de fallback documentado.

## Exit Criteria

- [ ] Todos os 6 MH (MH-01..MH-06) com CA correspondente verde
- [ ] Todos os 7 SH (SH-01..SH-07) implementados e testados
- [ ] `bun test && bun run lint` verde no main
- [ ] Goldens E2E init verdes
- [ ] Grep validação CA-17 vazio (zero imports `init → compound-engineering` reverso)
- [ ] PR descrição lista os 3 patches aplicados (P1/P2/P3)
- [ ] Compound capture decidido (este PRD vira nota em `docs/compound/` OU registra "no compound capture needed because X" no `## Lessons Captured` deste PLAN.md)

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
