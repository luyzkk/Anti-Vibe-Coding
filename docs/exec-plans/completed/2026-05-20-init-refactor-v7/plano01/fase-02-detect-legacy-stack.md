<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: Step 2 — Detect Legacy + Stack (Real, Read-Only)

**Plano:** 01 — Foundation + Tracer + Cleanup
**Sizing:** 2h
**Depende de:** fase-01 (AUDIT.md preenchido confirma behaviors validos a preservar do `00-detect-legacy` e `03-detect-stack-and-register`)
**Visual:** false

---

## O que esta fase entrega

Step 2 real do init v7: `02-detect-legacy-and-stack.ts` consolida detect-legacy + detect-stack
em uma execucao read-only que popula `ctx.legacy` e `ctx.stack` para os steps seguintes consumirem.
Nenhuma escrita em disco. NAO aborta mesmo se legacy for detectado (mudanca vs v6.7).

**Nota DV-3:** Step 1 (re-entry gate) eh um step proprio criado em fase-03. Esta fase NAO inclui
o gate — apenas o detect puro. Pipeline final tem 10 steps (era 8).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/02-detect-legacy-and-stack.ts` | Create | Novo step consolidado. Reaproveita libs `detect-v5-legacy.ts` e `detect-stack.ts` |
| `skills/init/lib/steps/02-detect-legacy-and-stack.test.ts` | Create | Testes unitarios cobrindo: greenfield Node, legacy detectado nao-aborta, stack=null fallback, exposicao em ctx |
| `skills/init/lib/steps/types.ts` | Modify | Estender `StepContext` com `legacy?` e `stack?` opcionais (G6 do README) |
| `skills/init/lib/steps/types.test.ts` | Modify | Cobrir os novos fields opcionais (smoke test de tipo) |

---

## Implementacao

### Passo 1: Estender StepContext com legacy + stack opcionais

```typescript
// skills/init/lib/steps/types.ts
import type { DetectedStack } from '../detect-stack'
import type { V5LegacyState } from '../detect-v5-legacy'

export type StepContext = {
  cwd: string
  args: readonly string[]
  flags: Readonly<Record<string, boolean | string>>
  askUser?: (prompt: string, options: readonly string[]) => Promise<string>
  // 2026-05-21 (Luiz/dev): Plano 01 fase-02 — populados pelo Step 1 (detect-legacy-and-stack).
  // Opcionais nesta fase para nao quebrar stubs dos outros 7 steps (Plano 01 fase-04).
  // Plano 02 endurece para obrigatorios apos Step 2 escrever o manifest no disco.
  legacy?: V5LegacyState
  stack?: DetectedStack
}
```

Aqui ja precisamos confirmar o nome exato do tipo retornado por `detectV5Legacy()` — abra
`skills/init/lib/detect-v5-legacy.ts` antes de digitar (provavel: `V5LegacyState` ou `LegacyDetectionResult`).

### Passo 2: Criar o step

```typescript
// skills/init/lib/steps/02-detect-legacy-and-stack.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-02 — RF-01 do PRD init-refactor-v7.
// Step 2 do pipeline v7 (gate eh Step 1, fase-03 — DV-3).
// Substitui o antigo Step 00-detect-legacy (que abortava em legacy) + Step 03-detect-stack-and-register
// (que escrevia STATE.md). Aqui: pura leitura, popula ctx, nao aborta.
// Reaproveita libs existentes (DT-01): detect-v5-legacy, detect-stack.
import { detectV5Legacy } from '../detect-v5-legacy'
import { detectStack } from '../detect-stack'
import type { Step } from './types'

export const detectLegacyAndStackStep: Step = {
  id: 'detect-legacy-and-stack',
  async run(ctx) {
    const legacy = await detectV5Legacy(ctx.cwd)
    const stack = await detectStack(ctx.cwd)

    // 2026-05-21 (Luiz/dev): mutacao do ctx aqui eh deliberada — StepContext eh shared
    // ao longo do registry pelo dispatcher. Steps subsequentes leem ctx.legacy / ctx.stack.
    // Plano 02 (Step 2) consome ambos para escrever o manifest.
    // NOTA: ctx eh Readonly em assinatura mas o dispatcher repassa o MESMO objeto a cada step
    // (`run-init.ts:140-181`). Verificar contrato — se assinatura imutavel, retornar via
    // novo report.contextPatch (proposta) ou mudar dispatcher para reassinar ctx.
    // Decisao final: usar Object.assign no ctx (mais simples, mesma referencia). Documentar G novo.
    Object.assign(ctx, { legacy, stack })

    const stackLabel = stack.primary ?? 'unknown'
    const legacyMsg = legacy.isLegacy
      ? `legacy v5.x artifacts detected: ${legacy.artifacts.join(', ')}`
      : 'no legacy artifacts'

    return {
      mutated: false,
      summary: `stack=${stackLabel} via ${stack.signalSource}; ${legacyMsg}`,
    }
  },
}
```

> **Decisao a confirmar na implementacao:** ctx eh hoje `Readonly<...>`. Se mudar para mutavel
> rompe contratos. Alternativa: retornar `report.contextPatch?: Partial<StepContext>` e dispatcher
> faz merge. Verificar em fase-02 e atualizar MEMORY.md como DI-Plano01-fase02-ctx-mutation.

### Passo 3: Testes RED → GREEN

```typescript
// skills/init/lib/steps/02-detect-legacy-and-stack.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { detectLegacyAndStackStep } from './02-detect-legacy-and-stack'

describe('detectLegacyAndStackStep', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'init-v7-detect-'))
  })

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true })
  })

  test('greenfield Node.js: stack=node-ts/nextjs, legacy.isLegacy=false', async () => {
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({
      name: 'demo', devDependencies: { typescript: '^5' },
    }))
    const ctx = { cwd, args: [], flags: {} } as any
    const report = await detectLegacyAndStackStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(ctx.stack?.primary).toBe('node-ts')
    expect(ctx.legacy?.isLegacy).toBe(false)
  })

  test('legacy v5.x detected does NOT abort (RF-01)', async () => {
    await mkdir(path.join(cwd, '.claude', 'planning'), { recursive: true })
    await writeFile(path.join(cwd, '.claude', 'planning', 'old.md'), '# legacy')
    const ctx = { cwd, args: [], flags: {} } as any
    const report = await detectLegacyAndStackStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(ctx.legacy?.isLegacy).toBe(true)
    expect(report.summary).toContain('legacy v5.x')
  })

  test('no stack signal: stack.primary=null, no abort', async () => {
    const ctx = { cwd, args: [], flags: {} } as any
    const report = await detectLegacyAndStackStep.run(ctx)
    expect(ctx.stack?.primary).toBeNull()
    expect(report.summary).toContain('stack=unknown')
  })

  test('Rails detected via Gemfile (D12)', async () => {
    await writeFile(path.join(cwd, 'Gemfile'), 'source "https://rubygems.org"\ngem "rails"')
    const ctx = { cwd, args: [], flags: {} } as any
    await detectLegacyAndStackStep.run(ctx)
    expect(ctx.stack?.primary).toBe('rails')
  })
})
```

---

## Gotchas

- **G1 (G3 do README):** NAO reescrever `detect-stack.ts` nem `detect-v5-legacy.ts`. Esta fase
  e puramente glue code. Se algo nas libs estiver errado, abrir PRD separado.
- **G2 (ctx mutation):** o dispatcher hoje passa `ctxWithAudit` montado uma vez e re-usado.
  Mutacao via `Object.assign` funciona, mas ContextPatch via report seria mais clean.
  Decidir em fase-02 e registrar em MEMORY.md.
- **G3 (DT-06 alinhamento):** os fields que vao para o manifest no Plano 02 sao derivados de
  `ctx.legacy` e `ctx.stack`. Garantir que `V5LegacyState` exponha `sourcePath` para cada artefato
  — se nao expor, abrir TODO para Plano 02 ajustar a lib.
- **G4 (sem STATE.md):** o step antigo `03-detect-stack-and-register` escrevia STATE.md. O novo
  Step 1 NAO escreve. STATE.md vira plano populate gerado pelo Step 5 (Plano 04, D18 item 15).
  Confirmar que `writeStackToStateMd` nao eh chamada aqui.
- **G5 (DV-3 — gate em step proprio):** A versao anterior desta fase planejava embutir o gate
  DR-1 dentro deste step. A decisao DV-3 separou em `01-reentry-gate.ts` (fase-03). Esta fase
  agora cria SO o detect; NAO duplicar logica de gate aqui.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `greenfield Node.js: stack=node-ts/nextjs` escrito e FALHA por step nao existir
  - Comando: `bun test skills/init/lib/steps/02-detect-legacy-and-stack.test.ts`
  - Resultado esperado: `Cannot find module './02-detect-legacy-and-stack'`

- [ ] **GREEN:** Step criado, todos os 4 testes passam
  - Comando: `bun test skills/init/lib/steps/02-detect-legacy-and-stack.test.ts`
  - Resultado esperado: `4 pass, 0 fail`

### Checklist

- [ ] `StepContext` estendido com `legacy?: V5LegacyState` e `stack?: DetectedStack`
- [ ] `02-detect-legacy-and-stack.ts` criado, `mutated: false` em todos os caminhos
- [ ] Step NUNCA chama `throw new AbortError(...)` (RF-01: read-only, nao aborta)
- [ ] Step NAO escreve em STATE.md nem em manifest (verificar com `grep "writeFile" 02-detect-legacy-and-stack.ts` retorna 0)
- [ ] `bun test skills/init/lib/steps/02-detect-legacy-and-stack.test.ts` verde
- [ ] `bun run lint` limpo no novo arquivo
- [ ] `bun run typecheck` (se configurado) limpo
- [ ] MEMORY.md registra decisao sobre ctx-mutation (Object.assign vs ContextPatch)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/02-detect-legacy-and-stack.test.ts` retorna `4 pass, 0 fail`
- `grep -c "AbortError" skills/init/lib/steps/02-detect-legacy-and-stack.ts` retorna `0`
- `grep -c "writeFile\|mkdir" skills/init/lib/steps/02-detect-legacy-and-stack.ts` retorna `0` (read-only puro)

**Por humano:**
- Code review confirma que step apenas le e popula ctx — nenhuma escrita lateral

---

<!-- Gerado por /plan-feature em 2026-05-20 -->
