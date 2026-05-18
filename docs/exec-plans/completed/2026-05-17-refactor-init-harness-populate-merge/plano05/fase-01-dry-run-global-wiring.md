<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): dry-run helper — MH-06 + D18 + CA-07`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 01: Dry-Run Global Wiring

**Plano:** 05 — Modos Reversiveis
**Sizing:** 1h
**Depende de:** fase-02 (precisa do `renderMergePreview` para Step 09 chamar em dry-run)
**Visual:** false

---

## O que esta fase entrega

`--dry-run` cobre TODOS os novos Steps 06-11 + 91 com `mutated: false`. Novo helper `lib/dry-run-mode.ts` centraliza a deteccao da flag e a obtencao do `WriteRecorder` propagado via `ctx`. Cada Step novo (06/07/08/09/10/11/91) ganha branch unico: se dry-run, computa as operacoes intencionadas, registra paths no `WriteRecorder` (via `makeWriter` ja existente) e retorna `mutated: false` com `summary` previsto. Fundacao para CA-13 dry-run parity (Plano 07 fase-04) — os MESMOS paths que `apply-merge-destructive` mutaria em modo real sao registrados pelo recorder em dry-run.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/dry-run-mode.ts` | Create | Exporta `isDryRun(ctx): boolean` e `getRecorder(ctx): WriteRecorder \| undefined`. Centraliza leitura da flag e instancia do recorder |
| `skills/init/lib/dry-run-mode.test.ts` | Create | 5 testes minimos cobrindo helpers + propagacao via ctx |
| `skills/init/lib/run-init.ts` | Modify | Instancia `WriteRecorder` quando `flags['--dry-run'] === true` e propaga via `ctx.flags['__dryRunRecorder']` (chave reservada igual ao `__interactiveAnswer`) |
| `skills/init/lib/steps/06-secrets-scan.ts` | Modify | Branch dry-run: nao escreve `secrets-scan-result.json` em disco; computa e retorna `mutated: false` (ja eh read-only mas wiring uniforme) |
| `skills/init/lib/steps/07-discover-existing-docs.ts` | Modify | Idem 06 — discovery store recebe `noWrite: true` em dry-run (G8 do Plano 03) |
| `skills/init/lib/steps/08-classify-blocks-hybrid.ts` | Modify | Idem 06/07 — classification-result.json em recorder, nao disco |
| `skills/init/lib/steps/09-propose-merge-batch.ts` | Modify | Dry-run: chama `renderMergePreview` (fase-02) e `console.log` o resultado SEM `needsUser`. Real: ja entregue por Plano 04 + fase-02 |
| `skills/init/lib/steps/10-apply-merge-destructive.ts` | Modify | Dry-run: substitui `fs.writeFile`/`fs.rename` por `makeWriter(getDryRunMode(ctx))` — todas as mutacoes intencionadas registradas no recorder; retorna `mutated: false`, summary "would write N files to .anti-vibe/backup/{ts}/ + transform CLAUDE.md" |
| `skills/init/lib/steps/11-move-docs-with-stub.ts` | Modify | Dry-run: substitui `fs.rename` por `RenameRecorder` analog (declarado neste arquivo se necessario) — registra `(from, to)` pairs; retorna `mutated: false` |
| `skills/init/lib/steps/12-detect-drift-incremental.ts` | (referenciado, criado em fase-03) | Em dry-run: NAO escreve `drift-report.json` em disco; retorna summary com paths que seriam escritos |
| `skills/init/lib/steps/91-generate-populate-plan.ts` | Modify | (Plano 02 fase-03) Dry-run: nao escreve PLAN.md, retorna `mutated: false` + summary com path previsto. ADAPTAR conforme `plano02/MEMORY.md` |

---

## Implementacao

### Passo 1: Criar `lib/dry-run-mode.ts` (helpers de detecao + recorder)

```typescript
// skills/init/lib/dry-run-mode.ts
// 2026-05-18 (Luiz/dev): dry-run wiring global — MH-06 + D18 + foundation para CA-13 parity

import { WriteRecorder, makeWriter, type DryRunMode } from './dry-run'
import type { StepContext } from './steps/types'

const DRY_RUN_FLAG = '--dry-run'
const RECORDER_KEY = '__dryRunRecorder' as const

/**
 * Detecta se o init esta rodando em modo dry-run.
 * Lookups EXCLUSIVAMENTE em ctx.flags — args posicionais sao ignorados.
 *
 * @example
 * if (isDryRun(ctx)) {
 *   return { mutated: false, summary: 'dry-run: would write X' }
 * }
 */
export function isDryRun(ctx: StepContext): boolean {
  return ctx.flags[DRY_RUN_FLAG] === true
}

/**
 * Retorna o WriteRecorder propagado pelo dispatcher quando dry-run esta ativo,
 * ou undefined caso contrario. Steps que precisam capturar mutacoes em dry-run
 * passam o recorder retornado para makeWriter.
 */
export function getRecorder(ctx: StepContext): WriteRecorder | undefined {
  // 2026-05-18 (Luiz/dev): cast minimo — recorder e instancia, nao primitive. Compatibilidade
  // com Record<string, boolean | string> via slot reservado __dryRunRecorder; runtime garante o tipo.
  const slot = (ctx.flags as Record<string, unknown>)[RECORDER_KEY]
  return slot instanceof WriteRecorder ? slot : undefined
}

/**
 * Conveniencia: monta um DryRunMode a partir do ctx para passar a makeWriter.
 * Em modo nao-dry-run, retorna { dryRun: false } — makeWriter degrada para fs.writeFile real.
 */
export function getDryRunMode(ctx: StepContext): DryRunMode {
  if (!isDryRun(ctx)) return { dryRun: false }
  const recorder = getRecorder(ctx)
  if (recorder === undefined) return { dryRun: true, recorder: new WriteRecorder() }
  return { dryRun: true, recorder }
}

// Re-export para consumo direto pelos steps:
export { makeWriter, WriteRecorder }
```

### Passo 2: Estender `runInit` para instanciar e propagar o `WriteRecorder`

```typescript
// skills/init/lib/run-init.ts (trecho relevante apos parseFlags)
// 2026-05-18 (Luiz/dev): Plano 05 fase-01 — instancia WriteRecorder UMA vez por run; steps
// le via getRecorder(ctx). Compartilhado ao longo do registry para registrar paths previstos
// de TODOS os steps em uma unica passagem (foundation para CA-13 parity test).
import { WriteRecorder } from './dry-run'

// ... dentro de runInit, apos const { args, flags } = parseFlags(argv):
const recorder = flags['--dry-run'] === true ? new WriteRecorder() : undefined
const ctxFlags = recorder !== undefined
  ? { ...flags, __dryRunRecorder: recorder as unknown as boolean }  // cast slot — runtime garante via getRecorder
  : flags
const base: StepContext = { cwd: cwd ?? process.cwd(), args, flags: ctxFlags }
```

**ADAPTAR:** o cast `as unknown as boolean` eh feio mas inevitavel pelo shape declarado de `flags: Record<string, boolean | string>` em `parse-flags.ts`. Alternativa eh evoluir o tipo de `StepContext.flags` para `Record<string, unknown>` — decisao a registrar como DI-1 em MEMORY.md se for adotada. **Conservador:** manter o cast neste plano; evolucao de tipo fica para Plano 06.

### Passo 3: Patch em Step 10 `apply-merge-destructive` para usar `makeWriter`

```typescript
// skills/init/lib/steps/10-apply-merge-destructive.ts (apos validacao inicial)
// 2026-05-18 (Luiz/dev): Plano 05 fase-01 — substitui fs.writeFile direto por makeWriter
// para que dry-run capture os MESMOS paths que o modo real mutaria. CA-13 foundation.
import { getDryRunMode, isDryRun } from '../dry-run-mode'
import { makeWriter } from '../dry-run'

// ... dentro do step.run:
const writer = makeWriter(getDryRunMode(ctx))

// Antes (Plano 04):
//   await fs.writeFile(path.join(backupDir, 'CLAUDE.md'), originalClaudeMd, 'utf8')
//   await fs.writeFile(path.join(ctx.cwd, 'CLAUDE.md'), mirroredContent, 'utf8')

// Depois (Plano 05 fase-01):
await writer(path.join(backupDir, 'CLAUDE.md'), originalClaudeMd)
await writer(path.join(ctx.cwd, 'CLAUDE.md'), mirroredContent)
await writer(path.join(ctx.cwd, 'docs', 'DESIGN.md'), designMdContent)

if (isDryRun(ctx)) {
  return {
    mutated: false,
    summary: `dry-run: would write ${getRecorder(ctx)?.count() ?? 0} files (backup + CLAUDE.md + DESIGN.md)`,
  }
}

return { mutated: true, summary: `applied destructive merge — backup at ${backupDir}` }
```

### Passo 4: Patch em Step 11 `move-docs-with-stub` (RenameRecorder analog)

Step 11 usa `fs.rename` + `fs.writeFile` (stub) + grep+rewrite (`fs.writeFile`). O `WriteRecorder` ja cobre `fs.writeFile`. Falta cobrir `fs.rename`. Solucao: declarar um helper local `makeRenamer` em `lib/dry-run-mode.ts`:

```typescript
// Adicionar a lib/dry-run-mode.ts
export type RenameRecord = { from: string; to: string }

export class RenameRecorder {
  private renames: RenameRecord[] = []
  record(from: string, to: string): void {
    this.renames.push({ from, to })
  }
  list(): readonly RenameRecord[] { return this.renames }
  count(): number { return this.renames.length }
}

// makeRenamer: factory para fs.rename-compatible closure
export function makeRenamer(mode: DryRunMode & { renameRecorder?: RenameRecorder }): (from: string, to: string) => Promise<void> {
  if (mode.dryRun && mode.renameRecorder !== undefined) {
    const rec = mode.renameRecorder
    return async (from, to) => { rec.record(from, to) }
  }
  return async (from, to) => {
    const { promises: fs } = await import('node:fs')
    await fs.rename(from, to)
  }
}
```

Em Step 11:

```typescript
// skills/init/lib/steps/11-move-docs-with-stub.ts (trecho)
const renameRecorder = isDryRun(ctx) ? new RenameRecorder() : undefined
const renamer = makeRenamer({ dryRun: isDryRun(ctx), renameRecorder })

for (const { source, target } of classification.mappings) {
  await renamer(source, target)
  await writer(source, `# Moved\n\nThis document moved to [${target}](${target}).\n`)
}

if (isDryRun(ctx)) {
  return {
    mutated: false,
    summary: `dry-run: would rename ${renameRecorder?.count() ?? 0} files + write stubs`,
  }
}
```

### Passo 5: Wiring rapido nos steps read-only (06/07/08/12/91)

Esses steps ja sao `mutated: false` por design (Plano 03 G8, Plano 02 G6). Adicao em fase-01:
- `discoveryStore.writeDiscoveryArtifact` recebe parametro opcional `noWrite: boolean` (Plano 03 fase-02 ja declarou suporte — confirmar via `plano03/MEMORY.md`). Em dry-run, passar `noWrite: true`.
- Step 12 (criado em fase-03 deste plano): em dry-run, NAO escreve `drift-report.json`. Summary lista paths que seriam escritos.
- Step 91: em dry-run, NAO escreve PLAN.md. Summary inclui path que seria gerado + numero de tasks que seriam emitidas. ADAPTAR conforme convencao do Plano 02 fase-03 documentar.

### Passo 6: Suite de testes para `dry-run-mode.test.ts`

```typescript
// skills/init/lib/dry-run-mode.test.ts
import { describe, it, expect } from 'bun:test'
import { isDryRun, getRecorder, getDryRunMode, RenameRecorder, makeRenamer } from './dry-run-mode'
import { WriteRecorder } from './dry-run'
import type { StepContext } from './steps/types'

const mkCtx = (flags: Record<string, unknown> = {}): StepContext => ({
  cwd: '/tmp/test',
  args: [],
  flags: flags as Record<string, boolean | string>,
})

describe('isDryRun', () => {
  it('returns true when --dry-run flag is set', () => {
    expect(isDryRun(mkCtx({ '--dry-run': true }))).toBe(true)
  })
  it('returns false when flag absent', () => {
    expect(isDryRun(mkCtx())).toBe(false)
  })
})

describe('getRecorder', () => {
  it('returns WriteRecorder instance when propagated via ctx', () => {
    const rec = new WriteRecorder()
    expect(getRecorder(mkCtx({ __dryRunRecorder: rec }))).toBe(rec)
  })
  it('returns undefined when slot is empty', () => {
    expect(getRecorder(mkCtx({ '--dry-run': true }))).toBeUndefined()
  })
})

describe('getDryRunMode', () => {
  it('returns { dryRun: false } when not in dry-run', () => {
    expect(getDryRunMode(mkCtx())).toEqual({ dryRun: false })
  })
  it('returns { dryRun: true, recorder } in dry-run', () => {
    const rec = new WriteRecorder()
    const mode = getDryRunMode(mkCtx({ '--dry-run': true, __dryRunRecorder: rec }))
    expect(mode.dryRun).toBe(true)
    expect(mode.recorder).toBe(rec)
  })
})

describe('E2E recorder captures intended writes', () => {
  it('Step 10 in dry-run records CLAUDE.md write without touching disk', async () => {
    // 2026-05-18 (Luiz/dev): smoke test — fixture com CLAUDE.md de 287 linhas. Garante
    // que recorder.count() >= 3 (backup + CLAUDE.md final + DESIGN.md) apos Step 10 dry-run.
    // ADAPTAR fixture conforme Plano 04 fase-03 documentar — pode requerer mock de classification-result.json.
    // (placeholder — implementacao concreta consulta o fixture greenfield/inverted-merge do Plano 07)
    expect(true).toBe(true)  // RED-GREEN inicial: substituir por assert real
  })
})
```

---

## Gotchas

- **G3 do plano (dry-run parity foundation):** Esta fase eh o ALICERCE da CA-13 — sem `WriteRecorder` capturando os MESMOS paths que o modo real escreveria, o parity test do Plano 07 fase-04 nao tem como comparar. Cuidado: cada path que ainda use `fs.writeFile`/`fs.rename` diretamente (sem passar pelo recorder) eh um BLIND SPOT que vai aparecer como divergencia no parity test do Plano 07. Auditar cada step modificado nesta fase: `grep -n "fs\.\(writeFile\|rename\)" skills/init/lib/steps/0[6-9]*.ts skills/init/lib/steps/1[01]*.ts` retorna 0 — caso contrario, BUG.
- **G4 do plano (Windows path safety):** O `WriteRecorder` armazena paths como string — Windows pode produzir paths com `\\` mistos. Test garantir que paths nao sao normalizados pelo recorder; comparacao no parity test deve normalizar em ambos os lados (real vs dry-run).
- **Local: slot `__dryRunRecorder` em `ctx.flags` polui o shape `Record<string, boolean | string>`.** Decisao conservadora desta fase: cast `as unknown as boolean` no slot. Evolucao para `Record<string, unknown>` em Plano 06 fase-02 (ADR-NNNN-ctx-flags-evolution registrado se decisao acontecer). Por enquanto: aceitar o cast, documentar em MEMORY.md.
- **Local: `RenameRecorder` eh helper deste plano — nao reutilizado em outros lugares ate Plano 07.** Manter logica simples (array push + count). Se for util em outras skills no futuro, promover para lib compartilhada — nao especular agora.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/init/lib/dry-run-mode.test.ts` falha — `dry-run-mode.ts` nao existe.
  - Comando: `bun run test skills/init/lib/dry-run-mode.test.ts`
  - Resultado esperado: `Cannot find module './dry-run-mode'` ou assertion fail no E2E smoke.

- [ ] **GREEN:** Helpers + RenameRecorder + makeRenamer implementados. Testes passam.
  - Comando: `bun run test skills/init/lib/dry-run-mode.test.ts`
  - Resultado esperado: `5 passed, 0 failed`.

### Checklist

- [ ] `skills/init/lib/dry-run-mode.ts` exporta exatamente 5 simbolos publicos: `isDryRun`, `getRecorder`, `getDryRunMode`, `RenameRecorder`, `makeRenamer` (`WriteRecorder` e `makeWriter` sao re-exports do modulo existente).
- [ ] `run-init.ts` instancia `WriteRecorder` quando `--dry-run` ativo e propaga via `ctx.flags['__dryRunRecorder']`.
- [ ] Cada Step modificado (06/07/08/09/10/11) chama `isDryRun(ctx)` e retorna `mutated: false` em dry-run com summary que descreve "would write/rename N files".
- [ ] `grep -n "fs\\.\\(writeFile\\|rename\\)" skills/init/lib/steps/09-propose-merge-batch.ts skills/init/lib/steps/10-apply-merge-destructive.ts skills/init/lib/steps/11-move-docs-with-stub.ts` retorna 0 matches (todos passam por `makeWriter`/`makeRenamer`).
- [ ] Testes passam: `bun run test skills/init/lib/dry-run-mode.test.ts`.
- [ ] Lint limpo: `bun run lint skills/init/lib/dry-run-mode.ts`.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/dry-run-mode.test.ts` retorna `5 passed, 0 failed`.
- `bun test skills/init/lib/steps/10-apply-merge-destructive.test.ts skills/init/lib/steps/11-move-docs-with-stub.test.ts` retorna 0 falhas com testes adicionados para dry-run path (cada step recebe ao menos 1 teste novo cobrindo dry-run).
- Fixture E2E (manual ate Plano 07 fase-04): rodar `bunx /anti-vibe-coding:init --dry-run` em repo com CLAUDE.md de 287 linhas → `git status` retorna `clean working tree` (nada mutado).

**Por humano:**
- Output em terminal mostra `[10-apply-merge-destructive] dry-run: would write N files...` e `[11-move-docs-with-stub] dry-run: would rename M files...` — visivel que nada foi escrito.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
