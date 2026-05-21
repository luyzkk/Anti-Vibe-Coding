<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 02: Step 9 (`copy-knowledge`) real — port + remocao dry-run

**Plano:** 05 — Steps 8-10 + harness-validate + E2E final
**Sizing:** 1h
**Depende de:** Nenhuma (paralela a fase-01, 03, 04). Plano 01 fase-04 ja criou stub `copyKnowledgeStep` em `steps/09-copy-knowledge.ts`.
**Visual:** false

---

## O que esta fase entrega

`skills/init/lib/steps/09-copy-knowledge.ts` REAL que porta a logica de `03_1-persist-stack-and-knowledge.ts` SEM o dry-run guard (D4). Reusa `runStackKnowledgeInit` (orquestrador existente — detectMultiStack + writeStackJson + copyKnowledge + emitStackKnowledgeEvents + Rails warnings). Stack=null = skip gracioso (RF-11) — NAO aborta (diferente de Step 7 / DR-2). Summary inclui `stackPrimary` e `copyResult.status`. DI-2 pattern preservado: runner injetavel para testes sem mock.module pollution.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/09-copy-knowledge.ts` | Modify | Substituir stub por logica real portada de `03_1-persist-stack-and-knowledge.ts` (sem dry-run guard). Manter runner injetavel (DI-2). |
| `skills/init/lib/steps/09-copy-knowledge.test.ts` | Create | Testes unit cobrindo: stack=node copia atoms; stack=null skip gracioso (RF-11); summary inclui stackPrimary + status; D4 attestation. |
| `skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts` | (NAO TOCAR nesta fase) | Sera deletado em fase-05. Mantido para audit comparativo. |

---

## Implementacao

### Passo 1: Confirmar stub existente

```bash
grep "copyKnowledgeStep" skills/init/lib/steps/09-copy-knowledge.ts
# Esperado: export const copyKnowledgeStep: Step = { id: 'copy-knowledge', async run() { ... } }
```

### Passo 2: Escrever teste RED com runner injetavel

```typescript
// skills/init/lib/steps/09-copy-knowledge.test.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-02 — RF-11 skip gracioso, summary stack-aware, D4 attestation.

import { test, expect, describe } from 'bun:test'
import { runCopyKnowledgeStep } from './09-copy-knowledge'
import type { RunStackKnowledgeInitResult } from '../run-stack-knowledge-init'

const ctxBase = { cwd: '/tmp/fake', args: [] as readonly string[], flags: {} }

describe('Step 9: copy-knowledge', () => {
  test('stack=node-ts: summary contains stackPrimary and copyResult.status', async () => {
    const runner = async (): Promise<RunStackKnowledgeInitResult> => ({
      stackPrimary: 'nodejs-typescript',
      stackJsonMessage: 'stack.json written. primary = nodejs-typescript',
      copyResult: { status: 'ok', message: 'copied 12 atoms', atomsCount: 12 } as any,
      previewEmitted: true,
    })
    const report = await runCopyKnowledgeStep(ctxBase, runner)
    expect(report.mutated).toBe(true)
    expect(report.summary).toContain('nodejs-typescript')
    expect(report.summary).toContain('ok')
  })

  test('RF-11: stack=null skip gracioso — does NOT throw, returns mutated=true with skip summary', async () => {
    const runner = async (): Promise<RunStackKnowledgeInitResult> => ({
      stackPrimary: null,
      stackJsonMessage: 'stack.json written. primary = null',
      copyResult: { status: 'no-source', message: 'no source for primary=null', atomsCount: 0 } as any,
      previewEmitted: false,
    })
    const report = await runCopyKnowledgeStep(ctxBase, runner)
    expect(report.mutated).toBe(true) // stack.json AINDA foi escrito mesmo com primary=null
    expect(report.summary).toMatch(/skipped|no-source|no stack/i)
  })

  test('Rails legado: warnings sao propagadas no summary (best-effort)', async () => {
    const runner = async (): Promise<RunStackKnowledgeInitResult> => ({
      stackPrimary: 'rails',
      stackJsonMessage: 'stack.json written. primary = rails',
      copyResult: { status: 'ok', message: 'copied 8 atoms', atomsCount: 8 } as any,
      previewEmitted: true,
      warnings: ['Rails 6.1 detected — knowledge atoms target Rails 7+'],
    })
    const report = await runCopyKnowledgeStep(ctxBase, runner)
    expect(report.summary).toContain('rails')
    // 2026-05-21 (Luiz/dev): warnings sao loggadas pelo runner via console.log;
    // step nao precisa duplicar no summary, mas pode incluir count.
  })

  // 2026-05-21 (Luiz/dev): D4 attestation — Step 09 NAO contem dry-run guard.
  test('D4: dry-run flag is ignored — runner is invoked regardless', async () => {
    let runnerCalled = false
    const runner = async (): Promise<RunStackKnowledgeInitResult> => {
      runnerCalled = true
      return {
        stackPrimary: 'nodejs-typescript',
        stackJsonMessage: '',
        copyResult: { status: 'ok', message: '', atomsCount: 0 } as any,
        previewEmitted: false,
      }
    }
    const ctx = { ...ctxBase, flags: { 'dry-run': true } }
    await runCopyKnowledgeStep(ctx, runner)
    expect(runnerCalled).toBe(true) // would be false in v6.7 with dry-run guard
  })

  test('reentry re-populate: runner receives refresh=true', async () => {
    let receivedRefresh: boolean | undefined
    const runner = async (opts: { refresh?: boolean }): Promise<RunStackKnowledgeInitResult> => {
      receivedRefresh = opts.refresh
      return {
        stackPrimary: 'nodejs-typescript',
        stackJsonMessage: '',
        copyResult: { status: 'ok', message: '', atomsCount: 0 } as any,
        previewEmitted: false,
      }
    }
    const ctx = { ...ctxBase, flags: { __reentryMode: 're-populate' } }
    await runCopyKnowledgeStep(ctx, runner as any)
    expect(receivedRefresh).toBe(true)
  })
})
```

Rodar `bun test skills/init/lib/steps/09-copy-knowledge.test.ts` → RED esperado.

### Passo 3: Portar logica de `03_1-persist-stack-and-knowledge.ts` para `09-copy-knowledge.ts`

```typescript
// skills/init/lib/steps/09-copy-knowledge.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-02 — port de 03_1-persist-stack-and-knowledge.ts sem dry-run guard (D4).
// RF-11: stack=null skip gracioso (NAO aborta — diferente do Step 7 DR-2).

import { runStackKnowledgeInit } from '../run-stack-knowledge-init'
import type { RunStackKnowledgeInitOpts, RunStackKnowledgeInitResult } from '../run-stack-knowledge-init'
import type { Step } from './types'
import { resolvePluginRoot } from './helpers'

// 2026-05-21 (Luiz/dev): DI-2 — runner injetavel preservado de 03_1-persist-stack-and-knowledge.ts.
// Compound note 2026-05-16-bun-mock-module-pollution.md.
export type StackKnowledgeRunner = (opts: RunStackKnowledgeInitOpts) => Promise<RunStackKnowledgeInitResult>

export async function runCopyKnowledgeStep(
  ctx: { cwd: string; args: readonly string[]; flags?: Record<string, unknown> },
  runner: StackKnowledgeRunner = runStackKnowledgeInit,
  pluginRootOverride?: string,
): Promise<{ mutated: boolean; summary: string }> {
  const pluginRoot = pluginRootOverride ?? resolvePluginRoot(import.meta.dir)
  // 2026-05-21 (Luiz/dev): D5.B.2 do PRD knowledge-path-cutover — refresh quando re-populate.
  // Greenfield (flags ausente ou __reentryMode !== 're-populate') usa false.
  const refresh = ctx.flags?.['__reentryMode'] === 're-populate'
  const result = await runner({
    targetDir: ctx.cwd,
    pluginRoot,
    args: ctx.args.join(' '),
    refresh,
  })

  // 2026-05-21 (Luiz/dev): summary single-line stack-aware (DI-Plano05-fase02-summary-format).
  // RF-11: primary=null e estado valido — summary indica skip mas mutated=true (stack.json escrito).
  const primary = result.stackPrimary ?? 'none'
  const status = result.copyResult.status
  const summary =
    result.stackPrimary === null
      ? `copy-knowledge: skipped (no stack detected, status=${status})`
      : `copy-knowledge: stack=${primary}, status=${status}`

  return { mutated: true, summary }
}

export const copyKnowledgeStep: Step = {
  id: 'copy-knowledge',
  async run(ctx) {
    // 2026-05-21 (Luiz/dev): D4 — SEM dry-run guard. Step antigo 03_1-persist-stack-and-knowledge.ts:38-43 removido.
    return runCopyKnowledgeStep(ctx)
  },
}
```

### Passo 4: GREEN + REFACTOR

Rodar `bun test skills/init/lib/steps/09-copy-knowledge.test.ts` → esperado 5 passed.

REFACTOR: verificar que summary nao excede 1 linha. Se logger do `runStackKnowledgeInit` emitir multilinhas (ok — console.log dele, nao do step), step summary continua single-line.

### Passo 5: VERIFY

```bash
bun test skills/init/lib/steps/09-copy-knowledge.test.ts
bun run lint -- skills/init/lib/steps/09-copy-knowledge.ts
grep -c "dry-run\|isDryRun" skills/init/lib/steps/09-copy-knowledge.ts
# Esperado: 0
```

---

## Gotchas

- **G4 do plano (RF-11 skip gracioso):** o teste com `stackPrimary: null` deve passar **sem throw**. Se o step der throw (ex: `if (!stackPrimary) throw new AbortError(...)`), confundiu DR-2 (Step 7) com RF-11 (Step 9). Step 9 e PERMISSIVO.
- **G9 do plano (DV-4 — `ctx.stack` opcional):** o step NAO usa `ctx.stack` — detecta internamente via `runStackKnowledgeInit` → `detectMultiStack`. Manter assim. Se um teste tentar `ctx.stack = {primary: 'node'}` esperando que o step pule deteccao, falha (ignorado).
- **Local — `RunStackKnowledgeInitResult.copyResult.status`:** valores possiveis sao `'ok'`, `'no-source'`, `'no-matrix'`. O teste deve usar `as any` para o `copyResult` se nao quiser importar o tipo `CopyKnowledgeResult` completo. Aceitavel para testes (nao para producao).
- **Local — `runner` injetavel evita `mock.module`:** compound note 2026-05-16-bun-mock-module-pollution.md explica por que. Manter o padrao mesmo que tente parecer over-engineered para teste pequeno.

---

## Verificacao

### TDD

- [ ] **RED:** Testes em `09-copy-knowledge.test.ts` falham porque stub retorna sem invocar runner.
  - Comando: `bun test skills/init/lib/steps/09-copy-knowledge.test.ts`
  - Resultado esperado: 5 failed (assertion failures)

- [ ] **GREEN:** Apos porting, todos os 5 testes passam.
  - Comando: `bun test skills/init/lib/steps/09-copy-knowledge.test.ts`
  - Resultado esperado: `5 passed, 0 failed`

### Checklist

- [ ] `09-copy-knowledge.ts` reescrito com porting de `03_1-persist-stack-and-knowledge.ts`
- [ ] Dry-run guard REMOVIDO (D4): `grep -c "dry-run\|isDryRun" 09-copy-knowledge.ts` retorna `0`
- [ ] DI-2 preservado: `StackKnowledgeRunner` type exportado, `runCopyKnowledgeStep` aceita runner
- [ ] RF-11: stack=null nao throws, summary indica skip
- [ ] Refresh propagado: `__reentryMode === 're-populate'` vira `refresh: true`
- [ ] Summary single-line formato `copy-knowledge: stack={primary}, status={status}` ou `copy-knowledge: skipped (no stack...)`
- [ ] `bun run test` (suite completa) verde
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/09-copy-knowledge.test.ts` retorna `5 passed, 0 failed`
- `grep -c "dry-run\|isDryRun" skills/init/lib/steps/09-copy-knowledge.ts` retorna `0`
- `grep -c "StackKnowledgeRunner" skills/init/lib/steps/09-copy-knowledge.ts` retorna `>= 2` (type export + default param)

**Por humano:**
- Inspecao visual: lado-a-lado com `03_1-persist-stack-and-knowledge.ts`, confirma que `if (ctx.flags['dry-run']...)` (linhas 38-43 do antigo) SUMIU no novo. Restante e identico modulo wording de comentarios.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
