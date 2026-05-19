<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Validator Allowlist Derivada de TEMPLATE_MANIFEST

**Plano:** 04 — Reentrada + Validator allowlist + Audit Step 12
**Sizing:** 1.5h
**Depende de:** Nenhuma (independente das fases 01/02 dentro do plano)
**Visual:** false

---

## O que esta fase entrega

Helper `buildAllowlistFromTemplateManifest()` que deriva a lista de docs canonicos a partir do `TEMPLATE_MANIFEST` + paths gerados em runtime; Step 90 (`final-validation`) reescrito para emitir warnings agrupados por subdiretorio canonico em vez dos 179 falsos positivos atuais (CA-06).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/validator-allowlist.ts` | Create | Helper que retorna `{ exactPaths: Set<string>, globPatterns: string[] }` derivado de `TEMPLATE_MANIFEST` + paths runtime |
| `skills/init/lib/validator-allowlist.test.ts` | Create | Cobre cada entrada de `TEMPLATE_MANIFEST` presente, paths runtime adicionados, casos de docs custom legitimos |
| `skills/init/lib/steps/90-final-validation.ts` | Modify | Trocar `Bun.spawn(harness-validate)` por walk em `docs/` + raiz, comparar contra allowlist, retornar warnings agrupados |
| `skills/init/lib/steps/90-final-validation.test.ts` | Create | Fixture com docs/ legitimo + arquivos extras -> assertions de warning count <= 5 (CA-06 Bug A) |

---

## Implementacao

### Passo 1: criar helper de allowlist

```typescript
// skills/init/lib/validator-allowlist.ts
import { TEMPLATE_MANIFEST } from './template-manifest'

export type Allowlist = {
  /** Paths exatos relativos ao repo root permitidos. Set para O(1) lookup. */
  readonly exactPaths: ReadonlySet<string>
  /** Globs (prefix-match simplificado) — ex: `docs/exec-plans/active/`. */
  readonly globPrefixes: readonly string[]
}

const RUNTIME_GLOB_PREFIXES: readonly string[] = [
  'docs/exec-plans/active/',
  'docs/exec-plans/completed/',
  'docs/compound/_imported/',
  'docs/compound/_archived/',
  'docs/design-docs/',           // ADRs nomeados dinamicamente
  'docs/lessons/',                // alternativo a compound em alguns projetos
] as const

/**
 * Allowlist canonica para o validador final (PRD MH-08, CA-06).
 * Combina destinos do TEMPLATE_MANIFEST com prefixos de runtime (exec-plans, compound).
 * Arquivos fora da allowlist sao reportados como warning (NAO erro).
 */
export function buildAllowlistFromTemplateManifest(): Allowlist {
  const exactPaths = new Set<string>()
  for (const entry of TEMPLATE_MANIFEST) {
    exactPaths.add(entry.dst)
  }
  // Paths fixos fora de TEMPLATE_MANIFEST mas legitimos
  exactPaths.add('AGENTS.md')
  exactPaths.add('ARCHITECTURE.md')
  exactPaths.add('CLAUDE.md')
  return {
    exactPaths,
    globPrefixes: RUNTIME_GLOB_PREFIXES,
  }
}

/**
 * Verifica se `relPath` (sempre relativo, com `/`) e permitido pela allowlist.
 */
export function isAllowed(relPath: string, allowlist: Allowlist): boolean {
  if (allowlist.exactPaths.has(relPath)) return true
  for (const prefix of allowlist.globPrefixes) {
    if (relPath.startsWith(prefix)) return true
  }
  return false
}

/**
 * Agrupa caminhos nao permitidos por "doc canonico" mais proximo (primeiro segmento + dir pai).
 * Retorna array de objetos {group, paths} para apresentacao concisa (resolve CA-06: 179 -> ~5 grupos).
 */
export function groupWarnings(
  unallowedRelPaths: readonly string[],
): readonly { readonly group: string; readonly paths: readonly string[] }[] {
  const buckets = new Map<string, string[]>()
  for (const p of unallowedRelPaths) {
    const segments = p.split('/')
    const group = segments.length >= 2 ? `${segments[0]}/${segments[1]}` : segments[0] ?? p
    const arr = buckets.get(group) ?? []
    arr.push(p)
    buckets.set(group, arr)
  }
  return Array.from(buckets.entries()).map(([group, paths]) => ({ group, paths }))
}
```

### Passo 2: testes do helper

```typescript
// skills/init/lib/validator-allowlist.test.ts
import { describe, it, expect } from 'bun:test'
import { TEMPLATE_MANIFEST } from './template-manifest'
import { buildAllowlistFromTemplateManifest, isAllowed, groupWarnings } from './validator-allowlist'

describe('buildAllowlistFromTemplateManifest', () => {
  const allowlist = buildAllowlistFromTemplateManifest()

  it('includes every TEMPLATE_MANIFEST dst', () => {
    for (const entry of TEMPLATE_MANIFEST) {
      expect(allowlist.exactPaths.has(entry.dst)).toBe(true)
    }
  })

  it('allows runtime paths under docs/exec-plans/active/', () => {
    expect(isAllowed('docs/exec-plans/active/2026-05-19-foo/PLAN.md', allowlist)).toBe(true)
    expect(isAllowed('docs/exec-plans/active/2026-05-19-foo/plano-populate-harness/fase-01.md', allowlist)).toBe(true)
  })

  it('allows compound imported lessons', () => {
    expect(isAllowed('docs/compound/_imported/2025-foo.md', allowlist)).toBe(true)
  })

  it('rejects unrelated docs/ files', () => {
    expect(isAllowed('docs/RANDOM.md', allowlist)).toBe(false)
  })
})

describe('groupWarnings', () => {
  it('groups by first two segments', () => {
    const out = groupWarnings([
      'docs/custom/a.md',
      'docs/custom/b.md',
      'docs/another/c.md',
    ])
    expect(out.length).toBe(2)
    const customGroup = out.find((g) => g.group === 'docs/custom')
    expect(customGroup?.paths.length).toBe(2)
  })
})
```

### Passo 3: reescrever Step 90

```typescript
// skills/init/lib/steps/90-final-validation.ts
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { isDryRun } from '../dry-run-mode'
import { buildAllowlistFromTemplateManifest, isAllowed, groupWarnings } from '../validator-allowlist'
import type { Step } from './types'

async function walkDocs(rootCwd: string): Promise<string[]> {
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

/**
 * Step 90 — validacao final via allowlist (PRD MH-08, CA-06).
 * - Substitui denylist por allowlist derivada de TEMPLATE_MANIFEST.
 * - Modo warning: nao aborta. Aborto (se aplicavel) e responsabilidade da fase-04.
 */
export const finalValidationStep: Step = {
  id: 'final-validation',
  async run(ctx) {
    if (isDryRun(ctx)) {
      return { mutated: false, summary: 'dry-run: validator skipped (would check allowlist)' }
    }

    const allowlist = buildAllowlistFromTemplateManifest()
    const docs = await walkDocs(ctx.cwd)
    const unallowed = docs.filter((p) => !isAllowed(p, allowlist))

    if (unallowed.length === 0) {
      return { mutated: false, summary: 'validator: 0 warnings — scaffold canonico intacto' }
    }

    const grouped = groupWarnings(unallowed)
    const summary = `validator: ${grouped.length} warnings (${unallowed.length} paths fora do scaffold canonico)`
    return { mutated: false, summary }
  },
}
```

### Passo 4: testes do Step 90 com fixture

```typescript
// skills/init/lib/steps/90-final-validation.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { finalValidationStep } from './90-final-validation'

async function makeFixture(extras: readonly string[]): Promise<string> {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'val-allowlist-'))
  await fs.mkdir(path.join(cwd, 'docs/design-docs'), { recursive: true })
  await fs.writeFile(path.join(cwd, 'docs/STATE.md'), '# state')
  await fs.writeFile(path.join(cwd, 'docs/design-docs/index.md'), '# index')
  for (const rel of extras) {
    const abs = path.join(cwd, rel)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, '# extra')
  }
  return cwd
}

describe('finalValidationStep (allowlist mode)', () => {
  let cwd: string

  afterEach(async () => {
    if (cwd) await fs.rm(cwd, { recursive: true, force: true })
  })

  it('reports 0 warnings when only canonical docs exist', async () => {
    cwd = await makeFixture([])
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.summary).toContain('0 warnings')
  })

  it('CA-06 Bug A: groups ~179 spurious paths into <= 5 warning groups', async () => {
    const extras: string[] = []
    for (let i = 0; i < 179; i++) {
      extras.push(`docs/custom/file-${i}.md`)
    }
    cwd = await makeFixture(extras)
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    const match = /(\d+) warnings/.exec(report.summary)
    expect(match).not.toBeNull()
    const warnings = Number(match![1])
    expect(warnings).toBeLessThanOrEqual(5)
  })

  it('does not warn on runtime paths under docs/exec-plans/active/', async () => {
    cwd = await makeFixture(['docs/exec-plans/active/2026-05-19-foo/PLAN.md'])
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.summary).toContain('0 warnings')
  })

  it('ignores docs/_legacy (backup pre-6.5.0)', async () => {
    cwd = await makeFixture(['docs/_legacy/pre-6.5.0/anything.md'])
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.summary).toContain('0 warnings')
  })
})
```

---

## Gotchas

- **G7 do plano:** Paths gerados em runtime (`docs/exec-plans/active/**`, `docs/compound/_imported/**`) NAO constam de `TEMPLATE_MANIFEST`. Adicionar como `globPrefixes`.
- **G8 do plano:** Wording byte-identico do harness-validate antigo (PRD R1/G1 do Plano 01) NAO se aplica aqui — output deste validator e fundamentalmente diferente. Liberado para reformatar.
- **Local:** Walk recursivo precisa SKIPAR `docs/_legacy/` para nao reportar backup pre-6.5.0 como warning. Garantir com guard explicito + teste.
- **Local:** `path.relative` no Windows produz `\`; normalizar para `/` (split + join) — IMPORTANTE para a allowlist.
- **Local:** `groupWarnings` pode agrupar por mais segmentos se precisar (`docs/exec-plans/active`). Versao inicial agrupa por 2 segmentos; ajustar se test Carreirarte indicar >5 grupos.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/init/lib/validator-allowlist.test.ts` -> FAIL (helper inexistente)
- [ ] **GREEN:** Mesma suite passa apos implementacao
- [ ] **RED:** `bun test skills/init/lib/steps/90-final-validation.test.ts` -> FAIL (step antigo lanca AbortError)
- [ ] **GREEN:** Apos refactor, `4 pass, 0 fail`

### Checklist

- [ ] Allowlist contem todas as `TEMPLATE_MANIFEST[*].dst`
- [ ] Allowlist contem `AGENTS.md`, `ARCHITECTURE.md`, `CLAUDE.md` (raiz)
- [ ] `docs/exec-plans/active/**` reconhecido como runtime path
- [ ] Fixture com 179 arquivos extras -> warning groups <= 5
- [ ] Lint limpo
- [ ] `registry.test.ts` continua verde

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/validator-allowlist.test.ts` retorna `>=4 pass, 0 fail`
- `bun test skills/init/lib/steps/90-final-validation.test.ts` retorna `4 pass, 0 fail`
- Fixture Carreirarte (ou simulacao): warning count na summary <= 5 (CA-06 Bug A)

**Por humano (se aplicavel):**
- Rodar `runInit` em projeto greenfield: summary `validator: 0 warnings` aparece no log final

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
