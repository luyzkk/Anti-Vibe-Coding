<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-16 (Luiz/dev): tiebreaker por file count — alinhado com PRD §Mecanismo (multi-stack)`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Multi-Stack Detection (primary + secondary com anchor_files)

**Plano:** 02 — Init Enrichment
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase do plano; bloqueador externo é Plano 01 fase-03 entregue)
**Visual:** false

---

## O que esta fase entrega

Função `detectMultiStack(targetDir)` que retorna `{ primary, secondary[], anchor_files[] }` aplicando todos os probes do `detect-stack.ts` em paralelo e resolvendo `primary` via contagem de arquivos source (RF3, suporta CA-07).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/detect-multi-stack.ts` | Create | Nova função `detectMultiStack()` que compõe os probes existentes e resolve primary via file-count tiebreaker. Não modifica `detect-stack.ts`. |
| `skills/init/lib/detect-multi-stack.test.ts` | Create | Suite com casos: single Node+TS, single Rails, multi-stack (Rails + Node), zero anchors, monorepo bounded. |

---

## Implementacao

### Passo 1: Tipos e contrato da nova função

Criar `skills/init/lib/detect-multi-stack.ts` com tipo de retorno alinhado ao schema do PRD (`primary` é nome de pasta do matrix, não `StackId` interno — DI-2).

```typescript
// 2026-05-16 (Luiz/dev): nova função multi-stack — alinhada com PRD §Mecanismo (RF3) e CA-07.
// G3: NÃO modifica detect-stack.ts (state-md-init.ts continua chamando detectStack singular).
// G2 / DI-2: primary e secondary armazenam nomes de pasta do matrix (nodejs-typescript, rails, ...).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { detectStack, type StackId } from './detect-stack'

// G1 / DI-1: alias map estendido. Plano 01 entregou apenas 'node-ts' → 'nodejs-typescript'.
// Plano 02 fase-01 estende para cobrir todas as StackIds do detector existente.
const STACK_ID_TO_MATRIX_FOLDER: Record<StackId, string | null> = {
  'node-ts': 'nodejs-typescript',
  'nextjs': 'nodejs-typescript', // Next.js compartilha matrix Node+TS em v6.3.2
  'rails': 'rails',
  'laravel': 'laravel',
  'python': 'python',
  'unknown': null, // G10: sentinel "não copiar nada" (CA-06)
}

export type MatrixFolder = NonNullable<typeof STACK_ID_TO_MATRIX_FOLDER[StackId]>

export interface MultiStackResult {
  /** Nome de pasta do matrix (`nodejs-typescript`, `rails`, ...) ou `null` se nenhum anchor (CA-06). */
  primary: MatrixFolder | null
  /** Demais pastas do matrix detectadas. Pode conter o mesmo matrix folder do primary só uma vez (dedupe). */
  secondary: MatrixFolder[]
  /** Paths relativos dos anchor files efetivamente detectados (G5: lista, não mapa). */
  anchor_files: string[]
}
```

### Passo 2: Probes em paralelo + file-count tiebreaker

Reutilizar os probes do `detect-stack.ts` (não duplicar lógica). Para CA-07 — múltiplos anchors detectados — usar contagem bounded de arquivos source para decidir primary.

```typescript
// 2026-05-16 (Luiz/dev): tiebreaker por file count — alinhado com PRD §Mecanismo "Primary = stack com mais arquivos source".
// G4: walk é BOUNDED em profundidade e exclui node_modules/vendor/dist/.git para não estourar NFR <500ms.

const MAX_DEPTH = 4
const EXCLUDED_DIRS = new Set(['node_modules', 'vendor', 'dist', '.git', '.next', 'build', 'target', '.venv', '__pycache__'])

const SOURCE_EXT_BY_MATRIX: Record<MatrixFolder, ReadonlyArray<string>> = {
  'nodejs-typescript': ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  'rails': ['.rb', '.erb'],
  'python': ['.py'],
  'laravel': ['.php'],
}

async function countSourceFiles(dir: string, extensions: ReadonlyArray<string>, depth = 0): Promise<number> {
  if (depth > MAX_DEPTH) return 0
  let total = 0
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue
      total += await countSourceFiles(path.join(dir, entry.name), extensions, depth + 1)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      if (extensions.includes(ext)) total += 1
    }
  }
  return total
}
```

### Passo 3: Função pública `detectMultiStack`

Rodar todos os probes (não para no primeiro match como `detectStack`), agregar resultados, aplicar tiebreaker.

```typescript
// 2026-05-16 (Luiz/dev): roda todos os probes (não first-match), agrega, aplica tiebreaker — CA-07.
export async function detectMultiStack(targetDir: string): Promise<MultiStackResult> {
  // Reutilizar detectStack para o primeiro hit, depois iterar probes manualmente
  // para coletar TODOS os matches (detect-stack.ts é first-match — não dá pra
  // expor probes individualmente sem refactor que viole G3).
  // Estratégia: probar anchor files diretamente aqui (lista curta) sem mexer em detect-stack.ts.

  const candidates: Array<{ id: StackId; anchor: string }> = []
  const anchorChecks: Array<[string, StackId]> = [
    ['package.json', 'node-ts'],
    ['Gemfile', 'rails'],
    ['pyproject.toml', 'python'],
    ['requirements.txt', 'python'],
    ['go.mod', 'unknown'], // 2026-05-16 (Luiz/dev): go.mod listado no PRD §Mecanismo; v6.3.2 não tem matrix Go — vira anchor sem matrix folder
    ['composer.json', 'laravel'],
  ]

  for (const [file, candidateId] of anchorChecks) {
    try {
      await fs.access(path.join(targetDir, file))
      candidates.push({ id: candidateId, anchor: file })
    } catch {
      // arquivo ausente, segue
    }
  }

  if (candidates.length === 0) {
    return { primary: null, secondary: [], anchor_files: [] }
  }

  // Resolver matrix folders, dedupar
  const matrixCandidates = new Map<string, string>() // matrixFolder → anchor
  const anchor_files: string[] = []
  for (const { id, anchor } of candidates) {
    anchor_files.push(anchor)
    const folder = STACK_ID_TO_MATRIX_FOLDER[id]
    if (folder && !matrixCandidates.has(folder)) {
      matrixCandidates.set(folder, anchor)
    }
  }

  if (matrixCandidates.size === 0) {
    // Caso: só anchors sem matrix folder (ex: só go.mod em v6.3.2)
    return { primary: null, secondary: [], anchor_files }
  }

  const folders = Array.from(matrixCandidates.keys()) as MatrixFolder[]

  // Single match: primary direto, secondary vazio
  if (folders.length === 1) {
    return { primary: folders[0], secondary: [], anchor_files }
  }

  // Multi-match: tiebreaker por file count
  const counts = await Promise.all(
    folders.map(async (folder) => ({
      folder,
      count: await countSourceFiles(targetDir, SOURCE_EXT_BY_MATRIX[folder] ?? []),
    })),
  )
  counts.sort((a, b) => b.count - a.count) // desc

  const [primaryEntry, ...rest] = counts
  return {
    primary: primaryEntry.folder,
    secondary: rest.map((r) => r.folder),
    anchor_files,
  }
}
```

### Passo 4: Suite de testes (RED → GREEN)

`skills/init/lib/detect-multi-stack.test.ts` cobre os 5 casos críticos do PRD/CA antes da implementação.

```typescript
// 2026-05-16 (Luiz/dev): casos cobertos — CA-02 (Node+TS), CA-03 (Rails puro), CA-06 (sem anchor), CA-07 (multi-stack), G4 (perf bounded).
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { detectMultiStack } from './detect-multi-stack'

async function mkProject(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'multi-stack-'))
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, content)
  }
  return dir
}

describe('detectMultiStack', () => {
  it('returns nodejs-typescript primary when only package.json with ts present', async () => {
    const dir = await mkProject({ 'package.json': JSON.stringify({ devDependencies: { typescript: '^5' } }) })
    const result = await detectMultiStack(dir)
    expect(result.primary).toBe('nodejs-typescript')
    expect(result.secondary).toEqual([])
    expect(result.anchor_files).toEqual(['package.json'])
  })

  it('returns rails primary when only Gemfile present (CA-03)', async () => {
    const dir = await mkProject({ 'Gemfile': 'gem "rails"\n' })
    const result = await detectMultiStack(dir)
    expect(result.primary).toBe('rails')
    expect(result.secondary).toEqual([])
  })

  it('returns primary=null when no anchor file present (CA-06)', async () => {
    const dir = await mkProject({ 'README.md': '# nothing here' })
    const result = await detectMultiStack(dir)
    expect(result.primary).toBeNull()
    expect(result.secondary).toEqual([])
    expect(result.anchor_files).toEqual([])
  })

  it('multi-stack Rails+Node: primary=rails when .rb files outnumber .ts/.js (CA-07)', async () => {
    const dir = await mkProject({
      'Gemfile': 'gem "rails"\n',
      'package.json': JSON.stringify({ devDependencies: { typescript: '^5' } }),
      'app/models/user.rb': 'class User; end',
      'app/models/order.rb': 'class Order; end',
      'app/models/item.rb': 'class Item; end',
      'frontend/index.ts': 'export const x = 1',
    })
    const result = await detectMultiStack(dir)
    expect(result.primary).toBe('rails')
    expect(result.secondary).toEqual(['nodejs-typescript'])
    expect(result.anchor_files.sort()).toEqual(['Gemfile', 'package.json'])
  })

  it('completes detection within 500ms even with bounded walk (NFR perf, G4)', async () => {
    const dir = await mkProject({
      'package.json': JSON.stringify({ devDependencies: { typescript: '^5' } }),
      'Gemfile': 'gem "rails"\n',
      // criar 200 arquivos shallow para exercitar o walk
      ...Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`src/a${i}.ts`, '//x'])),
      ...Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`app/b${i}.rb`, '#x'])),
    })
    const start = Date.now()
    await detectMultiStack(dir)
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(500)
  })
})
```

---

## Gotchas

- **G3 do plano:** Não modificar `detect-stack.ts`. `state-md-init.ts` ainda chama `detectStack()` singular para gravar `detected_stack` em STATE.md (CA-10). Nova função vive em arquivo separado.
- **G4 do plano:** Walk é bounded em `MAX_DEPTH = 4` e exclui dirs pesados (`node_modules`, `vendor`, etc). Teste de perf assertia o NFR.
- **G5 do plano:** `anchor_files` é lista de paths relativos detectados, sem correlação inline para qual stack — formato fixo do PRD.
- **G10 do plano:** Caso `primary: null` (CA-06) não é erro — função retorna estrutura válida vazia.
- **Local:** `nextjs` mapeia para o **mesmo** matrix folder `nodejs-typescript` em v6.3.2 (D2 — stack como unidade, ecossistema). Quando v6.3.3+ adicionar matrix Next.js dedicado, atualizar o alias map e este teste muda.

---

## Verificacao

### TDD

- [ ] **RED:** Testes de `detect-multi-stack.test.ts` escritos antes da implementação; falham com `Cannot find module './detect-multi-stack'` substituído por assertion failure após stub mínimo
  - Comando: `bun run test -- --grep 'detectMultiStack'`
  - Resultado esperado: `Expected 'nodejs-typescript', received undefined` (após stub que retorna `{ primary: null, secondary: [], anchor_files: [] }`)

- [ ] **GREEN:** Implementação completa; suite passa
  - Comando: `bun run test -- --grep 'detectMultiStack'`
  - Resultado esperado: `5 passed, 0 failed`

### Checklist

- [ ] `skills/init/lib/detect-multi-stack.ts` exporta `detectMultiStack`, `MultiStackResult`, `MatrixFolder`
- [ ] `skills/init/lib/detect-stack.ts` **não** foi modificado (diff vazio neste arquivo)
- [ ] Walk bounded confirmado: teste de 200 arquivos roda em < 500ms localmente
- [ ] CA-07 verificado: Rails+Node com mais `.rb` retorna `primary: rails, secondary: [nodejs-typescript]`
- [ ] CA-06 verificado: projeto sem anchor retorna `primary: null, secondary: [], anchor_files: []`
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'detectMultiStack'` retorna `5 passed, 0 failed`
- `bun run lint skills/init/lib/detect-multi-stack.ts skills/init/lib/detect-multi-stack.test.ts` exit 0
- `git diff skills/init/lib/detect-stack.ts` produz output vazio (G3 — detect-stack.ts intocado)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
