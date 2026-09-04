<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Contrato de Tipos

**Plano:** 01 — Fundacao + Tracer Bullet (Next.js)
**Sizing:** 1h
**Depende de:** fase-01
**Visual:** false

---

## O que esta fase entrega

O shape que as QUATRO stacks vao servir — `Route`, `CoverageMap`, `Verdict`, `RouteFinding` e a
interface `RouteAdapter` — congelado num arquivo proprio, com type guards em vez de `as`, e a lib da
fase-01 migrada para ele. A partir daqui o Plano 04 pode comecar os adaptadores Rails/Express/Python.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/route-auth-matrix.types.ts` | Create | Tipos do contrato + type guards + constantes |
| `skills/security/lib/route-auth-matrix.types.test.ts` | Create | Guards aceitam o valido e rejeitam o invalido; fixture produz `Route[]` valido |
| `skills/security/lib/route-auth-matrix.ts` | Modify | Substitui `RouteAuditFinding` ad hoc pelos tipos do contrato; separa `enumerate`/`readCoverage` ingenuos atras de `RouteAdapter` |
| `skills/security/lib/route-auth-matrix.test.ts` | Modify | Assercoes passam a ler `finding.route.path` / `finding.verdict` |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G3) — 2 libs alteradas/novas |

---

## Implementacao

### Passo 1: O contrato

Arquivo separado para que o Plano 04 importe tipos sem puxar o adaptador Next.js. `stack` carrega
`StackId` de `detect-stack.ts` (fato do codebase: `'nextjs' | 'react' | 'node-ts' | 'rails' |
'laravel' | 'python' | 'unknown'`) — o Plano 01 nao chama `detectStack()`, mas o campo existe para
que a fase-04 do Plano 04 preencha sem mudar o shape.

```ts
// skills/security/lib/route-auth-matrix.types.ts
// 2026-09-03 (Luiz/dev): contrato unico rota × cobertura — PRD route-auth-matrix-audit RF-01, D1.
// Adaptador e nativo por stack; o que e comum e SO este shape. Plano 04 implementa RouteAdapter
// para rails/node-ts/python contra este arquivo — mudanca aqui reabre tres adaptadores.
import type { StackId } from '../../init/lib/detect-stack'
import type { IssueSeverity } from '../../lib/subagent-contract'

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

/** Uma rota enumerada. `file` e `path` sempre POSIX, relativos a raiz do projeto auditado. */
export type Route = {
  method: HttpMethod
  /** Caminho publico como a stack escreve (`/api/users/[id]` no Next, `/users/:id` no Express). */
  path: string
  file: string
  line: number
  stack: StackId
}

/**
 * Como a stack expressa "esta rota exige auth". Uniao aberta a extensao ADITIVA pelo Plano 04
 * (ex: `controller-filter` para before_action do Rails, `dependency` para Depends do FastAPI).
 * O motor de veredito trata `kind` desconhecido como `indeterminada` — nunca como coberta.
 */
export type CoverageRule =
  | {
      kind: 'path-pattern'
      /** Padrao no dialeto da stack (`/admin/:path*` no Next/Express). */
      pattern: string
      file: string
      line: number
    }
  | {
      kind: 'opaque'
      /** Por que nao deu para ler (matcher computado, spread, import dinamico...). */
      reason: string
      file: string
      line: number
    }

export type CoverageMap = {
  stack: StackId
  rules: CoverageRule[]
  /** Arquivos lidos para montar o mapa — o relatorio cita, e o Plano 03 le nas duas pontas. */
  sources: string[]
  /** Observacoes nao-bloqueantes (ex: `src/app` e `app` coexistem). */
  notes: string[]
}

export const VERDICTS = ['coberta', 'publica-declarada', 'DESCOBERTA', 'indeterminada'] as const
export type Verdict = (typeof VERDICTS)[number]

export type RouteVerdict = {
  route: Route
  verdict: Verdict
  /** O que demonstrou o veredito (regra que casou) ou o que faltou (RF-05). */
  evidence: string
}

/** So os veredictos que emitem finding viram RouteFinding (tabela de severidade do PRD). */
export type RouteFinding = {
  route: Route
  verdict: Exclude<Verdict, 'coberta' | 'publica-declarada'>
  severity: IssueSeverity
  /** O que faltou, em prosa curta: "nenhuma entrada de config.matcher casa /api/admin". */
  missing: string
}

export interface RouteAdapter {
  readonly stack: StackId
  enumerate(targetDir: string): Route[]
  readCoverage(targetDir: string): CoverageMap
}

// ---------------------------------------------------------------------------
// Type guards — o repo proibe `as`; quem recebe `unknown` (JSON da CLI, fixture) estreita por aqui.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isHttpMethod(value: unknown): value is HttpMethod {
  return typeof value === 'string' && (HTTP_METHODS as readonly string[]).includes(value)
}

export function isVerdict(value: unknown): value is Verdict {
  return typeof value === 'string' && (VERDICTS as readonly string[]).includes(value)
}

export function isRoute(value: unknown): value is Route {
  if (!isRecord(value)) return false
  return (
    isHttpMethod(value['method']) &&
    typeof value['path'] === 'string' && value['path'].startsWith('/') &&
    typeof value['file'] === 'string' && !value['file'].includes('\\') &&
    typeof value['line'] === 'number' && Number.isInteger(value['line']) && value['line'] >= 1 &&
    typeof value['stack'] === 'string'
  )
}
```

Escolhas fixadas aqui (registrar no MEMORY como DI se mudarem na execucao):

- `enumerate`/`readCoverage` **sincronos** — segue o orquestrador e o precedente de I/O sincrono
  de `stack-aware-preface.ts` (nota L5). Bun le arquivo local em microssegundos; `async` so
  espalharia `await` pelo motor e pelos testes.
- `Route.path` fica **no dialeto da stack** (`[id]`, nao `:id`). Traduzir para uma notacao comum
  seria o "enumerador unico" que a Decisao 1 do PRD rejeitou. Quem casa path com padrao e o motor
  (fase-04), que conhece o dialeto por `stack`.
- `CoverageRule` e uniao **aberta**: o motor usa hash map `kind → matcher` com fallback
  `indeterminada`. Plano 04 acrescenta variantes sem tocar o motor.

### Passo 2: Migrar a lib da fase-01 para o contrato

Em `route-auth-matrix.ts`: apagar `RouteAuditFinding`; extrair o glob para `enumerate()` e a leitura
do `middleware.ts` para `readCoverage()` dentro de um objeto `nextjsAdapter: RouteAdapter` (ainda
ingenuo — `readCoverage` devolve UMA regra `path-pattern` por entrada encontrada por regex
`matcher:\s*\[([^\]]*)\]`, ou `opaque` se nao achar). `auditRouteCoverage` passa a devolver
`RouteFinding[]` e a decisao continua string-match, agora `rule.pattern.includes(route.path)`.

```ts
// trecho de route-auth-matrix.ts apos a migracao
export const nextjsAdapter: RouteAdapter = {
  stack: 'nextjs',
  enumerate(targetDir) { /* glob ingenuo da fase-01, devolvendo Route com method 'GET', line 1 */ },
  readCoverage(targetDir) { /* regex sobre o texto de middleware.ts → CoverageRule[] */ },
}

export function auditRouteCoverage(targetDir: string): RouteFinding[]
```

`toContractIssue(finding, index)` passa a ler `finding.route.file`, `finding.route.line`,
`finding.severity` e monta `description` a partir de `finding.verdict` + `finding.missing`.

### Passo 3: Testes dos guards e da fixture

```ts
// skills/security/lib/route-auth-matrix.types.test.ts
// 2026-09-03 (Luiz/dev): o contrato precisa de teste proprio — Plano 04 confia nele sem reler a lib.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { isRoute, isVerdict, isHttpMethod } from './route-auth-matrix.types'
import { nextjsAdapter } from './route-auth-matrix'

const FIXTURES = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix')

describe('route-auth-matrix contract guards', () => {
  it('accepts a well-formed Route', () => {
    expect(isRoute({ method: 'GET', path: '/api/admin', file: 'app/api/admin/route.ts', line: 1, stack: 'nextjs' })).toBe(true)
  })

  it('rejects a Route with backslash in file or path without leading slash', () => {
    expect(isRoute({ method: 'GET', path: 'api/admin', file: 'app/api/admin/route.ts', line: 1, stack: 'nextjs' })).toBe(false)
    expect(isRoute({ method: 'GET', path: '/api/admin', file: 'app\\api\\admin\\route.ts', line: 1, stack: 'nextjs' })).toBe(false)
  })

  it('rejects unknown verdicts and methods', () => {
    expect(isVerdict('covered')).toBe(false)
    expect(isHttpMethod('FETCH')).toBe(false)
  })

  it('enumerates the nextjs-minimal fixture as valid Route[]', () => {
    const routes = nextjsAdapter.enumerate(join(FIXTURES, 'nextjs-minimal'))
    expect(routes.length).toBeGreaterThan(0)
    expect(routes.every(isRoute)).toBe(true)
  })
})
```

Atualizar `route-auth-matrix.test.ts` da fase-01: `finding.verdict === 'DESCOBERTA'`,
`finding.route.path === '/api/admin'`, `finding.route.file === 'app/api/admin/route.ts'`.

---

## Gotchas

- **G3 do plano:** dois arquivos rastreados (`.types.ts` novo, `.ts` alterado) — `generate:manifest`
  no mesmo commit.
- **G8 do plano:** o guard `isRoute` REJEITA `\` em `file` de proposito — e o teste que pega
  adaptador que esqueceu `toPosix()`. Manter.
- **G12 do plano:** `(HTTP_METHODS as readonly string[]).includes(value)` e o unico `as` aceito
  aqui — e um alargamento para `readonly string[]` (seguro, sem estreitar), nao um cast de
  `unknown`. Se o dev preferir zero `as`, trocar por `HTTP_METHODS.some((m) => m === value)`.
- **Local — congelamento:** depois desta fase, qualquer mudanca em `.types.ts` e DI no MEMORY.md e
  aviso ao Plano 04 (que pode ja estar rodando em paralelo). Acrescentar variante em
  `CoverageRule` e aditivo e livre; renomear campo de `Route` nao e.
- **Local — `line >= 1`:** o schema v2 exige `"line": { "type": "integer", "minimum": 1 }`. O guard
  espelha; adaptador que nao sabe a linha devolve `1`, nunca `0`.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (nao por compilation error)
  - Comando: `bun test skills/security/lib/route-auth-matrix.types.test.ts -t 'rejects a Route with backslash'`
  - Resultado esperado: `Expected: false, Received: true` (guard stub devolvendo `true` para tudo)

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun test skills/security/lib/route-auth-matrix.types.test.ts skills/security/lib/route-auth-matrix.test.ts`
  - Resultado esperado: `5 pass, 0 fail`

### Checklist

- [ ] `grep -n "RouteAuditFinding" skills/security/lib/` devolve vazio (shape ad hoc removido)
- [ ] `grep -rn " as " skills/security/lib/route-auth-matrix*.ts` mostra no maximo o alargamento
      `as readonly string[]` (ou nada)
- [ ] `bun skills/security/lib/route-auth-matrix.ts tests/fixtures/route-auth-matrix/nextjs-minimal`
      ainda devolve 1 issue `critical` (comportamento da fase-01 preservado)
- [ ] `bun run generate:manifest` sem warning; manifest contem `route-auth-matrix.types.ts`
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/` retorna `0 fail`
- `bun run typecheck` retorna sem erros com `route-auth-matrix.types.ts` importado por
  `route-auth-matrix.ts` e por `.types.test.ts`
- `grep -c "export type\|export interface" skills/security/lib/route-auth-matrix.types.ts` >= 7
  (`HttpMethod`, `Route`, `CoverageRule`, `CoverageMap`, `Verdict`, `RouteVerdict`, `RouteFinding`, `RouteAdapter`)

**Por humano:**
- Ler `.types.ts` com os olhos do Plano 04: da para escrever `railsAdapter.readCoverage()` devolvendo
  `before_action` como `CoverageRule` sem pedir campo novo em `Route`? Se nao, o contrato esta vago
  demais — resolver AQUI, nao no Plano 04

---

<!-- Gerado por /plan-feature em 2026-09-03 -->
