# compute-confidence

Combina classificacao por pastas (`FolderClassification`) e amostragem de imports (`ImportSampling`) em um score de confianca final `0..100` e perfil definitivo.

**Modulo importavel:** `./compute-confidence.ts`
**Depende de:** `./types` (`FolderClassification`, `ImportSampling`, `Profile`)

---

## Interface

```typescript
import type { FolderClassification, ImportSampling, Profile } from './types'

export function computeConfidence(
  folder: FolderClassification,
  imports: ImportSampling,
): { confidence: number; finalProfile: Profile }
```

## Logica de Combinacao

| Situacao | Confidence | finalProfile |
|----------|-----------|-------------|
| Folder e imports concordam (mesmo perfil, >= 2 votos) | `min(100, folderScore + 30)` | perfil concordante |
| Folder e imports divergem (top import != folder, >= 2 votos) | `max(40, folderScore - 20)` | `folder.profile` (pasta vence) |
| Imports inconclusivos (< 2 votos para o top perfil) | `folderScore` sem ajuste | `folder.profile` |

## Constantes e WHY Comments

```typescript
const CONCORDANCE_BOOST = 30
// WHY: concordancia de dois sinais independentes (estrutura + comportamento) e evidencia forte.

const DIVERGENCE_PENALTY = 20
// WHY: divergencia sugere projeto em transicao ou ruido de legacy. Pasta e sinal mais estavel.

const MIN_VOTES_FOR_ADJUSTMENT = 2
// WHY: 1 voto pode ser arquivo legado isolado. 2+ votos indica padrao real.

const FLOOR_ON_DIVERGENCE = 40
// WHY: mesmo divergindo, algo foi detectado por pastas. Nao colapsar confidence para zero.
```

## Decisao em Divergencia

Em divergencia, `finalProfile === folder.profile`. Motivo: layout de pastas e decisao arquitetural consciente da equipe; padroes de import podem ser ruido (controller legado, utilitario compartilhado, migracao parcial). A pasta e o sinal mais estrutural e intencional.

Conforme D9 do README: heuristica = pastas + amostragem. Em desacordo, pastas tem precedencia.
