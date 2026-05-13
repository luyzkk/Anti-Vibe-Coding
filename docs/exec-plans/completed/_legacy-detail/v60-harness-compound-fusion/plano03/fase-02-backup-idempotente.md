<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: Backup atômico idempotente de `.planning/` e arquivos legados

**Plano:** 03 — Migration v5→v6
**Sizing:** 1.5h
**Depende de:** fase-01 (consome `LegacyState` para saber o que copiar)
**Visual:** false

---

## O que esta fase entrega

Helper `backupPlanning(targetDir, dryRun?): Promise<BackupResult>` que cria `.planning.v5-backup/` no projeto-alvo contendo cópia integral de TODOS os artefatos detectados em fase-01 (planning-dir + lessons-learned.md + decisions.md + senior-principles.md). Operação é **atômica** (copia para `.planning.v5-backup.tmp/`, depois `rename` para `.planning.v5-backup/`) e **idempotente** (re-execução é no-op com status `'already-exists'`). Atende **M8** (backup obrigatório), **R2** (mitigação de corrupção), **R14** (fonte de verdade para rollback).

Esta é a **fase mais crítica do plano**: é o que separa migração reversível de catástrofe. Nenhuma fase posterior (03/04/05) pode rodar sem backup confirmado.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/lib/backup-planning.ts` | Create | Helper `backupPlanning` + tipo `BackupResult` |
| `anti-vibe-coding/skills/init/lib/backup-planning.test.ts` | Create | Testes: criação, idempotência, atomic rename, dryRun no-op, lock file |
| `anti-vibe-coding/skills/init/lib/copy-recursive.ts` | Create | Wrapper sobre `fs.cp` com fallback para Node <18 (defensivo) |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Step `migrate.1` — chama `backupPlanning` ANTES de qualquer migration helper |
| `.gitignore` (do projeto-alvo, via instrução em SKILL.md) | Document | Sugerir adicionar `.planning.v5-backup/` ao `.gitignore` pós-migração |

---

## Implementacao

### Passo 1: `lib/backup-planning.ts`

```typescript
// 2026-05-11 (Luiz/dev): backup ATOMICO idempotente — R2/R14, M8.
// .planning/ + 3 .md legados copiados para .planning.v5-backup/.
// Rename atomico via diretorio temporario .planning.v5-backup.tmp/.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { LegacyState } from './detect-v5-legacy'
import { copyRecursive } from './copy-recursive'

export const BACKUP_DIR = '.planning.v5-backup'
const TMP_DIR = '.planning.v5-backup.tmp'
const LOCK_FILE = '.planning.v5-backup.lock'

export type BackupResult = {
  status: 'created' | 'already-exists' | 'dry-run'
  backupPath: string
  filesCopied: number
}

export type BackupOptions = {
  dryRun?: boolean
  /** State da fase-01 — evita re-stat dos artefatos. */
  state: LegacyState
}

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true } catch { return false }
}

/**
 * Cria backup atomico em .planning.v5-backup/.
 * - Se diretorio destino ja existe: no-op (idempotente).
 * - Operacao: copia para .planning.v5-backup.tmp/ → rename final.
 * - Lock file impede execucoes concorrentes.
 * - dryRun: nao toca disco, retorna count estimado.
 */
export async function backupPlanning(
  targetDir: string,
  options: BackupOptions,
): Promise<BackupResult> {
  const backupPath = path.join(targetDir, BACKUP_DIR)
  const tmpPath = path.join(targetDir, TMP_DIR)
  const lockPath = path.join(targetDir, LOCK_FILE)

  // Idempotencia: backup ja foi feito.
  if (await exists(backupPath)) {
    return { status: 'already-exists', backupPath, filesCopied: 0 }
  }

  // Lock concorrencia: outro processo esta no meio do backup?
  if (await exists(lockPath)) {
    throw new Error(
      `Backup lock present at ${lockPath} — another /init may be running. ` +
      `If stale, delete manually and re-run.`,
    )
  }

  // Estimate files (necessario tanto para dryRun quanto para log).
  let filesCopied = 0
  for (const id of options.state.artifacts) {
    const src = options.state.paths[id]
    if (!src) continue
    const stat = await fs.stat(src)
    filesCopied += stat.isDirectory() ? await countFiles(src) : 1
  }

  if (options.dryRun) {
    return { status: 'dry-run', backupPath, filesCopied }
  }

  // Cria lock antes de qualquer side effect.
  await fs.writeFile(lockPath, `pid=${process.pid}\nstarted=${new Date().toISOString()}\n`, 'utf8')

  try {
    // Limpa qualquer tmp orfao de execucao anterior.
    await fs.rm(tmpPath, { recursive: true, force: true })
    await fs.mkdir(tmpPath, { recursive: true })

    // Copia cada artefato detectado em fase-01.
    for (const id of options.state.artifacts) {
      const src = options.state.paths[id]
      if (!src) continue
      const dst = path.join(tmpPath, path.basename(src))
      await copyRecursive(src, dst)
    }

    // RENAME ATOMICO — ponto de virada. Tudo ou nada.
    await fs.rename(tmpPath, backupPath)

    return { status: 'created', backupPath, filesCopied }
  } finally {
    // Lock sempre removido (mesmo em erro).
    await fs.rm(lockPath, { force: true }).catch(() => { /* swallow */ })
  }
}

async function countFiles(dir: string): Promise<number> {
  let n = 0
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.isDirectory()) {
      n += await countFiles(path.join(dir, e.name))
    } else {
      n += 1
    }
  }
  return n
}
```

### Passo 2: `lib/copy-recursive.ts`

```typescript
// 2026-05-11 (Luiz/dev): wrapper fs.cp recursivo + fallback defensivo.
// fs.cp existe em Node 16.7+. Bun cobre tambem. Wrapper isola caso teste.

import { promises as fs } from 'node:fs'
import path from 'node:path'

export async function copyRecursive(src: string, dst: string): Promise<void> {
  const stat = await fs.stat(src)
  if (stat.isDirectory()) {
    await fs.mkdir(dst, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })
    await Promise.all(entries.map(async (entry) => {
      const childSrc = path.join(src, entry.name)
      const childDst = path.join(dst, entry.name)
      await copyRecursive(childSrc, childDst)
    }))
  } else {
    await fs.mkdir(path.dirname(dst), { recursive: true })
    await fs.copyFile(src, dst)
  }
}
```

### Passo 3: Testes `backup-planning.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): cobre RED da fase-02 + matriz de idempotencia/atomicidade.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { backupPlanning, BACKUP_DIR } from './backup-planning'
import { detectV5Legacy } from './detect-v5-legacy'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'backup')

async function setupLegacy(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(path.join(FIXTURE, '.planning', 'plano01'), { recursive: true })
  await fs.writeFile(path.join(FIXTURE, '.planning', 'CONTEXT-foo.md'), '# Foo\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, '.planning', 'plano01', 'PRD.md'), '# PRD\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, 'lessons-learned.md'), '# Lessons\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, 'decisions.md'), '# Decisions\n', 'utf8')
}

describe('backupPlanning', () => {
  beforeEach(setupLegacy)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('creates .planning.v5-backup/ with all artifacts', async () => {
    const state = await detectV5Legacy(FIXTURE)
    const result = await backupPlanning(FIXTURE, { state })
    expect(result.status).toBe('created')
    expect(await fs.stat(path.join(FIXTURE, BACKUP_DIR, '.planning'))).toBeDefined()
    expect(await fs.stat(path.join(FIXTURE, BACKUP_DIR, 'lessons-learned.md'))).toBeDefined()
    expect(await fs.stat(path.join(FIXTURE, BACKUP_DIR, 'decisions.md'))).toBeDefined()
  })

  it('is idempotent — second call returns already-exists', async () => {
    const state = await detectV5Legacy(FIXTURE)
    await backupPlanning(FIXTURE, { state })
    const second = await backupPlanning(FIXTURE, { state })
    expect(second.status).toBe('already-exists')
    expect(second.filesCopied).toBe(0)
  })

  it('preserves nested directory structure', async () => {
    const state = await detectV5Legacy(FIXTURE)
    await backupPlanning(FIXTURE, { state })
    const nested = path.join(FIXTURE, BACKUP_DIR, '.planning', 'plano01', 'PRD.md')
    expect(await fs.readFile(nested, 'utf8')).toBe('# PRD\n')
  })

  it('dryRun=true does NOT create backup but returns count', async () => {
    const state = await detectV5Legacy(FIXTURE)
    const result = await backupPlanning(FIXTURE, { state, dryRun: true })
    expect(result.status).toBe('dry-run')
    expect(result.filesCopied).toBeGreaterThan(0)
    // Nao escreveu nada:
    const exists = await fs.stat(path.join(FIXTURE, BACKUP_DIR)).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })

  it('cleans tmp dir from previous aborted run', async () => {
    // Simula tmp dir orfao:
    await fs.mkdir(path.join(FIXTURE, '.planning.v5-backup.tmp', 'leftover'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, '.planning.v5-backup.tmp', 'leftover', 'x'), 'x', 'utf8')

    const state = await detectV5Legacy(FIXTURE)
    const result = await backupPlanning(FIXTURE, { state })
    expect(result.status).toBe('created')
    // Tmp dir nao deve mais existir (foi renomeado).
    const tmpExists = await fs.stat(path.join(FIXTURE, '.planning.v5-backup.tmp'))
      .then(() => true).catch(() => false)
    expect(tmpExists).toBe(false)
  })

  it('rejects when lock file present', async () => {
    await fs.writeFile(path.join(FIXTURE, '.planning.v5-backup.lock'), 'pid=999\n', 'utf8')
    const state = await detectV5Legacy(FIXTURE)
    await expect(backupPlanning(FIXTURE, { state })).rejects.toThrow(/lock/i)
  })

  it('removes lock even on success', async () => {
    const state = await detectV5Legacy(FIXTURE)
    await backupPlanning(FIXTURE, { state })
    const lockExists = await fs.stat(path.join(FIXTURE, '.planning.v5-backup.lock'))
      .then(() => true).catch(() => false)
    expect(lockExists).toBe(false)
  })

  it('does NOT modify the original .planning/ (read-only over source)', async () => {
    const state = await detectV5Legacy(FIXTURE)
    const before = await fs.readFile(path.join(FIXTURE, '.planning', 'CONTEXT-foo.md'), 'utf8')
    await backupPlanning(FIXTURE, { state })
    const after = await fs.readFile(path.join(FIXTURE, '.planning', 'CONTEXT-foo.md'), 'utf8')
    expect(after).toBe(before)
  })
})
```

### Passo 4: Integração em `SKILL.md` do `/init`

```markdown
## Step migrate.1: Backup before any mutation (Plano 03 fase-02 — R2, R14, M8)

\`\`\`bash
bun run -e "
import { detectV5Legacy } from './lib/detect-v5-legacy.ts'
import { backupPlanning } from './lib/backup-planning.ts'

const state = await detectV5Legacy(process.cwd())
const result = await backupPlanning(process.cwd(), { state })

if (result.status === 'created') {
  console.log('Backup ' + result.filesCopied + ' files → ' + result.backupPath)
}
if (result.status === 'already-exists') {
  console.log('Backup already present at ' + result.backupPath + ' — proceeding (idempotent).')
}
"
\`\`\`

**Gate:** if this step exits non-zero (lock present / disk full / permission denied),
**abort the migration**. Migration helpers (fases 03/04/05) must not run.

After successful migration, suggest user adds `.planning.v5-backup/` to `.gitignore`.
```

---

## Gotchas

- **G1 do plano (backup é fonte de verdade):** Esta fase é **a** materialização desse princípio. Tudo depois lê de `.planning.v5-backup/`. Documentado em SKILL.md.
- **G2 do plano (idempotência):** Re-execução vai por `already-exists` sem erro. Comprovado por teste.
- **G3 do plano (cross-platform):** `fs.cp` foi liberado em Node 16.7+; em Bun funciona. Mesmo assim, escolho `copyRecursive` próprio para evitar dependência de versão. `path.join` em todos os caminhos.
- **G8 do plano (dry-run não escreve):** `options.dryRun === true` retorna ANTES de qualquer `fs.write*` / `fs.mkdir`. Teste explícito (`dryRun=true does NOT create backup`).
- **G11 do plano (M8 ≤120s):** Backup de `.planning/` com ~50 arquivos é I/O dominado — `copyRecursive` paraleliza entries com `Promise.all`. Em fixture média (~200 arquivos) o backup deve ficar em <5s.
- **Local — rename atômico exige mesma partição:** `fs.rename` falha cross-device. `.planning.v5-backup.tmp/` está no MESMO `targetDir`, então sempre na mesma partição que `.planning.v5-backup/`. Garantido.
- **Local — lock file sobrevive a crash:** Se Node morrer **entre** criação do lock e `finally`, lock fica órfão. Documentado em SKILL.md: "If lock present, delete manually if stale (older than 5min)". Não auto-deleto porque pode mascarar bug real.
- **Local — `senior-principles.md` no plugin tem mtime de meses atrás:** Backup preserva mtime via `fs.copyFile` (default). Validar em CA-37 (rollback test).
- **G9 do plano (provenance):** Header de provenance em `backup-planning.ts` e `copy-recursive.ts`.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `creates .planning.v5-backup/ with all artifacts` falha porque módulo não existe.
  - Comando: `bun run test skills/init/lib/backup-planning.test.ts`
  - Resultado esperado: `Cannot find module` ou assertion fail (stub vazio).

- [ ] **GREEN:** Helper implementado — 8 testes passam.
  - Comando: `bun run test skills/init/lib/backup-planning.test.ts`
  - Resultado esperado: `8 passed, 0 failed`

### Checklist

- [ ] Backup criado em `.planning.v5-backup/` com TODOS artefatos da fase-01
- [ ] Re-execução é idempotente (`already-exists`, sem efeito)
- [ ] Estrutura aninhada preservada (`plano01/PRD.md` chega em `.planning.v5-backup/.planning/plano01/PRD.md`)
- [ ] `dryRun: true` não escreve nada em disco (verificar `stat` no destino)
- [ ] Tmp dir órfão de run anterior é limpo
- [ ] Lock file impede execução concorrente
- [ ] Lock removido após sucesso E após falha (block finally)
- [ ] `.planning/` original **NÃO modificada** (mtime/conteúdo inalterado)
- [ ] **Backup é a primeira mutação do `/init migrate` — nenhuma fase 03/04/05 pode rodar antes**
- [ ] Lint limpo: `bun run lint skills/init/lib/`
- [ ] Testes passam: `bun run test`

---

## Criterio de Aceite

**Por máquina:**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/backup-planning.test.ts
# Esperado: 8 passed, 0 failed em <2s

# Em fixture legacy, rodar backup e conferir:
bun run -e "
import { detectV5Legacy } from './skills/init/lib/detect-v5-legacy.ts'
import { backupPlanning } from './skills/init/lib/backup-planning.ts'
const dir = 'tests/fixtures/legacy-v5'
const state = await detectV5Legacy(dir)
const r = await backupPlanning(dir, { state })
console.log(r.status, r.filesCopied)
"
# Esperado: 'created N' em primeira run, 'already-exists 0' em re-run

# Conferir que .planning/ original nao foi tocada:
diff -r tests/fixtures/legacy-v5/.planning tests/fixtures/legacy-v5/.planning.v5-backup/.planning
# Esperado: identico
```

**Por humano:**

- Inspeção visual de `.planning.v5-backup/` no Explorer: deve conter `.planning/`, `lessons-learned.md`, `decisions.md`. Abrir aleatoriamente um arquivo profundo (ex: `.planning.v5-backup/.planning/plano02/fase-03.md`) e confirmar conteúdo idêntico ao original.
- Após migração completa (fases 03/04/05), rodar `git revert {commit}` mentalmente: o backup permanece, posso restaurar manualmente copiando `.planning.v5-backup/.planning/` para `.planning/` (atende R14).

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
