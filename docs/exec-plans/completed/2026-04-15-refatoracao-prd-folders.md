---
title: "Refatoracao da Estrutura de Pastas por PRD"
status: completed
date-start: 2026-04-20
date-end: 2026-04-20
slug: refatoracao-prd-folders
---

# Refatoracao da Estrutura de Pastas por PRD

## Goal

As skills `write-prd`, `plan-feature` e `execute-plan` geravam artefatos em `.planning/` usando numeracao global (`plano01/`, `plano02/`, ...). Isso tornava impossivel trabalhar em mais de uma feature em paralelo — a segunda feature colidiria com `plano01/` ja existente, com risco de sobrescrita silenciosa. O objetivo foi reorganizar a estrutura para que cada PRD viva em sua propria **pasta datada** (`YYYY-MM-DD-{slug}/`) dentro de `.planning/`, eliminando colisoes e permitindo execucao paralela de features.

## Scope

**IN:**
- `write-prd` cria pasta datada `YYYY-MM-DD-{slug}/` e salva arquivos nus (`PRD.md`, `PLAN.md`, `STATE.md`, `SUMMARY.md`) dentro dela
- `plan-feature` e `execute-plan` leem e escrevem dentro da pasta do PRD, sem interferir em outras features
- Deteccao automatica de estrutura legacy (`planoNN/` solto, `PRD-*.md` solto) com migracao on-detect e confirmacao
- Arquivamento opcional para `.planning/_archive/` ao concluir PRD
- Descoberta interativa quando skills rodam sem argumento
- `MEMORY.md` consolidado gerado ao arquivar
- Rastreio de origem nas licoes (campo `Origem:` referenciando SUMMARY.md do PRD)
- Suporte a campo opcional `requires: [slug]` no frontmatter do PRD

**OUT:**
- `quick-plan` permanece inline, sem integracao com nova estrutura
- Sem arquivo global `.planning/ACTIVE.md` (paralelismo livre por design)
- Sem novo comando `/migrate-prd` standalone

## Assumptions

- Projetos legacy continuam executaveis durante a transicao — migracao eh sempre on-detect + confirmacao
- `.planning/` esta no mesmo filesystem que o projeto (necessario para `mv` atomico sem cross-filesystem)
- Cada sessao Claude opera em uma pasta de PRD por vez; paralelismo via multiplas sessoes sobre pastas distintas
- Plugin `anti-vibe-coding/` eh repositorio git independente — commits precisam de CWD dentro dessa pasta

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Deteccao legacy com falso positivo (pasta planoNN em contexto nao anti-vibe) | Baixa | Medio | So considerar legacy se houver `fase-*.md` dentro OU `PRD-*.md` com estrutura de anti-vibe proximo |
| Slug do CONTEXT.md (grill-me) difere do slug da pasta final (write-prd) | Media | Baixo | write-prd confirma slug antes de mover, oferece renomear |
| Dependencia circular em `requires:` | Baixa | Baixo | Detectar ciclo em plan-feature e avisar sem bloquear (DFS 3 cores) |
| MEMORY.md consolidado cresce demais com muitos planos | Media | Baixo | Template foca em "o que vira licao", nao copia tudo |
| Projetos ja instalados com plugin desatualizado | Alta | Baixo | `/anti-vibe-coding:update` propaga docs e templates; skills detectam legacy no primeiro uso |
| Migracao atomica falha no meio (crash, permissao) | Baixa | Alto | STAGE → MOVE → CONFIRM com rollback logado no STATE da nova pasta |
| Dev rodar pipeline em paralelo na mesma feature por engano | Baixa | Medio | write-prd usa resolucao v2 (sufixo -v2) ao detectar colisao de nome |
| 10+ PRDs em .planning/ poluem lista de descoberta | Media | Baixo | Listar so planned e in-progress por default; flag `--all` mostra todos |

## Execution Steps

- plano01 — Nova estrutura (fundacao + tracer bullet)
  - fase-01 — write-prd cria pasta datada + salva PRD.md nu (TRACER BULLET)
  - fase-02 — plan-feature opera dentro de PASTA_ATIVA (le PRD.md, salva PLAN.md/STATE.md/planoNN/ dentro)
  - fase-03 — execute-plan navega pasta do PRD, le STATE.md local, passa PASTA_ATIVA absoluta aos subagentes
  - fase-04 — write-prd move CONTEXT-{slug}.md da raiz para dentro da pasta como CONTEXT.md
  - fase-05 — atualizar templates (prd-template com frontmatter YAML, plan-overview-template, plan-readme-template, state-template criado)
- plano02 — Deteccao legacy e migracao on-detect
  - fase-01 — `detectLegacy()`: heuristica dupla (sinal A: PRD-*.md solto; sinal B: planoNN/ com fase-*.md)
  - fase-02 — `migrateLegacy()`: STAGE → MOVE → CONFIRM com ROLLBACK atomico e deteccao de log orfao
  - fase-03 — Step 0 inserido em plan-feature/SKILL.md (detecta legacy, oferece migrar com confirmacao)
  - fase-04 — Step 0 inserido em execute-plan/SKILL.md (fluxo identico ao plan-feature)
  - fase-05 — Validacao CA-12: 6 cenarios de backward compat (detectar sem migrar, migrar preservando STATE, flat v1, ambiguous, cancelamento, rollback atomico)
- plano03 — Multi-PRD, ciclo de vida e consolidacao
  - fase-01 — Discovery interativo: execute-plan e plan-feature sem argumento listam PRDs ativos com status
  - fase-02 — write-prd: colisao mesmo-dia → pergunta atualizar/v2/cancelar (sufixo -v2 com fallback EEXIST)
  - fase-03 — verify-work: arquivamento real via mv para `.planning/_archive/` (verifica estado terminal via regex)
  - fase-04 — Template `memory-prd-template.md` criado; verify-work recebe `gerarMEMORYConsolidado` com filtros de relevancia
  - fase-05 — CLAUDE.md do plugin atualizado: nova estrutura hierarquica v2, _archive/, discovery interativo, legacy on-detect
- plano04 — Extras (Could Have)
  - fase-01 — `requires: [slug]` no frontmatter do PRD + parser tolerante em execute-plan/plan-feature (aviso nao-bloqueante)
  - fase-02 — DFS com 3 cores (branco/cinza/preto) em plan-feature: detecta ciclos diretos, indiretos e auto-referencia
  - fase-03 — `/lessons-learned add` infere origem do PRD mais recente em `_archive/` e registra campo `Origem:`

## Review Checklist

> _(reconstructed: section absent in original PRD; inferred from CA and functional requirements)_

- [ ] write-prd cria pasta datada sem sobrescrever existente (CA-01)
- [ ] plan-feature opera dentro da pasta do PRD sem interferir em outros PRDs (CA-02)
- [ ] execute-plan sem argumento lista PRDs ativos e pede escolha (CA-03, CA-08)
- [ ] Deteccao de legacy e migracao com confirmacao funciona corretamente (CA-04)
- [ ] Dois PRDs paralelos executados em sessoes distintas sem colisao (CA-05)
- [ ] write-prd move CONTEXT.md para dentro da pasta ao criar PRD (CA-06)
- [ ] verify-work oferece arquivamento e move pasta para _archive/ ao aceitar (CA-07)
- [ ] Legado em execucao continua funcionando — migracao oferecida mas nunca forcada (CA-12)
- [ ] `requires:` nao bloqueia execucao — apenas avisa quando dep nao esta completed (CA-11)

## Validation Log

### Log de Execucao (do STATE.md)

- 2026-04-20: CONTEXT gerado via `/grill-me` (15 decisoes D1-D15)
- 2026-04-20: PRD formal gerado via `/write-prd` e aprovado pelo dev
- 2026-04-20: PLAN overview gerado via `/plan-feature` (4 planos, 18 fases, ~21h)
- 2026-04-20: Planos 01-04 detalhados via subagentes isolados
- 2026-04-20: Plano 01 executado (5/5 fases, commits 0c73cd3 → af96598). Tracer bullet passou.
- 2026-04-20: Plano 02 executado (5/5 fases). CA-12 validado: 6/6 cenarios PASS.
- 2026-04-20: Plano 03 executado (5/5 fases). Discovery interativo, arquivamento, MEMORY consolidado, CLAUDE.md atualizado.
- 2026-04-20: Plano 04 executado (3/3 fases, commits c8d5520 + c425644). `requires:` + DFS ciclos + origem em lessons-learned.
- 2026-04-20: TODOS OS PLANOS CONCLUIDOS (18/18 fases, 100%). SUMMARY.md gerado. 3 licoes salvas em anti-vibe-coding/CLAUDE.md (commit d872217).

### Status Final

**Phase:** completed — 18/18 fases (100%)

## Compound Opportunity

> _(reconstructed: pre-v6 plan had no Compound Engineering section)_

Esta feature introduz o padrao de "pasta datada por PRD" que foi reusado em todas as features subsequentes (v5.2, v5.3, v6.0). A migracao on-detect e o algoritmo de discovery interativo tornaram-se padroes reutilizaveis — posteriormente empacotados como `lib/detect-v5-legacy.ts` (Plano 03 do v6.0). O modelo STAGE → MOVE → CONFIRM foi o precursor do `lib/backup-planning.ts` de v6.0.

## Lessons Captured

### Do plano01/MEMORY.md

- **GT-1:** `anti-vibe-coding/` e repositorio git independente. Todos os commits precisam de CWD nessa pasta — git porcelain no repo pai pode parecer "sem staging" quando o commit ja foi feito no repo filho.
- **GT-2:** Instrucoes executaveis em SKILL.md devem ficar DENTRO de blocos de codigo. NOTAs decorativas fora. Se voce quer que o modelo EXECUTE algo, fica no bloco.
- **GT-3:** `skills/lib/state-utils.md` tinha referencia legacy `STATE-{featureName}.md` — corrigida no Plano 02. Fonte de verdade divergente reintroduz padrao antigo se nao corrigida.
- **GT-4:** CRLF/LF no Windows — autocrlf ativo converte LF→CRLF. Nao confundir mudancas de line ending com mudancas reais no diff.

### Do plano02/MEMORY.md

- **GOTCHA-1:** `mv dir/ existing-dir/` no bash/Windows faz nested merge em vez de retornar erro. O algoritmo real usa `fs.rename` (Node.js) que retorna `ENOTEMPTY`. Simulacao bash do rollback precisa de tratamento adicional.
- **GOTCHA-2:** STATE.md usa markdown bold (`**Phase:**`) — grep literal `phase:` falha silenciosamente. Detector/migrador deve buscar por padrao case-insensitive ou com bold markup.

### Do plano03/MEMORY.md

- **GT-1:** Agentes paralelos com `git add` simultaneo geram commits agrupados — o commit do segundo agente pode incluir mudancas staged pelo primeiro. Usar `git diff --staged` antes de commitar para garantir atomicidade por fase.

### Do plano04/MEMORY.md

- **DI-1:** `prd-template.md` ja tinha frontmatter YAML (G-PLAN-13 estava desatualizado). Ao editar arquivos existentes, sempre ler antes de modificar — suposicoes sobre estado inicial frequentemente estao erradas.

### Consolidado do SUMMARY.md

| ID | Gotcha | Plano |
|----|--------|-------|
| GT-1 | `anti-vibe-coding/` e repo git separado — commits precisam de CWD nessa pasta | P01 F01 |
| GT-2 | Instrucoes executaveis em SKILL.md dentro de blocos de codigo | P01 F04 |
| GT-3 | `state-utils.md` tinha referencia legacy — corrigida no P02 | P01 F05 |
| GT-4 | `mv dir/` em bash faz MERGE; algoritmo real precisa de `fs.rename` | P02 F05 |
| GT-5 | STATE.md usa `**Phase:**` em negrito — grep literal `Phase:` falha silenciosamente | P02 F05 |
| GT-6 | Agentes paralelos com `git add` simultaneo geram commits agrupados | P03 F01 |

## Exit Criteria

**Criterios do PRD (todos cumpridos):**
- CA-01: write-prd cria pasta `YYYY-MM-DD-{slug}/` com PRD.md nu — sem `PRD-*.md` solto na raiz
- CA-02: plan-feature sem argumento detecta e usa PRD.md dentro da pasta; gera PLAN.md/STATE.md/planoNN/ dentro
- CA-03: execute-plan sem argumento com 1 PRD ativo lista e pede confirmacao, depois prossegue de dentro da pasta
- CA-04: legacy detectado, migrado atomicamente para pasta datada com confirmacao
- CA-05: dois PRDs paralelos operando em sessoes distintas sem colisao
- CA-06: CONTEXT.md movido para dentro da pasta por write-prd
- CA-07: verify-work arquiva pasta em _archive/ com confirmacao
- CA-08: 3 PRDs com status distintos listados corretamente em discovery interativo
- CA-09: legacy sem PRD associado → skill pede nome antes de migrar
- CA-10: write-prd no mesmo dia/slug → pergunta atualizar/v2/cancelar
- CA-11: `requires:` nao bloqueia, apenas avisa
- CA-12: projeto legacy em execucao nao eh interrompido; migracao eh oferecida mas nunca forcada

**Status Final (do STATE.md):** `Phase: completed` — 18/18 fases — 4/4 planos concluidos

---

## Original artifacts (verbatim)

### CONTEXT-refatoracao-prd-folders.md (preserved for audit trail)

> _(Content of `f:/Projetos/Claude code/.planning/CONTEXT-refatoracao-prd-folders.md` at migration time 2026-05-12)_

```markdown
---
name: refatoracao-prd-folders
slug: refatoracao-prd-folders
generated_by: /anti-vibe-coding:grill-me
date: 2026-04-20
decisions: 15
complexity: complex
---

# Context: Refatoracao da Estrutura de Pastas por PRD

**Generated by:** /grill-me
**Date:** 2026-04-20
**Decisions:** 15
**Complexity:** complex

## Problema

As skills `write-prd`, `plan-feature` e `execute-plan` geram artefatos em `.planning/` usando nomes planos (`plano01/`, `plano02/`, ...). Isso causa conflito quando mais de um PRD coexiste: a segunda feature tenta criar `plano01/` e colide com a existente.

## Solucao Proposta

Cada PRD vira uma pasta datada contendo seu proprio conjunto de artefatos. Estrutura alvo:

```
.planning/
├── CONTEXT-{slug}.md
├── 2026-04-20-sistema-notificacoes/
│   ├── CONTEXT.md
│   ├── PRD.md
│   ├── PLAN.md
│   ├── STATE.md
│   ├── MEMORY.md
│   ├── SUMMARY.md
│   └── plano01/ ...
└── _archive/
    └── 2026-01-10-auth/
```

## Decisions (D1-D15)

D1: Pasta YYYY-MM-DD-{slug-kebab}/ | D2: Arquivos nus dentro da pasta |
D3: Paralelismo sem lock global | D4: Licoes em CLAUDE.md via /lessons-learned |
D5: Migracao on-detect com confirmacao | D6: CONTEXT.md movido pelo write-prd |
D7: Arquivamento opt-in em _archive/ | D8: Discovery lista e pergunta |
D9: Conflito mesmo-dia → v2 | D10: quick-plan inalterado |
D11: requires: [] opcional | D12: Origem em lessons-learned |
D13: MEMORY consolidado ao arquivar | D14: Sinais legacy A+B |
D15: Pipeline para refatorar o sistema (ironia intencional)
```

### PRD.md (preserved)

```markdown
# PRD: Refatoracao da Estrutura de Pastas por PRD

**Status:** Approved
**Author:** Luiz Felipe + AI
**Date:** 2026-04-20

## Problema

As skills geram artefatos em `.planning/` usando numeracao global. Quando uma primeira feature ja criou `plano01/` ate `plano05/` e o dev inicia uma segunda feature, o `plan-feature` tenta criar outro `plano01/` e colide com a existente.

Impacto de nao resolver:
- Impossibilidade pratica de trabalhar em mais de 1 feature em paralelo via anti-vibe-coding
- Risco de sobrescrever planos existentes sem aviso
- Poluicao visual progressiva de `.planning/`

## Solucao

Cada PRD passa a viver em sua propria pasta datada `YYYY-MM-DD-{slug}/` dentro de `.planning/`, contendo todos os artefatos (PRD, PLAN, STATE, SUMMARY, MEMORY consolidado, planos e fases) como arquivos nus.

## Requisitos Funcionais

### Must Have (RF1-RF3)
- RF1: Cada PRD vive em pasta datada com arquivos nus
- RF2: 3 skills leem/escrevem dentro da pasta sem interferir em outras
- RF3: Deteccao legacy e migracao atomica com confirmacao

### Should Have (RF4-RF7)
- RF4: write-prd move CONTEXT.md para dentro da pasta
- RF5: Discovery interativo sem argumento
- RF6: Arquivamento em _archive/ com confirmacao
- RF7: MEMORY.md consolidado ao arquivar

### Could Have (RF8-RF11)
- RF8: Campo requires: [] no frontmatter
- RF9: Versao v2 em colisao de nome
- RF10: Rastreio de origem em /lessons-learned
- RF11: Deteccao de ciclos em requires:

## Criterios de Aceite

CA-01 a CA-12 (ver secao Exit Criteria do plano consolidado acima)
```

### STATE.md (preserved)

```markdown
# State: Refatoracao da Estrutura de Pastas por PRD

**Phase:** completed
**Current Plan:** 04/04
**Last Updated:** 2026-04-20

## Progress Global: 18/18 (100%)

## Log resumido:
- 2026-04-20: CONTEXT + PRD + PLAN gerados
- 2026-04-20: Plano 01 concluido (5/5 fases, commits 0c73cd3...af96598)
- 2026-04-20: Plano 02 concluido (5/5 fases, CA-12 validado: 6/6 cenarios PASS)
- 2026-04-20: Plano 03 concluido (5/5 fases)
- 2026-04-20: Plano 04 concluido (3/3 fases, commits c8d5520 + c425644)
- 2026-04-20: SUMMARY.md gerado. 3 licoes salvas em CLAUDE.md (commit d872217)
```

### SUMMARY.md (preserved)

```markdown
# Summary: Refatoracao da Estrutura de Pastas por PRD

**Completed:** 2026-04-20
**Planos:** 4 (4 completed) | **Fases:** 18 (18 done)

## Metricas
Planos: 4 | Fases done: 18 | Bugs: 0 | Desvios: 2 | Gotchas: 6 | DI: 6

## Decisoes de Implementacao
DI-01: Bloco legacy como comentario HTML marcador (nao deletado)
DI-02: Sub-step 5.5 dentro do Step 5 do write-prd
DI-03: Step 2-FLAT preservado sem edicao
DI-04: Instrucao separacao codigo/artefatos como diretiva positiva
DI-05: execute-plan nao explicita "pasta sem STATE.md = planned" (Step 2 ja trata)
DI-06: prd-template.md ja tinha frontmatter YAML (G-PLAN-13 desatualizado)

## Bugs e Gotchas (GT-1 a GT-6)
GT-1: anti-vibe-coding/ repo git independente
GT-2: Instrucoes executaveis em SKILL.md dentro de blocos de codigo
GT-3: state-utils.md tinha referencia legacy
GT-4: mv dir/ faz MERGE no bash
GT-5: STATE.md usa **Phase:** bold — grep literal falha
GT-6: Agentes paralelos com git add simultaneo geram commits agrupados
```

### Phases History (consolidated from plano01..04/)

#### plano01 — Nova estrutura (fundacao + tracer bullet)

**O que entregou:** As 3 skills principais (`write-prd`, `plan-feature`, `execute-plan`) passam a operar dentro de pasta datada por PRD. Template criado (state-template.md). Fluxo FLAT preservado. 5 commits (0c73cd3, 6a030b1, 6d4cb11, 2c13b66, af96598).

**Fases:** 5 | **Sizing:** ~6h | **Dependencias:** nenhum | **Desbloqueia:** Planos 02, 03, 04

**Tracer Bullet:** fase-01 — write-prd cria pasta datada + PRD.md nu

**Gotchas criticos:**
- GT-1: anti-vibe-coding/ e repo git independente — commits com CWD ali dentro
- GT-2: Instrucoes executaveis em SKILL.md dentro de blocos de codigo
- GT-3: state-utils.md com referencia legacy `STATE-{featureName}.md`

#### plano02 — Deteccao legacy e migracao on-detect

**O que entregou:** `lib/legacy-detector.md` (heuristica 3 sinais), `lib/legacy-migrator.md` (STAGE/MOVE/CONFIRM/ROLLBACK), Step 0 em plan-feature e execute-plan, CA-12 validado (6/6 cenarios PASS).

**Fases:** 5 | **Sizing:** ~7h | **Depende de:** Plano 01 | **Desbloqueia:** nada (folha)

**Gotchas:**
- `mv dir/ existing-dir/` no bash faz nested merge (nao falha como esperado)
- STATE.md usa **Phase:** bold — grep literal `phase:` falha silenciosamente

#### plano03 — Multi-PRD, ciclo de vida e consolidacao

**O que entregou:** Discovery interativo (liste PRDs ativos com status), colisao mesmo-dia → v2, arquivamento real para `_archive/`, template `memory-prd-template.md`, `gerarMEMORYConsolidado`, CLAUDE.md do plugin atualizado.

**Fases:** 5 | **Sizing:** ~5h | **Depende de:** Plano 01 | **Desbloqueia:** nada (folha)

**Desvio:** DEV-1 — fase-02 bundled com fase-01 em commit 036315a (agentes paralelos com git staging simultaneo).

**Gotcha:** GT-1 — agentes paralelos com `git add` simultaneo geram commits agrupados. Usar `git diff --staged` antes de commitar.

#### plano04 — Extras (Could Have)

**O que entregou:** `requires: []` no frontmatter do PRD, DFS com 3 cores para deteccao de ciclos em plan-feature, `/lessons-learned add` rastreia origem do PRD mais recente em `_archive/`.

**Fases:** 3 | **Sizing:** ~3h | **Depende de:** Plano 01 | **Desbloqueia:** nada (folha)

**Desvio:** DEV-1 — fase-01 e fase-03 bundladas em commit c8d5520 (mesmo padrao de git staging paralelo).

**DI critico:** DI-1 — `prd-template.md` ja tinha frontmatter YAML (G-PLAN-13 estava desatualizado) — sempre ler arquivo antes de modificar.
