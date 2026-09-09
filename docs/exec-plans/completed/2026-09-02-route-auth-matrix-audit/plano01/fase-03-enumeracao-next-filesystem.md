<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Enumeracao Next.js Real (File-system do App Router)

**Plano:** 01 — Fundacao + Tracer Bullet (Next.js)
**Sizing:** 1.5h
**Depende de:** fase-02
**Visual:** false

---

## O que esta fase entrega

`nextjsAdapter.enumerate()` fiel ao App Router: `app/**/{page,route}.{ts,tsx}` (e `src/app/`),
segmentos dinamicos `[id]` e `[...slug]`, route groups `(group)` fora do path, e `route.ts` gerando
uma `Route` por verbo exportado — cada caso coberto por um teste contra fixture ampliada.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/route-auth-nextjs.ts` | Create | Adaptador Next.js movido para arquivo proprio: `enumerateNextjsRoutes`, `readNextjsCoverage`, `nextjsAdapter` |
| `skills/security/lib/route-auth-nextjs.test.ts` | Create | Um `it` por regra de enumeracao |
| `skills/security/lib/route-auth-matrix.ts` | Modify | Remove o glob ingenuo; importa `nextjsAdapter` de `./route-auth-nextjs` |
| `tests/fixtures/route-auth-matrix/nextjs-minimal/` | Modify | +4 arquivos de rota (ver Passo 1) |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G3) |

---

## Implementacao

### Passo 1: Ampliar a fixture

Manter os dois arquivos da fase-01 e acrescentar (todos sem `next/*`, G7):

| Arquivo novo | Regra que exercita | `Route` esperada |
|---|---|---|
| `app/(marketing)/pricing/page.tsx` | route group nao entra no path (G5) | `GET /pricing` |
| `app/api/users/[id]/route.ts` exportando `GET` e `DELETE` | segmento dinamico + N metodos (G6) | `GET /api/users/[id]`, `DELETE /api/users/[id]` |
| `app/docs/[...slug]/page.tsx` | catch-all | `GET /docs/[...slug]` |
| `app/api/preferences/route.ts` exportando `export const GET = async () =>` | terceira forma de export (G6); reaproveitada em CA-01b na fase-05 | `GET /api/preferences` |

```ts
// tests/fixtures/route-auth-matrix/nextjs-minimal/app/api/users/[id]/route.ts
// 2026-09-03 (Luiz/dev): dois verbos no mesmo arquivo — G6; DELETE alimenta a regra "metodo muta" na fase-05.
export async function GET() {
  return Response.json({ id: 'x' })
}
export async function DELETE() {
  return new Response(null, { status: 204 })
}
```

```tsx
// tests/fixtures/route-auth-matrix/nextjs-minimal/app/(marketing)/pricing/page.tsx
// 2026-09-03 (Luiz/dev): route group — o path publico e /pricing, nao /(marketing)/pricing (G5).
export default function PricingPage() {
  return null
}
```

`.tsx` sem JSX real (retorna `null`) para nao exigir `jsx` no tsconfig — o typecheck do repo nao
compila JSX hoje e esta fase nao vai mudar isso por causa de fixture.

### Passo 2: Regras de conversao caminho → `Route.path`

Regras oficiais em `knowledge/nextjs/atoms/app-router-and-layouts.md` (route groups, parallel e
intercepting routes) — ler antes de codar. O que entra nesta fase:

| Segmento no disco | No `Route.path` | Nota |
|---|---|---|
| `foo` | `/foo` | literal |
| `[id]` | `/[id]` | dinamico — mantido no dialeto Next (fase-02, "path no dialeto da stack") |
| `[...slug]` | `/[...slug]` | catch-all |
| `[[...slug]]` | `/[[...slug]]` | catch-all opcional |
| `(group)` | — | removido (G5) |
| `@slot` | — | parallel route: **fora do escopo**; o arquivo e ignorado e anotado em `CoverageMap.notes` |
| `(.)x`, `(..)x`, `(...)x` | — | intercepting: **fora do escopo**; idem |
| `page.tsx` / `page.ts` | `/<dir>` com `method: 'GET'` | raiz `app/page.tsx` → `/` |
| `route.ts` / `route.tsx` | `/<dir>` com um `Route` por verbo exportado | sem verbo reconhecido → nenhuma `Route` + nota |

Raiz: procurar `app/`; se ausente, `src/app/` (G14). Os dois presentes → `app/` vence e
`notes` registra a coexistencia.

```ts
// skills/security/lib/route-auth-nextjs.ts — esqueleto
import type { CoverageMap, HttpMethod, Route, RouteAdapter } from './route-auth-matrix.types'
import { HTTP_METHODS } from './route-auth-matrix.types'

const ROUTE_FILES = new Set(['route.ts', 'route.tsx'])
const PAGE_FILES = new Set(['page.ts', 'page.tsx'])

/** Segmento que nao aparece no path publico: route group, parallel slot, intercepting. */
function isNonPathSegment(segment: string): boolean {
  return /^\(.*\)$/.test(segment) || segment.startsWith('@')
}

function isInterceptingSegment(segment: string): boolean {
  return /^\(\.{1,3}\)/.test(segment)
}

/** `app/(marketing)/pricing/page.tsx` → `/pricing`; `app/page.tsx` → `/`. */
export function toPublicPath(relDirPosix: string): string {
  const kept = relDirPosix.split('/').filter((s) => s.length > 0 && !isNonPathSegment(s))
  return '/' + kept.join('/')
}

// 2026-09-03 (Luiz/dev): regex para os 3 formatos de export (G6) — fase-04 troca pelo AST no mesmo
// parse que le o matcher. Cobre `export function GET`, `export async function POST`,
// `export const PUT =`. Nao cobre `export { GET }` re-export nem `export default` — vira nota.
const EXPORT_VERB_RE = /^export\s+(?:async\s+)?(?:function|const|let)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/gm

export function extractExportedMethods(source: string): Array<{ method: HttpMethod; line: number }>
export function enumerateNextjsRoutes(targetDir: string): { routes: Route[]; notes: string[] }
export function readNextjsCoverage(targetDir: string): CoverageMap   // ainda o regex ingenuo da fase-02
export const nextjsAdapter: RouteAdapter
```

`line` de `route.ts` = linha do export do verbo (contar `\n` ate `match.index`). `line` de `page.tsx`
= linha do `export default` se o regex `^export\s+default` achar, senao `1`.

Ordenacao: devolver `routes` ordenadas por `path` e depois `method` — saida deterministica facilita
o golden do Plano 04 fase-05 e o diff do Plano 03.

### Passo 3: Mover o adaptador para o arquivo proprio

`route-auth-matrix.ts` deixa de ter glob: importa `nextjsAdapter` e mantem so o cruzamento
(ainda string-match, ainda severidade fixa — donos: fase-04 e fase-05). `readNextjsCoverage` vai
junto para `route-auth-nextjs.ts` sem mudar de comportamento.

### Passo 4: Testes — um `it` por regra

```ts
// skills/security/lib/route-auth-nextjs.test.ts
// 2026-09-03 (Luiz/dev): enumeracao do App Router — PRD RF-01 (fixture Next), CA-08 (parte Next).
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { enumerateNextjsRoutes, toPublicPath, extractExportedMethods } from './route-auth-nextjs'

const FIXTURE = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix/nextjs-minimal')

describe('toPublicPath', () => {
  it('drops route group segments from the public path', () => {
    expect(toPublicPath('(marketing)/pricing')).toBe('/pricing')
  })
  it('maps the app root to /', () => {
    expect(toPublicPath('')).toBe('/')
  })
  it('keeps dynamic and catch-all segments in Next dialect', () => {
    expect(toPublicPath('api/users/[id]')).toBe('/api/users/[id]')
    expect(toPublicPath('docs/[...slug]')).toBe('/docs/[...slug]')
  })
})

describe('extractExportedMethods', () => {
  it('finds function, async function and const exports of HTTP verbs with their line', () => {
    const src = `import x from 'y'\nexport function GET() {}\nexport async function POST() {}\nexport const PUT = async () => {}\nexport const helper = 1\n`
    expect(extractExportedMethods(src)).toEqual([
      { method: 'GET', line: 2 },
      { method: 'POST', line: 3 },
      { method: 'PUT', line: 4 },
    ])
  })
})

describe('enumerateNextjsRoutes (fixture nextjs-minimal)', () => {
  const { routes } = enumerateNextjsRoutes(FIXTURE)
  const sig = (r: { method: string; path: string }) => `${r.method} ${r.path}`

  it('emits one Route per exported verb in route.ts', () => {
    expect(routes.filter((r) => r.path === '/api/users/[id]').map(sig).sort()).toEqual([
      'DELETE /api/users/[id]',
      'GET /api/users/[id]',
    ])
  })
  it('emits GET for page.tsx and strips the route group', () => {
    expect(routes.map(sig)).toContain('GET /pricing')
    expect(routes.some((r) => r.path.includes('(marketing)'))).toBe(false)
  })
  it('emits catch-all page in Next dialect', () => {
    expect(routes.map(sig)).toContain('GET /docs/[...slug]')
  })
  it('records file as POSIX path relative to the project root', () => {
    const admin = routes.find((r) => r.path === '/api/admin')
    expect(admin?.file).toBe('app/api/admin/route.ts')
    expect(admin?.line).toBe(3)
  })
})
```

Ajustar `admin?.line` para a linha real do `export function GET` na fixture da fase-01 (o
comentario de proveniencia ocupa a linha 1 → o export fica na 3; conferir com `grep -n`).

---

## Gotchas

- **G5 do plano:** o filtro `isNonPathSegment` trata `(group)` E `@slot` do mesmo jeito (fora do
  path) — mas `@slot` e parallel route e o arquivo inteiro sai da enumeracao; nao e so o segmento.
  Duas regras, nao uma: `(group)` remove o segmento e continua; `@slot`/intercepting pula o arquivo.
- **G6 do plano:** o regex de export e a peca ingenua desta fase. `export { GET, POST }` (re-export
  de outro modulo) e `export default handler` NAO sao capturados — vao para `notes`. Fase-04 avalia
  se o AST cobre o re-export; se nao cobrir, continua em `notes` (e RF-09 — rota que nao da para
  enumerar estaticamente vira `indeterminada`, nunca some).
- **G8 do plano:** `relative()` + `split(sep).join('/')` ANTES de `toPublicPath`; o guard `isRoute`
  da fase-02 rejeita `\` e o teste `records file as POSIX path` pega se esquecer.
- **G14 do plano:** `src/app` — testar manualmente contra
  `tests/fixtures/nextjs-app-router-fixture` (tem `src/app/page.tsx`): deve devolver `GET /`.
- **Local — `.tsx` de fixture sem JSX:** `tsconfig` nao tem `"jsx"`. Se algum `.tsx` de fixture
  usar `<div>`, `bun run typecheck` quebra. Retornar `null`.
- **Local — `route.ts` E `page.tsx` no mesmo diretorio** e erro de build no Next. O enumerador nao
  precisa detectar; se acontecer na fixture de alguem, as duas `Route` saem e o auditor reporta as
  duas — comportamento aceitavel.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (nao por compilation error)
  - Comando: `bun test skills/security/lib/route-auth-nextjs.test.ts -t 'drops route group segments'`
  - Resultado esperado: `Expected: "/pricing", Received: "/(marketing)/pricing"` (com `toPublicPath` devolvendo o caminho cru)

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun test skills/security/lib/route-auth-nextjs.test.ts`
  - Resultado esperado: `9 pass, 0 fail`

### Checklist

- [ ] `bun skills/security/lib/route-auth-matrix.ts tests/fixtures/route-auth-matrix/nextjs-minimal`
      lista `summary.enumerated: 6` (admin GET, users GET, users DELETE, pricing, docs, preferences)
- [ ] Nenhum path de saida contem `(` ou `@` (`... | grep -c "(marketing)"` → 0)
- [ ] `route-auth-matrix.ts` nao tem mais `readdirSync` (`grep -c readdirSync skills/security/lib/route-auth-matrix.ts` → 0)
- [ ] Fase-01 e fase-02 continuam verdes: `bun test skills/security/lib/`
- [ ] `bun run generate:manifest` sem warning; manifest contem `route-auth-nextjs.ts`
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck` (fixtures `.tsx` incluidas — G7)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/route-auth-nextjs.test.ts` retorna `0 fail`
- `bun skills/security/lib/route-auth-matrix.ts tests/fixtures/route-auth-matrix/nextjs-minimal | grep -c '"file"'` >= 5
  (rotas fora do matcher `/dashboard/:path*` — todas, nesta fase)
- `bun run typecheck` sem erros

**Por humano:**
- Rodar o CLI contra um projeto Next.js real do dev e conferir por amostragem 3 rotas: path
  publico bate com a URL que o dev sabe que existe

---

<!-- Gerado por /plan-feature em 2026-09-03 -->
