<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Audit Log Canonico em Todos os Novos Steps

**Plano:** 06 — Comunicacao + Observabilidade
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase do plano); gate externo: Planos 03, 04 e 05 precisam ter entregue wrapper `logAudit` stub em Steps 06/07/08/09/10/11/12/91 + comando `--rollback`. **Contratos do Plano 05 fixados (revisao 2026-05-18):** `subagent_id` literais (`init-drift-detect`, `init-rollback`), shape de `DriftReport` e `RollbackResult`, slot `ctx.flags['__initMode']` para mode propagation, helper `isDryRun(ctx)` em `lib/dry-run-mode.ts`.
**Visual:** false

---

## O que esta fase entrega

Conforme **D19**, **SH-07** e **CA-14** do PRD: substituir o wrapper local `logAudit` (introduzido como stub nos Planos 03/04/05) por chamada real ao `AuditLogWriter.append` existente, com `subagent_id` canonico literal centralizado em `INIT_SUBAGENT_IDS`, `duration_ms` medido em `performance.now()`, `retry_count` e `output_struct` semantica por step. Resultado: todos os 8 novos steps + comando `--rollback` emitem entries deterministicas no `discovery/agents-log.json`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/init-subagent-ids.ts` | Create | Const `INIT_SUBAGENT_IDS` literal canonica (9 entradas) — fonte unica de verdade dos subagent_id |
| `skills/init/lib/init-subagent-ids.test.ts` | Create | 1 teste de shape (todas as 9 chaves presentes + literais nao vazias) |
| `skills/init/lib/audit-log-writer-factory.ts` | Create | Helper `createAuditLogWriterForCtx(ctx, runId)` injeta `AuditLogWriter` em `ctx.flags['__auditLog']` ou no-op |
| `skills/init/lib/audit-log-writer-factory.test.ts` | Create | 3 testes: factory cria writer real quando `runId` valido; no-op quando `runId` ausente; idempotente quando ja injetado |
| `skills/init/lib/steps/06-secrets-scan.ts` | Modify | Substitui `logAudit({...})` stub por `await ctx.flags['__auditLog']?.append({subagent_id: INIT_SUBAGENT_IDS.secretsScan, ...})` com `duration_ms` real |
| `skills/init/lib/steps/07-discover-existing-docs.ts` | Modify | Idem para `INIT_SUBAGENT_IDS.discoverDocs` |
| `skills/init/lib/steps/08-classify-blocks-hybrid.ts` | Modify | Idem para `INIT_SUBAGENT_IDS.classifyBlocks` |
| `skills/init/lib/steps/09-propose-merge-batch.ts` | Modify | Idem para `INIT_SUBAGENT_IDS.proposeMerge` |
| `skills/init/lib/steps/10-apply-merge-destructive.ts` | Modify | Idem para `INIT_SUBAGENT_IDS.applyMerge` |
| `skills/init/lib/steps/11-move-docs-with-stub.ts` | Modify | Idem para `INIT_SUBAGENT_IDS.moveDocs` |
| `skills/init/lib/steps/12-detect-drift-incremental.ts` | Modify | Idem para `INIT_SUBAGENT_IDS.detectDrift`. `output_struct` per Plano 05 fase-03: `{ summary: { placeholder, populated, drift }, fileCount: Object.keys(report.byFile).length, reportPath: string \| null }` (null em dry-run, senao caminho absoluto do `drift-report.json` escrito via `discovery-store`) |
| `skills/init/lib/steps/91-generate-populate-plan.ts` | Modify | Idem para `INIT_SUBAGENT_IDS.populatePlanGen` (Plano 02 fase-03 ja usa o literal em `summary`; aqui sobe pra `AuditLogWriter`) |
| `skills/init/lib/rollback.ts` | Modify | Idem para `INIT_SUBAGENT_IDS.rollback`. `output_struct` per Plano 05 fase-04 (`RollbackResult`): `{ restoredCount: result.restored.length, errorCount: result.errors.length, userCancelled: result.userCancelled, adrPath: result.adrPath, backupDir: result.backupDir }` |
| `skills/init/lib/run-init.ts` | Modify | No inicio do `runInit` (apos `parseFlags`, antes do loop), chama `createAuditLogWriterForCtx` se `--no-audit-log` nao estiver setado |
| `skills/init/lib/run-init-audit-integration.test.ts` | Create | Integration test: stubea registry com os 8 novos steps + spy no `AuditLogWriter.append`, valida que TODAS as 8 entries aparecem na ordem CA-14 (secrets → discover → classify → propose → apply → move → populate-plan-gen [+ detect-drift em already-initiated]) |

**Total:** 2 arquivos novos (4 contando testes) + 9 arquivos modificados = 13 arquivos tocados. **Acima do limite de 5/fase do CLAUDE.md** — justificado por ser refactor mecanico (Tabela Akita: "Refactoring mecanico" = agente faz bem) substituindo wrapper por chamada real com mesma assinatura. Risco de regressao baixo, testes pareados de cada step preservados.

---

## Implementacao

### Passo 1: Centralizar `subagent_id` literais

Conforme **G4 do README**, criar fonte unica de verdade dos literais. Eliminar strings cruas espalhadas.

```typescript
// skills/init/lib/init-subagent-ids.ts
/**
 * Conforme D19 + SH-07 do PRD refactor-init-harness-populate-merge (2026-05-18):
 * subagent_id canonicos para entries no agents-log.json emitidas pelos novos steps
 * e pelo comando --rollback. Fonte unica de verdade — steps NUNCA usam string literal.
 *
 * Adicionar uma nova entrada aqui SEMPRE acompanhada de:
 *   1. Atualizar tipo `InitSubagentId` (derivado via `typeof`)
 *   2. Adicionar teste em `init-subagent-ids.test.ts`
 *   3. Citar onde o step consumidor vive (Plano X fase-Y)
 */
export const INIT_SUBAGENT_IDS = {
  secretsScan: 'init-secrets-scan',           // Plano 03 fase-02 (Step 06)
  discoverDocs: 'init-discover-existing-docs', // Plano 03 fase-04 (Step 07)
  classifyBlocks: 'init-classify-blocks',     // Plano 03 fase-06 (Step 08)
  proposeMerge: 'init-propose-merge',         // Plano 04 fase-02 (Step 09)
  applyMerge: 'init-apply-merge',             // Plano 04 fase-03 (Step 10)
  moveDocs: 'init-move-docs',                 // Plano 04 fase-05 (Step 11)
  detectDrift: 'init-drift-detect',           // Plano 05 fase-03 (Step 12) — literal CONFIRMADO em revisao 2026-05-18
  populatePlanGen: 'init-populate-plan-gen',  // Plano 02 fase-03 (Step 91)
  rollback: 'init-rollback',                  // Plano 05 fase-04 (comando --rollback)
} as const

export type InitSubagentId = (typeof INIT_SUBAGENT_IDS)[keyof typeof INIT_SUBAGENT_IDS]
```

### Passo 2: Factory do AuditLogWriter

Conforme **D19**, dispatcher precisa instanciar UM writer por run e injetar nos steps via `ctx`. Reaproveita `AuditLogWriter` existente em `skills/init/lib/audit-log.ts`.

```typescript
// skills/init/lib/audit-log-writer-factory.ts
import { AuditLogWriter } from './audit-log'
import type { StepContext } from './steps/types'

/**
 * Conforme D19 do PRD: cria writer canonico para um run de `runInit` e
 * deposita em `ctx.flags['__auditLog']` para que steps consumam sem mudar a assinatura
 * de `Step.run(ctx)`. Reusa contrato existente — sem nova API.
 *
 * @param targetDir cwd do projeto-alvo (mesmo que `ctx.cwd`)
 * @param runId UUID correlacionando inventory ↔ agents-log (vem do PRD anterior — discovery)
 * @returns AuditLogWriter pronto, ou null se audit log estiver desabilitado (`--no-audit-log`)
 */
export function createAuditLogWriterForCtx(
  targetDir: string,
  runId: string | null,
  opts: { disabled?: boolean } = {},
): AuditLogWriter | null {
  if (opts.disabled === true) return null
  if (runId === null || runId.length === 0) return null
  return new AuditLogWriter(targetDir, runId)
}
```

### Passo 3: Padrao de uso em cada step refatorado

Refactor mecanico — antes e depois.

**Antes (Plano 03 fase-02 stub):**

```typescript
// skills/init/lib/steps/06-secrets-scan.ts (estado pos-Plano03)
async function logAudit(ctx: StepContext, payload: AuditPayload): Promise<void> {
  const writer = ctx.flags['__auditLog']
  if (writer === undefined) return // stub no-op
  // TODO Plano 06 fase-01: substituir por chamada real
}
```

**Depois (entregue por esta fase):**

```typescript
// skills/init/lib/steps/06-secrets-scan.ts (estado pos-Plano06 fase-01)
import { INIT_SUBAGENT_IDS } from '../init-subagent-ids'
import type { AuditLogWriter } from '../audit-log'

export const secretsScanStep: Step = {
  id: '06-secrets-scan',
  async run(ctx) {
    const start = performance.now()
    const writer = ctx.flags['__auditLog'] as AuditLogWriter | undefined

    const matches = await scanSecrets(ctx.cwd)

    const duration_ms = Math.round(performance.now() - start)
    await writer?.append({
      subagent_id: INIT_SUBAGENT_IDS.secretsScan,
      input_paths: [ctx.cwd], // path ALVO, NAO conteudo escaneado (G5: zero PII)
      output_struct: { matchCount: matches.length, blockedFiles: matches.map(m => m.path) },
      duration_ms,
      retry_count: 0,
    })

    return { mutated: false, summary: `secrets-scan: ${matches.length} match(es)` }
  },
}
```

Replicar **exatamente o mesmo padrao** nos 7 steps restantes + comando `--rollback`, variando apenas o literal `INIT_SUBAGENT_IDS.X` e o shape de `output_struct` semantico.

**Shapes canonicos de `output_struct` (fixados em revisao 2026-05-18 apos Plano 05 detalhado):**

| subagent_id | output_struct shape (esperado nos testes) |
|-------------|-------------------------------------------|
| `init-secrets-scan` | `{ matchCount: number, blockedFiles: string[] }` |
| `init-discover-existing-docs` | `{ candidateCount: number, scannedRoots: string[] }` |
| `init-classify-blocks` | `{ classifiedCount: number, byCategory: Record<string, number>, pendingLlmRefinement: boolean }` |
| `init-propose-merge` | `{ claudeMdReduction: { fromLines: number, toLines: number }, docMovesCount: number, blockedBySecretsCount: number }` |
| `init-apply-merge` | `{ backupDir: string, transformedFiles: string[], extractedToDesign: number }` |
| `init-move-docs` | `{ movedCount: number, stubsCreated: number, linksRewritten: number }` |
| `init-drift-detect` | `{ summary: { placeholder, populated, drift }, fileCount: number, reportPath: string \| null }` |
| `init-populate-plan-gen` | `{ planPath: string, taskCount: number }` |
| `init-rollback` | `{ restoredCount: number, errorCount: number, userCancelled: boolean, adrPath: string \| null, backupDir: string \| null }` |

### Passo 4 (NOVO): Dry-run audit log behavior — suprimir entries em simulacao

Conforme **Plano 05 README "Produz para"**: `Plano 06 fase-01 (audit log usa isDryRun para suprimir entries em simulacao)`. Decisao final: **dry-run NAO emite entries no `agents-log.json`** — caso contrario o teste CA-13 (dry-run parity, Plano 07 fase-04) precisaria filtrar/comparar entries com `dryRun: true`, complicando a comparacao byte-identica entre paths previstos e reais.

```typescript
// Padrao em CADA step (e no comando --rollback):
const writer = isDryRun(ctx) ? undefined : (ctx.flags['__auditLog'] as AuditLogWriter | undefined)
await writer?.append({ subagent_id: INIT_SUBAGENT_IDS.X, ... })
```

Test pareado em `run-init-audit-integration.test.ts` adiciona um caso negativo:

```typescript
it('does NOT emit audit log entries in --dry-run mode', async () => {
  const tmp = await mkdtemp(...)
  await runInit(['--dry-run'], { cwd: tmp, askUser: async () => 'Confirm' })
  // agents-log.json nao deve existir OU deve estar vazio
  const logPath = path.join(tmp, 'discovery', 'agents-log.json')
  const exists = await fs.access(logPath).then(() => true).catch(() => false)
  if (exists) {
    const log = JSON.parse(await readFile(logPath, 'utf-8'))
    expect(log.entries).toHaveLength(0)
  }
})
```

### Passo 5: Instanciacao no dispatcher

Conforme **G7 do README** + **D19**:

```typescript
// skills/init/lib/run-init.ts (adicao apos parseFlags, antes do for loop)
import { createAuditLogWriterForCtx } from './audit-log-writer-factory'
import { randomUUID } from 'node:crypto'

// ...dentro de runInit, apos const ctx = ...:
const auditLogWriter = createAuditLogWriterForCtx(
  ctx.cwd,
  // 2026-05-18 (Luiz/dev): run_id derivado de UUID novo a cada execucao do init.
  // Conforme D19 + audit-log.ts JSDoc: correlaciona inventory↔agents-log; se inventory
  // run_id existir em discovery prior, reusa; senao gera novo.
  randomUUID(),
  { disabled: ctx.flags['--no-audit-log'] === true },
)
const ctxWithAudit: StepContext = auditLogWriter !== null
  ? { ...ctx, flags: { ...ctx.flags, __auditLog: auditLogWriter } }
  : ctx
// substituir uso de `ctx` por `ctxWithAudit` no loop
```

### Passo 6: Integration test cross-step (CA-14)

```typescript
// skills/init/lib/run-init-audit-integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { tmpdir } from 'node:os'
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { runInit } from './run-init'
// ... importar registry com fixture non-greenfield + CLAUDE.md de 287 linhas + 4 docs

describe('runInit emits canonical audit log entries (CA-14)', () => {
  it('records entries on order: secrets → discover → classify → propose → apply → move → populate-plan-gen', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'audit-ca14-'))
    await mkdir(path.join(tmp, 'discovery'), { recursive: true })
    // ... popula fixture com CLAUDE.md inflado + ARQUITETURA.md etc

    await runInit([], { cwd: tmp /* askUser stub aprova batch */ })

    const log = JSON.parse(await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8'))
    const ids = log.entries.map((e: any) => e.subagent_id)
    expect(ids).toEqual([
      'init-secrets-scan',
      'init-discover-existing-docs',
      'init-classify-blocks',
      'init-propose-merge',
      'init-apply-merge',
      'init-move-docs',
      'init-populate-plan-gen',
    ])
    for (const entry of log.entries) {
      expect(entry).toMatchObject({
        input_paths: expect.any(Array),
        output_struct: expect.any(Object),
        duration_ms: expect.any(Number),
        retry_count: 0,
      })
    }
  })
})
```

---

## Gotchas

- **G1 herdado (G1 do README) — Contratos do Plano 05 RESOLVIDOS (2026-05-18):** Plano 05 fase-03 fixou `subagent_id: 'init-drift-detect'` (NAO `'init-detect-drift'` como assumimos antes — `INIT_SUBAGENT_IDS.detectDrift` ja foi corrigido). Plano 05 fase-04 fixou `executeRollback({ cwd, askUser?, log? }): Promise<RollbackResult>` com `RollbackResult = { restored, skipped, errors, adrPath, backupDir, userCancelled }`. Mode propagation: `ctx.flags['__initMode']`. Sem outros desvios pendentes — testes pareados ja referenciam os literais corretos.
- **G2 herdado (G4 do README) — Literais antes vs depois:** Fazer um `Grep "'init-(secrets-scan|discover-existing-docs|classify-blocks|propose-merge|apply-merge|move-docs|detect-drift|populate-plan-gen|rollback)'" skills/init/lib` antes de iniciar para mapear todas as ocorrencias atuais. Apos refactor, repetir o grep — esperar 1 ocorrencia por literal (na definicao do `INIT_SUBAGENT_IDS`) + 1 ocorrencia em cada teste pareado.
- **G3 herdado (G5 do README) — Zero PII no `output_struct`:** Steps 06 (secrets-scan), 07 (discover) e 10 (apply-merge — extrai blocos de CLAUDE.md) tem risco de vazar conteudo cru. Convencao: `output_struct` contem **counts + paths + categorias**, NUNCA o texto do bloco. Asserter negativo no teste de integracao: `expect(JSON.stringify(log)).not.toMatch(/AKIA[0-9A-Z]{16}/)`.
- **G4 herdado (G7 do README) — `performance.now()` Windows safety:** Funciona nativo em Node 18+ e Bun. Sem `bun -e` em runtime. Cast `Math.round` para `duration_ms` inteiro (esperado pelo schema do `AgentLogEntry`).
- **Local — `runId` correlacao:** O `audit-log.ts` JSDoc menciona "mesmo run_id do InventoryResult". No init refactor v6.4.0 o discovery roda dentro do mesmo `runInit`, entao gerar `randomUUID()` no inicio do dispatcher eh aceitavel — Plano 03 pode opcionalmente sobrescrever via `ctx.flags['__runId']` se quiser fixar para fixtures. Documentar no MEMORY como decisao.
- **Local — `--no-audit-log` flag opt-out:** Nao esta no PRD, mas eh util para CI/tests determinisicos. Adicionar como flag reconhecida em `parseFlags` (mudanca de 1 linha). Se Plano 01 fase-03 ja parseou flags arbitrarias, nao precisa mudar — apenas documentar.
- **Local — Ordem das entries em modo `already-initiated`:** Em re-run (Plano 05 fase-03), Steps 06-11 sao pulados e apenas Step 12 + Step 91 emitem entries. CA-14 do PRD lista a ordem do caminho com merge destrutivo (cenario principal); o teste CA-14 NAO deve assertar Step 12 na sequencia (eh exclusivo do `already-initiated`). Test separado em fase-01 do Plano 07 cobre o caminho re-run.

---

## Verificacao

### TDD

- [ ] **RED — `init-subagent-ids`:** Teste de shape escrito ANTES do arquivo existir; falha por `Cannot find module './init-subagent-ids'`
  - Comando: `bun test skills/init/lib/init-subagent-ids.test.ts`
  - Resultado esperado: `error: Cannot find module './init-subagent-ids'` (compilation error eh aceitavel aqui — modulo ausente)

- [ ] **GREEN — `init-subagent-ids`:** Const criada com 9 entradas, teste passa
  - Comando: `bun test skills/init/lib/init-subagent-ids.test.ts`
  - Resultado esperado: `1 passed, 0 failed`

- [ ] **RED — factory:** Teste do factory falha por `Cannot find module './audit-log-writer-factory'`
  - Comando: `bun test skills/init/lib/audit-log-writer-factory.test.ts`
  - Resultado esperado: error compilation

- [ ] **GREEN — factory:** Factory implementado, 3 testes verdes
  - Comando: `bun test skills/init/lib/audit-log-writer-factory.test.ts`
  - Resultado esperado: `3 passed, 0 failed`

- [ ] **RED — integration CA-14:** Teste de integracao falha porque steps ainda usam wrapper stub (entries do log existem mas sem `subagent_id` ou em ordem errada)
  - Comando: `bun test skills/init/lib/run-init-audit-integration.test.ts`
  - Resultado esperado: `Expected ['init-secrets-scan', ...]; Received [...]` (assertion failure)

- [ ] **GREEN — integration CA-14:** Refactor dos 8 steps + comando `--rollback` concluido; integration test verde
  - Comando: `bun test skills/init/lib/run-init-audit-integration.test.ts`
  - Resultado esperado: `1 passed, 0 failed`

### Checklist

- [ ] `INIT_SUBAGENT_IDS` exportado com EXATAMENTE 9 entradas (count via `Object.keys(INIT_SUBAGENT_IDS).length === 9`).
- [ ] `Grep "logAudit\\(" skills/init/lib` retorna ZERO ocorrencias (wrapper stub eliminado).
- [ ] `Grep "'init-(secrets-scan|discover-existing-docs|classify-blocks|propose-merge|apply-merge|move-docs|detect-drift|populate-plan-gen|rollback)'" skills/init/lib` retorna EXATAMENTE 1 ocorrencia por literal na definicao + 1 por teste pareado (total esperado ~18, validar via grep -c).
- [ ] Asserter negativo PII: `JSON.stringify(agents-log.json)` em fixture com CLAUDE.md inflado NAO contem nenhum dos patterns AKIA/sk_live_/postgres:// (proxy para "nenhum secret vazou").
- [ ] Steps individuais existentes (06/07/08/09/10/11/12/91) e comando `--rollback` continuam verdes apos refactor (sem regressao).
- [ ] `bun run lint` clean em todos os arquivos tocados.
- [ ] `bun run typecheck` clean (tipo `InitSubagentId` derivado corretamente).

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/init-subagent-ids.test.ts skills/init/lib/audit-log-writer-factory.test.ts skills/init/lib/run-init-audit-integration.test.ts skills/init/lib/steps/06-secrets-scan.test.ts skills/init/lib/steps/07-discover-existing-docs.test.ts skills/init/lib/steps/08-classify-blocks-hybrid.test.ts skills/init/lib/steps/09-propose-merge-batch.test.ts skills/init/lib/steps/10-apply-merge-destructive.test.ts skills/init/lib/steps/11-move-docs-with-stub.test.ts skills/init/lib/steps/12-detect-drift-incremental.test.ts skills/init/lib/steps/91-generate-populate-plan.test.ts skills/init/lib/rollback.test.ts` retorna `0 failed`.
- `bun run lint && bun run typecheck` retornam exit 0.
- Fixture E2E non-greenfield (`tests/fixtures/inverted-merge-v6.4/`, criado em Plano 07 fase-02) executado via `runInit` produz `discovery/agents-log.json` cuja propriedade `entries.map(e => e.subagent_id)` eh **exatamente** `['init-secrets-scan', 'init-discover-existing-docs', 'init-classify-blocks', 'init-propose-merge', 'init-apply-merge', 'init-move-docs', 'init-populate-plan-gen']`.

**Por humano (manual review):**
- `Grep "logAudit\\(" skills/init/lib` (deve retornar zero) — confirma extincao do wrapper stub.
- Spot-check de 2 entries no `agents-log.json` apos run real: `output_struct` contem apenas paths/counts/categorias, nunca trechos de CLAUDE.md ou secrets.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
