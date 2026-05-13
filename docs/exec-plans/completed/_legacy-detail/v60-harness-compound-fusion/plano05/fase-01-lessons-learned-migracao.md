<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-11 (Luiz/dev): default 30s — alinhado com OQ2 do CONTEXT v6.0.0`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Lessons-Learned Migracao

**Plano:** 05 — Skill Migration + Hooks
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase do plano)
**Visual:** false

---

## O que esta fase entrega

`/anti-vibe-coding:lessons-learned` passa a escrever em `docs/compound/YYYY-MM-DD-{slug}.md` com YAML frontmatter completo + secoes `## Problem` / `## Solution` / `## Prevention` quando detecta projeto v6 (CA-14). Mantem comportamento legado em projetos v5.x (D10 — zero breaking change).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/lib/path-resolver-v6.ts` | Create | Detecta layout v6 (`docs/compound/` existe) vs v5 (so `lessons-learned.md`); resolve paths absolutos |
| `anti-vibe-coding/lib/compound-note-writer.ts` | Create | Escreve compound note com frontmatter validado por `lib/compound-frontmatter.ts` (Plano 04 fase-02) |
| `anti-vibe-coding/skills/lessons-learned/SKILL.md` | Modify | Atualizar fluxo: detect → switch v5/v6 → write — mantendo assinatura legada |
| `anti-vibe-coding/skills/lessons-learned/index.ts` (ou equivalente) | Modify | Funcao `add()` aceita `(string)` ou `(LessonOpts)` |
| `anti-vibe-coding/tests/lessons-learned-v6.test.ts` | Create | RED→GREEN para CA-14 |

---

## Implementacao

### Passo 1: `lib/path-resolver-v6.ts` (raiz da migracao)

Cria o resolver compartilhado por todas as 6 skills migradas. Detecta v6 pela existencia de `docs/compound/` E `docs/exec-plans/` (heuristica conjunta evita falso-positivo em projetos com `docs/` ad-hoc).

```typescript
// 2026-05-11 (Luiz/dev): path resolver compartilhado por todas as 6 skills migradas (Plano 05)
// Detecta v6 vs v5 — referencia PRD secao "Estrutura de Pastas Final" e D10
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type ProjectLayout = 'v6' | 'v5' | 'cru'

export type ResolvedPaths = {
  layout: ProjectLayout
  projectRoot: string
  compoundDir: string                        // docs/compound (v6) ou lessons-learned.md (v5)
  designDocsDir: string                      // docs/design-docs (v6)
  execPlansActiveDir: string
  execPlansCompletedDir: string
  legacyLessonsFile: string                  // sempre lessons-learned.md (raiz) — v5 ou fallback
}

export async function resolvePaths(projectRoot: string): Promise<ResolvedPaths> {
  // 2026-05-11 (Luiz/dev): heuristica D10 — v6 = (docs/compound/ + docs/exec-plans/) ambos
  const compoundDir = path.join(projectRoot, 'docs', 'compound')
  const execPlansDir = path.join(projectRoot, 'docs', 'exec-plans')
  const legacyLessons = path.join(projectRoot, 'lessons-learned.md')

  const [hasCompound, hasExecPlans, hasLegacy] = await Promise.all([
    fs.stat(compoundDir).then(() => true).catch(() => false),
    fs.stat(execPlansDir).then(() => true).catch(() => false),
    fs.stat(legacyLessons).then(() => true).catch(() => false),
  ])

  const layout: ProjectLayout = hasCompound && hasExecPlans
    ? 'v6'
    : hasLegacy
      ? 'v5'
      : 'cru'

  return {
    layout,
    projectRoot,
    compoundDir,
    designDocsDir: path.join(projectRoot, 'docs', 'design-docs'),
    execPlansActiveDir: path.join(projectRoot, 'docs', 'exec-plans', 'active'),
    execPlansCompletedDir: path.join(projectRoot, 'docs', 'exec-plans', 'completed'),
    legacyLessonsFile: legacyLessons,
  }
}
```

### Passo 2: `lib/compound-note-writer.ts`

Escreve um arquivo compound com frontmatter completo, derivando defaults de heuristica do titulo. Idempotente (slug colision = sufixo numerico).

```typescript
// 2026-05-11 (Luiz/dev): compound note writer — emite frontmatter compativel com Plano 04 fase-02 (compound-check.ts)
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type CompoundNoteInput = {
  title: string
  body?: string
  category?: string        // default: 'general'
  tags?: string[]          // default: heuristica do titulo (>=1 tag obrigatorio — CA-29 ambiguity 04-A2)
  problem?: string         // se body for unstructured, dividir em 3 secoes via heuristica
  solution?: string
  prevention?: string
  createdISO?: string      // default: hoje em YYYY-MM-DD
}

export async function writeCompoundNote(
  compoundDir: string,
  input: CompoundNoteInput,
): Promise<{ filePath: string; created: boolean }> {
  const today = input.createdISO ?? new Date().toISOString().slice(0, 10)
  const slug = slugify(input.title)
  const baseName = `${today}-${slug}.md`
  const filePath = await resolveUniquePath(compoundDir, baseName)

  // 2026-05-11 (Luiz/dev): tags default — ao menos 1 string nao vazia (CA-29 ambiguity 04-A2 documentada)
  const tags = (input.tags && input.tags.length > 0)
    ? input.tags
    : [input.category ?? 'general']

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(input.title)}`,
    `category: ${input.category ?? 'general'}`,
    `tags: [${tags.map((t) => JSON.stringify(t)).join(', ')}]`,
    `created: ${today}`,
    '---',
    '',
  ].join('\n')

  const sections = [
    `# ${input.title}`,
    '',
    '## Problem',
    input.problem ?? (input.body ?? '(describe the problem here)'),
    '',
    '## Solution',
    input.solution ?? '(describe the solution here)',
    '',
    '## Prevention',
    input.prevention ?? '(describe how to prevent in future)',
    '',
  ].join('\n')

  await fs.mkdir(compoundDir, { recursive: true })
  await fs.writeFile(filePath, frontmatter + sections, 'utf-8')
  return { filePath, created: true }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled'
}

async function resolveUniquePath(dir: string, baseName: string): Promise<string> {
  // 2026-05-11 (Luiz/dev): collision policy G5 herdada — sufixar com -2, -3 se ja existe
  let candidate = path.join(dir, baseName)
  let n = 2
  while (await exists(candidate)) {
    const [stem, ext] = splitExt(baseName)
    candidate = path.join(dir, `${stem}-${n}${ext}`)
    n++
  }
  return candidate
}

async function exists(p: string): Promise<boolean> {
  try { await fs.stat(p); return true } catch { return false }
}

function splitExt(name: string): [string, string] {
  const i = name.lastIndexOf('.')
  return i === -1 ? [name, ''] : [name.slice(0, i), name.slice(i)]
}
```

### Passo 3: atualizar `skills/lessons-learned/` (assinatura compativel D10)

Skill atual exporta funcao tipo `add(title: string, body?: string)`. Manter forma posicional + adicionar forma rica.

```typescript
// 2026-05-11 (Luiz/dev): D10 — backward-compat com chamada posicional v5.x
import { resolvePaths } from '../../lib/path-resolver-v6'
import { writeCompoundNote, type CompoundNoteInput } from '../../lib/compound-note-writer'
import { promises as fs } from 'node:fs'

export type LessonAddInput = CompoundNoteInput

export async function add(
  arg: string | LessonAddInput,
  projectRoot: string = process.cwd(),
): Promise<{ filePath: string; layout: 'v6' | 'v5' | 'cru' }> {
  // 2026-05-11 (Luiz/dev): normaliza string posicional v5 → opts v6 (Ambiguity 05-A1 resolvida: assinatura unica)
  const opts: LessonAddInput = typeof arg === 'string' ? { title: arg } : arg

  const paths = await resolvePaths(projectRoot)

  if (paths.layout === 'v6') {
    const { filePath } = await writeCompoundNote(paths.compoundDir, opts)
    return { filePath, layout: 'v6' }
  }

  // 2026-05-11 (Luiz/dev): G2 — projeto v5 ou cru → appenda em lessons-learned.md + tip de migracao (Ambiguity 05-A2)
  const tip = '\n<!-- Tip: rode /anti-vibe-coding:init para migrar para layout v6 (docs/compound/) -->\n'
  const line = formatLegacyLessonLine(opts)
  const existing = await readSafe(paths.legacyLessonsFile)
  const body = existing
    ? existing + '\n' + line + (existing.includes('<!-- Tip:') ? '' : tip)
    : `# Lessons Learned\n\n${line}${tip}`
  await fs.writeFile(paths.legacyLessonsFile, body, 'utf-8')
  return { filePath: paths.legacyLessonsFile, layout: paths.layout }
}

async function readSafe(p: string): Promise<string | null> {
  try { return await fs.readFile(p, 'utf-8') } catch { return null }
}

function formatLegacyLessonLine(opts: LessonAddInput): string {
  const date = opts.createdISO ?? new Date().toISOString().slice(0, 10)
  return `## ${date}: ${opts.title}\n\n${opts.body ?? '(detalhe aqui)'}\n`
}
```

### Passo 4: atualizar `skills/lessons-learned/SKILL.md`

Adicionar bloco que documenta o fluxo dual v5/v6 para o orquestrador LLM. Lembrar: **logica executavel deve estar dentro de blocos de codigo** (licao registrada no CLAUDE.md atual — "Instrucoes executaveis em SKILL.md pertencem a blocos de codigo").

````markdown
## Fluxo de Captura (v6)

```
1. Resolve project layout via lib/path-resolver-v6.ts
2. Se layout === 'v6':
     - Escreve em docs/compound/YYYY-MM-DD-{slug}.md
     - Frontmatter: title, category (default 'general'), tags (>=1), created (today)
     - Secoes: ## Problem, ## Solution, ## Prevention
3. Se layout === 'v5' ou 'cru':
     - Appenda em lessons-learned.md (formato legado)
     - Injeta tip de migracao uma vez
4. Retorna { filePath, layout } para o orquestrador
```
````

---

## Gotchas

- **G1 do plano (D10 — assinatura compativel):** `add()` aceita string posicional OU objeto. Teste cobre as 2 formas. Provenance comment justifica.
- **G2 do plano (path-resolver):** v6 = `docs/compound/` + `docs/exec-plans/` (AND). Apenas um dos dois nao basta — projeto pode ter `docs/` ad-hoc sem ser v6.
- **G8 do plano (cross-platform):** `path.join` em todos os retornos de `resolvePaths`.
- **Local 01-G1 (BOM Windows):** Se `lessons-learned.md` legado tem BOM (`\uFEFF`), `readSafe` retorna com BOM e proximo write o preserva. Aceitavel (Plano 03 fase-04 fara strip durante migracao formal).
- **Local 01-G2 (slug collision):** Politica `-2`, `-3` em colisao. Idempotencia: chamar `add("foo")` 2x em 1 dia gera `2026-05-12-foo.md` + `2026-05-12-foo-2.md` — comportamento esperado.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `creates compound note with full frontmatter in v6 project` espera `docs/compound/2026-05-12-bug-x.md` com frontmatter contendo `title`, `category`, `tags: [...]`, `created`
  - Comando: `bun test tests/lessons-learned-v6.test.ts --grep 'compound note'`
  - Resultado esperado: `Error: ENOENT: no such file or directory ... docs/compound/2026-05-12-bug-x.md` (assertion failure)

- [ ] **GREEN:** Apos implementacao, teste passa
  - Comando: `bun test tests/lessons-learned-v6.test.ts`
  - Resultado esperado: `2 passed, 0 failed` (1 caso v6 + 1 caso v5 legado)

### Checklist

- [ ] `lib/path-resolver-v6.ts` exporta `resolvePaths(root)` e tipo `ResolvedPaths`
- [ ] `lib/compound-note-writer.ts` exporta `writeCompoundNote(dir, input)` e tipo `CompoundNoteInput`
- [ ] Em fixture v6 (`tests/fixtures/v6-with-plan/` ou criar `v6-empty/`), `add("titulo livre")` cria arquivo em `docs/compound/`
- [ ] Em fixture v5 (`tests/fixtures/legacy-v5/`), `add("titulo")` appenda em `lessons-learned.md` E inclui linha `Tip: rode /init`
- [ ] Frontmatter gerado passa `compound-check.ts` (Plano 04 fase-02) — rodar manualmente: `bun run compound:check` no fixture v6 apos `add`
- [ ] Teste valida que chamar `add` duas vezes com mesmo titulo no mesmo dia gera arquivos `-1` e `-2`
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck strict: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/lessons-learned-v6.test.ts` retorna exit 0 com >=2 testes passados
- Apos `add("teste D10 fase 01")` em fixture v6, comando `bun run compound:check` retorna exit 0 (frontmatter valido)
- Em fixture v5, mesmo comando NAO cria pasta `docs/compound/` (verificado via `fs.stat` rejeicao)

**CA do PRD coberto:**
- CA-14 (verbatim): "Dado plugin v6 e projeto v6, quando rodar `/lessons-learned 'X aconteceu'`, então cria `docs/compound/{date}-{slug}.md` com frontmatter completo (Problem/Solution/Prevention) em vez de appendar em `lessons-learned.md` único."

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
