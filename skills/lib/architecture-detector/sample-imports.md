# sample-imports

Helper puro que amostra arquivos representativos da `SrcTree` e detecta padroes de import para votar em perfis arquiteturais.

**Modulo importavel:** `./sample-imports.ts`
**Depende de:** `./types` (`SrcTreeNode`, `ImportSampling`, `ImportSignal`, `Profile`)

---

## Interface

```typescript
import type { SrcTreeNode, ImportSampling } from './types'

type FileReader = (path: string) => string  // injetavel para teste — sem fs no modulo

export const MAX_LINES_READ = 100  // G5: imports ficam no topo, leitura completa e desnecessaria

export function sampleImports(srcTree: SrcTreeNode, readFile: FileReader): ImportSampling
```

## Comportamento

1. **Coleta candidatos** via `pickCandidates`: arquivos `.ts`/`.tsx` em profundidade 2–3, excluindo `index.*` e `*.test.*`. Ordenados alfabeticamente para determinismo.
2. **Amostra**: entre `MIN_SAMPLES = 5` e `MAX_SAMPLES = 10` arquivos.
3. **Le apenas as primeiras `MAX_LINES_READ = 100` linhas** de cada arquivo (G5 — imports vivem no topo).
4. **Testa cada linha** contra `IMPORT_PATTERNS` — regex mapeadas para perfis.
5. **Retorna** `ImportSampling` com `filesSampled`, `signals` (match ou `no-match` por arquivo), e `profileVotes`.

## Padroes de Import Detectados

| Regex | Perfil | Descricao |
|-------|--------|-----------|
| `@/domain/...` ou `@/application/...` | `clean-architecture-ritual` | Imports cruzando camadas |
| `../domain/`, `../application/`, `../use-cases/` | `clean-architecture-ritual` | Imports relativos de camadas |
| `@/controllers/...`, `@/services/...`, `@/models/...` | `mvc-flat` | Estrutura flat de MVC |
| `features/<X>/domain\|api\|ui\|data` | `vertical-slice` | Camadas internas de feature |
| `@/shared/...` | `vertical-slice` | Shared centralizado |
| `next/navigation`, `next/server`, etc | `nextjs-app-router` | Imports do framework Next.js |
| `'use client'` / `'use server'` | `nextjs-app-router` | Diretivas de componente |

## Decisoes de Design

- **`readFile` injetado** — sem `fs` no modulo. Fase-03 injeta `fs.readFileSync`; testes injetam fixtures.
- **Profundidade 2–3** — profundidade 1 e geralmente pasta tematica (ex: `domain/`), nao arquivo de negocio. Profundidade >3 e detalhe de implementacao com menos valor heuristico.
- **Ordenacao alfabetica dos candidatos** — `Set` e `Map` nao garantem ordem; sort explicito garante reproducibilidade dos testes.
```
