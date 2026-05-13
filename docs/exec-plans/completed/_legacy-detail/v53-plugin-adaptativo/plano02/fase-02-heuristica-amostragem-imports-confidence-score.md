# Fase 02: Amostragem de Imports + Confidence Score

**Plano:** 02 — Architecture Detector
**Sizing:** 2h
**Depende de:** fase-01 (consome `Profile`, `FolderClassification`, fixtures)
**Visual:** false

---

## O que esta fase entrega

Funcao pura `sampleImports(srcTree, samples?)` que escolhe 5-10 arquivos representativos e retorna sinais sobre imports cruzando camadas; e funcao `computeConfidence(folderResult, importResult)` que combina ambas heuristicas em score final 0..100. Implementa a parte "imports" da D9 (heuristica = pastas + amostragem).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/lib/architecture-detector/sample-imports.md` | Create | Funcao de amostragem + analise de imports |
| `anti-vibe-coding/skills/lib/architecture-detector/compute-confidence.md` | Create | Combinador de scores pasta + imports |
| `anti-vibe-coding/skills/lib/architecture-detector/sample-imports.test.ts` | Create | Testes com fixtures de arquivos mock |
| `anti-vibe-coding/skills/lib/architecture-detector/compute-confidence.test.ts` | Create | Testes para concordancia, divergencia, edge cases |
| `anti-vibe-coding/skills/lib/architecture-detector/__fixtures__/sample-files.ts` | Create | Conteudo mock de arquivos por perfil |
| `anti-vibe-coding/skills/lib/architecture-detector/types.md` | Modify | Adicionar `ImportSignal`, `ImportSampling`, `DetectionResult` |

---

## Implementacao

### Passo 1: Estender tipos

```typescript
// types.md (apendice)

export type ImportSignal = {
  filePath: string
  pattern: string                      // ex: "import from '@/domain'"
  matchedProfile: Profile | null       // perfil sugerido por este import
}

export type ImportSampling = {
  filesSampled: number
  signals: ImportSignal[]
  profileVotes: Partial<Record<Profile, number>>  // contagem de votos por perfil
}

export type DetectionResult = {
  profile: Profile
  confidence: number                   // 0..100 final
  detectedAt: string                   // ISO 8601
  signals: {
    folderSignals: FolderSignal[]
    importSignals: ImportSignal[]
  }
  alternativeProfiles: Array<{ profile: Profile; score: number }>
}
```

### Passo 2: Amostragem de arquivos representativos

Escolhe 5-10 arquivos com criterio: 1 por subpasta de profundidade 2-3, preferindo arquivos `.ts`/`.tsx` que NAO sejam `index.ts` ou `*.test.*`. Conforme G5 do README (perf), nunca le mais que 100 linhas por arquivo.

```typescript
// sample-imports.md

import type { SrcTreeNode, ImportSampling, ImportSignal, Profile } from './types'

type FileReader = (path: string) => string  // injetavel para teste

const MIN_SAMPLES = 5
const MAX_SAMPLES = 10
const MAX_LINES_READ = 100

const IMPORT_PATTERNS: Array<{ regex: RegExp; profile: Profile; description: string }> = [
  // clean-architecture-ritual: imports cruzando camadas (presentation -> application -> domain)
  { regex: /from\s+['"]@?\/?(domain|application)\/.+['"]/, profile: 'clean-architecture-ritual', description: "imports de @/domain ou @/application" },
  { regex: /from\s+['"]\.\.?\/(domain|application|use-cases)\//, profile: 'clean-architecture-ritual', description: "imports relativos para camadas" },

  // mvc-flat: controllers importando services/models direto
  { regex: /from\s+['"]@?\/?(controllers|services|repositories|models)\/.+['"]/, profile: 'mvc-flat', description: "imports de controllers/services/models flat" },

  // vertical-slice: imports cruzando features sao raros; imports de shared/ frequentes
  { regex: /from\s+['"]@?\/?(features|modules)\/[^/]+\/(domain|api|data|ui)/, profile: 'vertical-slice', description: "imports de features/<X>/<camada-interna>" },
  { regex: /from\s+['"]@?\/?shared\//, profile: 'vertical-slice', description: "imports de shared/" },

  // nextjs-app-router: next/* imports + 'use client' + server actions
  { regex: /from\s+['"]next\/(navigation|server|headers|cache)['"]/, profile: 'nextjs-app-router', description: "imports next/server, next/navigation" },
  { regex: /^['"]use\s+(client|server)['"]/, profile: 'nextjs-app-router', description: "directive 'use client' / 'use server'" },
]

export function sampleImports(srcTree: SrcTreeNode, readFile: FileReader): ImportSampling {
  const candidates = pickCandidates(srcTree)  // helper interno
  const sampled = candidates.slice(0, Math.min(MAX_SAMPLES, Math.max(MIN_SAMPLES, candidates.length)))

  const signals: ImportSignal[] = []
  const votes: Partial<Record<Profile, number>> = {}

  for (const filePath of sampled) {
    const content = readFile(filePath).split('\n').slice(0, MAX_LINES_READ).join('\n')

    for (const { regex, profile, description } of IMPORT_PATTERNS) {
      if (regex.test(content)) {
        signals.push({ filePath, pattern: description, matchedProfile: profile })
        votes[profile] = (votes[profile] ?? 0) + 1
      }
    }

    // Arquivo lido sem nenhum match relevante: ainda conta como amostrado
    if (!signals.some(s => s.filePath === filePath)) {
      signals.push({ filePath, pattern: 'no-match', matchedProfile: null })
    }
  }

  return { filesSampled: sampled.length, signals, profileVotes: votes }
}

function pickCandidates(node: SrcTreeNode, prefix = '', depth = 0): string[] {
  // Heuristica: profundidade 2-3, arquivos .ts/.tsx que nao sao index/test
  // Implementacao concreta na fase de codificacao — esqueleto:
  if (node.type === 'file' && depth >= 2 && depth <= 3) {
    const fullPath = prefix ? `${prefix}/${node.path}` : node.path
    if (/\.(ts|tsx)$/.test(node.path) && !/^index\.|\.test\./.test(node.path)) {
      return [fullPath]
    }
    return []
  }
  if (node.type !== 'dir') return []
  const here = prefix ? `${prefix}/${node.path}` : node.path
  return (node.children ?? []).flatMap(c => pickCandidates(c, here, depth + 1))
}
```

### Passo 3: Combinar pasta + imports em confidence final

Conforme D9 (heuristica = pastas + amostragem), o score final pondera concordancia. Criterio explicito documentado:

- Se pasta e imports concordam no MESMO perfil: confidence = `min(100, folderScore + 30)` (boost de concordancia)
- Se pasta e imports DIVERGEM: confidence = `max(40, folderScore - 20)` (penalidade)
- Se imports inconclusivos (< 2 votos): confidence = `folderScore` (sem ajuste)

```typescript
// compute-confidence.md

import type { FolderClassification, ImportSampling, DetectionResult, Profile } from './types'

const CONCORDANCE_BOOST = 30
const DIVERGENCE_PENALTY = 20
const MIN_VOTES_FOR_AJUSTMENT = 2
const FLOOR_ON_DIVERGENCE = 40

export function computeConfidence(
  folder: FolderClassification,
  imports: ImportSampling,
): { confidence: number; finalProfile: Profile } {
  const sortedVotes = Object.entries(imports.profileVotes)
    .sort(([, a], [, b]) => (b as number) - (a as number)) as Array<[Profile, number]>

  const topImportProfile = sortedVotes[0]?.[0] ?? null
  const topImportVotes = sortedVotes[0]?.[1] ?? 0

  // Sem votos suficientes: usa apenas pasta
  if (topImportVotes < MIN_VOTES_FOR_AJUSTMENT) {
    return { confidence: folder.preliminaryScore, finalProfile: folder.profile }
  }

  // Concordancia
  if (topImportProfile === folder.profile) {
    return {
      confidence: Math.min(100, folder.preliminaryScore + CONCORDANCE_BOOST),
      finalProfile: folder.profile,
    }
  }

  // Divergencia: pasta diz A, imports dizem B com 2+ votos
  // Decide pela pasta (mais estrutural), mas reduz confidence e expoe alternativa
  return {
    confidence: Math.max(FLOOR_ON_DIVERGENCE, folder.preliminaryScore - DIVERGENCE_PENALTY),
    finalProfile: folder.profile,
  }
}
```

### Passo 4: Fixtures de arquivos mock

```typescript
// __fixtures__/sample-files.ts

export const FILES_CLEAN_ARCH: Record<string, string> = {
  'src/application/use-cases/create-order.ts': `
import { Order } from '@/domain/aggregates/order'
import { OrderRepository } from '@/domain/repositories/order-repository'

export class CreateOrderUseCase { /* ... */ }
`,
  'src/presentation/controllers/order-controller.ts': `
import { CreateOrderUseCase } from '@/application/use-cases/create-order'
export class OrderController { /* ... */ }
`,
  // ... 3-5 mais arquivos
}

export const FILES_NEXTJS: Record<string, string> = {
  'src/app/(dashboard)/page.tsx': `
'use client'
import { redirect } from 'next/navigation'
export default function Page() { /* ... */ }
`,
  // ...
}

// FILES_VERTICAL_SLICE, FILES_MVC_FLAT, FILES_DIVERGENTE (pastas mvc, imports clean)
```

### Passo 5: Testes

```typescript
// sample-imports.test.ts
describe('sampleImports', () => {
  test('detects clean-architecture-ritual via imports of @/domain and @/application', () => {
    const reader = (path: string) => FILES_CLEAN_ARCH[path] ?? ''
    const result = sampleImports(TREE_CLEAN_ARCH, reader)
    expect(result.profileVotes['clean-architecture-ritual']).toBeGreaterThanOrEqual(2)
  })

  test('reads at most MAX_LINES_READ lines per file (G5)', () => {
    const longFile = '\n'.repeat(2000) + "import x from '@/domain/foo'"
    const reader = () => longFile
    const result = sampleImports(TREE_CLEAN_ARCH, reader)
    // import na linha 2001 NAO deve ser detectado
    expect(result.profileVotes['clean-architecture-ritual'] ?? 0).toBe(0)
  })

  test('respects MIN_SAMPLES floor and MAX_SAMPLES ceiling', () => {
    const reader = () => 'export const x = 1'
    const result = sampleImports(TREE_CLEAN_ARCH, reader)
    expect(result.filesSampled).toBeGreaterThanOrEqual(5)
    expect(result.filesSampled).toBeLessThanOrEqual(10)
  })
})

// compute-confidence.test.ts
describe('computeConfidence', () => {
  test('boosts confidence when folder and imports agree', () => {
    const folder: FolderClassification = { profile: 'clean-architecture-ritual', preliminaryScore: 70, signals: [], alternativeProfiles: [] }
    const imports: ImportSampling = { filesSampled: 5, signals: [], profileVotes: { 'clean-architecture-ritual': 4 } }
    const { confidence, finalProfile } = computeConfidence(folder, imports)
    expect(confidence).toBe(100)  // 70 + 30
    expect(finalProfile).toBe('clean-architecture-ritual')
  })

  test('penalizes confidence when folder says A but imports say B', () => {
    const folder: FolderClassification = { profile: 'mvc-flat', preliminaryScore: 80, signals: [], alternativeProfiles: [] }
    const imports: ImportSampling = { filesSampled: 5, signals: [], profileVotes: { 'clean-architecture-ritual': 3 } }
    const { confidence, finalProfile } = computeConfidence(folder, imports)
    expect(confidence).toBe(60)  // 80 - 20
    expect(finalProfile).toBe('mvc-flat')  // pasta vence em divergencia
  })

  test('keeps folder score unchanged when imports inconclusive (< 2 votes)', () => {
    const folder: FolderClassification = { profile: 'vertical-slice', preliminaryScore: 75, signals: [], alternativeProfiles: [] }
    const imports: ImportSampling = { filesSampled: 5, signals: [], profileVotes: { 'vertical-slice': 1 } }
    const { confidence } = computeConfidence(folder, imports)
    expect(confidence).toBe(75)
  })

  test('floors divergence penalty at FLOOR_ON_DIVERGENCE', () => {
    const folder: FolderClassification = { profile: 'unknown-mixed', preliminaryScore: 50, signals: [], alternativeProfiles: [] }
    const imports: ImportSampling = { filesSampled: 5, signals: [], profileVotes: { 'mvc-flat': 3 } }
    const { confidence } = computeConfidence(folder, imports)
    expect(confidence).toBeGreaterThanOrEqual(40)  // floor
  })
})
```

---

## Gotchas

- **G5 do README — limite de linhas:** `MAX_LINES_READ = 100`. Imports vivem no topo, lendo arquivo inteiro mata performance. Teste explicito cobre o caso de import na linha 2001.
- **G7 do README — markdown executavel:** ambos `sample-imports.md` e `compute-confidence.md` sao skills helpers. Codigo TS em blocos triple-backtick.
- **Local — `pickCandidates` determinismo:** ordenar lista de paths candidatos alfabeticamente antes de slice para garantir testes reproducíveis. Nao usar `Set` (ordem nao garantida).
- **Local — divergencia escolhe pasta, nao imports:** decisao consciente — pastas sao sinal estrutural mais estavel; imports podem ser ruido (ex: 1 controller legado ainda usando services flat). Documentar em comentario WHY.
- **Local — `readFile` injetado:** torna funcao testavel sem `fs`. Real `fs.readFileSync` so entra na fase-03 (skill).

---

## Verificacao

### TDD

- [ ] **RED:** Testes de `sampleImports` e `computeConfidence` falham antes da implementacao.
  - Comando: `bun run test --grep 'sampleImports|computeConfidence'`
  - Resultado esperado: 7 testes falhando

- [ ] **GREEN:** Implementacao faz todos os 7 testes passarem.
  - Comando: `bun run test --grep 'sampleImports|computeConfidence'`
  - Resultado esperado: `7 passed, 0 failed`

### Checklist

- [ ] `sampleImports` aceita `FileReader` injetado (sem `fs` no codigo)
- [ ] `MAX_LINES_READ` constante exportada e respeitada
- [ ] `computeConfidence` retorna `confidence` em `[0, 100]` em todos os ramos
- [ ] Em divergencia, `finalProfile === folder.profile` (decisao documentada)
- [ ] Score >= 80 para fixture canonica de cada perfil quando pasta + imports concordam
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test --grep 'sampleImports|computeConfidence'` retorna `7 passed, 0 failed`
- Para fixture canonica `TREE_CLEAN_ARCH + FILES_CLEAN_ARCH`, `computeConfidence` retorna `confidence >= 80` (validacao de CA-01 a nivel de unit)
- `grep -E "from ['\"]?(node:fs|fs)" anti-vibe-coding/skills/lib/architecture-detector/{sample-imports,compute-confidence}.md` retorna vazio

**Por humano:**
- Constantes `CONCORDANCE_BOOST`, `DIVERGENCE_PENALTY`, `MIN_VOTES_FOR_AJUSTMENT`, `FLOOR_ON_DIVERGENCE` documentadas com WHY comments

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
