# Plano 02: Init Enrichment — multi-stack, idempotent, `--refresh-knowledge`, telemetria

**Feature:** Stack Knowledge Layer — Node.js + TypeScript (v6.3.2) ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~5.5h
**Depende de:** Plano 01 (Tracer Bullet — matrix skeleton + pilot atom + minimal init + 1 skill wire)
**Desbloqueia:** Plano 06 fase-04 (INDEX final consumido pelo init multi-stack), Plano 06 fase-06 (E2E completo CA-01..CA-10)

---

## O que este plano entrega

Eleva `/init` de monostack (Node+TS happy path do Plano 01) para multi-stack production-grade: detecção de primary+secondary com `anchor_files`, `stack.json` com schema final + timestamp ISO 8601, idempotência por default + flag `--refresh-knowledge` (CA-04), telemetria `stack_detected` / `knowledge_copied` via `lib/telemetry-utils.ts` (RF9) e cobertura E2E dos edge cases CA-03, CA-06, CA-07 e da regressão CA-10.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `skills/init/lib/detect-stack.ts` retornando `StackId` interno (`node-ts`, `rails`, `python`, `laravel`, `nextjs`, `unknown`) | codebase pre-v6.3.2 | pronto |
| `skills/init/lib/copy-knowledge.ts` com `STACK_ID_TO_MATRIX_FOLDER` (entrada `'node-ts' → 'nodejs-typescript'`) | Plano 01 fase-03 | pendente |
| `skills/init/lib/write-stack-json.ts` (monostack writer Node+TS) | Plano 01 fase-03 | pendente |
| Pasta `docs/knowledge/nodejs-typescript/INDEX.md` + 1 átomo piloto | Plano 01 fase-01/02 | pendente |
| `tests/e2e/stack-knowledge-tracer-bullet.test.ts` cobrindo CA-02/CA-05/CA-09 happy path | Plano 01 fase-05 | pendente |
| `skills/lib/telemetry-utils.ts` + `telemetry-types.ts` (pattern start/end) | codebase v6.3.0+ | pronto |
| Decisões DI-1 (alias map) e DI-2 (dupla representação `StackId` ↔ matrix folder) | `../plano01/MEMORY.md` | herdado |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `STACK_ID_TO_MATRIX_FOLDER` estendido (rails, python, laravel, nextjs, unknown sentinel) | Plano 06 fase-04 (validação do INDEX final), Planos 04/05/06 (átomos consumidos por multi-stack copy) |
| Schema final de `.claude/stack.json` (primary + secondary + anchor_files + detected_at ISO 8601) | Plano 06 fase-04 (preview de keywords lê stack.json) |
| Flag `--refresh-knowledge` documentada + handler em `/init` | Plano 06 fase-05 (RF10 reusa o handler para preview) |
| Eventos de telemetria `stack_detected` / `knowledge_copied` no monthly JSONL | Plano 06 fase-06 (E2E completo verifica eventos emitidos) |
| `tests/e2e/stack-knowledge-tracer-bullet.test.ts` estendido com CA-03/CA-06/CA-07/CA-10 | Plano 06 fase-06 (reusa setup + helpers para CA-01..CA-10 final) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-multi-stack-detection.md | `detectMultiStack()` retornando `{ primary, secondary[], anchor_files[] }` com tiebreaker por contagem de source files | 1.5h | — |
| 02 | fase-02-stack-json-schema-final.md | `writeStackJson()` com schema final (primary, secondary, anchor_files, detected_at ISO 8601) | 1h | fase-01 |
| 03 | fase-03-idempotent-refresh-flag.md | Idempotent default (skip + mensagem CA-04) + flag `--refresh-knowledge` que força overwrite | 1h | fase-02 |
| 04 | fase-04-telemetria.md | Eventos `stack_detected` e `knowledge_copied` via `lib/telemetry-utils.ts` (RF9) | 1h | fase-02, fase-03 |
| 05 | fase-05-edge-cases-ca-regression.md | E2E estendido cobrindo CA-03 (Rails puro), CA-06 (sem anchor), CA-07 (multi-stack), CA-10 (regressão) + NFR perf | 1h | fase-01, fase-02, fase-03, fase-04 |

---

## Grafo de Fases

```
fase-01 (multi-stack detection)
    |
    v
fase-02 (stack.json schema final)
    |
    +----------+----------+
    |                     |
    v                     v
fase-03 (refresh flag)   fase-04 (telemetria)
    |                     |
    +----------+----------+
               |
               v
        fase-05 (edge cases + CA-10)
```

**Paralelismo possivel:** fase-03 e fase-04 podem executar em paralelo após fase-02 estar verde (tocam pontos diferentes do flow do `/init` — refresh flag mexe no handler de invocação, telemetria envolve emissão de eventos no início/fim). Fase-05 fecha o ciclo e exige todas anteriores.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

Todas as 5 fases seguem TDD rigoroso — diferente do Plano 01 onde fase-01/02 eram content-only (markdown). Aqui cada fase modifica ou cria código TypeScript verificável por suite de testes.

**Tracer Bullet deste plano:** N/A (este NÃO é o primeiro plano). O tracer arquitetural já foi validado em Plano 01 fase-05. Fase-05 deste plano é apenas extensão de cobertura de edge cases sobre o E2E existente.

---

## Gotchas Conhecidos

Indexados aqui; referenciados nas fases. **G1-G2 herdados do Plano 01** (CA-10 regressão e dupla representação) reaparecem como pilares deste plano.

- **G1 — CA-10 regressão (herdado do Plano 01 G2):** `skills/init/lib/state-md-init.ts` escreve `detected_stack: <StackId>` em `docs/STATE.md` desde v6.0.0. Esse comportamento **permanece intacto** ao longo de todo o Plano 02. `.claude/stack.json` continua sendo **aditivo** — nunca substitui STATE.md, nunca altera o formato/conteúdo do bloco `detected_stack`. Qualquer mudança em `state-md-init.ts` ou no formato de STATE.md = regressão CA-10 e bloqueia merge. Validado em fase-05.

- **G2 — Dupla representação `StackId` ↔ matrix folder (herdado do Plano 01 G6, DI-2):** STATE.md continua armazenando `StackId` interno (`node-ts`, `rails`, etc.). `.claude/stack.json` armazena nomes de pasta do matrix (`nodejs-typescript`, `rails`). O alias map `STACK_ID_TO_MATRIX_FOLDER` em `copy-knowledge.ts` é a **única** ponte. Toda fase deste plano que tocar id de stack precisa saber em qual lado do alias está operando.

- **G3 — `detectMultiStack` NÃO pode ser breaking change para `detectStack`:** `detectStack()` (singular) é chamado por `state-md-init.ts` e retorna `{ id, signalSource }`. Multi-stack detection é uma **nova função `detectMultiStack()`** que internamente compõe os mesmos probes — não rename, não delete, não refactor. State-md-init continua chamando `detectStack()` legado sem mudança. Fase-01 documenta isso explicitamente.

- **G4 — Tiebreaker por contagem de arquivos source é I/O sensível:** "Primary = stack com mais arquivos source" (`.rb` vs `.ts/.js` em CA-07) exige walk de filesystem. Walk não-bounded em monorepos grandes mata os 500ms do NFR. Limitar profundidade (ex: `maxDepth: 4`), excluir `node_modules`, `vendor`, `dist`, `.git`. Documentar em fase-01.

- **G5 — `anchor_files` é lista, não mapa:** Schema do PRD pede `"anchor_files": ["package.json", "Gemfile"]` — apenas paths relativos detectados, **não** os IDs de stack a que cada anchor pertence. A correlação anchor → stack vive nos probes (já existe em `detect-stack.ts`). Fase-02 não pode "enriquecer" anchor_files com stack name — fugiria do schema.

- **G6 — Flag `--refresh-knowledge` precisa ser parseável sem dependência nova:** `/init` é skill TypeScript invocada por slash command; argumentos chegam via `$ARGUMENTS` no SKILL.md. Parser deve ser inline (split simples por whitespace, busca string), **não** importar `commander`/`yargs`. Fase-03 mantém parser ~10 linhas.

- **G7 — Telemetria não bloqueia, não trava (herdado de telemetry-utils):** `lib/telemetry-utils.ts:appendJsonlLine` já tem `try/catch` silencioso. Eventos `stack_detected` e `knowledge_copied` seguem o mesmo contrato: falha de I/O do JSONL **nunca** propaga para o `/init` (CA-09 graceful degradation). Fase-04 não introduz `await`/`throw` que altere esse contrato.

- **G8 — Schema dos novos eventos NÃO é `TelemetryStart`/`TelemetryEnd`:** os tipos existentes em `telemetry-types.ts` modelam **start/end de skill**, não eventos de domínio. `stack_detected` e `knowledge_copied` são eventos auxiliares; fase-04 decide entre (a) reutilizar `TelemetryEnd` com `skill_invocada: 'init'` + payload extra ou (b) criar novo tipo `TelemetryDomainEvent`. Decisão dentro da fase, registrada em MEMORY.md como DI-3.

- **G9 — Performance NFR é asserção, não meta:** `detection < 500ms`, `cópia (14 átomos) < 100ms`. Fase-05 assertia ambos via `expect(durationMs).toBeLessThan(...)`. Se em CI Windows passar de 500ms por flakiness, bumpar para 800ms localmente é proibido — investigar primeiro (provavelmente walk não-bounded, ver G4).

- **G10 — CA-06 (`primary: null`) é **não-erro**:** "Stack não detectada" não lança exceção; `stack.json` é gravado com `primary: null`, `secondary: []`, `anchor_files: []`. `/init` finaliza com exit 0. Fase-05 testa esse caminho explicitamente.

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
