# Memoria: Plano 06 — Comunicacao + Observabilidade

**Feature:** refactor-init-harness-populate-merge
**Iniciado:** 2026-05-18
**Status:** em andamento

---

## Decisoes de Implementacao

- **DI-1 (fase-01):** Integration test CA-14 usou `--additive-merge` para evitar anti-loop guard do dispatcher (Step 09 retorna `needsUser` mas nao le `__interactiveAnswer` — comportamento pre-existente). Test usa `askUser` stub que retorna `options[0]`.
- **DI-2 (fase-02):** `readPluginVersion` usa `import.meta.url + path.dirname` para resolver caminho ESM do `.claude-plugin/plugin.json` com fallback para `package.json` raiz e hardcoded `'6.4.0'`.
- **DI-3 (fase-01):** Steps com early-return em dry-run (Step 09 — empty proposal) instrumentados antes do return; isDryRun guard garante que writer=undefined em dry-run.
- **DI-4 (fase-02):** `run-init-rollback.test.ts` tinha 1 falha pre-existente (ENOENT `discovery/agents-log.json`) — confirmada via git stash; nao causada por esta fase.

---

## Bugs Descobertos

Nenhum bug novo introduzido. 1 falha pre-existente em `run-init-rollback.test.ts` (ENOENT) documentada como DI-4.

---

## Gotchas

- **GT-1 (fase-01):** O cast `as unknown as boolean` para `ctx.flags['__auditLog']` (padrao DI-1 do Plano 05) deve ser mantido. NAO evoluir para `Record<string, unknown>` sem ADR especifico — consistencia com `__dryRunRecorder`, `__renameRecorder`.
- **GT-2 (fase-02):** Mensagem de warning cita `ADR-0021` literalmente (nao placeholder) — fases 02 e 03 souberam o numero antes da execucao (inferido de max=0020).

---

## Desvios do Plano

Nenhum desvio significativo. Fases 03/04 rodaram em paralelo e ambas usaram ADR-0021 diretamente (sem placeholder intermediario) — coordenacao resolvida antes da execucao.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 (1 pre-existente documentado) |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Para Plano 07 (Aceitacao E2E + Release v6.4.0)

- **RESOLVIDO:** `INIT_SUBAGENT_IDS` exportado de `skills/init/lib/init-subagent-ids.ts` com 9 entradas. Usar em CA-14 para assertar entries na ordem: `['init-secrets-scan', 'init-discover-existing-docs', 'init-classify-blocks', 'init-propose-merge', 'init-apply-merge', 'init-move-docs', 'init-populate-plan-gen']` (greenfield omite Step 12).
- **RESOLVIDO:** ADR-ID definitivo = **ADR-0021** (`docs/design-docs/ADR-0021-destructive-merge-default.md`). Commit `36c5782`.
- **RESOLVIDO:** `detectCrossUpgrade(input: CrossUpgradeInput)` e funcao pura (sem IO). Plano 07 fase-03 injeta `manifestPluginVersion: '6.3.2'` + `claudeMdLineCount: 287` diretamente para validar warning sem fixture pesada.
- **RESOLVIDO:** `run-init.ts` injeta `__auditLog` writer em `ctx.flags` antes do loop. Plano 07 fase-04 (CA-13 dry-run parity) confirma que `agents-log.json` NAO eh criado em dry-run.
- **ADR-0021** referenciado no CHANGELOG `### Breaking Changes (Behavior)` (2x) e no warning runtime do cross-upgrade-detector.

### Contratos cross-Plano RESOLVIDOS (revisao 2026-05-18 apos Plano 05 detalhado)

> **STATUS: Plano 05 foi detalhado em 2026-05-18 (mesmo dia, sequencia invertida).** Todos os 5 TODOs abaixo foram cross-checked contra `plano05/README.md`, `plano05/fase-03-drift-detector-step-12.md`, `plano05/fase-04-rollback-completo.md`, `plano05/fase-01-dry-run-global-wiring.md` e `plano05/fase-05-additive-merge-opt-in.md`. Diff aplicado em `fase-01-audit-log-canonico-novos-steps.md`.

- **TODO-1 — RESOLVIDO (com diff aplicado):** Plano 05 fase-03 (linha 215, 219) fixou `subagent_id: 'init-drift-detect'` no summary do Step 12. Diff: `INIT_SUBAGENT_IDS.detectDrift` corrigido de `'init-detect-drift'` (palpite errado) para `'init-drift-detect'`. Comentario inline atualizado para "literal CONFIRMADO em revisao 2026-05-18". Teste pareado da fase-01 do Plano 06 + Plano 07 fase-03 CA-14 vao usar o literal correto.
- **TODO-2 — RESOLVIDO:** Plano 05 fase-03 (linhas 46-56) fixou `DriftReport = { generatedAt: string, summary: { placeholder: number, populated: number, drift: number }, byFile: Readonly<Record<string, DriftStatus>> }`. `output_struct` para `init-drift-detect` no audit log: `{ summary: { placeholder, populated, drift }, fileCount: Object.keys(report.byFile).length, reportPath: string | null }` (null em dry-run; senao caminho absoluto do `drift-report.json` via `discovery-store`). Diff aplicado no Arquivos Afetados da fase-01.
- **TODO-3 — RESOLVIDO:** Plano 05 fase-04 (linhas 55-62) fixou `RollbackResult = { restored: readonly string[], skipped: readonly string[], errors: readonly { path, message }[], adrPath: string | null, backupDir: string | null, userCancelled: boolean }`. `output_struct` para `init-rollback` no audit log: `{ restoredCount: result.restored.length, errorCount: result.errors.length, userCancelled: result.userCancelled, adrPath: result.adrPath, backupDir: result.backupDir }`. NAO incluir `result.restored` (array de paths) inteiro — apenas contagens, por consistencia com G3 (zero-PII / counts-only). Diff aplicado.
- **TODO-4 — RESOLVIDO:** Plano 05 fase-05 (linhas 39-56) confirma que `parseFlags` reconhece `--additive-merge` (parser eh generico). Tests pareados em `parse-flags.test.ts` adicionados pelo Plano 05 fase-05. Plano 06 fase-02 (warning runtime) pode SUGERIR `--additive-merge` ao dev sem precisar de wiring adicional.
- **TODO-5 — RESOLVIDO (decisao final: SUPRIMIR entries em dry-run):** Plano 05 README "Produz para" linha 38: `Plano 06 fase-01 (audit log usa isDryRun para suprimir entries em simulacao)`. Decisao final: dry-run NAO emite entries no `agents-log.json`. Justificativa: teste CA-13 (dry-run parity, Plano 07 fase-04) faria comparacao mais ruidosa se entries com `dryRun: true` aparecessem; a parity eh validada via paths registrados no `WriteRecorder`, nao no audit log. Diff aplicado: fase-01 ganhou Passo 4 (NOVO) com padrao `const writer = isDryRun(ctx) ? undefined : ...` e test pareado negativo.

### Gotchas adicionais descobertos durante revisao 2026-05-18

- **GT-CROSS-1 — Slot `__dryRunRecorder` mantido com cast feio (DI-1 do Plano 05):** Plano 05 fase-01 (linhas 105-114) optou por NAO evoluir `StepContext.flags` para `Record<string, unknown>`. O cast `as unknown as boolean` foi mantido por compatibilidade com `parse-flags.ts`. Implicacao para Plano 06: nosso slot `__auditLog` segue o MESMO padrao (cast no inject, type-assertion no consume). Consistencia entre `__dryRunRecorder`, `__auditLog`, `__initMode`, `__renameRecorder` (todos em `ctx.flags` com cast). Evolucao de tipo deferida para v6.5+.
- **GT-CROSS-2 — `runId` correlacao com discovery (Plano 03):** `audit-log.ts` JSDoc menciona "mesmo run_id do InventoryResult". Plano 03 fase-02 introduz `discovery-store.ts` que pode aceitar `runId` opcional. Decisao final: dispatcher gera `randomUUID()` no inicio do `runInit` e injeta em ambos `__auditLog` (writer) e `__runId` (slot opcional para discovery-store reusar). Garante que `inventory.json` (Plano 03) e `agents-log.json` (Plano 06) compartilham o mesmo `runId`.
- **GT-CROSS-3 — `move` reversal sem campo `movedTo` (DI-2 do Plano 05):** Plano 05 fase-04 (linha 199, 407) registra que rollback de `action: 'move'` deixa residuo no path movido (stub nao eh removido). `output_struct.errorCount` do `init-rollback` NAO incrementa por esse residuo — eh aceitavel por design. Documentar no CHANGELOG (Plano 06 fase-04) como "limitacao conhecida do rollback v6.4.0" e referenciar issue futura para v6.5+.

### Pontos de friccao a sinalizar ao orchestrador

- O `output_struct` de cada step nao tem schema versionado — eh `unknown` em `AgentLogEntry`. Risco moderado de drift entre testes (que assumem shape) e impls (que evoluem livremente). Considerar futura ADR "Schema per step do audit log" no v6.5+ caso o numero de assertions cresca.
- A versao do plugin lida em runtime depende de `.claude-plugin/plugin.json` — confirmar que o file system loader funciona em ambos os modos de instalacao (clone local vs install via marketplace). Se diferir, ajustar `cross-upgrade-detector.ts` para aceitar `currentPluginVersion` como injecao explicita (testabilidade ja garantida) E adicionar fallback para `package.json` se o `.claude-plugin/` nao existir.

---

<!-- Atualizado automaticamente durante execucao -->
