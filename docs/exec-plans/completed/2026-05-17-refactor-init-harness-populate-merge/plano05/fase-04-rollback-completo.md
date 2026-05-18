<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): rollback impl — MH-07 + CA-06 + CA-10`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 04: Rollback Completo

**Plano:** 05 — Modos Reversiveis (TRACER BULLET deste plano)
**Sizing:** 1h
**Depende de:** fase-06 (template ADR existe para o ADR writer consumir)
**Visual:** false

---

## O que esta fase entrega

Implementacao completa do `lib/rollback.ts` (substitui o stub do Plano 01 fase-03). Le `.anti-vibe/backup/{latest}/manifest.json`, valida checksums (CA-10), pergunta confirmacao via `askUser`, restaura cada arquivo byte-identico (CA-06), reverte moves (acao `'move'`: restore at originalPath + remove stub at target), e finalmente gera `docs/design-docs/ADR-NNNN-rollback-init-{date}.md` a partir do template da fase-06. Wireado no `runInit` early-return que ja existe desde Plano 01 fase-03.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/rollback.ts` | Modify (preenche stub) | Implementacao completa de `executeRollback` + tipo `RollbackResult` |
| `skills/init/lib/rollback.test.ts` | Modify (estende testes do stub) | 6 testes minimos (no-backup, corrupt-manifest, sha-mismatch, user-cancel, success+ADR, move-reversal) |
| `skills/init/lib/run-init.ts` | Modify | Early-return existente do Plano 01 fase-03 troca chamada ao stub por chamada a `executeRollback` (assinatura final) |
| `skills/init/lib/run-init-rollback.test.ts` | Modify | Estende testes de integracao para asserts no `RollbackResult` retornado |

---

## Implementacao

### Passo 1: Definir tipos publicos em `lib/rollback.ts`

```typescript
// skills/init/lib/rollback.ts
// 2026-05-18 (Luiz/dev): impl completa — MH-07 + CA-06 + CA-10 + D10 + D24 + D29

import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {
  getLatestBackupDir,
  readBackupManifest,
  computeSha256,
  type BackupManifest,
  type BackupEntry,
} from './backup-anti-vibe'  // ADAPTAR conforme plano01/MEMORY.md "API publica final"

export type RollbackResult = {
  readonly restored: ReadonlyArray<string>
  readonly skipped: ReadonlyArray<string>
  readonly errors: ReadonlyArray<{ readonly path: string; readonly message: string }>
  readonly adrPath: string | null
  readonly backupDir: string | null
  readonly userCancelled: boolean
}

export type ExecuteRollbackOptions = {
  readonly cwd: string
  readonly askUser?: (prompt: string, options: readonly string[]) => Promise<string>
  readonly log?: (line: string) => void
}

export async function executeRollback(opts: ExecuteRollbackOptions): Promise<RollbackResult> {
  // implementacao no Passo 2
}
```

### Passo 2: Implementacao do `executeRollback`

```typescript
// 2026-05-18 (Luiz/dev): fluxo canonico: discover backup -> validate manifest -> ask user
// -> restore each file -> revert moves (remove stubs) -> write ADR -> return RollbackResult.
// Aborta cedo em qualquer falha de integridade — nunca restaura parcialmente (CA-10).
export async function executeRollback(opts: ExecuteRollbackOptions): Promise<RollbackResult> {
  const log = opts.log ?? console.log
  // 1. Localizar backup mais recente
  const backupDir = await getLatestBackupDir(opts.cwd)
  if (backupDir === null) {
    return {
      restored: [],
      skipped: [],
      errors: [{ path: '.', message: 'no backup found' }],
      adrPath: null,
      backupDir: null,
      userCancelled: false,
    }
  }

  // 2. Ler manifest D29
  let manifest: BackupManifest
  try {
    manifest = await readBackupManifest(backupDir)
  } catch (e) {
    return {
      restored: [],
      skipped: [],
      errors: [{ path: backupDir, message: `Backup integrity check failed: invalid manifest schema (${e instanceof Error ? e.message : String(e)})` }],
      adrPath: null,
      backupDir,
      userCancelled: false,
    }
  }

  // 3. Validar checksums de TODOS os arquivos do backup ANTES de restaurar
  for (const entry of manifest.files) {
    const backupPath = path.join(backupDir, entry.backupPath)
    const currentSha = await computeSha256(backupPath)
    if (currentSha !== entry.sha256) {
      return {
        restored: [],
        skipped: [],
        errors: [{ path: entry.originalPath, message: `Backup integrity check failed: ${entry.backupPath} sha256 mismatch (expected ${entry.sha256}, got ${currentSha})` }],
        adrPath: null,
        backupDir,
        userCancelled: false,
      }
    }
  }

  // 4. Perguntar confirmacao ao dev
  const prompt = `Will restore ${manifest.files.length} files from backup ${path.basename(backupDir)}.\nConfirm rollback?`
  const options = ['Confirm', 'Cancel'] as const
  if (opts.askUser !== undefined) {
    const answer = await opts.askUser(prompt, options as unknown as readonly string[])
    if (answer !== 'Confirm') {
      return {
        restored: [],
        skipped: manifest.files.map((f) => f.originalPath),
        errors: [],
        adrPath: null,
        backupDir,
        userCancelled: true,
      }
    }
  } else {
    log('No askUser injected — proceeding with rollback non-interactively.')
  }

  // 5. Restaurar cada arquivo
  const restored: string[] = []
  const errors: Array<{ path: string; message: string }> = []
  for (const entry of manifest.files) {
    try {
      await restoreEntry(backupDir, entry, opts.cwd)
      restored.push(entry.originalPath)
    } catch (e) {
      errors.push({ path: entry.originalPath, message: e instanceof Error ? e.message : String(e) })
    }
  }

  // 6. Escrever ADR
  let adrPath: string | null = null
  if (errors.length === 0) {
    try {
      adrPath = await writeRollbackAdr({
        cwd: opts.cwd,
        backupTimestamp: manifest.timestamp,
        gitSha: manifest.gitSha,
        restoredFiles: restored,
      })
    } catch (e) {
      errors.push({ path: 'docs/design-docs/ADR-*-rollback-init-*.md', message: `ADR write failed: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  return { restored, skipped: [], errors, adrPath, backupDir, userCancelled: false }
}

// 2026-05-18 (Luiz/dev): restoreEntry suporta 3 actions do schema D29
async function restoreEntry(backupDir: string, entry: BackupEntry, cwd: string): Promise<void> {
  const backupAbs = path.join(backupDir, entry.backupPath)
  const originalAbs = path.join(cwd, entry.originalPath)

  await fs.mkdir(path.dirname(originalAbs), { recursive: true })

  if (entry.action === 'overwrite' || entry.action === 'transform') {
    // restaura conteudo original via copy (preserva o backup)
    await fs.copyFile(backupAbs, originalAbs)
    return
  }

  if (entry.action === 'move') {
    // 2026-05-18 (Luiz/dev): inversao do move — restora arquivo no originalPath
    // E remove o stub que ficou no path antigo (o originalPath ANTES do move foi reescrito como stub).
    // ADAPTAR conforme `plano04/MEMORY.md` "API publica final de doc-mover-stub" — se MoveResult
    // registrou `targetPath` separado de `originalPath`, usar esse campo. Por enquanto assume
    // que originalPath no manifest eh o path PRE-move (onde o stub agora reside).
    await fs.copyFile(backupAbs, originalAbs)
    // Stub do move: se entry tiver um campo `movedTo`, removeria o arquivo la.
    // Schema D29 atual nao tem campo movedTo — ADAPTAR conforme Plano 04 evoluir o schema.
    // Por enquanto: rollback de move = apenas restaurar no original; dev limpa stub manualmente
    // ou o ADR documenta a presenca residual do arquivo movido.
    return
  }

  throw new Error(`unknown action: ${entry.action}`)
}
```

### Passo 3: Implementar `writeRollbackAdr` consumindo o template da fase-06

```typescript
// 2026-05-18 (Luiz/dev): writeRollbackAdr — substitui marcadores do template via .replaceAll.
// Numera ADR pelo MAIOR numero existente em docs/design-docs/ADR-*.md + 1 (G9 do plano05).
async function writeRollbackAdr(input: {
  cwd: string
  backupTimestamp: string
  gitSha: string | null
  restoredFiles: ReadonlyArray<string>
}): Promise<string> {
  const adrDir = path.join(input.cwd, 'docs', 'design-docs')
  await fs.mkdir(adrDir, { recursive: true })

  // 1. Calcular proximo NUMBER
  const existing = await listExistingAdrs(adrDir)
  const maxNum = existing.reduce((max, n) => Math.max(max, n), 0)
  const nextNum = String(maxNum + 1).padStart(4, '0')

  // 2. Ler template da fase-06
  // ADAPTAR: path do snippet relativo ao skill root. Estrategia mais robusta — passar pluginRoot via opts:
  const skillRoot = await resolvePluginRoot()
  const templatePath = path.join(skillRoot, 'skills', 'init', 'assets', 'snippets', 'rollback-adr-template.md')
  const template = await fs.readFile(templatePath, 'utf8')

  // 3. Substituir marcadores
  const today = new Date().toISOString().slice(0, 10)  // YYYY-MM-DD
  const restoredList = input.restoredFiles.map((p) => `- ${p}`).join('\n')
  const rendered = template
    .replaceAll('{NUMBER}', nextNum)
    .replaceAll('{date}', today)
    .replaceAll('{backup_ts}', input.backupTimestamp)
    .replaceAll('{git_sha}', input.gitSha ?? 'null')
    .replaceAll('{N}', String(input.restoredFiles.length))
    .replaceAll('{restored_files_list}', restoredList)

  // 4. Escrever ADR
  const adrPath = path.join(adrDir, `ADR-${nextNum}-rollback-init-${today}.md`)
  await fs.writeFile(adrPath, rendered, 'utf8')
  return adrPath
}

async function listExistingAdrs(adrDir: string): Promise<number[]> {
  try {
    const files = await fs.readdir(adrDir)
    return files
      .map((f) => {
        const m = f.match(/^ADR-(\d{4})-/)
        return m !== null ? parseInt(m[1] ?? '0', 10) : null
      })
      .filter((n): n is number => n !== null && !Number.isNaN(n))
  } catch {
    return []
  }
}

async function resolvePluginRoot(): Promise<string> {
  // ADAPTAR conforme plano01 fase-04 (Windows DI-06 centralization) — helper canonico em
  // steps/helpers.ts pode expor resolvePluginRoot. Por enquanto fallback via import.meta.dir.
  return path.resolve(import.meta.dir, '..', '..', '..')
}
```

### Passo 4: Wire em `run-init.ts` (substitui chamada ao stub)

```typescript
// skills/init/lib/run-init.ts (trecho do early-return ja existente do Plano 01 fase-03)
// 2026-05-18 (Luiz/dev): Plano 05 fase-04 — early-return chama executeRollback real.

if (flags['--rollback'] === true) {
  const { executeRollback } = await import('./rollback')
  const result = await executeRollback({ cwd: cwd ?? process.cwd(), askUser, log })
  if (result.userCancelled) {
    log('[rollback] cancelled by user.')
    return { kind: 'ok', report: { mutated: false, summary: 'rollback cancelled' } }
  }
  if (result.errors.length > 0) {
    log(`[rollback] ${result.errors.length} error(s):`)
    for (const e of result.errors) {
      log(`  ${e.path}: ${e.message}`)
    }
    return { kind: 'aborted', code: 1, reason: result.errors[0]?.message ?? 'rollback failed' }
  }
  log(`[rollback] restored ${result.restored.length} files. ADR: ${result.adrPath ?? '(none)'}`)
  return { kind: 'ok', report: { mutated: true, summary: `rollback restored ${result.restored.length} files` } }
}
```

### Passo 5: Suite de 6 testes em `rollback.test.ts`

```typescript
// skills/init/lib/rollback.test.ts (estende stub tests do Plano 01 fase-03)
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { executeRollback } from './rollback'

let tmpDir: string
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rollback-test-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

async function seedBackup(cwd: string, ts: string, entries: Array<{ originalPath: string; backupPath: string; content: string; action: string }>): Promise<string> {
  const backupDir = path.join(cwd, '.anti-vibe', 'backup', ts)
  await fs.mkdir(backupDir, { recursive: true })
  const files = []
  for (const e of entries) {
    const abs = path.join(backupDir, e.backupPath)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, e.content, 'utf8')
    files.push({ originalPath: e.originalPath, backupPath: e.backupPath, sha256: sha(e.content), action: e.action })
  }
  await fs.writeFile(path.join(backupDir, 'manifest.json'), JSON.stringify({ timestamp: ts, files, gitSha: null }, null, 2))
  return backupDir
}

describe('executeRollback', () => {
  it('returns error when no backup found', async () => {
    const result = await executeRollback({ cwd: tmpDir })
    expect(result.errors[0]?.message).toBe('no backup found')
    expect(result.adrPath).toBeNull()
  })

  it('aborts when manifest schema invalid', async () => {
    const backupDir = path.join(tmpDir, '.anti-vibe', 'backup', '2026-05-18T14-30-00Z')
    await fs.mkdir(backupDir, { recursive: true })
    await fs.writeFile(path.join(backupDir, 'manifest.json'), 'not valid json{', 'utf8')
    const result = await executeRollback({ cwd: tmpDir })
    expect(result.errors[0]?.message).toMatch(/Backup integrity check failed.*manifest/i)
  })

  it('aborts when checksum mismatch (CA-10)', async () => {
    const backupDir = await seedBackup(tmpDir, '2026-05-18T14-30-00Z', [
      { originalPath: 'CLAUDE.md', backupPath: 'CLAUDE.md', content: 'original', action: 'transform' },
    ])
    // Corrupt the backup file AFTER manifest was written
    await fs.writeFile(path.join(backupDir, 'CLAUDE.md'), 'tampered', 'utf8')
    const result = await executeRollback({ cwd: tmpDir })
    expect(result.errors[0]?.message).toMatch(/sha256 mismatch/)
    expect(result.restored).toHaveLength(0)
  })

  it('honours user cancel', async () => {
    await seedBackup(tmpDir, '2026-05-18T14-30-00Z', [
      { originalPath: 'CLAUDE.md', backupPath: 'CLAUDE.md', content: 'original', action: 'transform' },
    ])
    const result = await executeRollback({ cwd: tmpDir, askUser: async () => 'Cancel' })
    expect(result.userCancelled).toBe(true)
    expect(result.restored).toHaveLength(0)
  })

  it('restores byte-identico + writes ADR (CA-06)', async () => {
    const originalContent = '# CLAUDE\n\n## Akita rules\n... 287 lines ...\n'
    await seedBackup(tmpDir, '2026-05-18T14-30-00Z', [
      { originalPath: 'CLAUDE.md', backupPath: 'CLAUDE.md', content: originalContent, action: 'transform' },
    ])
    // Simulate post-merge state: CLAUDE.md is now a 36-line mirror
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# mirror\n', 'utf8')
    const result = await executeRollback({ cwd: tmpDir, askUser: async () => 'Confirm' })
    expect(result.errors).toHaveLength(0)
    expect(result.restored).toContain('CLAUDE.md')
    const restoredContent = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf8')
    expect(restoredContent).toBe(originalContent)
    expect(result.adrPath).not.toBeNull()
    const adrContent = await fs.readFile(result.adrPath!, 'utf8')
    expect(adrContent).toMatch(/ADR-0001:.*Rollback/)
    expect(adrContent).toContain('CLAUDE.md')
  })

  it('reverses move action — restores file at original path', async () => {
    const originalContent = '# Old\n\n... contents ...\n'
    await seedBackup(tmpDir, '2026-05-18T14-30-00Z', [
      { originalPath: 'docs/ARQUITETURA.md', backupPath: 'docs/ARQUITETURA.md', content: originalContent, action: 'move' },
    ])
    // Simulate post-move state: target file exists, stub at originalPath
    await fs.mkdir(path.join(tmpDir, 'docs'), { recursive: true })
    await fs.writeFile(path.join(tmpDir, 'docs', 'ARQUITETURA.md'), '# Moved\n\nThis document moved to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).\n', 'utf8')
    const result = await executeRollback({ cwd: tmpDir, askUser: async () => 'Confirm' })
    expect(result.errors).toHaveLength(0)
    const restoredContent = await fs.readFile(path.join(tmpDir, 'docs', 'ARQUITETURA.md'), 'utf8')
    expect(restoredContent).toBe(originalContent)  // stub overwritten by backup content
  })
})
```

---

## Gotchas

- **G2 do plano (manifest integrity — CA-10):** UM mismatch aborta tudo. NAO restaurar parcialmente. Test #3 cobre.
- **G5 do plano (manifest append convention):** Manifest final pode ter entries de Step 10 (`transform`) E Step 11 (`move`) misturadas. `executeRollback` itera TODAS sem distincao — apenas branch por `action` no `restoreEntry`.
- **G8 do plano (schema confirmation point):** Assinatura de `getLatestBackupDir`, `readBackupManifest`, `computeSha256` vem de `plano01/MEMORY.md`. Se Plano 01 fase-02 nomear diferentemente (ex: `latestBackupPath` em vez de `getLatestBackupDir`), ADAPTAR. Marcado como `// ADAPTAR conforme plano01/MEMORY.md` no Passo 1.
- **G9 do plano (ADR numbering with gaps):** Ler todos os ADRs existentes, pegar MAIOR numero, somar 1. NAO procurar primeiro gap. Test pareado cria fixture com ADR-0003 sem ADR-0001/0002 e asserta que novo eh ADR-0004 (nao ADR-0001).
- **Local: `move` reversal sem campo `movedTo` no manifest.** Schema D29 atual nao registra o target do move (apenas `originalPath` + `backupPath` + `action: 'move'`). Decisao desta fase: rollback de move RESTAURA o conteudo original no `originalPath` (que tem o stub) — efeito eh: stub somem, conteudo original volta. O arquivo MOVIDO em outro path NAO eh removido — fica como residuo (dev limpa via `git rm` ou ADR documenta). Refinamento futuro: estender schema D29 com `movedTo` opcional em v6.5+. Registrar em MEMORY.md como DI-1.
- **Local: askUser ausente = procede silenciosamente.** Em prod, askUser sempre eh injetado pelo dispatcher (Plano 01 fase-03). Em test, omissao = "no confirmation needed" (passa direto para restore). Documentar comportamento via log explicito.
- **Local: ADR write failure nao reverte os restores.** Se chegou a escrever os arquivos com sucesso mas ADR falha, retorna `errors: [{ path: 'ADR-...', message: '...' }]` MAS `restored[]` populado. Dev sabe que rollback funcionou parcialmente — restore OK, audit trail faltando. Aceitavel — alternativa (revert os restores) seria pior.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/init/lib/rollback.test.ts` falha — stub do Plano 01 retorna `notImplemented`.
  - Comando: `bun run test skills/init/lib/rollback.test.ts`
  - Resultado esperado: `executeRollback throws 'not implemented'` ou similar.

- [ ] **GREEN:** Impl completa + ADR template consumido + testes verdes.
  - Comando: `bun run test skills/init/lib/rollback.test.ts skills/init/lib/run-init-rollback.test.ts`
  - Resultado esperado: `6+N passed, 0 failed`.

### Checklist

- [ ] `skills/init/lib/rollback.ts` exporta `executeRollback`, `RollbackResult`, `ExecuteRollbackOptions`.
- [ ] Stub `notImplemented` removido — `grep -c "throw new Error('not implemented" skills/init/lib/rollback.ts` retorna `0`.
- [ ] `run-init.ts` chama `executeRollback` (nao mais stub) — `grep -c "executeRollback" skills/init/lib/run-init.ts` retorna `>= 1`.
- [ ] ADR gerado bate o template da fase-06 com substituicoes corretas (verificavel via teste #5 do rollback.test.ts).
- [ ] Numeracao do ADR pega maior + 1 (CA: teste com fixture de ADR-0003 ja existente → novo eh ADR-0004).
- [ ] Em mismatch de sha256, retorna error sem mutar disco — `git status` clean apos teste #3.
- [ ] Testes passam: `bun run test skills/init/lib/rollback.test.ts`.
- [ ] Lint limpo.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/rollback.test.ts` retorna `6 passed, 0 failed`.
- `bun test skills/init/lib/run-init-rollback.test.ts` retorna 0 falhas (testes de integracao do Plano 01 fase-03 atualizados sem regressao).
- Fixture E2E manual (Plano 07 fase-03 cobre formalmente): apos `init` + `init --rollback`, `git diff HEAD` mostra apenas o ADR de rollback novo (todos os outros arquivos voltaram ao estado original).

**Por humano:**
- ADR escrito tem texto legivel, com numero unico, lista de arquivos restaurados e contexto explicando o rollback.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
