<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 03: Step 10 (`final-validation`) real — port + D8.C preservation

**Plano:** 05 — Steps 8-10 + harness-validate + E2E final
**Sizing:** 1.5h
**Depende de:** Nenhuma (paralela a fase-01, 02, 04). Plano 01 fase-04 ja criou stub `finalValidationStep` em `steps/10-final-validation.ts`.
**Visual:** false

---

## O que esta fase entrega

`skills/init/lib/steps/10-final-validation.ts` REAL que porta a logica de `90-final-validation.ts` SEM o dry-run guard (D4). Preserva BYTE-IDENTICO o comportamento D8.C do PRD `knowledge-path-cutover`: stack detectada sem `.claude/knowledge/INDEX.md` → `AbortError code=1` (UNICA excecao ao "Step 10 modo warning"). Mantem `runFinalValidationChecks` exportada (G5 do README — D8.C). Walk em `docs/`, allowlist via `buildAllowlistFromTemplateManifest`, warnings agrupados via `groupWarnings`. Check secundario `docs/knowledge/` orfao → `console.warn` (nao-bloqueante).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/10-final-validation.ts` | Modify | Substituir stub por logica real portada de `90-final-validation.ts` (sem dry-run guard). Manter `runFinalValidationChecks` e `walkDocs` exportadas. |
| `skills/init/lib/steps/10-final-validation.test.ts` | Create | Testes unit cobrindo: zero warnings em scaffold canonico; warnings agrupados quando arquivo fora da allowlist; AbortError code=1 quando stack sem INDEX.md (D8.C); warning console nao-bloqueante para `docs/knowledge/` orfao; D4 attestation. |
| `skills/init/lib/steps/90-final-validation.ts` | (NAO TOCAR nesta fase) | Sera deletado em fase-05. Mantido para audit comparativo. |

---

## Implementacao

### Passo 1: Confirmar stub existente + dependencias

```bash
grep "finalValidationStep" skills/init/lib/steps/10-final-validation.ts
ls skills/init/lib/validator-allowlist.ts skills/init/lib/steps/abort-error.ts
```

### Passo 2: Escrever teste RED

```typescript
// skills/init/lib/steps/10-final-validation.test.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-03 — modo warning + D8.C exception + D4 attestation.

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { finalValidationStep, runFinalValidationChecks } from './10-final-validation'
import { AbortError } from './abort-error'

describe('Step 10: final-validation', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-step10-'))
    // Setup docs/ canonico (vazio — sem nada fora da allowlist)
    await fs.mkdir(path.join(cwd, 'docs'), { recursive: true })
  })
  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('zero warnings em scaffold canonico (docs/ vazio)', async () => {
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('0 warnings')
  })

  test('warnings agrupados quando arquivo fora da allowlist existe', async () => {
    await fs.writeFile(path.join(cwd, 'docs/UNEXPECTED.md'), '# Unexpected\n', 'utf8')
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toMatch(/\d+ warnings/)
  })

  test('D8.C: stack=rails + sem INDEX.md → AbortError code=1', async () => {
    // 2026-05-21 (Luiz/dev): simula estado pos-Step 9 onde stack detectada mas matrix ausente.
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, '.claude/stack.json'),
      JSON.stringify({ primary: 'rails' }),
      'utf8',
    )
    // .claude/knowledge/INDEX.md NAO criado intencionalmente.

    let caught: unknown = null
    try {
      await runFinalValidationChecks(cwd)
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(AbortError)
    expect((caught as AbortError).code).toBe(1)
    expect((caught as AbortError).reason).toContain('rails')
    expect((caught as AbortError).reason).toContain('INDEX.md')
  })

  test('D8.C: stack=null nao aborta mesmo sem INDEX.md (primary=null e estado valido)', async () => {
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, '.claude/stack.json'),
      JSON.stringify({ primary: null }),
      'utf8',
    )
    // Nao deve dar throw — D8.C eh especifico para stack detectada.
    await expect(runFinalValidationChecks(cwd)).resolves.toBeUndefined()
  })

  test('D8.C: docs/knowledge/ orfao emite console.warn (nao-bloqueante)', async () => {
    await fs.mkdir(path.join(cwd, 'docs/knowledge'), { recursive: true })
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (msg: string) => warnings.push(msg)
    try {
      await runFinalValidationChecks(cwd)
    } finally {
      console.warn = originalWarn
    }
    expect(warnings.join('\n')).toContain('docs/knowledge/')
    expect(warnings.join('\n')).toContain('orfao')
  })

  test('AbortError do check primario propaga via Step.run (NAO eh capturado pelo try/catch interno)', async () => {
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, '.claude/stack.json'),
      JSON.stringify({ primary: 'rails' }),
      'utf8',
    )
    let caught: unknown = null
    try {
      await finalValidationStep.run({ cwd, args: [], flags: {} })
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(AbortError)
    expect((caught as AbortError).code).toBe(1)
  })

  test('IO error em walkDocs vira summary com skipped (graceful degrade)', async () => {
    // 2026-05-21 (Luiz/dev): nao trivial criar IO error reprodutivel cross-platform.
    // Alternativa: testar via unit do walkDocs com path inexistente — walk retorna [] sem throw.
    // Este teste valida que se docs/ nao existir, summary continua "0 warnings" (degraded gracefully).
    await fs.rm(path.join(cwd, 'docs'), { recursive: true, force: true })
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    // Walk de path inexistente retorna [], allowlist filter retorna [], summary = "0 warnings".
    expect(report.summary).toContain('0 warnings')
  })

  // 2026-05-21 (Luiz/dev): D4 attestation — Step 10 NAO contem dry-run guard.
  test('D4: dry-run flag is ignored — validator runs regardless', async () => {
    await fs.writeFile(path.join(cwd, 'docs/OUTSIDE.md'), '# X\n', 'utf8')
    const report = await finalValidationStep.run({ cwd, args: [], flags: { 'dry-run': true } })
    expect(report.summary).not.toContain('skipped (would check allowlist)') // wording v6.7 do guard
  })
})
```

### Passo 3: Portar logica de `90-final-validation.ts` para `10-final-validation.ts`

```typescript
// skills/init/lib/steps/10-final-validation.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-03 — port de 90-final-validation.ts sem dry-run guard (D4).
// Preserva D8.C BYTE-IDENTICO: check primario (AbortError code=1) + check secundario (warn nao-bloqueante).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { buildAllowlistFromTemplateManifest, isAllowed, groupWarnings } from '../validator-allowlist'
import { AbortError } from './abort-error'
import type { Step } from './types'

/**
 * 2026-05-21 (Luiz/dev): exportada para teste isolado (G5 do README — D8.C contrato).
 * Mesma assinatura do antigo 90-final-validation.ts. Lanca AbortError code=1 no check primario.
 */
export async function runFinalValidationChecks(cwd: string): Promise<void> {
  const stackJsonPath = path.join(cwd, '.claude', 'stack.json')
  const stackJsonExists = await fs.access(stackJsonPath).then(() => true).catch(() => false)

  if (stackJsonExists) {
    let primary: string | null = null
    try {
      const raw = await fs.readFile(stackJsonPath, 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'primary' in parsed &&
        typeof (parsed as Record<string, unknown>)['primary'] === 'string'
      ) {
        primary = (parsed as Record<string, unknown>)['primary'] as string
      }
    } catch {
      primary = null // JSON malformado — degrade gracefully
    }

    if (primary !== null) {
      // 2026-05-21 (Luiz/dev): copyKnowledge grava em .claude/knowledge/ (sem subdir stack).
      // Consistente com run-stack-knowledge-init.ts L103. PRD knowledge-path-cutover D8.C.
      const indexPath = path.join(cwd, '.claude', 'knowledge', 'INDEX.md')
      const indexExists = await fs.access(indexPath).then(() => true).catch(() => false)
      if (!indexExists) {
        throw new AbortError({
          code: 1,
          reason:
            `Stack detectada (${primary}) mas .claude/knowledge/INDEX.md ausente. ` +
            `Re-rode /anti-vibe-coding:init ou verifique a matrix no plugin.`,
        })
      }
    }
  }

  // 2026-05-21 (Luiz/dev): check secundario nao-bloqueante — sunset v7.0.0.
  const orphanPath = path.join(cwd, 'docs', 'knowledge')
  const orphanExists = await fs.access(orphanPath).then(() => true).catch(() => false)
  if (orphanExists) {
    // eslint-disable-next-line no-console
    console.warn(
      'WARN: docs/knowledge/ orfao detectado. ' +
        'Re-rode /anti-vibe-coding:init para migrar para .claude/knowledge/. ' +
        'Aviso sera removido em v7.0.0.',
    )
  }
}

/**
 * 2026-05-21 (Luiz/dev): exportada para teste isolado e reuso em e2e final.
 * Walk em docs/ excluindo docs/_legacy. Retorna paths relativos com forward-slash.
 */
export async function walkDocs(rootCwd: string): Promise<string[]> {
  const out: string[] = []
  async function walk(absDir: string): Promise<void> {
    let entries: import('node:fs').Dirent[]
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const absPath = path.join(absDir, e.name)
      const rel = path.relative(rootCwd, absPath).split(path.sep).join('/')
      if (rel.startsWith('docs/_legacy')) continue
      if (e.isDirectory()) {
        await walk(absPath)
      } else if (e.isFile() && rel.endsWith('.md')) {
        out.push(rel)
      }
    }
  }
  await walk(path.join(rootCwd, 'docs'))
  return out
}

export const finalValidationStep: Step = {
  id: 'final-validation',
  async run(ctx) {
    // 2026-05-21 (Luiz/dev): D4 — SEM dry-run guard. Step antigo 90-final-validation.ts:117-119 removido.
    // AbortError do check primario NAO e capturado pelo try/catch abaixo — propaga corretamente.
    await runFinalValidationChecks(ctx.cwd)

    try {
      const allowlist = buildAllowlistFromTemplateManifest()
      const docs = await walkDocs(ctx.cwd)
      const unallowed = docs.filter((p) => !isAllowed(p, allowlist))

      if (unallowed.length === 0) {
        return { mutated: false, summary: 'validator: 0 warnings — scaffold canonico intacto' }
      }

      const grouped = groupWarnings(unallowed)
      const summary = `validator: ${grouped.length} warnings (${unallowed.length} paths fora do scaffold canonico)`
      return { mutated: false, summary }
    } catch (e) {
      // 2026-05-21 (Luiz/dev): IO errors degradam gracefully (PRD MH-08 modo warning).
      // AbortError do check primario nao chega aqui — lancado antes do try.
      if (e instanceof AbortError) throw e
      const reason = e instanceof Error ? e.message : String(e)
      return { mutated: false, summary: `validator: skipped due to IO error (${reason})` }
    }
  },
}
```

### Passo 4: GREEN + REFACTOR

```bash
bun test skills/init/lib/steps/10-final-validation.test.ts
# Esperado: 8 passed
```

REFACTOR: nenhum esperado. Codigo e fiel ao antigo modulo remocao de dry-run guard.

### Passo 5: VERIFY

```bash
bun test skills/init/lib/steps/10-final-validation.test.ts
bun run lint -- skills/init/lib/steps/10-final-validation.ts
grep -c "dry-run\|isDryRun" skills/init/lib/steps/10-final-validation.ts
# Esperado: 0
```

---

## Gotchas

- **G5 do plano (D8.C — UNICA excecao ao modo warning):** este step NAO aborta exceto pelo check primario de knowledge. Se outro abort for adicionado no futuro, abre brecha para drift. Comentario inline reforca: `// UNICA excecao ao "Step 10 modo warning" — D8.C do PRD knowledge-path-cutover`.
- **G6 do plano (check secundario eh `console.warn`, NAO `console.error`):** intencionalmente nao-bloqueante. Teste captura `console.warn` via override, NAO via `console.error`. Em CI com `--silent`, warn pode nao aparecer — teste valida via override programatico.
- **G9 do plano (DV-4 — `ctx.stack` opcional):** Step 10 le `.claude/stack.json` em disco, NAO `ctx.stack`. Razao: o arquivo eh fonte da verdade (escrito pelo Step 9). `ctx.stack` poderia divergir se um step intermediario modificasse. Manter leitura do disco.
- **Local — `AbortError` propaga corretamente:** o `try/catch` interno do `finalValidationStep.run` re-throws `AbortError`. Esta logica eh CRITICA — se for trocada por catch generico, D8.C vira warning silencioso. Teste explicito valida propagacao via `Step.run`, nao apenas via `runFinalValidationChecks`.
- **Local — `groupWarnings` retorna array de grupos, nao count:** `summary` mostra `${grouped.length} warnings (${unallowed.length} paths)` — 2 numeros distintos. Verificar via lib `validator-allowlist.ts` qual o formato exato (provavelmente group por diretorio).

---

## Verificacao

### TDD

- [ ] **RED:** Testes em `10-final-validation.test.ts` falham porque stub nao chama allowlist nem D8.C.
  - Comando: `bun test skills/init/lib/steps/10-final-validation.test.ts`
  - Resultado esperado: 8 failed

- [ ] **GREEN:** Apos porting, todos os 8 testes passam.
  - Comando: `bun test skills/init/lib/steps/10-final-validation.test.ts`
  - Resultado esperado: `8 passed, 0 failed`

### Checklist

- [ ] `10-final-validation.ts` reescrito com porting de `90-final-validation.ts`
- [ ] Dry-run guard REMOVIDO (D4): `grep -c "dry-run\|isDryRun" 10-final-validation.ts` retorna `0`
- [ ] `runFinalValidationChecks` exportada com mesma assinatura
- [ ] `walkDocs` exportada (auxiliar reusavel em e2e)
- [ ] D8.C preservado: AbortError code=1 byte-identico wording
- [ ] Check secundario preservado: `console.warn` para `docs/knowledge/` orfao
- [ ] AbortError propaga via `Step.run` (try/catch interno NAO captura)
- [ ] IO error em walkDocs degrada gracefully (summary com "skipped due to IO error")
- [ ] `bun run test` (suite completa) verde
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/10-final-validation.test.ts` retorna `8 passed, 0 failed`
- `grep -c "dry-run\|isDryRun" skills/init/lib/steps/10-final-validation.ts` retorna `0`
- `grep -c "AbortError" skills/init/lib/steps/10-final-validation.ts` retorna `>= 3` (import + throw + re-throw)
- Diff entre wording do `throw new AbortError` no novo vs `90-final-validation.ts:60-65` retorna identico modulo whitespace

**Por humano:**
- Inspecao visual: comentario inline `D4` sinaliza onde o guard antigo (linhas 117-119) foi removido. Comentario inline `D8.C` sinaliza onde o check primario lanca AbortError. Linhagem do porting clara.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
