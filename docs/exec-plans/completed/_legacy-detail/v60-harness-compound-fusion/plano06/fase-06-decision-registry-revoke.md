<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 06: decision-registry-revoke

**Plano:** 06 — Agent-Native (D31 CRUD + D32 STATE.md hook + D33 completion signal)
**Sizing:** 1.5h
**Depende de:** fase-02 (skill `/decision-registry` ja emite completion signal — `--revoke` herda)
**Visual:** false

---

## O que esta fase entrega

`/decision-registry --revoke {id}` cria novo ADR-NNNN-{slug}-superseded com pattern superseded e link bidirecional. ADR original NAO eh deletado — ganha frontmatter `status: superseded-by: ADR-NNNN` + bloco textual de link reverso (CA-43, R14).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/lib/decision-registry-revoke.ts` | Create | Helper `revoke(id, opts)` exportado |
| `anti-vibe-coding/lib/decision-registry-revoke.test.ts` | Create | Suite RED→GREEN com fixture de ADRs |
| `anti-vibe-coding/skills/decision-registry/SKILL.md` | Modify | Adicionar sub-comando `--revoke {id}` documentado |
| `anti-vibe-coding/skills/decision-registry/decision-registry.ts` | Modify | Roteador — invoca `revoke()` |

---

## Implementacao

### Passo 1: Helper de revoke

```typescript
// anti-vibe-coding/lib/decision-registry-revoke.ts
// 2026-05-11 (Luiz/dev): D31/S10/CA-43/R14 — revoke nunca deleta, usa pattern superseded
import * as fs from 'fs'
import * as path from 'path'
import * as matter from 'gray-matter'
import { resolveV6Paths } from './path-resolver-v6'

export type RevokeOptions = {
  reason: string                  // obrigatorio — por que esta ADR foi revogada
  newSlug?: string                // opcional — slug do novo ADR; default = {original-slug}-superseded
  newBody?: string                // opcional — body do novo ADR; default = template basico
}

export type RevokeResult = {
  original: { id: string; path: string }
  superseded: { id: string; path: string }
}

/**
 * Revoga uma ADR ativa criando uma nova ADR (superseded pattern).
 * Side-effects:
 *  1. Cria `ADR-{NEW}-{slug}-superseded.md` (numero monotonico apos max do diretorio).
 *  2. Atualiza frontmatter do ADR original: `status: superseded-by: ADR-{NEW}`.
 *  3. Adiciona bloco textual de link no topo do corpo da ADR original.
 *
 * @param id pode ser numero (`3`), string com prefixo (`'ADR-0003'`), ou path
 * @returns paths dos 2 arquivos modificados/criados
 */
export function revoke(projectRoot: string, id: string | number, opts: RevokeOptions): RevokeResult {
  const paths = resolveV6Paths(projectRoot)
  const originalPath = resolveAdrFile(paths.designDocs, id)
  if (!originalPath) {
    throw new Error(`decision-registry: ADR "${id}" nao encontrada em ${paths.designDocs}`)
  }

  // 2026-05-11 (Luiz/dev): parse ADR original — preserva tudo exceto status
  const rawOrig = fs.readFileSync(originalPath, 'utf-8')
  const parsedOrig = matter(rawOrig)
  const origId = extractAdrIdFromFilename(path.basename(originalPath))
  const origSlug = extractSlugFromFilename(path.basename(originalPath))

  // 2026-05-11 (Luiz/dev): numero do novo ADR — max + 1 (mesma logica de Plano 05 fase-02)
  const nextNumber = computeNextAdrNumber(paths.designDocs)
  const newSlug = opts.newSlug ?? `${origSlug}-superseded`
  const newFileName = `ADR-${formatAdrNumber(nextNumber)}-${newSlug}.md`
  const newPath = path.join(paths.designDocs, newFileName)
  const newId = `ADR-${formatAdrNumber(nextNumber)}`

  const today = new Date().toISOString().slice(0, 10)

  // 2026-05-11 (Luiz/dev): cria novo ADR com link reverso (Supersedes)
  const newBody = opts.newBody ?? renderSupersededTemplate({
    supersedesId: origId,
    supersedesPath: path.basename(originalPath),
    reason: opts.reason,
  })
  const newFm = {
    id: newId,
    title: `Supersedes ${origId}`,
    supersedes: origId,
    status: 'active',
    created: today,
  }
  fs.writeFileSync(newPath, matter.stringify(newBody, newFm), 'utf-8')

  // 2026-05-11 (Luiz/dev): atualiza ADR original — frontmatter + bloco textual no topo
  const updatedFm = {
    ...parsedOrig.data,
    status: `superseded-by: ${newId}`,
  }
  const reverseLinkBlock = `> **Superseded-by:** [${newId}](./${newFileName}) on ${today} — ${opts.reason}\n\n`
  const updatedBody = reverseLinkBlock + parsedOrig.content.replace(/^>\s*\*\*Superseded-by:\*\*[^\n]+\n+/m, '')
  fs.writeFileSync(originalPath, matter.stringify(updatedBody, updatedFm), 'utf-8')

  return {
    original: { id: origId, path: originalPath },
    superseded: { id: newId, path: newPath },
  }
}

function renderSupersededTemplate(args: { supersedesId: string; supersedesPath: string; reason: string }): string {
  return [
    `> **Supersedes:** [${args.supersedesId}](./${args.supersedesPath})`,
    '',
    '## Context',
    '',
    `${args.reason}`,
    '',
    '## Decision',
    '',
    '_TODO: descrever nova decisao que substitui a anterior._',
    '',
    '## Consequences',
    '',
    '_TODO: trade-offs e impactos._',
    '',
  ].join('\n')
}

function resolveAdrFile(designDocsDir: string, id: string | number): string | null {
  if (!fs.existsSync(designDocsDir)) return null
  const num = typeof id === 'number' ? id : parseAdrNumber(id)
  if (num === null) return null
  const prefix = `ADR-${formatAdrNumber(num)}-`
  const match = fs.readdirSync(designDocsDir).find((f) => f.startsWith(prefix) && f.endsWith('.md'))
  return match ? path.join(designDocsDir, match) : null
}

function parseAdrNumber(id: string): number | null {
  // 2026-05-11 (Luiz/dev): aceita 'ADR-0003', '0003', '3', 'ADR-3'
  const m = id.match(/(?:ADR-)?(\d+)$/i)
  return m ? parseInt(m[1], 10) : null
}

function formatAdrNumber(n: number): string {
  return n.toString().padStart(4, '0')
}

function extractAdrIdFromFilename(fileName: string): string {
  // 2026-05-11 (Luiz/dev): 'ADR-0003-x.md' -> 'ADR-0003'
  const m = fileName.match(/^(ADR-\d{4})-/)
  if (!m) throw new Error(`filename "${fileName}" nao casa com padrao ADR-NNNN-*.md`)
  return m[1]
}

function extractSlugFromFilename(fileName: string): string {
  // 'ADR-0003-foo-bar.md' -> 'foo-bar'
  return fileName.replace(/^ADR-\d{4}-/, '').replace(/\.md$/, '')
}

function computeNextAdrNumber(designDocsDir: string): number {
  const max = fs.readdirSync(designDocsDir)
    .filter((f) => /^ADR-\d{4}-/.test(f))
    .map((f) => parseInt(f.match(/^ADR-(\d{4})-/)![1], 10))
    .reduce((a, b) => Math.max(a, b), 0)
  return max + 1
}
```

### Passo 2: Suite de testes

```typescript
// anti-vibe-coding/lib/decision-registry-revoke.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import * as matter from 'gray-matter'
import { revoke } from './decision-registry-revoke'

const FIXTURE = path.resolve(__dirname, '..', 'tests', 'fixtures', 'adr-revoke-fixture')
const adrDir = path.join(FIXTURE, 'docs', 'design-docs')

beforeEach(() => {
  if (fs.existsSync(FIXTURE)) fs.rmSync(FIXTURE, { recursive: true, force: true })
  fs.mkdirSync(adrDir, { recursive: true })
  fs.writeFileSync(
    path.join(adrDir, 'ADR-0001-x.md'),
    `---
id: ADR-0001
title: Original X
status: active
created: 2026-04-01
---

## Context

Reasons for X.

## Decision

Choose X.
`,
  )
  fs.writeFileSync(
    path.join(adrDir, 'ADR-0003-y.md'),
    `---
id: ADR-0003
title: Original Y
status: active
created: 2026-05-01
---

Y body.
`,
  )
})

describe('decision-registry-revoke', () => {
  it('creates new ADR with monotonic number', () => {
    const result = revoke(FIXTURE, 3, { reason: 'X agora obsoleto' })
    expect(result.superseded.id).toBe('ADR-0004')
    expect(fs.existsSync(result.superseded.path)).toBe(true)
    expect(path.basename(result.superseded.path)).toBe('ADR-0004-y-superseded.md')
  })

  it('preserves original ADR file (no delete)', () => {
    const result = revoke(FIXTURE, 1, { reason: 'simplificacao' })
    expect(fs.existsSync(result.original.path)).toBe(true)
  })

  it('updates original frontmatter with status: superseded-by', () => {
    const result = revoke(FIXTURE, 1, { reason: 'r1' })
    const parsed = matter(fs.readFileSync(result.original.path, 'utf-8'))
    expect(parsed.data.status).toBe('superseded-by: ADR-0004')
  })

  it('adds bidirectional link block to original body', () => {
    const result = revoke(FIXTURE, 1, { reason: 'r1' })
    const content = fs.readFileSync(result.original.path, 'utf-8')
    expect(content).toContain('**Superseded-by:**')
    expect(content).toContain('ADR-0004')
    expect(content).toContain('r1')
  })

  it('new ADR contains supersedes link back', () => {
    const result = revoke(FIXTURE, 1, { reason: 'r1' })
    const content = fs.readFileSync(result.superseded.path, 'utf-8')
    expect(content).toContain('**Supersedes:**')
    expect(content).toContain('ADR-0001')
  })

  it('new ADR has frontmatter supersedes field', () => {
    const result = revoke(FIXTURE, 1, { reason: 'r1' })
    const parsed = matter(fs.readFileSync(result.superseded.path, 'utf-8'))
    expect(parsed.data.supersedes).toBe('ADR-0001')
    expect(parsed.data.status).toBe('active')
  })

  it('accepts id as string ADR-0003 or number 3', () => {
    const r1 = revoke(FIXTURE, 'ADR-0003', { reason: 'r' })
    expect(r1.original.id).toBe('ADR-0003')
  })

  it('throws on unknown ADR id', () => {
    expect(() => revoke(FIXTURE, 99, { reason: 'r' })).toThrow(/nao encontrada/)
  })

  it('respects custom newSlug', () => {
    const result = revoke(FIXTURE, 1, { reason: 'r', newSlug: 'new-approach' })
    expect(path.basename(result.superseded.path)).toBe('ADR-0004-new-approach.md')
  })

  it('is not idempotent — double revoke creates 2 superseded entries (documented)', () => {
    // 2026-05-11 (Luiz/dev): chamar 2x cria ADR-0004 e ADR-0005, ambos ativos
    // skill UI deveria pedir confirmacao antes do segundo revoke
    revoke(FIXTURE, 1, { reason: 'r1' })
    const second = revoke(FIXTURE, 1, { reason: 'r2' })
    expect(second.superseded.id).toBe('ADR-0005')
  })
})
```

### Passo 3: Roteamento na skill

Em `skills/decision-registry/decision-registry.ts`:

```typescript
// 2026-05-11 (Luiz/dev): sub-comando --revoke (D31/CA-43)
if (argv[0] === '--revoke') {
  const id = argv[1]
  const reason = await promptForReason() // skill pede ao usuario interativo
  const result = revoke(projectRoot, id, { reason })
  const signal = renderCompletionSignal({
    skill: 'decision-registry',
    status: 'complete',
    outputs: [
      path.relative(projectRoot, result.original.path),
      path.relative(projectRoot, result.superseded.path),
    ],
    next_suggested: null,
    blocks_for_user: [],
  })
  console.log(
    `ADR ${result.original.id} revoked. New ADR: ${result.superseded.id} at ${result.superseded.path}\n\n${signal}`,
  )
}
```

### Passo 4: Atualizar SKILL.md

Documentar `--revoke {id}`:
- `id` pode ser `3`, `0003`, `ADR-3`, `ADR-0003`
- Skill pergunta razao (obrigatorio)
- Resultado: 2 arquivos modificados — ADR original (ainda existe, status atualizado) e novo ADR superseded
- Aviso: `--revoke` nao eh idempotente; revogar a mesma ADR 2x gera ADRs duplicados

---

## Gotchas

- **G7 do plano (link bidirecional formato):** ADR original ganha `> **Superseded-by:** [ADR-NNNN](./ADR-NNNN-{slug}-superseded.md) on {date} — {reason}`. Novo ADR ganha `> **Supersedes:** [ADR-NNNN-orig](./ADR-NNNN-orig-{slug}.md)`. Ambos no topo do body (apos frontmatter).
- **06-A5 (slug do novo ADR):** Default `{original-slug}-superseded`. Override via `opts.newSlug`. Skill pode prompt usuario.
- **06-A7 (completion signal em revoke):** Emite signal — `outputs` contem AMBOS os paths (original modificado + novo criado).
- **G10 do plano (`gray-matter`):** Reusar parser de fase-03 e fase-05.
- **Local — numeracao monotonica vs Plano 05 fase-02:** Mesma logica. Garantir que helper aqui usa **mesmo formato** (`ADR-{padStart 4}-{slug}`). Se Plano 05 expos helper `computeNextAdrNumber`, importar dele em vez de duplicar — checar antes.
- **Local — idempotencia de duplo revoke:** Helper NAO bloqueia. Skill UI deve pedir confirmacao explicita se `status` ja eh `superseded-by:`. Documentar em SKILL.md.
- **Local — `replace(/^>\s*\*\*Superseded-by:\*\*/m)`:** Evita duplicacao de bloco textual se revoke for chamado de novo. Regex remove bloco existente antes de adicionar novo.

---

## Verificacao

### TDD

- [ ] **RED:** Suite escrita antes do helper, todos os 10 testes falham
  - Comando: `cd anti-vibe-coding && bun test lib/decision-registry-revoke.test.ts`
  - Resultado esperado: `10 fail` por `revoke is not a function`

- [ ] **GREEN:** Helper implementado, todos passam
  - Comando: `cd anti-vibe-coding && bun test lib/decision-registry-revoke.test.ts`
  - Resultado esperado: `10 pass, 0 fail`

### Checklist

- [ ] ADR original NUNCA deletada (file sempre existe pos-revoke)
- [ ] Novo ADR criado com numero monotonico (`max + 1`, padStart 4 digitos)
- [ ] Frontmatter de ADR original recebe `status: superseded-by: ADR-NNNN`
- [ ] Bloco textual `> **Superseded-by:** [link](./...) on date — reason` no topo da ADR original
- [ ] Novo ADR contem `supersedes: ADR-{orig}` no frontmatter
- [ ] Novo ADR contem `> **Supersedes:** [link](./...)` no topo do body
- [ ] Aceita `id` como numero (`3`), string (`'ADR-0003'`), com ou sem prefixo
- [ ] Throw com mensagem clara em id invalido
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`
- [ ] `harness:validate` continua exit 0

---

## Criterio de Aceite

**Por maquina:**

- `cd anti-vibe-coding && bun test lib/decision-registry-revoke.test.ts` retorna `10 pass, 0 fail`.
- CA-43 verbatim: rodar `revoke(root, 1, { reason: 'r' })` em fixture com ADR-0001 ativo → cria `ADR-NNNN-x-superseded.md` linkando original; ADR-0001 nao deletado; frontmatter de ADR-0001 atualizado com `status: superseded-by: ADR-NNNN`.

**Por humano:**

- Abrir ADR original apos revoke e verificar visualmente o bloco `> **Superseded-by:**` no topo.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
