# Fase 02: Atualizar Step 7 (summary + abort message)

**Plano:** 02 — Orchestrator, Hierarchy, Goldens
**Sizing:** 30min
**Depende de:** fase-01 (consome `GenerateResultV2`)
**Visual:** false

---

## O que esta fase entrega

`07-generate-populate-plans.ts` consome o novo shape do `GenerateResultV2` (`folderPath`, `fasePlans` em vez de `plans`). Summary multilinha aponta para a nova pasta. `ABORT_MESSAGE_NO_STACK` atualizada: troca `"16 populate plans"` por `"16 fases of populate-harness"` para refletir a nova realidade (1 pasta, 16 fases dentro).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/07-generate-populate-plans.ts` | Modify | Consome `GenerateResultV2`, atualiza summary + ABORT_MESSAGE_NO_STACK |
| `skills/init/lib/steps/07-generate-populate-plans.test.ts` | Modify | Testes asserta novo wording do summary e do abort |

---

## Implementacao

### Passo 1: Atualizar `ABORT_MESSAGE_NO_STACK`

```typescript
// skills/init/lib/steps/07-generate-populate-plans.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-02 — DR-2 wording refletindo hierarquia.

export const ABORT_MESSAGE_NO_STACK =
  'Stack not detected — run /anti-vibe-coding:detect-architecture before /init.\n' +
  'Detected primary: null.\n' +
  'Waves in the 16 populate-harness fases cannot be path-resolved without stack.'
```

> Mudanca minima: `"16 populate plans"` → `"the 16 populate-harness fases"`. Mantem prefixo de DR-2.

### Passo 2: Atualizar `summary` multilinha

```typescript
async run(ctx) {
  if (!ctx.stack || ctx.stack.primary === null) {
    throw new AbortError({ code: ABORT_CODE_NO_STACK, reason: ABORT_MESSAGE_NO_STACK })
  }

  const result = await generatePopulatePlans({
    cwd: ctx.cwd,
    stack: ctx.stack,
  })

  // 2026-05-21 (Luiz/dev): Plano 02 fase-02 — summary aponta para pasta unica.
  const summary = [
    `init-07: 1 folder generated with ${result.fasePlans.length} fases (${result.stackPrimary} stack)`,
    `Folder: ${result.folderPath}`,
    `Legacy artifacts found: ${result.legacyArtifactsFound}`,
    `Docs skipped: ${result.docsSkipped.length} (${result.docsSkipped.join(', ') || 'none excluded'})`,
  ].join('\n')

  return {
    mutated: true,
    summary,
  }
}
```

### Passo 3: Atualizar testes do step

```typescript
// skills/init/lib/steps/07-generate-populate-plans.test.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-02 — RED depois GREEN do novo summary.

import { describe, test, expect } from 'bun:test'
import { generatePopulatePlansStep, ABORT_MESSAGE_NO_STACK, ABORT_CODE_NO_STACK } from './07-generate-populate-plans'
import { AbortError } from './abort-error'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('Step 7 — generate-populate-plans', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'step7-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  test('aborts (code 20) when stack.primary is null', async () => {
    const ctx = { cwd: tmpDir, stack: { primary: null, confidence: 'low', signals: [] }, flags: {}, args: [] }
    try {
      await generatePopulatePlansStep.run(ctx as never)
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(AbortError)
      expect((err as AbortError).code).toBe(ABORT_CODE_NO_STACK)
      expect((err as AbortError).reason).toContain('populate-harness fases')
    }
  })

  test('summary reflects single folder output (NOT 16 plans)', async () => {
    const ctx = { cwd: tmpDir, stack: { primary: 'node-ts', confidence: 'high', signals: [] }, flags: {}, args: [] }
    const result = await generatePopulatePlansStep.run(ctx as never)

    expect(result.mutated).toBe(true)
    expect(result.summary).toContain('1 folder generated')
    expect(result.summary).toContain('16 fases')
    expect(result.summary).toContain('node-ts stack')
    expect(result.summary).toContain('docs/exec-plans/active/')
    expect(result.summary).toContain('populate-harness')
  })

  test('ABORT_MESSAGE_NO_STACK no longer references "16 populate plans" (old wording)', () => {
    expect(ABORT_MESSAGE_NO_STACK).not.toContain('16 populate plans')
    expect(ABORT_MESSAGE_NO_STACK).toContain('populate-harness fases')
  })
})
```

---

## Gotchas

- **G1:** O test "ABORT_MESSAGE_NO_STACK ja nao referencia '16 populate plans'" eh uma trava — previne reintroducao do wording antigo em refactors futuros.
- **G2:** Step 7 e idempotente — runs subsequentes sobrescrevem (D10 NFR). Sem chamada para "limpar arquivos antigos" no host project — eh historia do cliente.
- **G3:** O summary continua sendo string multilinha (4 linhas exatas, separadas por `\n`). Pipeline de telemetria espera esse shape — manter.
- **G4 (local):** Se algum step downstream consome `result.plans.length`, vai quebrar — grep do projeto inteiro confirma que NAO consome (Step 7 eh terminal por padrao, output e so summary).

---

## Verificacao

### TDD

- [ ] **RED:** rodar `bun test skills/init/lib/steps/07-generate-populate-plans.test.ts` antes do update — testes falham (summary antigo nao bate, ABORT_MESSAGE ainda contem `"16 populate plans"`)
- [ ] **RED → GREEN:** apos update, `bun test` retorna `3 passed, 0 failed`
- [ ] **REFACTOR:** `bun run lint` limpo

### Checklist

- [ ] `ABORT_MESSAGE_NO_STACK` atualizada — nao contem `"16 populate plans"` literal
- [ ] `ABORT_MESSAGE_NO_STACK` contem `"populate-harness fases"`
- [ ] Summary contem `"1 folder generated"` e `"populate-harness"`
- [ ] Summary mantem 4 linhas separadas por `\n`
- [ ] Step 7 consome `result.fasePlans.length` (nao `result.plans.length`)
- [ ] Testes passam: `bun test skills/init/lib/steps/07-generate-populate-plans.test.ts`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/07-generate-populate-plans.test.ts` retorna `3 passed, 0 failed`
- `grep "16 populate plans" skills/init/lib/steps/07-generate-populate-plans.ts` retorna vazio
- `bun run typecheck` passa

**Por humano:**
- Inspecao do summary num run real: 4 linhas legíveis apontando para a nova pasta

---

<!-- Gerado por /plan-feature (inline, auto mode) em 2026-05-21 -->
