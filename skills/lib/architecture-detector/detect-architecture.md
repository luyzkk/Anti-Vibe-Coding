# detect-architecture

Orquestrador puro: combina `classifyByFolders` + `sampleImports` + `computeConfidence` em um
único `DetectionResult`. Sem IO direto, sem acesso ao cwd em tempo de execução — totalmente
testável com fixtures. Implementação real em `detect-architecture.ts`. Este arquivo é documentação/referência.

## Assinatura

```typescript
export function detectArchitecture(
  srcTree: SrcTreeNode,
  readFile: FileReader,
): DetectionResult
```

- `srcTree`: árvore já montada (ex: via `readSrcTree().tree`)
- `readFile`: leitor de arquivo injetado (sem fs direto aqui)
- Retorna `DetectionResult` com `profile`, `confidence`, `detectedAt`, `signals`, `alternativeProfiles`

## Código

```typescript
import type { SrcTreeNode, DetectionResult } from './types'
import { classifyByFolders } from './classify-by-folders'
import { sampleImports, type FileReader } from './sample-imports'
import { computeConfidence } from './compute-confidence'

export function detectArchitecture(srcTree: SrcTreeNode, readFile: FileReader): DetectionResult {
  const folder = classifyByFolders(srcTree)
  const imports = sampleImports(srcTree, readFile)
  const { confidence, finalProfile } = computeConfidence(folder, imports)

  return {
    profile: finalProfile,
    confidence,
    detectedAt: new Date().toISOString(),
    signals: {
      folderSignals: folder.signals,
      importSignals: imports.signals,
    },
    alternativeProfiles: folder.alternativeProfiles,
  }
}
```

## Por que puro?

A SKILL.md é responsável por montar o IO real (`readSrcTree` + leitura de arquivos).
Manter o orquestrador sem IO direto permite testá-lo com fixtures de forma determinística
e sem side effects. Cf. TDD Strategy do Plano 02 README.
