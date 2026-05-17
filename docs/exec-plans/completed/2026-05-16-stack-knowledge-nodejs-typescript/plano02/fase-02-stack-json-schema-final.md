<!--
Princípio universal #5 — Comment Provenance.
Comentários em código gerado desta fase seguem: autor + papel, YYYY-MM-DD, razão/decisão referenciada.
Ex: `// 2026-05-16 (Luiz/dev): timestamp ISO 8601 — alinhado com PRD schema (linha 96-101)`
-->

# Fase 02: `stack.json` Schema Final + Writer com Timestamp ISO 8601

**Plano:** 02 — Init Enrichment
**Sizing:** 1h
**Depende de:** fase-01 (consome `MultiStackResult` de `detect-multi-stack.ts`)
**Visual:** false

---

## O que esta fase entrega

`writeStackJson(targetDir, result)` que serializa `.claude/stack.json` no schema final do PRD (`primary`, `secondary[]`, `anchor_files[]`, `detected_at` ISO 8601 UTC), substituindo o writer monostack mínimo do Plano 01.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/write-stack-json.ts` | Modify | Estender writer monostack (criado em Plano 01 fase-03) para schema multi-stack final. Mantém assinatura de path e atomicidade. |
| `skills/init/lib/write-stack-json.test.ts` | Modify | Adicionar casos para `secondary`, `anchor_files`, formato ISO 8601 do `detected_at`, idempotência de escrita. |

---

## Implementacao

### Passo 1: Schema final + type guard de leitura

Confirmar shape público do JSON e expor type para que fases seguintes (fase-04 telemetria, Plano 06 fase-04 INDEX consumer) tenham contrato.

```typescript
// 2026-05-16 (Luiz/dev): schema final de .claude/stack.json — alinhado com PRD §Mecanismo (linha 96-101).
// G2 / DI-2: primary e secondary são nomes de pasta do matrix (não StackId interno).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { MultiStackResult, MatrixFolder } from './detect-multi-stack'

export interface StackJson {
  primary: MatrixFolder | null
  secondary: MatrixFolder[]
  anchor_files: string[]
  /** ISO 8601 UTC com sufixo `Z`. Ex: `2026-05-16T12:34:56.789Z`. */
  detected_at: string
}

const STACK_JSON_REL_PATH = path.join('.claude', 'stack.json')
```

### Passo 2: Writer atômico

Escrita em duas etapas (`tmp` + `rename`) para evitar leitura parcial caso `/init` seja interrompido. Diretório `.claude/` pode não existir — `mkdir recursive` antes.

```typescript
// 2026-05-16 (Luiz/dev): atomic write — escreve em .tmp e renomeia. Evita arquivo parcialmente populado em caso de SIGINT.
export async function writeStackJson(
  targetDir: string,
  result: MultiStackResult,
  now: Date = new Date(),
): Promise<{ path: string; written: StackJson }> {
  const dest = path.join(targetDir, STACK_JSON_REL_PATH)
  const tmp = `${dest}.tmp`
  await fs.mkdir(path.dirname(dest), { recursive: true })

  const payload: StackJson = {
    primary: result.primary,
    secondary: result.secondary,
    anchor_files: result.anchor_files,
    detected_at: now.toISOString(), // 2026-05-16 (Luiz/dev): ISO 8601 UTC — formato fixo do PRD
  }

  const body = JSON.stringify(payload, null, 2) + '\n'
  await fs.writeFile(tmp, body, 'utf8')
  await fs.rename(tmp, dest)
  return { path: dest, written: payload }
}

/**
 * Lê e parseia .claude/stack.json se existir. Retorna `null` se ausente ou inválido.
 * Usado por fase-04 (telemetria — para inferir o que foi detectado) e Plano 06 (preview de keywords).
 */
export async function readStackJson(targetDir: string): Promise<StackJson | null> {
  try {
    const body = await fs.readFile(path.join(targetDir, STACK_JSON_REL_PATH), 'utf8')
    const parsed: unknown = JSON.parse(body)
    if (!parsed || typeof parsed !== 'object') return null
    const candidate = parsed as Record<string, unknown>
    if (typeof candidate.detected_at !== 'string') return null
    if (!Array.isArray(candidate.secondary) || !Array.isArray(candidate.anchor_files)) return null
    if (candidate.primary !== null && typeof candidate.primary !== 'string') return null
    return parsed as StackJson
  } catch {
    return null
  }
}
```

### Passo 3: Testes que cobrem o schema final

`skills/init/lib/write-stack-json.test.ts` recebe novos casos. Os testes existentes do Plano 01 (monostack) devem continuar passando (regressão local — herda comportamento).

```typescript
// 2026-05-16 (Luiz/dev): testes do schema final — alinhado com CA-02, CA-03, CA-06, CA-07.
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { writeStackJson, readStackJson } from './write-stack-json'

const FIXED_NOW = new Date('2026-05-16T12:34:56.789Z')

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(tmpdir(), 'stack-json-'))
}

describe('writeStackJson — schema final', () => {
  it('writes primary, empty secondary, single anchor for monostack Node+TS (CA-02)', async () => {
    const dir = await tmpDir()
    const result = await writeStackJson(
      dir,
      { primary: 'nodejs-typescript', secondary: [], anchor_files: ['package.json'] },
      FIXED_NOW,
    )
    expect(result.written.primary).toBe('nodejs-typescript')
    expect(result.written.secondary).toEqual([])
    expect(result.written.anchor_files).toEqual(['package.json'])
    expect(result.written.detected_at).toBe('2026-05-16T12:34:56.789Z')
  })

  it('writes primary=null + empty arrays when no stack detected (CA-06)', async () => {
    const dir = await tmpDir()
    const { written } = await writeStackJson(
      dir,
      { primary: null, secondary: [], anchor_files: [] },
      FIXED_NOW,
    )
    expect(written.primary).toBeNull()
    expect(written.secondary).toEqual([])
    expect(written.anchor_files).toEqual([])
  })

  it('writes multi-stack with primary=rails, secondary=[nodejs-typescript] (CA-07)', async () => {
    const dir = await tmpDir()
    const { path: jsonPath } = await writeStackJson(
      dir,
      {
        primary: 'rails',
        secondary: ['nodejs-typescript'],
        anchor_files: ['Gemfile', 'package.json'],
      },
      FIXED_NOW,
    )
    const body = await fs.readFile(jsonPath, 'utf8')
    const parsed = JSON.parse(body)
    expect(parsed.primary).toBe('rails')
    expect(parsed.secondary).toEqual(['nodejs-typescript'])
    expect(parsed.anchor_files).toEqual(['Gemfile', 'package.json'])
  })

  it('emits ISO 8601 UTC with Z suffix for detected_at', async () => {
    const dir = await tmpDir()
    const { written } = await writeStackJson(
      dir,
      { primary: 'nodejs-typescript', secondary: [], anchor_files: ['package.json'] },
    )
    // 2026-05-16 (Luiz/dev): regex valida formato ISO 8601 UTC (Z final, ms opcional)
    expect(written.detected_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
  })

  it('creates .claude/ directory if missing and writes atomically (no .tmp leftover)', async () => {
    const dir = await tmpDir()
    await writeStackJson(
      dir,
      { primary: 'nodejs-typescript', secondary: [], anchor_files: ['package.json'] },
      FIXED_NOW,
    )
    const claudeEntries = await fs.readdir(path.join(dir, '.claude'))
    expect(claudeEntries).toContain('stack.json')
    expect(claudeEntries).not.toContain('stack.json.tmp')
  })

  it('readStackJson returns null when file absent', async () => {
    const dir = await tmpDir()
    const result = await readStackJson(dir)
    expect(result).toBeNull()
  })

  it('readStackJson round-trips a written stack.json', async () => {
    const dir = await tmpDir()
    await writeStackJson(
      dir,
      { primary: 'rails', secondary: ['nodejs-typescript'], anchor_files: ['Gemfile', 'package.json'] },
      FIXED_NOW,
    )
    const read = await readStackJson(dir)
    expect(read?.primary).toBe('rails')
    expect(read?.secondary).toEqual(['nodejs-typescript'])
    expect(read?.detected_at).toBe('2026-05-16T12:34:56.789Z')
  })
})
```

### Passo 4: Confirmar contrato CA-10 (regressão `state-md-init`)

Validar manualmente (não via teste — fase-05 trata o E2E) que a única mudança nesta fase é em `write-stack-json.ts` + seu test. `state-md-init.ts` continua escrevendo `detected_stack: <StackId>` em STATE.md sem nenhuma alteração.

---

## Gotchas

- **G2 do plano:** `primary` e `secondary` são **nomes de pasta do matrix**, não `StackId`. Quem chama `writeStackJson` (Plano 01 fase-03 callsite + extensão de fase-03 deste plano) já deve ter aplicado o alias map antes de passar `MultiStackResult`.
- **G5 do plano:** `anchor_files` é lista crua dos paths relativos detectados (`'package.json'`, `'Gemfile'`). Nunca enriquecer com stack name.
- **Local — atomicidade:** Em Windows, `fs.rename` falha se o destino existir e o filesystem não for NTFS recente. Em prática, NTFS suporta — `fs.rename` é atômico via MoveFileEx. Para WSL/Linux nada muda. Se algum dia falhar em CI Windows: investigar via log, não fallback para `copyFile + unlink`.
- **Local — `detected_at` sempre UTC:** `Date.prototype.toISOString()` em Node retorna sempre UTC com sufixo `Z`. Não usar `toLocaleString` ou similar — quebra o regex do teste e o schema do PRD.

---

## Verificacao

### TDD

- [ ] **RED:** Novos asserts (multi-stack, ISO 8601, atomicidade) falham contra writer monostack do Plano 01
  - Comando: `bun run test -- --grep 'writeStackJson — schema final'`
  - Resultado esperado: `Expected 'rails', received undefined` (writer antigo não conhece secondary/anchor_files)

- [ ] **GREEN:** Implementação atualizada; suite completa passa (incluindo casos legados do Plano 01)
  - Comando: `bun run test -- --grep 'writeStackJson'`
  - Resultado esperado: todos os testes passam, zero falhas

### Checklist

- [ ] `writeStackJson` exporta tipo `StackJson` com 4 campos: `primary`, `secondary`, `anchor_files`, `detected_at`
- [ ] `readStackJson` export disponível (consumido por fase-04 e Plano 06)
- [ ] `detected_at` regex match `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$`
- [ ] Atomicidade: arquivo `.tmp` não permanece após escrita bem-sucedida
- [ ] `git diff skills/init/lib/state-md-init.ts` vazio (CA-10 não tocado)
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'writeStackJson'` retorna `0 failed`
- Após escrita, `cat .claude/stack.json | jq '.detected_at'` retorna string ISO 8601 com `Z` final
- `git diff skills/init/lib/state-md-init.ts` produz output vazio

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
