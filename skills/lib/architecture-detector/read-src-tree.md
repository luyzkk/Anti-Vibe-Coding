# read-src-tree

Helper de IO que lê o `src/` real do projeto e monta um `SrcTreeNode` para uso nos detectores
de heurística. Implementação real em `read-src-tree.ts`. Este arquivo é documentação/referência.

## Casos Tratados

### G3 — Monorepo
Se `packages/` ou `apps/` existir na raiz do projeto, retorna `{ kind: 'monorepo', markerDir }`.
Não classifica como `unknown-mixed` silenciosamente (OQ10 — decisão aberta Onda 2).

### G6 — src/ ausente
Tenta candidatos em ordem: `src/` → `app/` → `lib/`. Se nenhum casar, retorna
`{ kind: 'no-src', cwd }` para que o chamador possa pedir ao usuário onde está o código.
**Não roda heurística na raiz do projeto** — ruído demais.

## Tipo de Retorno

```typescript
export type ReadSrcTreeResult =
  | { kind: 'ok'; root: string; tree: SrcTreeNode }
  | { kind: 'monorepo'; markerDir: string }
  | { kind: 'no-src'; cwd: string }
```

## Código

```typescript
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { SrcTreeNode } from './types'

const SRC_CANDIDATES = ['src', 'app', 'lib'] as const
const MONOREPO_MARKERS = ['packages', 'apps'] as const
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'build', '.next', '.turbo', 'coverage'])

export function readSrcTree(cwd: string): ReadSrcTreeResult {
  // G3: monorepo — check before src/ candidates
  for (const marker of MONOREPO_MARKERS) {
    if (existsSync(join(cwd, marker))) {
      return { kind: 'monorepo', markerDir: marker }
    }
  }

  // G6: try canonical src candidates in order
  for (const candidate of SRC_CANDIDATES) {
    const full = join(cwd, candidate)
    if (existsSync(full) && statSync(full).isDirectory()) {
      return { kind: 'ok', root: full, tree: walk(full, candidate) }
    }
  }

  return { kind: 'no-src', cwd }
}
```

## Filtros de Walk

`IGNORE_DIRS` exclui: `node_modules`, `dist`, `build`, `.next`, `.turbo`, `coverage`.
