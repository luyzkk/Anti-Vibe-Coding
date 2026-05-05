# Architecture Detector — Types

Tipos compartilhados usados pelas funções do detector de arquitetura (fases 01-05).
Arquivo de referência — implementação real em `classify-by-folders.ts` e módulos subsequentes.

## Profile

Union dos 5 perfis arquiteturais canônicos (D4).

```typescript
export type Profile =
  | 'clean-architecture-ritual'
  | 'mvc-flat'
  | 'vertical-slice'
  | 'nextjs-app-router'
  | 'unknown-mixed'
```

## SrcTreeNode

Representação de um nó na árvore de pastas do projeto (relativo ao src/ root).

```typescript
export type SrcTreeNode = {
  path: string          // relativo ao src/ root, ex: "domain/aggregates"
  type: 'dir' | 'file'
  children?: SrcTreeNode[]
}
```

## FolderSignal

Sinal individual detectado (ou não) durante a heurística de pastas.

```typescript
export type FolderSignal = {
  pattern: string       // descrição legível do padrão, ex: "pasta domain/ com agregados/entidades"
  matched: boolean
  weight: number        // contribuição ao score parcial deste perfil
}
```

## FolderClassification

Resultado da classificação preliminar por heurística de pastas.

```typescript
export type FolderClassification = {
  profile: Profile
  preliminaryScore: number    // 0..100 (apenas pastas; imports ajustam na fase-02)
  signals: FolderSignal[]
  alternativeProfiles: Array<{ profile: Profile; score: number }>  // top-2 outros candidatos
}
```
