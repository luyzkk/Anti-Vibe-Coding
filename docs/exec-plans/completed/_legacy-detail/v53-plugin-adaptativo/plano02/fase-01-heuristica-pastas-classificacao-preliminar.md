# Fase 01: Heuristica de Pastas — Classificacao Preliminar

**Plano:** 02 — Architecture Detector
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase do plano; consome apenas o schema da fase-01 do Plano 01)
**Visual:** false

---

## O que esta fase entrega

Funcao pura `classifyByFolders(srcTree)` que recebe uma representacao da arvore de pastas do projeto e retorna uma classificacao preliminar em 1 dos 5 perfis (D4) com lista de sinais usados. Sem IO — testavel com fixtures inline.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/lib/architecture-detector/types.md` | Create | Tipos `Profile`, `FolderSignal`, `FolderClassification` |
| `anti-vibe-coding/skills/lib/architecture-detector/classify-by-folders.md` | Create | Funcao pura + lookup table dos 5 perfis |
| `anti-vibe-coding/skills/lib/architecture-detector/classify-by-folders.test.ts` | Create | Testes RED-GREEN com fixtures inline |
| `anti-vibe-coding/skills/lib/architecture-detector/__fixtures__/folder-trees.ts` | Create | Arvores de pasta canonicas para cada perfil |

---

## Implementacao

### Passo 1: Definir tipos compartilhados

Conforme D4 (5 perfis) e D9 (heuristica pastas + imports), criar tipos base reutilizados pelas fases 02-05.

```typescript
// anti-vibe-coding/skills/lib/architecture-detector/types.md (bloco executavel)

export type Profile =
  | 'clean-architecture-ritual'
  | 'mvc-flat'
  | 'vertical-slice'
  | 'nextjs-app-router'
  | 'unknown-mixed'

export type SrcTreeNode = {
  path: string          // relativo ao src/ root, ex: "domain/aggregates"
  type: 'dir' | 'file'
  children?: SrcTreeNode[]
}

export type FolderSignal = {
  pattern: string       // ex: "src/application/use-cases"
  matched: boolean
  weight: number        // contribuicao ao score parcial deste perfil
}

export type FolderClassification = {
  profile: Profile
  preliminaryScore: number    // 0..100 (apenas pastas; imports ajustam na fase-02)
  signals: FolderSignal[]
  alternativeProfiles: Array<{ profile: Profile; score: number }>  // top-2 outros candidatos
}
```

### Passo 2: Lookup table dos 5 perfis (hash-list, nao switch)

Conforme CLAUDE.md raiz ("Prefira hash maps sobre switch-case"). Cada perfil tem padroes esperados com peso. Match parcial conta proporcionalmente.

```typescript
// anti-vibe-coding/skills/lib/architecture-detector/classify-by-folders.md

import type { Profile, SrcTreeNode, FolderSignal, FolderClassification } from './types'

type ProfilePattern = {
  patterns: Array<{ regex: RegExp; weight: number; description: string }>
  // Soma maxima de weights = 100. Match real = (sum_matched_weights / 100) * 100.
}

const PROFILE_PATTERNS: Record<Profile, ProfilePattern> = {
  'clean-architecture-ritual': {
    patterns: [
      { regex: /^domain\/(aggregates|entities|value-objects)/, weight: 30, description: 'pasta domain/ com agregados/entidades' },
      { regex: /^application\/use-cases/, weight: 30, description: 'pasta application/use-cases' },
      { regex: /^infrastructure\/(repositories|adapters)/, weight: 20, description: 'pasta infrastructure/ com adapters' },
      { regex: /^presentation\/(controllers|http)/, weight: 20, description: 'pasta presentation/ ou interfaces' },
    ],
  },
  'mvc-flat': {
    patterns: [
      { regex: /^controllers$/, weight: 30, description: 'pasta controllers/ no topo' },
      { regex: /^models$/, weight: 30, description: 'pasta models/ no topo' },
      { regex: /^views$/, weight: 20, description: 'pasta views/ (ou similar)' },
      { regex: /^(services|repositories)$/, weight: 20, description: 'services/ ou repositories/ flat' },
    ],
  },
  'vertical-slice': {
    patterns: [
      { regex: /^(features|modules)\/[^/]+$/, weight: 50, description: 'features/<nome> ou modules/<nome>' },
      { regex: /^(features|modules)\/[^/]+\/(domain|api|ui|data)/, weight: 30, description: 'feature com subpastas internas' },
      { regex: /^shared\/(lib|ui|types)/, weight: 20, description: 'shared/ centralizando utilidades' },
    ],
  },
  'nextjs-app-router': {
    patterns: [
      { regex: /^app\/.*page\.(tsx?|jsx?)$/, weight: 40, description: 'app/.../page.tsx (App Router)' },
      { regex: /^app\/.*layout\.(tsx?|jsx?)$/, weight: 20, description: 'app/.../layout.tsx' },
      { regex: /^app\/.*route\.(ts|js)$/, weight: 20, description: 'app/api/.../route.ts' },
      { regex: /^(components|lib|hooks)$/, weight: 20, description: 'components/, lib/ ou hooks/ no topo' },
    ],
  },
  'unknown-mixed': {
    patterns: [],  // fallback puro: score = 100 - max(outros perfis)
  },
}

// G1 (do README): nextjs precisa precedencia sobre vertical-slice quando ambos tem score similar
const PROFILE_PRIORITY: Profile[] = [
  'nextjs-app-router',
  'clean-architecture-ritual',
  'vertical-slice',
  'mvc-flat',
  'unknown-mixed',
]
```

### Passo 3: Implementacao da funcao pura

```typescript
export function classifyByFolders(srcTree: SrcTreeNode): FolderClassification {
  const allPaths = flattenPaths(srcTree)  // helper interno: lista plana de paths relativos

  const scoresPerProfile = new Map<Profile, { score: number; signals: FolderSignal[] }>()

  for (const [profile, { patterns }] of Object.entries(PROFILE_PATTERNS) as Array<[Profile, ProfilePattern]>) {
    if (profile === 'unknown-mixed') continue

    const signals: FolderSignal[] = []
    let scoreSum = 0

    for (const { regex, weight, description } of patterns) {
      const matched = allPaths.some(p => regex.test(p))
      signals.push({ pattern: description, matched, weight })
      if (matched) scoreSum += weight
    }

    scoresPerProfile.set(profile, { score: scoreSum, signals })
  }

  // unknown-mixed = 100 menos o melhor score concreto, capado em [0, 60]
  const bestConcreteScore = Math.max(...Array.from(scoresPerProfile.values()).map(v => v.score))
  scoresPerProfile.set('unknown-mixed', {
    score: Math.max(0, Math.min(60, 100 - bestConcreteScore)),
    signals: [],
  })

  // Ordenacao: score desc, com PROFILE_PRIORITY como tiebreaker (G1)
  const ranked = Array.from(scoresPerProfile.entries())
    .map(([profile, v]) => ({ profile, ...v }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return PROFILE_PRIORITY.indexOf(a.profile) - PROFILE_PRIORITY.indexOf(b.profile)
    })

  const winner = ranked[0]
  const alternatives = ranked.slice(1, 3).map(r => ({ profile: r.profile, score: r.score }))

  return {
    profile: winner.profile,
    preliminaryScore: winner.score,
    signals: winner.signals,
    alternativeProfiles: alternatives,
  }
}

function flattenPaths(node: SrcTreeNode, prefix = ''): string[] {
  const here = prefix ? `${prefix}/${node.path}` : node.path
  if (node.type === 'file') return [here]
  const childPaths = (node.children ?? []).flatMap(c => flattenPaths(c, here))
  return [here, ...childPaths]
}
```

### Passo 4: Fixtures de arvore canonicas

Criar 1 fixture mock minimal por perfil, mais 1 fixture ambigua para alimentar a fase-02.

```typescript
// __fixtures__/folder-trees.ts (resumo — fixtures completas no arquivo)

export const TREE_CLEAN_ARCH: SrcTreeNode = {
  path: 'src', type: 'dir', children: [
    { path: 'domain', type: 'dir', children: [
      { path: 'aggregates', type: 'dir', children: [{ path: 'order.ts', type: 'file' }] },
    ]},
    { path: 'application', type: 'dir', children: [
      { path: 'use-cases', type: 'dir', children: [{ path: 'create-order.ts', type: 'file' }] },
    ]},
    { path: 'infrastructure', type: 'dir', children: [
      { path: 'repositories', type: 'dir', children: [{ path: 'order-repo.ts', type: 'file' }] },
    ]},
    { path: 'presentation', type: 'dir', children: [
      { path: 'controllers', type: 'dir', children: [{ path: 'order-controller.ts', type: 'file' }] },
    ]},
  ],
}

export const TREE_NEXTJS: SrcTreeNode = { /* app/(dashboard)/page.tsx, app/api/health/route.ts, components/, lib/ */ }
export const TREE_VERTICAL_SLICE: SrcTreeNode = { /* features/billing/{domain,api,ui}, shared/lib/ */ }
export const TREE_MVC_FLAT: SrcTreeNode = { /* controllers/, models/, services/, views/ */ }
export const TREE_UNKNOWN: SrcTreeNode = { /* random/, mixed/, sem padrao */ }
```

### Passo 5: Testes RED-GREEN

```typescript
// classify-by-folders.test.ts

import { describe, expect, test } from 'bun:test'
import { classifyByFolders } from './classify-by-folders'
import { TREE_CLEAN_ARCH, TREE_NEXTJS, TREE_VERTICAL_SLICE, TREE_MVC_FLAT, TREE_UNKNOWN } from './__fixtures__/folder-trees'

describe('classifyByFolders', () => {
  test('classifies clean-architecture-ritual when domain+application+infra+presentation present', () => {
    const result = classifyByFolders(TREE_CLEAN_ARCH)
    expect(result.profile).toBe('clean-architecture-ritual')
    expect(result.preliminaryScore).toBeGreaterThanOrEqual(80)
  })

  test('classifies nextjs-app-router when app/page.tsx present', () => {
    const result = classifyByFolders(TREE_NEXTJS)
    expect(result.profile).toBe('nextjs-app-router')
  })

  test('prefers nextjs-app-router over vertical-slice when both have folders/ patterns (G1)', () => {
    // arvore com app/ E features/ — deve cair em nextjs por priority
    const ambiguous: SrcTreeNode = { /* mistura de TREE_NEXTJS + features/ */ } as never
    const result = classifyByFolders(ambiguous)
    expect(result.profile).toBe('nextjs-app-router')
  })

  test('returns unknown-mixed when no pattern matches', () => {
    const result = classifyByFolders(TREE_UNKNOWN)
    expect(result.profile).toBe('unknown-mixed')
    expect(result.preliminaryScore).toBeLessThan(60)
  })

  test('preserves alternativeProfiles top-2 sorted by score desc', () => {
    const result = classifyByFolders(TREE_CLEAN_ARCH)
    expect(result.alternativeProfiles).toHaveLength(2)
    expect(result.alternativeProfiles[0].score).toBeGreaterThanOrEqual(result.alternativeProfiles[1].score)
  })
})
```

---

## Gotchas

- **G1 do README — Next.js vs vertical-slice:** lookup table aplica `PROFILE_PRIORITY` como tiebreaker. Teste explicito cobre o caso ambiguo.
- **G6 do README — `src/` ausente:** a funcao `classifyByFolders` NAO trata isso. Recebe a arvore como parametro. Quem trata e a fase-03 (skill que faz IO).
- **G7 do README — markdown executavel:** os arquivos `.md` nesta fase sao processados pelo plugin como skills. Codigo em blocos triple-backtick. NAO usar `.ts` solto.
- **Local — pesos somam 100 por perfil:** se ajustar pesos, garantir soma = 100 (lint manual). Score normalizado 0..100 ja sai pronto sem divisao adicional.
- **Local — tiebreaker determinístico:** `PROFILE_PRIORITY.indexOf(a) - indexOf(b)` garante ordem estavel mesmo com scores empatados (importante para teste de regressao na fase-05).

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos antes de `classify-by-folders.md`. Falham com `Cannot find module './classify-by-folders'` ou assertion failure.
  - Comando: `bun run test --grep 'classifyByFolders'`
  - Resultado esperado: 5 falhas

- [ ] **GREEN:** Implementacao minima da lookup table + funcao + flatten. Todos os 5 testes passam.
  - Comando: `bun run test --grep 'classifyByFolders'`
  - Resultado esperado: `5 passed, 0 failed`

### Checklist

- [ ] `types.md` exporta `Profile` com exatamente 5 strings (D4)
- [ ] `classifyByFolders` e funcao pura: 2 chamadas com mesmo input retornam objetos deep-equal
- [ ] Score do perfil vencedor sempre em `[0, 100]`
- [ ] `alternativeProfiles.length === 2` em todos os casos
- [ ] Nenhuma chamada de IO (`fs`, `path`, `process.cwd`) dentro de `classify-by-folders.md`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test --grep 'classifyByFolders'` retorna `5 passed, 0 failed`
- `bun run typecheck` retorna 0 errors
- `grep -r "from 'fs'" anti-vibe-coding/skills/lib/architecture-detector/classify-by-folders.md` retorna vazio (zero IO)

**Por humano:**
- Lookup table tem entrada para cada um dos 5 perfis (D4) — `unknown-mixed` com `patterns: []`

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
