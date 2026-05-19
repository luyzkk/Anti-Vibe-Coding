<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Pre-6.5.0 Backup Completo

**Plano:** 04 — Reentrada + Validator allowlist + Audit Step 12
**Sizing:** 1h
**Depende de:** fase-01 (precisa de `ctx.flags['__reentryMode'] === 're-populate'` setado)
**Visual:** false

---

## O que esta fase entrega

Step `00_3-backup-pre-6_5_0` que, quando o reentry guard sinaliza `re-populate`, copia recursivamente `docs/` para `docs/_legacy/pre-6.5.0/` (com sufixo timestamp em caso de colisao) antes de qualquer mutacao do scaffold.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/00_3-backup-pre-6_5_0.ts` | Create | Step que copia `docs/` -> `docs/_legacy/pre-6.5.0/` quando `__reentryMode === 're-populate'` |
| `skills/init/lib/steps/00_3-backup-pre-6_5_0.test.ts` | Create | Cobre re-populate (copia), greenfield (NO-OP), idempotencia (sufixo `-{ts}`), dry-run (lista paths) |
| `skills/init/lib/registry.ts` | Modify | Inserir `backupPre650Step` entre `reentryGuardStep` e `secretsScanStep` |

---

## Implementacao

### Passo 1: criar o step

Escolha de primitivo: `fs.cp(..., { recursive: true })` nativo de Node 18+/Bun. O helper `createBackup` existente (Plano 02) e leve (single-file `copyFile`) e nao recursivo — reimplementar com `fs.cp` evita acoplamento e fica testavel em isolamento.

```typescript
// skills/init/lib/steps/00_3-backup-pre-6_5_0.ts
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { isDryRun } from '../dry-run-mode'
import type { Step } from './types'
import type { AuditLogWriter } from '../audit-log'

const LEGACY_ROOT = 'docs/_legacy/pre-6.5.0'

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Backup completo de docs/ antes de re-popular projetos < 6.5.0 (PRD MH-07, CA-03).
 * Idempotente: segunda execucao sufixa com `-{timestamp}`.
 * Filtra o proprio destino para nao copiar recursivamente.
 */
export const backupPre650Step: Step = {
  id: '00_3-backup-pre-6_5_0',
  async run(ctx) {
    const flags = ctx.flags as Record<string, string | boolean>
    if (flags['__reentryMode'] !== 're-populate') {
      return { mutated: false, summary: 'skipped (reentry mode is not re-populate)' }
    }

    const srcDir = path.join(ctx.cwd, 'docs')
    if (!(await pathExists(srcDir))) {
      return { mutated: false, summary: 'skipped (docs/ does not exist — nothing to back up)' }
    }

    let dstDir = path.join(ctx.cwd, LEGACY_ROOT)
    if (await pathExists(dstDir)) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      dstDir = path.join(ctx.cwd, `${LEGACY_ROOT}-${ts}`)
    }

    if (isDryRun(ctx)) {
      return {
        mutated: false,
        summary: `dry-run: would copy ${path.relative(ctx.cwd, srcDir)} -> ${path.relative(ctx.cwd, dstDir)}`,
      }
    }

    await fs.mkdir(path.dirname(dstDir), { recursive: true })
    await fs.cp(srcDir, dstDir, {
      recursive: true,
      filter: (source: string) => !source.includes(path.join('docs', '_legacy')),
    })

    const writer = flags['__auditLog'] as unknown as AuditLogWriter | undefined
    await writer?.append({
      subagent_id: 'init.backup-pre-6_5_0',
      input_paths: [srcDir],
      output_struct: { dst: path.relative(ctx.cwd, dstDir) },
      duration_ms: 0,
      retry_count: 0,
    })

    return {
      mutated: true,
      summary: `backup completo: docs/ -> ${path.relative(ctx.cwd, dstDir)}`,
    }
  },
}
```

### Passo 2: testes RED -> GREEN

```typescript
// skills/init/lib/steps/00_3-backup-pre-6_5_0.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { backupPre650Step } from './00_3-backup-pre-6_5_0'

async function makeTmpWithDocs(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-pre650-'))
  await fs.mkdir(path.join(dir, 'docs', 'sub'), { recursive: true })
  await fs.writeFile(path.join(dir, 'docs', 'STATE.md'), '# state')
  await fs.writeFile(path.join(dir, 'docs', 'sub', 'a.md'), 'a')
  return dir
}

describe('backupPre650Step', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await makeTmpWithDocs()
  })

  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  it('skips when reentry mode is greenfield', async () => {
    const flags = { __reentryMode: 'greenfield' as const }
    const report = await backupPre650Step.run({ cwd, args: [], flags })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('skipped')
  })

  it('copies docs/ to docs/_legacy/pre-6.5.0/ when reentry mode is re-populate', async () => {
    const flags = { __reentryMode: 're-populate' as const }
    const report = await backupPre650Step.run({ cwd, args: [], flags })
    expect(report.mutated).toBe(true)
    const backedUp = await fs.readFile(path.join(cwd, 'docs/_legacy/pre-6.5.0/STATE.md'), 'utf-8')
    expect(backedUp).toBe('# state')
  })

  it('suffixes destination with timestamp when previous backup exists', async () => {
    await fs.mkdir(path.join(cwd, 'docs/_legacy/pre-6.5.0'), { recursive: true })
    await fs.writeFile(path.join(cwd, 'docs/_legacy/pre-6.5.0/keep.md'), 'keep')

    const flags = { __reentryMode: 're-populate' as const }
    const report = await backupPre650Step.run({ cwd, args: [], flags })
    expect(report.summary).toMatch(/pre-6\.5\.0-\d{4}-\d{2}-\d{2}T/)

    const original = await fs.readFile(path.join(cwd, 'docs/_legacy/pre-6.5.0/keep.md'), 'utf-8')
    expect(original).toBe('keep')
  })

  it('dry-run lists paths without writing', async () => {
    const flags = { __reentryMode: 're-populate' as const, 'dry-run': true }
    const report = await backupPre650Step.run({ cwd, args: ['--dry-run'], flags })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('dry-run')
    const exists = await fs
      .access(path.join(cwd, 'docs/_legacy/pre-6.5.0'))
      .then(() => true)
      .catch(() => false)
    expect(exists).toBe(false)
  })

  it('does not recurse into its own destination (no infinite copy)', async () => {
    const flags = { __reentryMode: 're-populate' as const }
    await backupPre650Step.run({ cwd, args: [], flags })
    const nested = await fs
      .access(path.join(cwd, 'docs/_legacy/pre-6.5.0/_legacy'))
      .then(() => true)
      .catch(() => false)
    expect(nested).toBe(false)
  })
})
```

### Passo 3: registrar no `registry.ts`

```typescript
import { backupPre650Step } from './steps/00_3-backup-pre-6_5_0'
// ...
export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
  reentryGuardStep,
  backupPre650Step,       // 2026-05-19 (Luiz/dev): Plano 04 fase-02 — backup pre-6.5.0 antes de mutacao (MH-07, CA-03).
  secretsScanStep,
  // ...
]
```

---

## Gotchas

- **G5 do plano:** `fs.cp` recursive existe a partir do Node 18; o runtime alvo (Bun) suporta. Testar idempotencia EXPLICITAMENTE (caso `docs/_legacy/pre-6.5.0/` ja exista).
- **G6 do plano:** `docs/_legacy/pre-6.5.0/` esta DENTRO de `docs/`. Copia ingenua entra em loop. O `filter` callback exclui qualquer caminho contendo `docs/_legacy` — testar caso "no recurse into own destination".
- **Local:** Comparar com `createBackup` (`skills/init/lib/backup-anti-vibe.ts`): aquele e single-file (Plano 02 fase-03), nao recursivo. Decisao: reimplementar com `fs.cp` ao inves de generalizar `createBackup` — escopo deste step e diferente o suficiente para nao acoplar.
- **Local:** Quando manifest existe mas `docs/` nao (estado corrompido), step retorna skip silencioso sem abortar — proxima etapa (scaffold) cria `docs/` do zero. Cobrimos o caso em `pathExists(srcDir)`.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion
  - Comando: `bun test skills/init/lib/steps/00_3-backup-pre-6_5_0.test.ts`
  - Resultado esperado: 5 FAIL (step inexistente)

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun test skills/init/lib/steps/00_3-backup-pre-6_5_0.test.ts`
  - Resultado esperado: `5 pass, 0 fail`

### Checklist

- [ ] Step skipa em `greenfield` (mutated=false)
- [ ] Step copia `docs/STATE.md` -> `docs/_legacy/pre-6.5.0/STATE.md` em `re-populate`
- [ ] Idempotencia: segunda execucao gera `docs/_legacy/pre-6.5.0-{ts}/`
- [ ] Dry-run nao escreve nada
- [ ] Nao copia recursivamente para dentro do proprio destino
- [ ] `registry.test.ts` verde
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/00_3-backup-pre-6_5_0.test.ts` retorna `5 pass, 0 fail`
- Fixture E2E: cwd com `docs/` + manifest `pluginVersion: "6.4.1"` -> apos `runInit` existe `docs/_legacy/pre-6.5.0/` com snapshot completo (`diff -r docs/_legacy/pre-6.5.0 <snapshot original>` = vazio antes da mutacao do scaffold)

**Por humano (se aplicavel):**
- `tree docs/_legacy/pre-6.5.0` num projeto migrado mostra estrutura espelhada de `docs/` original (subindo manualmente confere CA-03 do PRD)

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
