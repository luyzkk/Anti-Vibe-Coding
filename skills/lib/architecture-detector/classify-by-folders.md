# Classify By Folders

Função pura `classifyByFolders(srcTree)` que recebe a árvore de pastas do projeto e retorna
uma classificação preliminar em 1 dos 5 perfis com lista de sinais usados. Sem IO — testável
com fixtures inline.

Implementação real em `classify-by-folders.ts`. Este arquivo é documentação/referência.

## Lookup Table dos 5 Perfis

Cada perfil tem padrões de regex com peso associado. Soma máxima de weights = 100 por perfil.

```typescript
import type { Profile, SrcTreeNode, FolderSignal, FolderClassification } from './types'

type ProfilePattern = {
  patterns: Array<{ regex: RegExp; weight: number; description: string }>
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
```

## Prioridade de Desempate (G1)

Next.js tem precedência sobre vertical-slice quando scores empatam:

```typescript
const PROFILE_PRIORITY: Profile[] = [
  'nextjs-app-router',
  'clean-architecture-ritual',
  'vertical-slice',
  'mvc-flat',
  'unknown-mixed',
]
```

## Função Principal

```typescript
export function classifyByFolders(srcTree: SrcTreeNode): FolderClassification {
  const allPaths = flattenPaths(srcTree)
  // scores por perfil -> ordena -> winner + alternatives top-2
}

function flattenPaths(node: SrcTreeNode, prefix = ''): string[] {
  const here = prefix ? `${prefix}/${node.path}` : node.path
  if (node.type === 'file') return [here]
  const childPaths = (node.children ?? []).flatMap(c => flattenPaths(c, here))
  return [here, ...childPaths]
}
```

## Score de unknown-mixed

`unknown-mixed` não tem padrões próprios. Seu score = `max(0, min(60, 100 - bestConcreteScore))`.
Isso garante que quando nenhum outro perfil pontua, `unknown-mixed` vence com score < 60.
