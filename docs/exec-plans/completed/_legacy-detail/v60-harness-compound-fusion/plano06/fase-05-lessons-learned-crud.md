<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 05: lessons-learned-crud

**Plano:** 06 — Agent-Native (D31 CRUD + D32 STATE.md hook + D33 completion signal)
**Sizing:** 2h
**Depende de:** fase-02 (skill `/lessons-learned` ja emite completion signal — sub-comandos `--update` e `--delete` herdam essa emissao)
**Visual:** false

---

## O que esta fase entrega

`/lessons-learned --update {slug}` reescreve compound note preservando frontmatter `created` e adicionando `updated`. `/lessons-learned --delete {slug}` move arquivo para `docs/compound/_archived/` (soft archive). Sem hard delete — R14 mitigado, recuperavel via git ou mover manualmente (CA-41, CA-42).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/lib/lessons-learned-crud.ts` | Create | Helpers `update(slug, opts)` e `archive(slug)` exportados |
| `anti-vibe-coding/lib/lessons-learned-crud.test.ts` | Create | Suite RED→GREEN com fixture de compound notes |
| `anti-vibe-coding/skills/lessons-learned/SKILL.md` | Modify | Adicionar sub-comandos `--update` e `--delete` (alias para `archive`) |
| `anti-vibe-coding/skills/lessons-learned/lessons-learned.ts` | Modify | Roteador de sub-comando — invoca helpers do CRUD |

---

## Implementacao

### Passo 1: Helper de update

```typescript
// anti-vibe-coding/lib/lessons-learned-crud.ts
// 2026-05-11 (Luiz/dev): D31/S9/CA-41/CA-42 — CRUD com soft delete
import * as fs from 'fs'
import * as path from 'path'
import * as matter from 'gray-matter'
import { resolveV6Paths } from './path-resolver-v6'

export type UpdateOptions = {
  body?: string                   // novo body markdown (substitui)
  title?: string                  // novo title (frontmatter)
  category?: string
  tags?: string[]
}

/**
 * Atualiza compound note existente.
 * Preserva `created`, adiciona `updated`, permite mudanca de campos opcionais.
 *
 * @param slug nome sem extensao .md ou com prefixo date (resolver tenta ambos)
 * @returns path absoluto do arquivo atualizado
 * @throws se compound note nao encontrada
 */
export function update(projectRoot: string, slug: string, opts: UpdateOptions): string {
  const paths = resolveV6Paths(projectRoot)
  const filePath = resolveCompoundFile(paths.compound, slug)
  if (!filePath) {
    throw new Error(`lessons-learned: nao encontrei compound note "${slug}" em ${paths.compound}`)
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const parsed = matter(raw)
  const fmOld = parsed.data ?? {}

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // 2026-05-11 (Luiz/dev): preserva created, sobrescreve outros campos seletivamente
  const fmNew = {
    ...fmOld,
    title: opts.title ?? fmOld.title,
    category: opts.category ?? fmOld.category,
    tags: opts.tags ?? fmOld.tags,
    created: fmOld.created, // imutavel apos primeira escrita
    updated: today,
  }

  const newBody = opts.body ?? parsed.content
  const newRaw = matter.stringify(newBody, fmNew)

  fs.writeFileSync(filePath, newRaw, 'utf-8')
  return filePath
}

/**
 * Soft delete: move compound note para `docs/compound/_archived/`.
 * Preserva nome original (com data) + adiciona campo `archived_at` ao frontmatter.
 *
 * @returns objeto com paths antigo e novo
 * @throws se compound note nao encontrada
 */
export function archive(projectRoot: string, slug: string): { from: string; to: string } {
  const paths = resolveV6Paths(projectRoot)
  const filePath = resolveCompoundFile(paths.compound, slug)
  if (!filePath) {
    throw new Error(`lessons-learned: nao encontrei compound note "${slug}" em ${paths.compound}`)
  }

  const archivedDir = path.join(paths.compound, '_archived')
  if (!fs.existsSync(archivedDir)) {
    fs.mkdirSync(archivedDir, { recursive: true })
  }

  const fileName = path.basename(filePath)
  const targetPath = path.join(archivedDir, fileName)

  // 2026-05-11 (Luiz/dev): adicionar archived_at antes de mover — preserva intencao
  const raw = fs.readFileSync(filePath, 'utf-8')
  const parsed = matter(raw)
  const fmNew = {
    ...parsed.data,
    archived_at: new Date().toISOString().slice(0, 10),
  }
  const newRaw = matter.stringify(parsed.content, fmNew)
  fs.writeFileSync(filePath, newRaw, 'utf-8')

  // 2026-05-11 (Luiz/dev): mover atomicamente — fs.renameSync evita merge silencioso (CLAUDE.md licao bash mv)
  fs.renameSync(filePath, targetPath)
  return { from: filePath, to: targetPath }
}

/**
 * Resolve slug para path completo.
 * Aceita: 'foo', '2026-05-12-foo', '2026-05-12-foo.md'.
 * Tenta match exato; senao, match por sufixo apos data.
 */
function resolveCompoundFile(compoundDir: string, slug: string): string | null {
  if (!fs.existsSync(compoundDir)) return null
  const cleanSlug = slug.endsWith('.md') ? slug : slug + '.md'

  // Tentativa 1: match exato
  const direct = path.join(compoundDir, cleanSlug)
  if (fs.existsSync(direct)) return direct

  // Tentativa 2: prefixo de data + slug (ex: slug='foo' -> match '*-foo.md')
  const candidates = fs.readdirSync(compoundDir).filter(
    (f) => f.endsWith('.md') && f !== 'README.md' && (
      f === cleanSlug ||
      f.endsWith(`-${cleanSlug}`) ||
      f.replace(/^\d{4}-\d{2}-\d{2}-/, '') === cleanSlug
    )
  )
  if (candidates.length === 1) return path.join(compoundDir, candidates[0])
  if (candidates.length > 1) {
    throw new Error(`lessons-learned: slug "${slug}" ambiguo — bate em ${candidates.join(', ')}`)
  }
  return null
}
```

### Passo 2: Suite de testes

```typescript
// anti-vibe-coding/lib/lessons-learned-crud.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import * as matter from 'gray-matter'
import { update, archive } from './lessons-learned-crud'

const FIXTURE = path.resolve(__dirname, '..', 'tests', 'fixtures', 'lessons-crud-fixture')
const compoundDir = path.join(FIXTURE, 'docs', 'compound')

beforeEach(() => {
  // Reset fixture
  if (fs.existsSync(FIXTURE)) fs.rmSync(FIXTURE, { recursive: true, force: true })
  fs.mkdirSync(compoundDir, { recursive: true })
  fs.writeFileSync(
    path.join(compoundDir, '2026-05-12-foo.md'),
    `---
title: foo
category: general
tags:
  - bash
created: 2026-05-12
---

Original body content.
`,
  )
})

describe('lessons-learned-crud.update', () => {
  it('rewrites body and preserves created, adds updated', () => {
    update(FIXTURE, 'foo', { body: 'novo body' })
    const raw = fs.readFileSync(path.join(compoundDir, '2026-05-12-foo.md'), 'utf-8')
    const parsed = matter(raw)
    expect(parsed.content.trim()).toBe('novo body')
    expect(parsed.data.created).toBe('2026-05-12')
    expect(parsed.data.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(parsed.data.title).toBe('foo') // preservado
  })

  it('updates tags selectively', () => {
    update(FIXTURE, 'foo', { tags: ['new-tag'] })
    const parsed = matter(fs.readFileSync(path.join(compoundDir, '2026-05-12-foo.md'), 'utf-8'))
    expect(parsed.data.tags).toEqual(['new-tag'])
  })

  it('throws on unknown slug', () => {
    expect(() => update(FIXTURE, 'inexistente', { body: 'x' })).toThrow(/nao encontrei/)
  })

  it('resolves slug without date prefix', () => {
    expect(() => update(FIXTURE, 'foo', { body: 'x' })).not.toThrow()
  })
})

describe('lessons-learned-crud.archive', () => {
  it('moves file to _archived/ and adds archived_at frontmatter', () => {
    const result = archive(FIXTURE, 'foo')
    expect(fs.existsSync(result.from)).toBe(false)
    expect(fs.existsSync(result.to)).toBe(true)
    expect(result.to).toContain('_archived')

    const parsed = matter(fs.readFileSync(result.to, 'utf-8'))
    expect(parsed.data.archived_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(parsed.data.created).toBe('2026-05-12') // preservado
  })

  it('creates _archived/ dir if missing', () => {
    const archivedDir = path.join(compoundDir, '_archived')
    if (fs.existsSync(archivedDir)) fs.rmSync(archivedDir, { recursive: true })
    archive(FIXTURE, 'foo')
    expect(fs.existsSync(archivedDir)).toBe(true)
  })

  it('throws on unknown slug', () => {
    expect(() => archive(FIXTURE, 'inexistente')).toThrow(/nao encontrei/)
  })

  it('original file recoverable via fs.renameSync semantic', () => {
    // 2026-05-11 (Luiz/dev): valida que move foi atomico — nao deixa arquivo nos 2 locais
    archive(FIXTURE, 'foo')
    const inActive = fs.existsSync(path.join(compoundDir, '2026-05-12-foo.md'))
    const inArchived = fs.existsSync(path.join(compoundDir, '_archived', '2026-05-12-foo.md'))
    expect(inActive).toBe(false)
    expect(inArchived).toBe(true)
  })
})
```

### Passo 3: Roteamento na skill

No `skills/lessons-learned/SKILL.md`, dentro de bloco de codigo executavel (lembrar: instrucoes fora de blocos sao ignoradas — licao Plugin Development):

```typescript
// Pseudocodigo de roteamento — implementar em lessons-learned.ts
if (argv[0] === '--update') {
  const slug = argv[1]
  const body = await readBodyFromStdin() // ou prompt interativo
  const result = update(projectRoot, slug, { body })
  const signal = renderCompletionSignal({
    skill: 'lessons-learned',
    status: 'complete',
    outputs: [path.relative(projectRoot, result)],
    next_suggested: null,
    blocks_for_user: [],
  })
  console.log(`Lesson updated: ${result}\n\n${signal}`)
} else if (argv[0] === '--delete') {
  // 2026-05-11 (Luiz/dev): UI confirmation lives in SKILL.md prompt — helper assumes confirmed
  const slug = argv[1]
  const result = archive(projectRoot, slug)
  const signal = renderCompletionSignal({
    skill: 'lessons-learned',
    status: 'complete',
    outputs: [path.relative(projectRoot, result.to)],
    next_suggested: null,
    blocks_for_user: [],
  })
  console.log(`Lesson archived: ${result.from} -> ${result.to}\n\n${signal}`)
}
```

### Passo 4: Atualizar `SKILL.md` com documentacao

Adicionar secao "Sub-comandos" ao SKILL.md descrevendo `--update {slug}` e `--delete {slug}`. UI de confirmacao para `--delete`: skill emite prompt "Confirma archive de {slug}? [s/N]" — apenas helper de fase aceita slug ja resolvido. Confirmacao eh **na skill**, nao no helper.

---

## Gotchas

- **G6 do plano (soft delete + git como rede dupla):** Nao chama `git rm`. Usuario decide quando comitar. `archived_at` no frontmatter sinaliza intencao.
- **G10 do plano (`gray-matter` consistente):** Mesmo parser de fase-03. Se Plano 05 ja introduziu, reusar.
- **06-A7 (completion signal em CRUD ops):** Sim — `--update` e `--delete` emitem signal com `next_suggested: null`.
- **Local — `fs.renameSync` vs `mv` bash:** Usa `fs.renameSync` que falha se destino existir (atomicidade real). Cuidado: se ja existir `_archived/2026-05-12-foo.md` (re-archive), throw. Politica: dejar throw — usuario resolve manual. Alternativa: append `.dup-{timestamp}` ao nome.
- **Local — slug ambiguidade:** Se 2 compound notes batem (`2026-05-12-foo.md` e `2026-05-14-foo.md`), helper joga error pedindo slug com data. Documentar em UX da skill.
- **Local — frontmatter `tags` array vs string:** `gray-matter` parseia YAML lista como array TS. Helper assume array. Se compound note tem `tags: bash` (string sem `-`), helper trata como `['bash']` — adicionar normalize step se necessario.

---

## Verificacao

### TDD

- [ ] **RED:** Suite escrita antes do helper, todos os 8 testes falham
  - Comando: `cd anti-vibe-coding && bun test lib/lessons-learned-crud.test.ts`
  - Resultado esperado: `8 fail` por `update is not a function`

- [ ] **GREEN:** Helper implementado, todos passam
  - Comando: `cd anti-vibe-coding && bun test lib/lessons-learned-crud.test.ts`
  - Resultado esperado: `8 pass, 0 fail`

### Checklist

- [ ] `update(root, 'foo', { body: 'x' })` reescreve body preservando `created`
- [ ] `update` adiciona `updated: YYYY-MM-DD` ao frontmatter
- [ ] `archive('foo')` move para `_archived/`
- [ ] `archive` adiciona `archived_at` ao frontmatter
- [ ] `_archived/` criado automaticamente se ausente
- [ ] Slug sem data resolve via sufixo (`'foo'` bate em `2026-05-12-foo.md`)
- [ ] Slug ambiguo joga erro descritivo
- [ ] SKILL.md atualizado com sub-comandos `--update` e `--delete`
- [ ] Sub-comandos emitem completion signal (herda de fase-02)
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`
- [ ] `harness:validate` continua exit 0

---

## Criterio de Aceite

**Por maquina:**

- `cd anti-vibe-coding && bun test lib/lessons-learned-crud.test.ts` retorna `8 pass, 0 fail`.
- CA-41 verbatim: rodar `/lessons-learned --update foo` em fixture com compound note → arquivo reescrito, `created` preservado, `updated` adicionado.
- CA-42 verbatim: rodar `/lessons-learned --delete foo` → arquivo move para `docs/compound/_archived/`. `git status` mostra arquivo deletado + arquivo novo (recuperavel via `git checkout HEAD~1` apos commit).

**Por humano:**

- N/A.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
