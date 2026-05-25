<!--
Princípio universal #5 — Comment Provenance.
Cada arquivo TS modificado nesta fase ganha um comentário de linhagem no topo da
seção alterada (não no topo do arquivo — preservar histórico anterior). Formato:
`// 2026-05-24 (Luiz/dev): rationale + ref PRD §X / DY`. Exemplos detalhados nos
trechos de código abaixo.

Esta fase é ATÔMICA (R4 mitigation): os 4 arquivos DEVEM ser commitados juntos
num único commit. Não permitir merge parcial — half-applied muda apenas matrix
mapping sem ajustar probes, levando a `stack.json` com primary='nextjs' mas
nenhum atom copiado, ou pior, `primary='react'` mapeando para folder inexistente.

A fase-00 (pré-RED audit) JÁ ajustou testes que codificavam `'nodejs-typescript'`
para Next.js — esta fase agora altera o mapping para `'nextjs'` sem causar regressão
de testes. Critério: `bun test` EXIT=0 após os 4 arquivos modificados + 4 unit tests
novos verdes.
-->

# Fase 04: Detector ajuste atômico — 4 arquivos coordenados (RF-02/03/04, mitiga R4)

**Plano:** 01 — Infra + Detector + Tracer Bullet
**Sizing:** 3h
**Depende de:** fase-00 (testes ajustados ANTES — sem isso, esta fase quebra suíte) + fase-01 (`knowledge/nextjs/` existe — caso contrário, `STACK_ID_TO_MATRIX_FOLDER['nextjs'] = 'nextjs'` aponta para folder inexistente e write-stack-json/copy falham)
**Visual:** false

---

## O que esta fase entrega

Os 4 arquivos do detector ajustados em **um único commit atômico** (R4 mitigation — não permitir merge parcial):

1. `stack-id-map.ts`: `MATRIX_FOLDER_VALUES` ganha `'nextjs'`; `STACK_ID_TO_MATRIX_FOLDER['nextjs']` muda de `'nodejs-typescript'` para `'nextjs'`; `STACK_ID_TO_MATRIX_FOLDER['react'] = 'nextjs'` (matrix compartilhada D6).
2. `detect-stack.ts`: `StackId` ganha literal `'react'`; novo probe `probeReact` (anchor `vite.config.{ts,js,mjs}` + check `react` em deps — G8); `PROBES` order: `[probeNextjs, probeReact, probeNodeTs, probeRails, probeLaravel, probePython]` (probeNextjs antes — G3 mitigation).
3. `detect-multi-stack.ts`: `SOURCE_EXT_BY_MATRIX['nextjs'] = ['.ts','.tsx','.js','.jsx','.mjs','.cjs']` (mesma lista de Node-TS — atoms cobrem o mesmo universo); `ANCHOR_CHECKS` ganha entries para `vite.config.ts`/`vite.config.js`/`vite.config.mjs` (StackId `'react'`) e — opcional — `package.json#dependencies.next` como redundância (já coberto via probe singular; aceito não duplicar aqui).
4. `stack-aware-input-paths.ts`: `pickStaticMap` ganha `case 'react': return NEXTJS_CANDIDATES` (R4 mitigation: matrix compartilhada implica paths compartilhados).

4 unit tests novos garantem: (a) `probeReact` detecta vite.config + react em deps; (b) `probeNextjs` ainda vence quando ambos presentes (monorepo Next+Vite — R5); (c) `probeReact` NÃO bate quando vite.config existe mas `react` não está em deps (G8 — evita falso-positivo vue-vite/svelte-vite); (d) `pickStaticMap('react')` retorna `NEXTJS_CANDIDATES`.

Critério de sucesso: `bun test` EXIT=0 (zero regressão graças à fase-00) + 4 novos testes verdes.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/stack-id-map.ts` | Modify | `MATRIX_FOLDER_VALUES` ganha `'nextjs'`; mappings de `'nextjs'` e `'react'` apontam para `'nextjs'` |
| `skills/init/lib/detect-stack.ts` | Modify | `StackId` ganha `'react'`; novo `probeReact`; `PROBES` order atualizada (probeNextjs antes — G3) |
| `skills/init/lib/detect-stack.test.ts` | Modify | +2 unit tests (probeReact positivo + probeNextjs vence) |
| `skills/init/lib/detect-multi-stack.ts` | Modify | `SOURCE_EXT_BY_MATRIX['nextjs']` + `ANCHOR_CHECKS` para vite.config.{ts,js,mjs} |
| `skills/init/lib/detect-multi-stack.test.ts` | Modify | +1 unit test (probeReact NÃO bate sem react em deps — G8) |
| `skills/init/lib/stack-aware-input-paths.ts` | Modify | `pickStaticMap` case `'react'` → `NEXTJS_CANDIDATES` |
| `skills/init/lib/stack-aware-input-paths.test.ts` | Modify | +1 unit test (`pickStaticMap('react')` retorna NEXTJS_CANDIDATES) |

---

## Implementacao

### Passo 1: `stack-id-map.ts` — expandir `MATRIX_FOLDER_VALUES` + remapear `'nextjs'`/`'react'`

Modificação no array de literais (linha 14-19 do arquivo atual):

```ts
// 2026-05-24 (Luiz/dev): PRD §RF-02 + D6 — 'nextjs' vira matrix folder próprio.
// 'react' (StackId novo) mapeia para a MESMA folder ('nextjs') porque atoms cobrem
// React conceitual + Next idioms (D6 matrix compartilhada). Vite puro consome o mesmo INDEX.
export const MATRIX_FOLDER_VALUES = [
  'nodejs-typescript',
  'nextjs',           // <-- novo
  'rails',
  'laravel',
  'python',
] as const
```

Modificação no `STACK_ID_TO_MATRIX_FOLDER` (linha 41-48):

```ts
export const STACK_ID_TO_MATRIX_FOLDER: Record<StackId, string | null> = {
  'node-ts': 'nodejs-typescript',
  // 2026-05-24 (Luiz/dev): PRD §RF-02 — Next.js sai do compartilhamento com Node-TS para folder própria.
  // Plano 01 fase-00 já ajustou testes que codificavam 'nodejs-typescript' literal para Next (R1).
  'nextjs': 'nextjs',
  // 2026-05-24 (Luiz/dev): PRD §RF-03 + D6 — StackId 'react' (novo, vite-puro) compartilha matrix Next.
  // Justificativa: 15 atoms cobrem React conceitual + Next idioms; cross-stack skills filtram por consulta.
  'react': 'nextjs',
  'rails': 'rails',
  'laravel': 'laravel',
  'python': 'python',
  'unknown': null, // sentinel "do not copy" (CA-06) — go.mod via detect-multi-stack.ts
}
```

> **Validação após edit:** `bun typecheck` deve passar — TypeScript exige que `Record<StackId, ...>` cubra todos os literais de StackId. Como `StackId` ganha `'react'` no Passo 2, esta edição só compila se feita em conjunto.

### Passo 2: `detect-stack.ts` — `StackId` ganha `'react'` + novo `probeReact` + reordenar `PROBES`

Modificação no tipo `StackId` (linha 12 aproximadamente):

```ts
// 2026-05-24 (Luiz/dev): PRD §RF-03 — 'react' adicionado (Vite + React, sem Next).
// G3 mitigation: probeNextjs RODA ANTES de probeReact em PROBES — todo Next.js project tem react
// em deps; se probeReact viesse primeiro, classificaria Next como react e perderíamos o signal Next.
export type StackId = 'node-ts' | 'nextjs' | 'react' | 'rails' | 'laravel' | 'python' | 'unknown'
```

Novo probe `probeReact` (inserir após `probeNextjs`, antes de `probeNodeTs` — preserva agrupamento JS/TS):

```ts
// 2026-05-24 (Luiz/dev): PRD §RF-03 — Vite + React puro.
// G8: vite.config sozinho dá falso-positivo (vue-vite, svelte-vite, lit-vite). EXIGE 'react' em deps.
// Anchor: vite.config.{ts,js,mjs} — Vite suporta os 3; mjs cobre projects ESM-only.
const probeReact: Probe = async (dir) => {
  const viteConfigCandidates = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs']
  let viteConfigFound: string | null = null
  for (const candidate of viteConfigCandidates) {
    try {
      await fs.access(path.join(dir, candidate))
      viteConfigFound = candidate
      break
    } catch { /* segue */ }
  }
  if (!viteConfigFound) return null

  const pkg = await readJsonSafe(path.join(dir, 'package.json'))
  if (!pkg) return null
  const deps: Record<string, unknown> = {
    ...((pkg.dependencies as object | undefined) ?? {}),
    ...((pkg.devDependencies as object | undefined) ?? {}),
  }
  if ('react' in deps) {
    return { id: 'react', signalSource: `${viteConfigFound} + package.json#dependencies.react` }
  }
  return null
}
```

Modificação no array `PROBES` (linha 128):

```ts
// 2026-05-24 (Luiz/dev): G3 mitigation — probeNextjs ANTES de probeReact.
// Razão: todo Next.js project também tem 'react' em deps + pode ter vite.config (monorepo R5).
// Se probeReact viesse primeiro: Next classificado como react, perdemos signal Next.
const PROBES: ReadonlyArray<Probe> = [probeNextjs, probeReact, probeNodeTs, probeRails, probeLaravel, probePython]
```

### Passo 3: `detect-stack.test.ts` — 2 unit tests novos

```ts
// 2026-05-24 (Luiz/dev): PRD §RF-03 — cobertura probeReact + ordem (G3).
test('detectStack returns react when vite.config.ts + react in deps', async () => {
  const tmp = await mkTmpProject({
    'vite.config.ts': 'export default {}',
    'package.json': JSON.stringify({ dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' } }),
  })
  const result = await detectStack(tmp)
  expect(result.primary).toBe('react')
  expect(result.signalSource).toContain('vite.config.ts')
  expect(result.signalSource).toContain('react')
})

test('detectStack returns nextjs when both Next AND vite.config exist (G3 monorepo R5)', async () => {
  const tmp = await mkTmpProject({
    'vite.config.ts': 'export default {}',
    'package.json': JSON.stringify({ dependencies: { next: '^14.0.0', react: '^18.0.0' } }),
  })
  const result = await detectStack(tmp)
  expect(result.primary).toBe('nextjs') // probeNextjs roda primeiro (G3)
})
```

### Passo 4: `detect-multi-stack.ts` — `SOURCE_EXT_BY_MATRIX['nextjs']` + ANCHOR_CHECKS

Modificação no `SOURCE_EXT_BY_MATRIX` (linha 37-42):

```ts
// 2026-05-24 (Luiz/dev): PRD §RF-02 — matrix 'nextjs' herda extensões de Node-TS (mesmo universo de fontes).
const SOURCE_EXT_BY_MATRIX: Record<MatrixFolder, ReadonlyArray<string>> = {
  'nodejs-typescript': ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  'nextjs': ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  'rails': ['.rb', '.erb'],
  'python': ['.py'],
  'laravel': ['.php'],
}
```

Modificação no `ANCHOR_CHECKS` (linha 67-74):

```ts
// 2026-05-24 (Luiz/dev): PRD §RF-03 — anchor para Vite + React (multi-stack tiebreaker).
// G8: vite.config sem react em deps cai no probe singular como null — multi-stack adiciona
// como candidato mas o tiebreaker por file count corrige se necessário.
const ANCHOR_CHECKS: ReadonlyArray<[string, StackId]> = [
  ['package.json', 'node-ts'],
  ['vite.config.ts', 'react'],
  ['vite.config.js', 'react'],
  ['vite.config.mjs', 'react'],
  ['Gemfile', 'rails'],
  ['pyproject.toml', 'python'],
  ['requirements.txt', 'python'],
  ['go.mod', 'unknown'],
  ['composer.json', 'laravel'],
]
```

> **Nota sobre `package.json#dependencies.next` como anchor multi-stack:** considerado mas REJEITADO — detect-multi-stack faz tiebreaker por file count, e Next.js sempre tem mais arquivos `.ts/.tsx` que React puro. O probe singular `probeNextjs` em detect-stack.ts já cobre o anchor primário; duplicar aqui adiciona ruído sem ganho.

### Passo 5: `detect-multi-stack.test.ts` — 1 unit test novo

```ts
// 2026-05-24 (Luiz/dev): G8 — vite.config SEM react em deps NÃO classifica como react (vue-vite scenario).
test('detectMultiStack ignores vite.config when react is NOT in deps (G8 false-positive guard)', async () => {
  const tmp = await mkTmpProject({
    'vite.config.ts': 'export default {}',
    'package.json': JSON.stringify({ dependencies: { vue: '^3.0.0' } }),
  })
  const result = await detectMultiStack(tmp)
  // probe singular probeReact retorna null sem react em deps — não vira primary.
  // detect-multi-stack pode ainda contar vite.config como anchor (recognized), mas primary fica null/outro.
  expect(result.primary).not.toBe('nextjs') // matrix folder de 'react' = 'nextjs'; não deve aparecer
})
```

### Passo 6: `stack-aware-input-paths.ts` — `pickStaticMap` case `'react'`

Modificação no `pickStaticMap` (linha 496-508):

```ts
// 2026-05-24 (Luiz/dev): PRD §RF-04 + D6 — StackId 'react' herda o mesmo mapa de candidatos do Next.
// R4 mitigation: matrix compartilhada implica paths compartilhados. Se alguém adicionar 'react' à
// STACK_ID_TO_MATRIX_FOLDER mas esquecer o case aqui, stackAwareInputPaths retorna mapa vazio —
// silent failure. Bloquear com test (Passo 7).
function pickStaticMap(primary: StackId | null): StackCandidates {
  switch (primary) {
    case 'nextjs': return NEXTJS_CANDIDATES
    case 'react': return NEXTJS_CANDIDATES // matrix compartilhada — D6
    case 'rails': return RAILS_CANDIDATES
    case 'node-ts': return NODE_TS_CANDIDATES
    case 'laravel': return LARAVEL_CANDIDATES
    case 'python': return PYTHON_CANDIDATES
    case 'unknown':
    case null:
    default:
      return GENERIC_CANDIDATES
  }
}
```

### Passo 7: `stack-aware-input-paths.test.ts` — 1 unit test novo

```ts
// 2026-05-24 (Luiz/dev): PRD §RF-04 — pickStaticMap('react') DEVE retornar NEXTJS_CANDIDATES.
// Bug guard: case 'react' esquecido no switch retorna GENERIC_CANDIDATES (mapa quase-vazio),
// fazendo stackAwareInputPaths emitir lista vazia em Vite-only projects.
test("pickStaticMap('react') returns NEXTJS_CANDIDATES (shared matrix D6)", () => {
  const result = pickStaticMap('react')
  expect(result).toBe(NEXTJS_CANDIDATES)
  // Smoke: pelo menos um path conhecido do mapa Next aparece (ex: src/app/page.tsx)
  expect(Object.values(result).flat().some(p => p.includes('app'))).toBe(true)
})
```

### Passo 8: rodar suíte completa + commit atômico

```bash
bun typecheck && bun test
```

Esperado: 0 erros, todos os testes verdes (incluindo os 4 novos + os ajustados em fase-00).

Commit:

```bash
git add skills/init/lib/stack-id-map.ts \
        skills/init/lib/detect-stack.ts \
        skills/init/lib/detect-stack.test.ts \
        skills/init/lib/detect-multi-stack.ts \
        skills/init/lib/detect-multi-stack.test.ts \
        skills/init/lib/stack-aware-input-paths.ts \
        skills/init/lib/stack-aware-input-paths.test.ts
git commit -m "feat(detector): nextjs matrix folder + react stack id

- MATRIX_FOLDER_VALUES ganha 'nextjs'
- StackId ganha 'react' (Vite + React puro)
- probeReact com anchor vite.config + react em deps (G8)
- PROBES order: probeNextjs antes de probeReact (G3 monorepo R5)
- pickStaticMap('react') retorna NEXTJS_CANDIDATES (D6 matrix compartilhada)
- 4 unit tests novos cobrem positivos + edge cases (G8)

Ref: PRD §RF-02/03/04, D6, R4 mitigation (commit atômico).
Pré-requisito fase-00 já ajustou testes que codificavam 'nodejs-typescript' para Next."
```

---

## Critérios de Sucesso

- [ ] `bun typecheck` EXIT=0
- [ ] `bun test` EXIT=0 (incluindo os 4 novos + os ajustados em fase-00)
- [ ] `MATRIX_FOLDER_VALUES` contém `'nextjs'`
- [ ] `STACK_ID_TO_MATRIX_FOLDER['nextjs'] === 'nextjs'` (não mais `'nodejs-typescript'`)
- [ ] `STACK_ID_TO_MATRIX_FOLDER['react'] === 'nextjs'`
- [ ] `StackId` aceita `'react'` como literal
- [ ] `probeReact` retorna `{ id: 'react', ... }` quando vite.config + react em deps
- [ ] `probeReact` retorna `null` quando vite.config existe mas `react` NÃO está em deps (G8)
- [ ] `probeNextjs` vence quando ambos Next AND vite.config existem (G3, R5 monorepo)
- [ ] `pickStaticMap('react') === NEXTJS_CANDIDATES`
- [ ] Commit atômico: os 7 arquivos modificados num único commit (não permitir merge parcial — R4)
- [ ] Provenance comments `// 2026-05-24 (Luiz/dev): ...` em todas as edições

---

## Gotchas / Observações

- **G3 (probeNextjs antes de probeReact):** ordem do array `PROBES` é load-bearing. Em monorepo Next+Vite (R5), probeNextjs lê `package.json#dependencies.next` e retorna `{ id: 'nextjs', ... }` — sai do loop. Se a ordem fosse trocada, probeReact bateria primeiro (vite.config existe + react em deps) e classificaria como react. Test do Passo 3 protege contra reordenação acidental.
- **G8 (false-positive vue-vite):** `probeReact` EXIGE `react` em deps porque vite.config sozinho existe em projetos Vue/Svelte/Lit. Test do Passo 5 documenta o comportamento esperado.
- **R4 (atomicidade):** os 7 arquivos DEVEM entrar num único commit. Half-applied = `STACK_ID_TO_MATRIX_FOLDER['nextjs'] = 'nextjs'` sem `MATRIX_FOLDER_VALUES` ganhar `'nextjs'` ⇒ `isMatrixFolder('nextjs')` retorna `false` e write-stack-json escreve `primary: null` em vez de `'nextjs'`. Não permitir squash de PR que separe os arquivos.
- **Dependência crítica de fase-00:** se fase-00 NÃO ajustou os testes que codificam `'nodejs-typescript'` para Next.js, esta fase quebra a suíte (RED genuíno, mas mistura RED-de-design com RED-de-regressão — má prática). Fase-00 PRECEDE esta fase sempre.
- **fase-01 também é pré-requisito implícito:** `STACK_ID_TO_MATRIX_FOLDER['nextjs'] = 'nextjs'` aponta para `knowledge/nextjs/` — se o diretório não existe (fase-01 não rodou), copy-knowledge falha. Bloquear merge se `knowledge/nextjs/INDEX.md` ausente.
- **Orfãos potenciais:** `NEXTJS_CANDIDATES` em `stack-aware-input-paths.ts` (linha 52) já existe — confirmar que não está marcado como "candidato a delete" antes desta fase. Grep `// orfa` para garantir.

---

## Vinculo com PRD/CONTEXT

- **RF-02:** matriz `knowledge/nextjs/` ativada — concretizada pela mudança em `STACK_ID_TO_MATRIX_FOLDER`.
- **RF-03:** detector reconhece Vite + React — concretizada pelo `probeReact` + literal `'react'` em `StackId`.
- **RF-04:** stack-aware-input-paths mapeia `'react'` para o mesmo mapa Next — concretizada pelo case `'react'` em `pickStaticMap`.
- **D6:** matrix compartilhada Next + React — concretizada pelo duplo mapping `'nextjs'`/`'react'` → `'nextjs'`.
- **D12:** vite.config como anchor — concretizada no `probeReact`.
- **R4 mitigation:** atomicidade — commit único exigido + testes ajustados em fase-00 garantem zero janela de inconsistência.
