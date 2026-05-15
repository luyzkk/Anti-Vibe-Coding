<!--
Princípio universal #5 — Comment Provenance.
Cada decisão não óbvia neste arquivo tem autor, data e justificativa inline.
Não remova comentários de proveniência — eles são o contexto que previne regressões.
-->

# Fase 01: Full Re-run Idempotência

**Plano:** 05 — Polish: Idempotência + Fixtures + AGENTS.md
**Sizing:** 1.5h
**Depende de:** Plano 04 completo (`AntiVibeManifest`, `computeChecksum`, `readManifest`, `autoFlipIfComplete`)
**Visual:** false

---

## O que esta fase entrega

Módulo `skills/init/lib/idempotency.ts` com lógica de re-run: `shouldSkipFile` compara
checksums contra o manifest gravado pelo Plano 04, preserva plans em `active/` incondicionalmente,
e `regenerateDiscovery` limpa os artefatos de discovery para forçar re-scan. Integração no
`SKILL.md` de `/init` para chamar `checkIdempotency()` antes de disparar as fases de migration.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/idempotency.ts` | Criar | shouldSkipFile + regenerateDiscovery + checkIdempotency + tipos |
| `skills/init/lib/idempotency.test.ts` | Criar | Testes unitários RED→GREEN cobrindo 4 caminhos de shouldSkipFile |
| `skills/init/SKILL.md` | Modificar | Seção de routing: chamar checkIdempotency() antes de migration phases |

---

## Implementacao

### Passo 1: Stub RED antes de criar o módulo

Criar `skills/init/lib/idempotency.test.ts` — este arquivo deve existir ANTES do módulo:

```typescript
import { describe, it, expect } from 'bun:test'
import { shouldSkipFile, regenerateDiscovery } from './idempotency'

describe('idempotency', () => {
  it('module exports shouldSkipFile and regenerateDiscovery', () => {
    expect(typeof shouldSkipFile).toBe('function')
    expect(typeof regenerateDiscovery).toBe('function')
  })
})
```

Rodar para confirmar RED:
```bash
bun run test -- --grep 'idempotency'
# Esperado: ModuleNotFoundError — módulo não existe ainda
```

### Passo 2: Tipos

```typescript
// skills/init/lib/idempotency.ts
// 2026-05-14 (Luiz/dev): Plano 05 fase-01 — idempotência de re-run.
// DT-02: full re-run regenera discovery/*, preserva plans em active/.
// DT-06: skip + warn se checksum mudou desde último run (respeita edits humanos).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import type { AntiVibeManifest } from './manifest-writer'

/**
 * Resultado de shouldSkipFile.
 *
 * skip: true + reason: 'checksum-mismatch' → arquivo foi editado pelo humano; emitir warning.
 * skip: true + reason: 'plan-preserved'    → arquivo é um migration plan em active/; sempre preservar.
 * skip: false                              → arquivo não estava no manifest ou checksum não mudou; pode regenerar.
 */
export type SkipResult =
  | { skip: true; reason: 'checksum-mismatch' | 'plan-preserved' }
  | { skip: false }

export type IdempotencyWarning = {
  filePath: string
  reason: 'checksum-mismatch' | 'plan-preserved'
  message: string
}

export type CheckIdempotencyResult = {
  warnings: IdempotencyWarning[]
  /** Paths que devem ser pulados pelo pipeline (edited by human OR plan-preserved). */
  skipPaths: Set<string>
}
```

### Passo 3: `computeChecksumSync` local

O `computeChecksum` do Plano 04 é async e opera sobre um arquivo. Este módulo usa a mesma
lógica, mas prefere uma versão async local para não criar dependência circular:

```typescript
/** SHA-256 hex do conteúdo do arquivo. Retorna '' se arquivo não existir. */
async function checksumOfFile(absPath: string): Promise<string> {
  let content: Buffer
  try {
    content = await fs.readFile(absPath)
  } catch {
    return ''
  }
  return createHash('sha256').update(content).digest('hex')
}
```

### Passo 4: `shouldSkipFile`

```typescript
/**
 * Decide se um arquivo deve ser pulado durante re-run de /init.
 *
 * Regras (em ordem de precedência):
 * 1. Paths dentro de `docs/exec-plans/active/` → SEMPRE preservados (plan-preserved).
 *    Não lê o arquivo nem compara checksum — é uma garantia de negócio, não otimização de I/O.
 * 2. Path não está no manifest.files → skip: false (novo arquivo — pode criar/regenerar).
 * 3. Checksum atual difere do gravado no manifest → skip: true, reason: 'checksum-mismatch'.
 *    Indica que o humano editou o arquivo entre runs.
 * 4. Checksum igual → skip: false (sem mudança — pode sobrescrever com mesmo conteúdo).
 *
 * @param relPath  Path relativo ao targetDir (ex: 'discovery/inventory.json').
 * @param absPath  Path absoluto (para leitura do conteúdo atual).
 * @param manifest Manifest do último run, lido via readManifest(targetDir).
 */
export async function shouldSkipFile(
  relPath: string,
  absPath: string,
  manifest: AntiVibeManifest,
): Promise<SkipResult> {
  // Regra 1: plans em active/ são sempre preservados.
  // Normaliza separadores para comparação cross-platform.
  const normalized = relPath.replace(/\\/g, '/')
  if (normalized.startsWith('docs/exec-plans/active/')) {
    return { skip: true, reason: 'plan-preserved' }
  }

  // Regra 2: não está no manifest → pode regenerar.
  const recorded = manifest.files[normalized] ?? manifest.files[relPath]
  if (!recorded) return { skip: false }

  // Regras 3 e 4: comparar checksum.
  const current = await checksumOfFile(absPath)
  if (!current) return { skip: false } // arquivo não existe mais → pode criar
  if (current !== recorded) {
    return { skip: true, reason: 'checksum-mismatch' }
  }
  return { skip: false }
}
```

### Passo 5: `regenerateDiscovery`

```typescript
const DISCOVERY_FILES = [
  'discovery/inventory.json',
  'discovery/semantic-inventory.json',
] as const

/**
 * Remove artefatos de discovery para forçar re-scan completo no próximo run.
 * DT-02: full re-run SEMPRE regenera discovery/*.
 *
 * Usa fs.unlink (não truncate) para garantir que checksums do manifest anterior
 * não colidam com estado intermediário (arquivo vazio tem checksum diferente de ausente).
 * Ignora ENOENT — arquivo já ausente é estado válido.
 */
export async function regenerateDiscovery(targetDir: string): Promise<void> {
  await Promise.all(
    DISCOVERY_FILES.map(async (rel) => {
      try {
        await fs.unlink(path.join(targetDir, rel))
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
        // ENOENT: arquivo já ausente — estado correto, sem ação.
      }
    }),
  )
}
```

### Passo 6: `checkIdempotency` — orquestrador para SKILL.md

```typescript
/**
 * Verifica idempotência antes de um re-run de /init em migration mode.
 *
 * Retorna o conjunto de paths que devem ser pulados e warnings a exibir ao operador.
 * SKILL.md deve chamar esta função ANTES de disparar runMigrationMode().
 *
 * @param targetDir  Diretório raiz do repo alvo.
 * @param manifest   Manifest do run anterior (de readManifest(targetDir)).
 * @param candidates Paths relativos a verificar (ex: planPaths relativos ao targetDir).
 */
export async function checkIdempotency(
  targetDir: string,
  manifest: AntiVibeManifest,
  candidates: string[],
): Promise<CheckIdempotencyResult> {
  const warnings: IdempotencyWarning[] = []
  const skipPaths = new Set<string>()

  await Promise.all(
    candidates.map(async (relPath) => {
      const absPath = path.join(targetDir, relPath)
      const result = await shouldSkipFile(relPath, absPath, manifest)
      if (result.skip) {
        skipPaths.add(relPath)
        const message =
          result.reason === 'checksum-mismatch'
            ? `"${relPath}" foi editado desde o último run — mantendo versão atual.`
            : `"${relPath}" é um migration plan ativo — preservando (nunca sobrescrever).`
        warnings.push({ filePath: relPath, reason: result.reason, message })
      }
    }),
  )

  return { warnings, skipPaths }
}
```

### Passo 7: Testes completos em `idempotency.test.ts`

Substituir o stub pelo conjunto completo de testes:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { shouldSkipFile, regenerateDiscovery, checkIdempotency } from './idempotency'
import type { AntiVibeManifest } from './manifest-writer'

// Helper: cria manifest mínimo com checksums fornecidos.
function makeManifest(files: Record<string, string> = {}): AntiVibeManifest {
  return {
    pluginVersion: '6.1.0',
    initMode: 'migration',
    installedAt: new Date().toISOString(),
    files,
  }
}

// Helper: SHA-256 de string.
function sha256(content: string): string {
  return createHash('sha256').update(Buffer.from(content)).digest('hex')
}

describe('shouldSkipFile', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'idempotency-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('returns skip:false when file is not in manifest', async () => {
    const manifest = makeManifest({})
    const absPath = path.join(tmpDir, 'discovery/inventory.json')
    const result = await shouldSkipFile('discovery/inventory.json', absPath, manifest)
    expect(result.skip).toBe(false)
  })

  it('returns plan-preserved for any path under docs/exec-plans/active/', async () => {
    const manifest = makeManifest({})
    // Não precisa existir no filesystem — preservação é garantia de negócio.
    const relPath = 'docs/exec-plans/active/2026-05-14-design-migration.md'
    const result = await shouldSkipFile(relPath, path.join(tmpDir, relPath), manifest)
    expect(result.skip).toBe(true)
    if (result.skip) expect(result.reason).toBe('plan-preserved')
  })

  it('returns checksum-mismatch when file was edited by human', async () => {
    const relPath = 'discovery/inventory.json'
    const absPath = path.join(tmpDir, relPath)
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    await fs.writeFile(absPath, '{"original": true}')
    const originalChecksum = sha256('{"original": true}')

    // Gravar checksum original no manifest.
    const manifest = makeManifest({ [relPath]: originalChecksum })

    // Humano edita o arquivo.
    await fs.writeFile(absPath, '{"edited": true}')

    const result = await shouldSkipFile(relPath, absPath, manifest)
    expect(result.skip).toBe(true)
    if (result.skip) expect(result.reason).toBe('checksum-mismatch')
  })

  it('returns skip:false when checksum matches (file unchanged)', async () => {
    const relPath = 'discovery/inventory.json'
    const absPath = path.join(tmpDir, relPath)
    const content = '{"unchanged": true}'
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    await fs.writeFile(absPath, content)
    const checksum = sha256(content)

    const manifest = makeManifest({ [relPath]: checksum })
    const result = await shouldSkipFile(relPath, absPath, manifest)
    expect(result.skip).toBe(false)
  })
})

describe('regenerateDiscovery', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'regen-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('removes inventory.json and semantic-inventory.json', async () => {
    const discoveryDir = path.join(tmpDir, 'discovery')
    await fs.mkdir(discoveryDir, { recursive: true })
    await fs.writeFile(path.join(discoveryDir, 'inventory.json'), '{}')
    await fs.writeFile(path.join(discoveryDir, 'semantic-inventory.json'), '{}')

    await regenerateDiscovery(tmpDir)

    await expect(fs.access(path.join(discoveryDir, 'inventory.json'))).rejects.toThrow()
    await expect(fs.access(path.join(discoveryDir, 'semantic-inventory.json'))).rejects.toThrow()
  })

  it('does not throw when discovery files are already absent', async () => {
    // Nenhum arquivo de discovery existe — deve completar sem erros.
    await expect(regenerateDiscovery(tmpDir)).resolves.toBeUndefined()
  })
})

describe('checkIdempotency', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'check-idempotency-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('returns empty warnings and skipPaths when nothing was edited', async () => {
    const relPath = 'discovery/inventory.json'
    const content = '{"data": 1}'
    const absPath = path.join(tmpDir, relPath)
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    await fs.writeFile(absPath, content)

    const manifest = makeManifest({ [relPath]: sha256(content) })
    const result = await checkIdempotency(tmpDir, manifest, [relPath])

    expect(result.warnings).toHaveLength(0)
    expect(result.skipPaths.size).toBe(0)
  })

  it('emits warning and adds to skipPaths when file was edited', async () => {
    const relPath = 'discovery/inventory.json'
    const absPath = path.join(tmpDir, relPath)
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    await fs.writeFile(absPath, '{"edited": true}')

    const manifest = makeManifest({ [relPath]: sha256('{"original": true}') })
    const result = await checkIdempotency(tmpDir, manifest, [relPath])

    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]?.reason).toBe('checksum-mismatch')
    expect(result.warnings[0]?.message).toContain('foi editado')
    expect(result.skipPaths.has(relPath)).toBe(true)
  })
})
```

### Passo 8: Integração em SKILL.md

Na seção de routing do `/init` SKILL.md, adicionar chamada antes de `runMigrationMode()`.
Localizar a seção `## Migration Mode Entry` (adicionada pelo Plano 01 fase-04) e inserir:

```markdown
<!-- IDEMPOTENCY CHECK (Plano 05 fase-01) -->
Se `initMode === "migration"` e manifest existir:
1. Chamar `regenerateDiscovery(targetDir)` — sempre (descarta discovery anterior).
2. Chamar `checkIdempotency(targetDir, manifest, planCandidates)`.
3. Para cada `warning` em `result.warnings`: exibir via AskUserQuestion ou console.warn
   no formato: `⚠️ [idempotency] {warning.message}`.
4. Passar `result.skipPaths` para `runMigrationMode()` como `skipPaths` option.
   O orchestrator usa skipPaths para pular fases cujo output já existe (editado ou preserved).
```

---

## Gotchas

**G1 — `shouldSkipFile` recebe `relPath` E `absPath` separados:** relPath é usado para lookup no
manifest e para a regra de `active/`. absPath é usado para leitura do arquivo. Não calcular absPath
internamente (requer `targetDir`, que complica a assinatura). Mantê-los separados simplifica testes.

**G2 — Normalização de separadores:** Windows usa `\`, manifest grava `/`. Normalizar com
`relPath.replace(/\\/g, '/')` antes de comparar com `manifest.files[key]`. Verificar nos testes
com path contendo `\\`.

**G3 — Plans em active/ subpastas também são preservados:** A regra `startsWith('docs/exec-plans/active/')` captura planos em subdiretórios (ex: `docs/exec-plans/active/2026-05-14-foo/README.md`). Comportamento correto — todo artefato dentro de active/ é trabalho humano.

**G4 — `regenerateDiscovery` antes do checksum check:** A ordem importa no SKILL.md. Se
`regenerateDiscovery` rodar APÓS `checkIdempotency`, os checksums de `discovery/*.json` vão
mostrar checksum-mismatch (arquivo foi deletado → checksum vazio). Rodar regeneração ANTES.

---

## Verificacao

### TDD
- [ ] RED: `idempotency.ts` não existe, teste falha com ModuleNotFoundError
  - Comando: `bun run test -- --grep 'idempotency'`
- [ ] GREEN: módulo criado, todos os testes passam
  - Comando: `bun run test -- --grep 'idempotency'`

### Checklist
- [ ] `shouldSkipFile` retorna `plan-preserved` para qualquer path em `docs/exec-plans/active/`
- [ ] `shouldSkipFile` retorna `checksum-mismatch` quando arquivo foi editado
- [ ] `shouldSkipFile` retorna `skip: false` quando arquivo não está no manifest
- [ ] `shouldSkipFile` retorna `skip: false` quando checksum é idêntico (arquivo inalterado)
- [ ] `regenerateDiscovery` remove `discovery/inventory.json` e `discovery/semantic-inventory.json`
- [ ] `regenerateDiscovery` não lança exceção quando arquivos já estão ausentes (ENOENT seguro)
- [ ] `checkIdempotency` retorna warnings com mensagens em português (consistência com o plugin)
- [ ] Separadores de path normalizados no lookup do manifest (cross-platform)
- [ ] `bun run tsc --noEmit` passa sem erros
- [ ] `bun run test` passa
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'idempotency'` retorna ≥6 testes PASS, 0 FAIL
- `bun run tsc --noEmit` retorna exit code 0
- `shouldSkipFile('docs/exec-plans/active/any.md', anyAbsPath, emptyManifest)` retorna
  `{ skip: true, reason: 'plan-preserved' }` sem ler o filesystem

**Por humano (CA-10 do PRD):**
Dado operador rodando `/init` 2× em sequência no mesmo repo em migration mode:
- `discovery/inventory.json` e `discovery/semantic-inventory.json` são regenerados (deletados e recriados)
- Plans em `docs/exec-plans/active/` são preservados
- Arquivos com checksum diferente do manifest emitem warning "X foi editado, mantendo versão atual"

<!-- Gerado por /plan-feature em 2026-05-14 -->
