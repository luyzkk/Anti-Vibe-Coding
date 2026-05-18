# Memoria: Plano 05 — Modos Reversiveis (dry-run + rollback + drift + additive)

**Feature:** refactor-init-harness-populate-merge
**Iniciado:** 2026-05-18
**Status:** concluido

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Usar `upsert` em vez de `insert` para notifications
  - Por que: tabela pode receber duplicatas via webhook retry
  - Impacto: simplifica error handling no service
-->

- **DI-1 (fase-01):** Cast `as unknown as boolean` mantido para `__dryRunRecorder` em `ctx.flags`. Evoluir para `Record<string, unknown>` deferido para Plano 06 ou v6.5+. Impacto: Plano 07 fase-04 usa `ctx.flags['__dryRunRecorder'] as WriteRecorder` com cast duplo.

- **DI-2 (fase-04):** `move` reversal sem `movedTo` no manifest D29 — stub residual permanece no path movido. `restoreEntry` restaura conteudo em `originalPath` via `copyFile`; arquivo destino do move (stub) nao eh limpo. Documentado como limitacao conhecida v6.4.0; extensao deferida v6.5+.

- **DI-3 (fase-05):** `runLegacyAdditiveMerge` NAO portado — nao existe helper pre-existente. Branch `additive-merge` em Step 02 apenas retorna `summary` inline sem chamar nenhum helper (early-return semantics). Codigo e inline em `02-link-claude-agents.ts`. Comportamento: skipa `linkClaudeToAgents` (que faz `fs.rm`) para preservar CLAUDE.md original.

- **DI-4 (fase-06):** Marcadores do template ADR usam chaves simples `{MARCADOR}`. Decisao: `{NUMBER}`, `{date}`, `{backup_ts}`, `{git_sha}`, `{N}`, `{restored_files_list}`. Difere de `classifier-llm-prompt.md` (chaves duplas `{{marcador}}`) — convencao por consumidor: ADR writer usa `.replaceAll`, LLM prompt usa template engine.

- **DI-5 (fase-01):** `RenameRecorder` propagado via `makeRenamer({ dryRun, renameRecorder })` — NAO via `ctx.flags`. `WriteRecorder` propagado via `ctx.flags['__dryRunRecorder']` (DI-1). Dois mecanismos distintos: renamer via DI em opts, write recorder via flags slot.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

- **BUG-1:** POPULATED classificado como DRIFT em drift-detector.test.ts
  - Causa: fixture usava exatamente 10 linhas nao-vazias; `TEMPLATE_LINE_LIMIT = 10` usa `<= 10`, entao 10 = template = PLACEHOLDER/DRIFT.
  - Fix: adicionada linha extra no fixture (`- src/api — routes`), tornando 11 linhas > TEMPLATE_LINE_LIMIT.
  - Fase afetada: fase-03

- **BUG-2:** ADR template path errado em `rollback.ts` — caminho com dois `..` apontava para `skills/assets/` (inexistente).
  - Causa: `import.meta.dir = skills/init/lib`; dois `..` sobem para `skills/`; correto e um `..` para `skills/init/`.
  - Fix: `path.join(import.meta.dir, '..', 'assets', 'snippets', 'rollback-adr-template.md')`.
  - Fase afetada: fase-04 / fase-06

- **BUG-3:** `run-init.test.ts` teste "parses flags into ctx" usava `toEqual` exato, mas `__dryRunRecorder` foi injetado junto.
  - Causa: fase-01 adicionou injecao do recorder em `ctx.flags` para dry-run.
  - Fix: mudado para assertions parciais `expect(captured?.['dry-run']).toBe(true)`.
  - Fase afetada: fase-01

- **BUG-4:** `exactOptionalPropertyTypes` TS error em `runRollback` bridge — passando `askUser: opts.askUser` onde `opts.askUser` pode ser `undefined`.
  - Causa: `exactOptionalPropertyTypes: true` exige que propriedade opcional nao receba `undefined` explicitamente.
  - Fix: objeto `execOpts` construido condicionalmente com ternario.
  - Fase afetada: fase-04

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1 (fase-01):** `__dryRunRecorder` em `ctx.flags` polui o shape declarado como `Record<string, boolean | string>`. Cast `as unknown as boolean` funciona mas e frágil. Plano 07 fase-04 precisa de cast duplo ao extrair o recorder. Confirmar DI-1 ao iniciar Plano 06.

- **GT-2 (fase-03):** `TEMPLATE_LINE_LIMIT = 10` usa comparacao `<= 10` — arquivo com exatamente 10 linhas e classificado como PLACEHOLDER (template). Fixture de teste POPULATED deve ter 11+ linhas nao-vazias. BUG-1 documa o caso real.

- **GT-3 (fase-04):** ADR numbering usa `max(existingNumbers) + 1`, NAO primeiro gap. Fixture com ADR-0001 + ADR-0003 (sem ADR-0002) produz ADR-0004, nao ADR-0002. Comportamento intencional: evita colisao em cherry-pick.

- **GT-4 (fase-04):** Schema D29 NAO tem campo `movedTo`. Rollback de `action: 'move'` restaura conteudo em `originalPath` mas nao remove o stub no path de destino. Limitacao conhecida — ver DI-2.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1:** Ordem de execucao invertida vs plano — executado: fase-06 → fase-02 → dry-run-mode.ts → fase-03 → fase-05 → fase-01 → fase-04. Motivo: fase-04 (rollback) depende de fase-06 (ADR template); fase-01 depende de dry-run-mode.ts; todas as fases dependem do modulo base. Aprovado implicitamente (sequencia discovery-first).

- **DEV-2:** `runLegacyAdditiveMerge` nao portado — comportamento additive-merge implementado inline como early-return em Step 02 (ver DI-3). Plano previa portagem de helper existente; helper nao existia.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 6 |
| Fases com desvio | 1 (DEV-1: ordem invertida) |
| Bugs encontrados | 4 |
| Retries necessarios | 2 (BUG-1 fixture fix, BUG-2 path fix) |

---

## Notas para Planos Seguintes

Informacoes que os proximos planos (Plano 06 e Plano 07) PRECISAM saber antes de comecar.
O subagente de cada plano le este campo.

- **API publica final de `lib/dry-run-mode.ts`:**
  ```ts
  isDryRun(ctx: StepContext): boolean
  getRecorder(ctx: StepContext): WriteRecorder | undefined
  getDryRunMode(ctx: StepContext): DryRunMode  // 'noWrite' | 'normal'
  class RenameRecorder { record(from,to); list(): Array<{from,to}>; count(): number }
  makeRenamer(mode: DryRunMode): (from: string, to: string) => Promise<void>
  class WriteRecorder { record(path,content); list(); count() }
  makeWriter(mode: DryRunMode, recorder?: WriteRecorder): (path,content) => Promise<void>
  ```

- **API publica final de `lib/preview-renderer.ts`:**
  ```ts
  type MergePreview = {
    claudeMd: { originalLines: number; finalLines: number; akitaBlocks: Array<{title,target}> }
    docMoves: Array<{ from: string; to: string; action: 'move' | 'reference' }>
    blockedBySecrets: Array<{ path: string; reason: string }>
    backupTimestamp: string
  }
  renderMergePreview(input: MergePreview): string
  ```

- **API publica final de `lib/drift-detector.ts`:**
  ```ts
  type DriftStatus = 'PLACEHOLDER' | 'POPULATED' | 'DRIFT'
  type DriftReport = { generatedAt: string; summary: { placeholder,populated,drift }; byFile: Record<string,DriftStatus> }
  const DRIFT_REPORT_FILENAME = 'drift-report'  // sem .json — discovery-store adiciona extensao
  detectDrift(opts: { manifestPath: string; cwd: string }): Promise<DriftReport>
  ```
  `byFile` serializado como `Record<string, DriftStatus>` (NAO array de tuples).

- **`ctx.mode` propagado via `ctx.flags['__initMode']`** — Step 12 verifica `ctx.flags['__initMode'] === 'already-initiated'`. Sem campo dedicado em StepContext; slot em flags.

- **API publica final de `lib/rollback.ts`:**
  ```ts
  type RollbackResult = { restored: string[]; skipped: string[]; errors: {path,message}[]; adrPath: string|null; backupDir: string|null; userCancelled: boolean }
  type ExecuteRollbackOptions = { cwd: string; askUser?: (prompt,options) => Promise<string>; log?: (line) => void }
  executeRollback(opts: ExecuteRollbackOptions): Promise<RollbackResult>
  runRollback(opts: RunRollbackOptions): Promise<StepResult>  // bridge para dispatcher
  ```

- **Path do template ADR:** `skills/init/assets/snippets/rollback-adr-template.md`. Resolvido via `path.join(import.meta.dir, '..', 'assets', 'snippets', '...')` onde `import.meta.dir = skills/init/lib`.

- **Warning emitido em additive-merge (texto exato):**
  `[init] additive-merge mode: CLAUDE.md preserved, Steps 09/10 skipped. Manual merge of new Akita blocks may be needed.`

- **Posicao final dos Steps no registry:**
  idx 0: readCurrentState | idx 1: linkClaudeAgents | idx 2: secretsScan | idx 3: discoverExistingDocs | idx 4: classifyBlocksHybrid | idx 5: proposeMergeBatch | idx 6: applyMergeDestructive | idx 7: moveDocsWithStub | **idx 8: detectDriftIncremental** | idx 9: generatePopulatePlan | ... | idx 14: finalValidation

- **Subagent_ids canonicos:** `init-drift-detect` (Step 12) e `init-rollback` (bridge runRollback). Literais fixados nos arquivos de impl.

- **Slot `__dryRunRecorder`:** mantido via cast `as unknown as boolean` — NAO evoluiu para `Record<string, unknown>`. Plano 06 decide se quer evoluir.

---

<!-- Atualizado automaticamente durante execucao -->
