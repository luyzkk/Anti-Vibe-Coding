<!--
Princípio universal #5 — Comment Provenance.
Comentários em código gerado desta fase seguem: autor + papel, YYYY-MM-DD, razão/decisão referenciada.
Ex: `// 2026-05-16 (Luiz/dev): idempotent default — alinhado com CA-04 e D16`
-->

# Fase 03: Idempotent Default + Flag `--refresh-knowledge`

**Plano:** 02 — Init Enrichment
**Sizing:** 1h
**Depende de:** fase-02 (consome `writeStackJson` final + `copy-knowledge.ts` do Plano 01)
**Visual:** false

---

## O que esta fase entrega

`copyKnowledge()` torna-se idempotente por default (skip + mensagem CA-04 quando `.claude/knowledge/` já existe) e expõe a flag `--refresh-knowledge` para forçar overwrite (RF7). `/init` SKILL.md ganha parser inline da flag.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/copy-knowledge.ts` | Modify | Adicionar parâmetro `{ refresh: boolean }`; retornar `{ status: 'copied' \| 'skipped' \| 'refreshed' \| 'no-matrix', atomCount, message }`. |
| `skills/init/lib/copy-knowledge.test.ts` | Modify | Adicionar casos: skip quando existe + refresh sobrescreve + mensagem informativa CA-04. |
| `skills/init/SKILL.md` | Modify | Adicionar parser inline da flag `--refresh-knowledge` no bloco onde `/init` decide chamar `copyKnowledge`. Manter parser ~10 linhas (G6). |

---

## Implementacao

### Passo 1: Contrato do `copyKnowledge` final

Retorno discriminado por `status` para que callsite (SKILL.md) e fase-04 (telemetria) possam reagir sem inspecionar mensagens textualmente.

```typescript
// 2026-05-16 (Luiz/dev): contrato final — alinhado com CA-04 (skip idempotente) e RF7 (--refresh-knowledge).
// G1 / DI-1: STACK_ID_TO_MATRIX_FOLDER continua sendo o ponto de truth do mapeamento.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { MatrixFolder } from './detect-multi-stack'

export type CopyKnowledgeStatus = 'copied' | 'skipped' | 'refreshed' | 'no-matrix' | 'no-source'

export interface CopyKnowledgeResult {
  status: CopyKnowledgeStatus
  /** Quantos átomos foram efetivamente escritos. 0 para skipped/no-matrix/no-source. */
  atomCount: number
  /** Mensagem human-readable já formatada para output do /init. */
  message: string
  /** Path absoluto de `.claude/knowledge/` no projeto alvo. */
  destDir: string
}

export interface CopyKnowledgeOptions {
  targetDir: string
  pluginRoot: string
  primary: MatrixFolder | null
  /** Quando true e .claude/knowledge/ existe, sobrescreve (RF7). Default false (CA-04). */
  refresh?: boolean
}
```

### Passo 2: Lógica idempotente + refresh

```typescript
// 2026-05-16 (Luiz/dev): idempotent default + refresh flag — alinhado com D16, CA-04, RF7.
export async function copyKnowledge(opts: CopyKnowledgeOptions): Promise<CopyKnowledgeResult> {
  const { targetDir, pluginRoot, primary, refresh = false } = opts
  const destDir = path.join(targetDir, '.claude', 'knowledge')

  // G10 / CA-06: primary=null → não há matrix para copiar
  if (!primary) {
    return {
      status: 'no-matrix',
      atomCount: 0,
      message: 'Stack não detectada. Knowledge não foi copiado.',
      destDir,
    }
  }

  const sourceDir = path.join(pluginRoot, 'docs', 'knowledge', primary)
  const sourceExists = await fs.access(sourceDir).then(() => true).catch(() => false)
  if (!sourceExists) {
    return {
      status: 'no-source',
      atomCount: 0,
      message: `Matrix '${primary}' não existe em ${path.relative(pluginRoot, sourceDir)}. Knowledge não foi copiado.`,
      destDir,
    }
  }

  const destExists = await fs.access(destDir).then(() => true).catch(() => false)

  if (destExists && !refresh) {
    // 2026-05-16 (Luiz/dev): CA-04 — preserve + inform. Mensagem textual exata do PRD §Edge Cases.
    return {
      status: 'skipped',
      atomCount: 0,
      message: 'Knowledge já existe em .claude/knowledge/. Use --refresh-knowledge para re-copiar.',
      destDir,
    }
  }

  // Refresh path: limpar antes de copiar
  if (destExists && refresh) {
    await fs.rm(destDir, { recursive: true, force: true })
  }

  await fs.mkdir(destDir, { recursive: true })
  const atomCount = await copyTree(sourceDir, destDir)

  return {
    status: refresh ? 'refreshed' : 'copied',
    atomCount,
    message: refresh
      ? `Stack detected: ${primary}. Knowledge re-copied: ${atomCount} atoms.`
      : `Stack detected: ${primary}. Knowledge copied: ${atomCount} atoms.`,
    destDir,
  }
}

/**
 * Cópia recursiva mínima. Retorna contagem de **arquivos** (não diretórios).
 * Reusa fs nativo — não usa `copy-recursive.ts` existente porque aquele é
 * para o scaffold de templates (contexto diferente, contagem distinta).
 */
async function copyTree(src: string, dest: string): Promise<number> {
  let count = 0
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true })
      count += await copyTree(srcPath, destPath)
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath)
      count += 1
    }
  }
  return count
}
```

### Passo 3: Parser inline da flag em `/init` SKILL.md

`/init` recebe argumentos via `$ARGUMENTS`. Parser fica ~10 linhas, sem dependência externa (G6).

```typescript
// 2026-05-16 (Luiz/dev): parser inline da flag — alinhado com RF7 e G6 (sem commander/yargs).
// Coloca-se no bloco do SKILL.md onde /init decide invocar copyKnowledge (após detectMultiStack).

function parseRefreshFlag(rawArgs: string | undefined): boolean {
  if (!rawArgs) return false
  // Aceita: "--refresh-knowledge", "--refresh-knowledge ", " --refresh-knowledge" entre outros tokens
  const tokens = rawArgs.split(/\s+/).filter(Boolean)
  return tokens.includes('--refresh-knowledge')
}

// Uso no flow do /init:
// const refresh = parseRefreshFlag(process.argv.slice(2).join(' ') || '')
// const copyResult = await copyKnowledge({ targetDir, pluginRoot, primary: detectionResult.primary, refresh })
// console.log(copyResult.message)
```

### Passo 4: Testes — skip + refresh + no-matrix

`skills/init/lib/copy-knowledge.test.ts` (já existe do Plano 01 fase-03 com casos monostack) recebe três novos casos:

```typescript
// 2026-05-16 (Luiz/dev): testes idempotência e refresh — alinhado com CA-04 e RF7.
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { copyKnowledge } from './copy-knowledge'

async function setupFixture(): Promise<{ targetDir: string; pluginRoot: string }> {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'copy-knowledge-'))
  const pluginRoot = path.join(root, 'plugin')
  const targetDir = path.join(root, 'project')
  await fs.mkdir(path.join(pluginRoot, 'docs', 'knowledge', 'nodejs-typescript', 'atoms'), { recursive: true })
  await fs.writeFile(path.join(pluginRoot, 'docs', 'knowledge', 'nodejs-typescript', 'INDEX.md'), '# INDEX')
  await fs.writeFile(
    path.join(pluginRoot, 'docs', 'knowledge', 'nodejs-typescript', 'atoms', 'pilot.md'),
    '---\ntopic: pilot\n---\n',
  )
  await fs.mkdir(targetDir, { recursive: true })
  return { targetDir, pluginRoot }
}

describe('copyKnowledge — idempotência + refresh', () => {
  it('returns status=copied + atomCount on first run', async () => {
    const { targetDir, pluginRoot } = await setupFixture()
    const result = await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript' })
    expect(result.status).toBe('copied')
    expect(result.atomCount).toBe(2) // INDEX.md + pilot.md
    expect(result.message).toContain('Knowledge copied: 2 atoms')
  })

  it('returns status=skipped with CA-04 message when .claude/knowledge/ exists (no refresh)', async () => {
    const { targetDir, pluginRoot } = await setupFixture()
    await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript' })
    const second = await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript' })
    expect(second.status).toBe('skipped')
    expect(second.atomCount).toBe(0)
    expect(second.message).toBe('Knowledge já existe em .claude/knowledge/. Use --refresh-knowledge para re-copiar.')
  })

  it('returns status=refreshed and overwrites when --refresh-knowledge passed (RF7)', async () => {
    const { targetDir, pluginRoot } = await setupFixture()
    await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript' })
    // mutar conteúdo do projeto para verificar overwrite
    await fs.writeFile(path.join(targetDir, '.claude', 'knowledge', 'INDEX.md'), '# STALE')
    const refreshed = await copyKnowledge({
      targetDir,
      pluginRoot,
      primary: 'nodejs-typescript',
      refresh: true,
    })
    expect(refreshed.status).toBe('refreshed')
    expect(refreshed.atomCount).toBe(2)
    const restored = await fs.readFile(path.join(targetDir, '.claude', 'knowledge', 'INDEX.md'), 'utf8')
    expect(restored).toBe('# INDEX')
  })

  it('returns status=no-matrix when primary=null (CA-06)', async () => {
    const { targetDir, pluginRoot } = await setupFixture()
    const result = await copyKnowledge({ targetDir, pluginRoot, primary: null })
    expect(result.status).toBe('no-matrix')
    expect(result.message).toBe('Stack não detectada. Knowledge não foi copiado.')
  })

  it('returns status=no-source when matrix folder for primary does not exist (CA-03 Rails puro v6.3.2)', async () => {
    const { targetDir, pluginRoot } = await setupFixture()
    const result = await copyKnowledge({ targetDir, pluginRoot, primary: 'rails' })
    expect(result.status).toBe('no-source')
    expect(result.atomCount).toBe(0)
    expect(result.message).toContain('rails')
  })
})
```

### Passo 5: Wire-up em `/init` SKILL.md

No bloco do SKILL.md onde Plano 01 fase-03 introduziu a chamada a `copyKnowledge` (monostack), substituir por:

```typescript
// 2026-05-16 (Luiz/dev): substituir bloco monostack do Plano 01 fase-03 por chamada multi-stack + refresh.
// G6: parser inline ~10 linhas, sem dependência nova.

const refresh = parseRefreshFlag(typeof __ARGUMENTS !== 'undefined' ? __ARGUMENTS : '')
const detection = await detectMultiStack(targetDir)
await writeStackJson(targetDir, detection)
const copyResult = await copyKnowledge({
  targetDir,
  pluginRoot,
  primary: detection.primary,
  refresh,
})
console.log(copyResult.message)
```

---

## Gotchas

- **G1 do plano (CA-10):** Nada nesta fase toca `state-md-init.ts`. STATE.md continua exatamente como antes.
- **G6 do plano:** Parser fica inline, sem `commander`/`yargs`. Aceita apenas `--refresh-knowledge` literal — não há aliases (`-r` etc) e não há suporte a `=value` (flag é boolean).
- **G10 do plano:** `primary: null` retorna `status: 'no-matrix'` sem tentar abrir source — não é erro, é caminho válido (CA-06).
- **Local — mensagem CA-04 é literal:** Texto exato `'Knowledge já existe em .claude/knowledge/. Use --refresh-knowledge para re-copiar.'` aparece no PRD §Edge Cases linha 159. Não parafrasear; testes assertam string exata.
- **Local — `no-source` vs `no-matrix`:** `no-matrix` = `primary=null` (detecção não achou anchor). `no-source` = primary é matrix folder válido mas a pasta `docs/knowledge/{primary}/` ainda não existe no plugin (caso CA-03 em v6.3.2 onde só Node+TS tem matrix). Telemetria de fase-04 trata ambos como "knowledge não copiado".

---

## Verificacao

### TDD

- [ ] **RED:** Casos novos falham contra `copy-knowledge.ts` monostack do Plano 01 (sem `refresh`/`status`)
  - Comando: `bun run test -- --grep 'copyKnowledge — idempotência'`
  - Resultado esperado: `Expected 'skipped', received 'copied'` (Plano 01 sempre sobrescreve, falha na segunda chamada)

- [ ] **GREEN:** Implementação ajustada; suite completa passa
  - Comando: `bun run test -- --grep 'copyKnowledge'`
  - Resultado esperado: todos passam

### Checklist

- [ ] `copyKnowledge` exporta `CopyKnowledgeStatus` com 5 valores: `copied | skipped | refreshed | no-matrix | no-source`
- [ ] Mensagem de skip casa exatamente com PRD linha 159 (CA-04)
- [ ] `parseRefreshFlag` reconhece a flag em qualquer posição da string de argumentos
- [ ] Diff em `skills/init/SKILL.md` é apenas no bloco da chamada `copyKnowledge` (não em outras seções)
- [ ] `git diff skills/init/lib/state-md-init.ts` vazio
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'copyKnowledge'` retorna `0 failed`
- Sequência manual:
  1. `bun run scripts/run-init-headless.ts <fixture-node-ts>` → output contém `Knowledge copied: <N> atoms`
  2. Re-executar mesma chamada → output contém `Knowledge já existe em .claude/knowledge/. Use --refresh-knowledge para re-copiar.`
  3. Re-executar com `--refresh-knowledge` → output contém `Knowledge re-copied: <N> atoms`

**Por humano:**
- Mensagem de output do `/init` é legível em terminal sem ANSI/escape esquisito.

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
