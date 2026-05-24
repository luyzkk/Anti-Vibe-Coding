---
title: "Hash-map de classificação separado da fonte de dados é frágil — falha só em runtime"
category: pitfall
tags: [typescript, refactor, manifest, runtime-error, cross-file-coupling]
created: 2026-05-24
---

## Problem

Durante o refactor de `skills/init/lib/template-manifest.ts` para consumir `getCompoundManifest()`
de uma skill irmã (Plano 01 fase-02 do PRD compound-engineering-skill-port), surgiu o padrão:

```typescript
// manifest.ts (fonte de verdade — 10 entradas)
const COMPOUND_ENTRIES = [
  { src: '...', dst: 'docs/COMPOUND_ENGINEERING.md' },
  // ...
]

// template-manifest.ts (consumidor — classifica via hash-map separado)
const COMPOUND_CATEGORY_BY_DST: Record<string, TemplateCategory> = {
  'docs/COMPOUND_ENGINEERING.md': 'anti-vibe-extension',
  // ... 10 entradas espelhando manifest.ts
}

function compoundEntry(dst: string): TemplateEntry {
  const category = COMPOUND_CATEGORY_BY_DST[dst]
  if (!category) throw new Error(`compound dst sem categoria: ${dst}`)
  // ...
}
```

Se um dev futuro adicionar entry em `manifest.ts` mas esquecer de espelhar em
`COMPOUND_CATEGORY_BY_DST`, o **TypeScript não acusa** — o tipo `Record<string, X>`
aceita qualquer chave string. O erro só aparece em **runtime**, quando init é
executado e `compoundEntry()` recebe um dst sem categoria mapeada e lança.

Init é path crítico — toda invocação de `/init` quebra para qualquer usuário se a
dessincronização passar para main.

## Solution

Três opções por ordem de robustez:

1. **Tipo derivado da fonte de verdade** — fazer `dst` ser literal type union derivada
   de `COMPOUND_ENTRIES`, e tipar o hash-map como `Record<typeof dst, X>`:
   ```typescript
   type CompoundDst = typeof COMPOUND_ENTRIES[number]['dst']
   const CATEGORY_BY_DST: Record<CompoundDst, TemplateCategory> = { /* exhaustive */ }
   ```
   Typecheck passa a falhar se faltar entry — pega no CI, não em runtime.

2. **Classificação inline na fonte** — mover `category` para dentro de `COMPOUND_ENTRIES`:
   ```typescript
   { src: '...', dst: '...', category: 'anti-vibe-extension' }
   ```
   Elimina hash-map separado; uma fonte, uma escrita. Custo: viola boundary se a
   fonte é uma skill irmã que não deve saber sobre categorização do consumidor.

3. **Test de invariante** (paliativo) — test que valida `Object.keys(CATEGORY_BY_DST)`
   contém todos os `dst` de `getCompoundManifest()`. Falha no CI mas só roda se
   alguém lembrar do test.

Escolhemos #3 inicialmente (custo zero, mantém boundary one-way entre `init` e
`compound-engineering`). #1 ou #2 ficam como hardening para próximo refactor.

## Prevention

**Regra:** ao criar hash-map `Record<string, X>` que classifica entries vindas de
outro arquivo, derive o tipo da chave da fonte de verdade — não use `string` solta.

**Sinal de alerta:** ver `Record<string, ...>` cujo valor é consultado por chave
dinâmica (`map[someKey]`) onde `someKey` vem de outro módulo. Pergunta diagnóstica:
"se eu adicionar um item lá e esquecer de espelhar aqui, typecheck acusa?" Se a
resposta é "não", há acoplamento runtime-only — aplicar uma das 3 soluções.

**Onde aplicar:** principalmente em camadas de classificação/decoração que
envolvem uma fonte de dados (manifests, registries, lookup tables). Comum em
plugins/skills que respeitam boundary one-way (consumidor não pode mexer na
fonte; tem que decorar do lado de fora).

**Aplicável a:** TypeScript ≥4.5 (suporta `typeof array[number]`).
