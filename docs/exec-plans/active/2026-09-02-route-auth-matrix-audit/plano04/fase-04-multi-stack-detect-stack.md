<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: Multi-stack via `detectStack()` — registro de adaptadores e `auditProject`

**Plano:** 04 — Os outros tres adaptadores + multi-stack
**Sizing:** 1.5h
**Depende de:** fases 01–03 (os quatro adaptadores); Plano 03 fase-03 para `AuditOptions.adapter?` — ou a DI de coordenacao abaixo
**Visual:** false

---

## O que esta fase entrega

`detectStack()` escolhe os adaptadores: `route-auth-adapters.ts` registra `nextjs`/`rails`/`node-ts`
(so com `express`)/`python` por `StackId` e explica cada stack pulada (`react`, `laravel`, `node-ts`
sem express, nenhuma detectada); `auditProject()` assincrona roda a `auditRouteCoverage` SINCRONA
existente uma vez por stack e devolve findings com prefixo `[<stack>]`, ids sequenciais e um summary
por stack + totais (CA-11 / RF-06). A CLI da secao 11 passa a chamar `auditProject`; o agente ganha
bullets aditivos (DP-14). Adaptadores sem G2 saem com `g2Support: false` e nota — nunca silencio
(DP-9). Monorepo por subdiretorio continua fora (DP-13).

**DP aplicadas:** DP-8, DP-9, DP-12, DP-13, DP-14, DP-7 (multi-stack: `ALLOW-*` so se nenhuma
stack promoveu), DP-10 (fixture `monorepo-next-rails`).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/route-auth-adapters.test.ts` | Create (PRIMEIRO) | 6 testes: `ADAPTERS`, `selectAdapters`, `applies`/`skipped`, invariante |
| `skills/security/lib/route-auth-adapters.ts` | Create | `ADAPTERS`, `SKIP_REASONS`, `selectAdapters` |
| `skills/security/lib/route-auth-matrix.test.ts` | Modify | 5 testes de `auditProject`/`buildProjectIssues` (stub primeiro → RED por assertion; ver Passo 3) |
| `skills/security/lib/route-auth-matrix.ts` | Modify | `AuditOptions.adapter?` (se o Plano 03 nao trouxe — DI de coordenacao), `auditProject`, `buildProjectIssues`, `summarizeProject`, `withG2Note`, CLI com `await` |
| `agents/security-auditor.md` | Modify (ADITIVO) | Secao 11: bullets DP-14 |
| `tests/fixtures/route-auth-matrix/monorepo-next-rails/**` (6 arquivos: `package.json`, `Gemfile`, `app/api/admin/route.ts`, `config/routes.rb`, `app/controllers/application_controller.rb`, `app/controllers/invoices_controller.rb`) | Create | dados (CA-11) — `route.ts` passa pelo gate; sem `middleware.ts` |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G3) — adapters (nova), matrix, agente |

> Excecao declarada (>5 arquivos): registro, `auditProject`, CLI e agente sao a mesma fatia — um
> registro sem consumidor, ou uma CLI que imprime um shape que a secao 11 nao descreve, e estado
> intermediario sem sentido (README, "Politica de fases").

**Ponto de coordenacao com o Plano 03 (README):** se `AuditOptions.adapter?` NAO existir no checkout
(Plano 03 nao mergeado), esta fase o introduz com o shape exato da DP-2/G14 do Plano 03
(`adapter?: RouteAdapter`, default `nextjsAdapter`, mesma natureza de `coverageOverride`) e registra
`DI-fase04-adapter-seam` no MEMORY; o Plano 03 herda ao rebasear. Se existir, nada a fazer.

---

## Implementacao

### Passo 1: Fixture `monorepo-next-rails` (dados)

`package.json` — `next` faz `probeNextjs` casar; `typescript` faz `probeNodeTs` casar (G8) e NAO ha `express` (DP-12)
```json
{ "name": "monorepo-next-rails", "private": true, "dependencies": { "next": "^15" }, "devDependencies": { "typescript": "^5" } }
```

`Gemfile`
```ruby
source "https://rubygems.org"
gem "rails"
```

`app/api/admin/route.ts` — sem `next/*` (DP-10); sem `middleware.ts` na raiz → DESCOBERTA
```ts
// 2026-09-06 (Luiz/dev): fixture CA-11 — rota Next sem middleware, no MESMO app/ dos controllers Rails (G9). Sem import de next/*.
export function GET() {
  return Response.json({ admin: true })
}
```

`config/routes.rb`
```ruby
Rails.application.routes.draw do
  resources :invoices, only: [:index]
  get "status", to: "status#show"
end
```

`app/controllers/application_controller.rb`
```ruby
class ApplicationController < ActionController::Base
  before_action :authenticate_user!
end
```

`app/controllers/invoices_controller.rb`
```ruby
class InvoicesController < ApplicationController
  def index; end
end
```

NAO existe `status_controller.rb` (→ `opaque` escopado → `indeterminada` medium, para o prefixo
`[rails]` aparecer numa issue).

**Esperado para `auditProject(MONOREPO, { changedFiles: ['app/api/admin/route.ts', 'config/routes.rb'] })`:**
- `detected`: `{ primary: 'nextjs', secondary: ['node-ts', 'rails'] }`
- `stacks.map((s) => s.stack)`: `['nextjs', 'rails']`; `skipped`: `[{ stack: 'node-ts', reason: 'node-ts sem express: Fastify/Koa/Hono/NestJS fora do escopo desta versao' }]`
- Next: `enumerated: 1` (ignora `app/controllers/*.rb` — G9), `GET /api/admin` DESCOBERTA critical
- Rails: `enumerated: 2`; `GET /invoices` coberta (herdado); `GET /status` indeterminada (controller ausente)
- `issues`: `ROUTE-001 critical [nextjs] DESCOBERTA: GET /api/admin (app/api/admin/route.ts:2) sem cobertura de middleware e nao declarada publica em anti-vibe.public-routes.json — ...`;
  `ROUTE-002 medium [rails] indeterminada: GET /status (config/routes.rb:3) — cobertura nao demonstravel: controller StatusController nao encontrado em app/controllers/`
- `summary.totals`: `{ enumerated: 3, evaluated: 3, coberta: 1, publicaDeclarada: 0, descoberta: 1, indeterminada: 1 }`

### Passo 2: Registro — testes PRIMEIRO (`route-auth-adapters.test.ts`), depois a lib

```ts
// route-auth-adapters.test.ts (arquivo NOVO — RED de compilacao ate a lib existir, aceito)
import { ADAPTERS, SKIP_REASONS, selectAdapters } from './route-auth-adapters'
import type { DetectedStack } from '../../init/lib/detect-stack'

const FIXTURES = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix')
const detected = (primary: DetectedStack['primary'], secondary: DetectedStack['secondary'] = []): DetectedStack => ({ primary, secondary, signalSource: 'test', anchorFiles: [] })

describe('ADAPTERS (DP-8 — registro por StackId)', () => {
  it('registers nextjs, rails, node-ts and python, and nothing for react or laravel', () => {
    expect(Object.keys(ADAPTERS).sort()).toEqual(['nextjs', 'node-ts', 'python', 'rails'])
    expect(ADAPTERS.react).toBeUndefined()
    expect(ADAPTERS.laravel).toBeUndefined()
  })
  it('keeps the invariant that every entry adapter reports the stack it is registered under', () => {
    for (const [stack, entry] of Object.entries(ADAPTERS)) expect(entry.adapter.stack).toBe(stack)
  })
})

describe('selectAdapters (primary first, then secondary; skipped always carries a reason)', () => {
  it('orders primary before secondary and dedupes', () => {
    const { selected } = selectAdapters(detected('nextjs', ['rails', 'nextjs']), join(FIXTURES, 'monorepo-next-rails'))
    expect(selected.map((s) => s.stack)).toEqual(['nextjs', 'rails'])
  })
  // 2026-09-06 (Luiz/dev): DP-12 / G8 — todo Next traz node-ts; sem express, pular COM razao.
  it('skips node-ts without express with a reason, and selects it when express is a dependency', () => {
    const without = selectAdapters(detected('nextjs', ['node-ts']), join(FIXTURES, 'nextjs-minimal'))
    expect(without.selected.map((s) => s.stack)).toEqual(['nextjs'])
    expect(without.skipped).toEqual([{ stack: 'node-ts', reason: SKIP_REASONS['node-ts'] }])
    const withExpress = selectAdapters(detected('node-ts'), join(FIXTURES, 'express-minimal'))
    expect(withExpress.selected.map((s) => s.stack)).toEqual(['node-ts'])
  })
  it('skips react and laravel with their reasons instead of silently dropping them', () => {
    const { selected, skipped } = selectAdapters(detected('react', ['laravel']), FIXTURES)
    expect(selected).toEqual([])
    expect(skipped.map((s) => s.reason)).toEqual(['react: SPA sem rotas de servidor nesta versao', 'laravel: sem adaptador nesta versao'])
  })
  it('reports "nenhuma stack detectada" when primary is null', () => {
    expect(selectAdapters(detected(null), FIXTURES).skipped).toEqual([{ stack: 'none', reason: 'nenhuma stack detectada — sem manifest reconhecido na raiz (DP-13: monorepo por subdiretorio fora desta versao)' }])
  })
})
```

```ts
// route-auth-adapters.ts
// 2026-09-06 (Luiz/dev): Plano 04 DP-8/DP-12 — PRD RF-06 (detectStack escolhe; monorepo roda varios).
// Registro por StackId; ausencia de entrada ou `applies` falso vira `skipped` COM razao — nunca silencio (RF-04).
import type { DetectedStack, StackId } from '../../init/lib/detect-stack'
import type { RouteAdapter } from './route-auth-matrix.types'
import { nextjsAdapter } from './route-auth-nextjs'
import { railsAdapter } from './route-auth-rails'
import { expressAdapter, hasExpress } from './route-auth-express'
import { pythonAdapter } from './route-auth-python'

export type KnownStack = Exclude<StackId, 'unknown'>
export type AdapterEntry = { adapter: RouteAdapter; applies: (targetDir: string) => boolean }

export const ADAPTERS: Readonly<Partial<Record<KnownStack, AdapterEntry>>> = {
  nextjs: { adapter: nextjsAdapter, applies: () => true },
  rails: { adapter: railsAdapter, applies: () => true },
  'node-ts': { adapter: expressAdapter, applies: hasExpress },   // DP-12
  python: { adapter: pythonAdapter, applies: () => true },       // dialeto decidido por import (DP-6)
}

// Hash map, nao switch. Toda stack conhecida sem adaptador aplicavel tem uma frase aqui.
export const SKIP_REASONS: Readonly<Record<string, string>> = {
  react: 'react: SPA sem rotas de servidor nesta versao',
  laravel: 'laravel: sem adaptador nesta versao',
  'node-ts': 'node-ts sem express: Fastify/Koa/Hono/NestJS fora do escopo desta versao',
  none: 'nenhuma stack detectada — sem manifest reconhecido na raiz (DP-13: monorepo por subdiretorio fora desta versao)',
}

export type SelectedAdapter = { stack: KnownStack; adapter: RouteAdapter }
export type SkippedStack = { stack: string; reason: string }

export function selectAdapters(detected: DetectedStack, targetDir: string): { selected: SelectedAdapter[]; skipped: SkippedStack[] } {
  if (detected.primary === null) return { selected: [], skipped: [{ stack: 'none', reason: SKIP_REASONS.none ?? 'nenhuma stack detectada' }] }
  const ordered = [...new Set([detected.primary, ...detected.secondary])]
  const selected: SelectedAdapter[] = []
  const skipped: SkippedStack[] = []
  for (const stack of ordered) {
    const entry = ADAPTERS[stack]   // G5: `AdapterEntry | undefined`
    if (entry !== undefined && entry.applies(targetDir)) { selected.push({ stack, adapter: entry.adapter }); continue }
    skipped.push({ stack, reason: SKIP_REASONS[stack] ?? `${stack}: sem adaptador nesta versao` })
  }
  return { selected, skipped }
}
```

### Passo 3: `auditProject` — stub primeiro (RED por assertion), testes, implementacao

**3a — stub** em `route-auth-matrix.ts` (G6: para que CA-11 seja RED por assertion e nao de compilacao):

```ts
export async function auditProject(targetDir: string, opts: ProjectAuditOptions = {}): Promise<ProjectAuditResult> {
  const detected = await detectStack(targetDir)
  return { detected, stacks: [], skipped: [], issues: [] }
}
```

**3b — testes** (`route-auth-matrix.test.ts`; `auditProject`/`buildProjectIssues`/`summarizeProject`
sao imports novos — acrescentar junto com o stub, no mesmo passo):

```ts
describe('auditProject — multi-stack via detectStack (RF-06 / CA-11)', () => {
  const MONOREPO = join(FIXTURES, 'monorepo-next-rails')
  const CHANGED = ['app/api/admin/route.ts', 'config/routes.rb']

  it('CA-11: runs the Next and Rails adapters on the monorepo and prefixes every finding with its stack', async () => {
    const result = await auditProject(MONOREPO, { changedFiles: CHANGED })
    expect(result.stacks.map((s) => s.stack)).toEqual(['nextjs', 'rails'])
    expect(result.skipped).toEqual([{ stack: 'node-ts', reason: expect.stringContaining('sem express') }])
    expect(result.issues.map((i) => `${i.id} ${i.severity} ${i.description.slice(0, 30)}`)).toEqual([
      'ROUTE-001 critical [nextjs] DESCOBERTA: GET /api/ad', 'ROUTE-002 medium [rails] indeterminada: GET /st',
    ])
    expect(result.issues[1]?.description).toContain('StatusController nao encontrado')
  })
  // G9: app/ e compartilhado — o Next NAO pode ver controllers Rails como rota.
  it('lets the Next enumerator walk app/ without counting Rails controllers, and the Rails adapter without seeing app/api', async () => {
    const result = await auditProject(MONOREPO, { changedFiles: CHANGED })
    expect(result.stacks.find((s) => s.stack === 'nextjs')?.result.summary.enumerated).toBe(1)
    expect(result.stacks.find((s) => s.stack === 'rails')?.result.summary.enumerated).toBe(2)
    const summary = summarizeProject(result)
    expect(summary.totals).toEqual({ enumerated: 3, evaluated: 3, coberta: 1, publicaDeclarada: 0, descoberta: 1, indeterminada: 1 })
    expect(summary.detected).toEqual({ primary: 'nextjs', secondary: ['node-ts', 'rails'] })
  })
  // 2026-09-06 (Luiz/dev): teste de abuso — `skipped` NUNCA vira aprovacao: razao visivel, nada descartado.
  it('never turns a skipped stack into approval: the reason is in the summary and no issue of the other stacks is dropped', async () => {
    const result = await auditProject(MINIMAL, { changedFiles: ['app/api/admin/route.ts'] })
    const summary = summarizeProject(result)
    expect(summary.skipped.map((s) => s.stack)).toEqual(['node-ts'])
    expect(summary.skipped[0]?.reason).toContain('fora do escopo')
    expect(summary.stacks['node-ts']).toBeUndefined()
    expect(result.issues.map((i) => i.id)).toEqual(['ROUTE-001'])                       // CA-01 continua
    expect(result.issues[0]?.description.startsWith('[nextjs] ')).toBe(true)
  })
  it('DP-9: flags adapters without G2 support per stack with a visible note', async () => {
    const result = await auditProject(MONOREPO, { changedFiles: CHANGED })
    const rails = result.stacks.find((s) => s.stack === 'rails')
    expect(rails?.g2Support).toBe(false)
    expect(rails?.result.summary.notes.some((n) => n.includes('sem suporte a G2'))).toBe(true)
    expect(summarizeProject(result).stacks.rails?.g2Support).toBe(false)
  })
  // DP-7 multi-stack: ALLOW-* so quando NENHUMA stack promoveu a candidata. Funcao pura, sem fixture.
  it('emits an ALLOW issue once, and only when the wide entry stayed wide in every stack', () => {
    const wide = (path: string): AllowlistFinding => ({ path, file: PUBLIC_ROUTES_FILE, line: 3, severity: 'high', description: `entrada ampla \`${path}\`` })
    const audit = (stack: StackId, allowlistFindings: AllowlistFinding[]): AuditResult => ({ findings: [], allowlistFindings, verdicts: [], summary: emptySummary(stack) })
    const both = buildProjectIssues([{ stack: 'nextjs', result: audit('nextjs', [wide('/api/*')]), g2Support: true }, { stack: 'rails', result: audit('rails', [wide('/api/*')]), g2Support: false }])
    expect(both.map((i) => i.id)).toEqual(['ALLOW-001'])
    const promotedInRails = buildProjectIssues([{ stack: 'nextjs', result: audit('nextjs', [wide('/posts/:id')]), g2Support: true }, { stack: 'rails', result: audit('rails', []), g2Support: false }])
    expect(promotedInRails).toEqual([])
  })
})
```

`emptySummary(stack)` e um helper local do teste (`AuditSummary` com zeros e `allowlist` vazia —
copiar o shape do `summary` atual; se o Plano 03 ja existir, inclui `g2`).

**3c — implementacao:**

```ts
// route-auth-matrix.ts
import { detectStack } from '../../init/lib/detect-stack'
import type { DetectedStack } from '../../init/lib/detect-stack'
import { selectAdapters } from './route-auth-adapters'
import type { KnownStack, SkippedStack } from './route-auth-adapters'

export type AuditOptions = {
  changedFiles?: string[]
  coverageOverride?: CoverageMap
  readAtBase?: (file: string) => BaseRead
  /** Seam: default `nextjsAdapter` (Plano 03 G14). `auditProject` injeta o adaptador de cada stack. */
  adapter?: RouteAdapter      // ← so se o Plano 03 nao trouxe (DI-fase04-adapter-seam)
}
// em auditRouteCoverage: `const adapter: RouteAdapter = opts.adapter ?? nextjsAdapter` e usar `adapter.` em vez de `nextjsAdapter.`

export type ProjectAuditOptions = Omit<AuditOptions, 'adapter' | 'coverageOverride'>
export type StackAudit = { stack: KnownStack; result: AuditResult; g2Support: boolean }
export type ProjectAuditResult = { detected: DetectedStack; stacks: StackAudit[]; skipped: SkippedStack[]; issues: ContractIssue[] }
export type ProjectSummary = {
  detected: { primary: DetectedStack['primary']; secondary: DetectedStack['secondary'] }
  stacks: Record<string, AuditSummary & { g2Support: boolean }>
  skipped: SkippedStack[]
  totals: Pick<AuditSummary, 'enumerated' | 'evaluated' | 'coberta' | 'publicaDeclarada' | 'descoberta' | 'indeterminada'>
}

// DP-9: a nota aparece por stack COM ou SEM o Plano 03 (que tambem a emite via reconstructBefore) — dedupe por substring.
function withG2Note(result: AuditResult, adapter: RouteAdapter): AuditResult {
  const supported = adapter.readCoverageAtBase !== undefined && adapter.isCoverageFile !== undefined
  if (supported || result.summary.notes.some((n) => n.includes('sem suporte a G2'))) return result
  const note = `adaptador ${adapter.stack} sem suporte a G2: alteracao em cobertura (controller/deps/middleware) que REMOVE auth nao e detectada nesta versao`
  return { ...result, summary: { ...result.summary, notes: [...result.summary.notes, note] } }
}

const PREFIX = (stack: string, issue: ContractIssue): ContractIssue => ({ ...issue, description: `[${stack}] ${issue.description}` })

/** DP-8 + DP-7: ALLOW-* uma vez (candidatas amplas em TODAS as stacks), depois ROUTE-* por stack na ordem detectada. */
export function buildProjectIssues(stacks: ReadonlyArray<StackAudit>): ContractIssue[] {
  const first = stacks[0]
  if (first === undefined) return []
  const keyOf = (f: AllowlistFinding): string => normalizePath(f.path)
  const stillWide = first.result.allowlistFindings.filter((f) => stacks.every((s) => s.result.allowlistFindings.some((g) => keyOf(g) === keyOf(f))))
  const allow = stillWide.map(allowlistToContractIssue)
  const routes = stacks.flatMap((s) => s.result.findings.map((f) => PREFIX(s.stack, toContractIssue(f, 0))))
  // ids sequenciais na lista COMBINADA (DP-8): renumerar apos concatenar
  return [...allow, ...routes.map((issue, i) => ({ ...issue, id: `ROUTE-${String(i + 1).padStart(3, '0')}` }))]
}

export async function auditProject(targetDir: string, opts: ProjectAuditOptions = {}): Promise<ProjectAuditResult> {
  const detected = await detectStack(targetDir)          // G7: a UNICA chamada assincrona
  const { selected, skipped } = selectAdapters(detected, targetDir)
  const stacks: StackAudit[] = selected.map(({ stack, adapter }) => ({
    stack,
    result: withG2Note(auditRouteCoverage(targetDir, { ...opts, adapter }), adapter),   // sincrona, por stack; allowlist lida por stack (aceito, DP-8)
    g2Support: adapter.readCoverageAtBase !== undefined && adapter.isCoverageFile !== undefined,
  }))
  return { detected, stacks, skipped, issues: buildProjectIssues(stacks) }
}

export function summarizeProject(result: ProjectAuditResult): ProjectSummary {
  const totals = { enumerated: 0, evaluated: 0, coberta: 0, publicaDeclarada: 0, descoberta: 0, indeterminada: 0 }
  const stacks: ProjectSummary['stacks'] = {}
  for (const s of result.stacks) {
    stacks[s.stack] = { ...s.result.summary, g2Support: s.g2Support }
    for (const k of Object.keys(totals) as Array<keyof typeof totals>) totals[k] += s.result.summary[k]   // ver Gotcha "sem as": iterar lista tipada
  }
  return { detected: { primary: result.detected.primary, secondary: result.detected.secondary }, stacks, skipped: result.skipped, totals }
}
```

> "sem `as`": em vez de `Object.keys(totals) as Array<...>`, declarar
> `const TOTAL_KEYS = ['enumerated', 'evaluated', 'coberta', 'publicaDeclarada', 'descoberta', 'indeterminada'] as const`
> e iterar `for (const k of TOTAL_KEYS) totals[k] += s.result.summary[k]`. O `as const` e literal de
> tupla, nao assercao de tipo — permitido (o repo ja usa em `HTTP_METHODS`).

### Passo 4: CLI — `await auditProject`, `{ issues, summary }` no topo (contrato com a secao 11)

```ts
if (import.meta.main) {
  // ...args, --ref, diff: inalterados (blocked continua exit 2)...
  const result = await auditProject(target, { changedFiles: diff.files, readAtBase: readAtBaseFromGit(target, ref) })
  console.log(JSON.stringify({ issues: result.issues, summary: summarizeProject(result) }, null, 2))
}
```

Top-level `await` em `import.meta.main` funciona no Bun (ESM). `issues` continua no topo; `summary`
muda de shape (por stack) — a secao 11 e atualizada no mesmo commit (Passo 5).

### Passo 5: Agente — secao 11 (ADITIVO, DP-14)

Acrescentar ao final da secao 11 de `agents/security-auditor.md` (nenhuma linha removida; o bullet
existente de `ALLOW-*` ganha UMA frase no fim, em `+`):

```markdown
- `summary` agora e POR STACK (PRD RF-06 / CA-11): `summary.detected` (`primary`, `secondary` de
  `detect-stack.ts`), `summary.stacks[<stack>]` (o summary de cada adaptador: `enumerated`,
  `evaluated`, `coberta`, `publicaDeclarada`, `descoberta`, `indeterminada`, `notes`, `allowlist`,
  `g2Support`), `summary.skipped` (stacks detectadas SEM adaptador aplicavel, cada uma com `reason`)
  e `summary.totals`. Cite em `reasoning` as stacks que rodaram, as que foram puladas COM a razao, e
  `totals.enumerated` / `totals.indeterminada`.
- Toda issue `ROUTE-*` comeca com `[<stack>] ` (ex.: `[rails] DESCOBERTA: ...`, `[nextjs] [cobertura
  perdida] DESCOBERTA: ...`). Copie o prefixo como esta — e o que identifica a stack de origem num
  monorepo. Ids sao sequenciais na lista combinada.
- `summary.skipped` NAO e "tudo coberto": `node-ts sem express` significa que Fastify/Koa/Hono/NestJS
  nao sao auditados nesta versao; `react`/`laravel` nao tem adaptador. Diga isso literalmente em
  `reasoning` em vez de silenciar. Monorepo com a stack num SUBDIRETORIO (`backend/`, `frontend/`) nao
  e detectado nesta versao — se o projeto for assim, registre em `reasoning`.
- Rails, Express e Python decidem "e auth?" pelo NOME do filtro/middleware/dependencia (heuristica —
  `authenticate_user!`, `requireAuth`, `get_current_user`...). `summary.stacks[<stack>].notes` lista
  `filtros/middlewares/dependencias contados como auth: ...` e `... ignorados por nome: ...`. Cite as
  duas listas: um nome de auth exotico ignorado explica uma DESCOBERTA; um nome que parece auth sem
  ser explica uma `coberta` falsa. E proxy, como o matcher sem `config` no Next.
- `g2Support: false` numa stack = o adaptador dela nao reconstroi a cobertura na ponta ANTES do diff:
  um diff que so acrescenta `skip_before_action` num controller Rails, ou tira um `Depends` de um
  `include_router`, NAO gera `[cobertura perdida]` nesta versao. Diga isso quando o diff tocar
  controllers/deps sem tocar rotas.
- Entrada ampla da allowlist (`:id`, `*`, `(...)`): a lib PROMOVE a entrada quando ela e a declaracao
  literal de uma rota enumerada (`/posts/:id` no Rails/Express, `/users/{id}` nao e ampla) e registra
  em `summary.stacks[<stack>].allowlist.notes`; so o que nao corresponde a rota nenhuma em NENHUMA
  stack vira `ALLOW-*`. Uma `ALLOW-*` num monorepo e uma entrada que nenhuma stack reconhece.
```

E no bullet existente `Issues com id ALLOW-* sao findings sobre a PROPRIA allowlist ...`, acrescentar
ao final da ultima frase (`Cite summary.allowlist.wide em reasoning.`): ` — salvo quando a entrada e a
declaracao literal de uma rota enumerada (Plano 04 DP-7): nesse caso ela e promovida e a nota diz.`
(unica edicao dentro de bullet existente; e adicao, nao remocao.) O comando Bash da secao NAO muda.

### Passo 6: Manifest

`bun run generate:manifest` — `route-auth-adapters.ts` (nova), `route-auth-matrix.ts`,
`agents/security-auditor.md` (G3).

---

## Gotchas

- **G7 do plano:** `auditRouteCoverage` continua sincrona (52+ testes sem `await`). So `auditProject` e
  `async`, e a unica coisa que ela aguarda e `detectStack`. Nao "aproveitar" para tornar adaptadores async.
- **G8 do plano:** `nextjs-minimal` detecta `nextjs` + `node-ts`; sem `express` → `node-ts` pulado com
  razao. O teste `never turns a skipped stack into approval` afirma exatamente isso — e que a
  `ROUTE-001` do CA-01 continua la, agora com `[nextjs] `.
- **G9 do plano:** o `walk` do Next ve `app/controllers/*.rb` e ignora; o Rails ve so
  `config/routes.rb` + `app/controllers/**`. O teste de `enumerated` por stack (1 e 2) trava isso.
- **G24 do plano:** se o Plano 03 ja existir, `readAllowlistAtBase` recebe `promoteWideCandidates`
  (fase-01 disse onde); se nao, nada a fazer aqui.
- **Local — prefixo `[<stack>]` e ADITIVO ao `[cobertura perdida]`:** `PREFIX` embrulha a description
  final de `toContractIssue` — que, apos o Plano 03, ja pode comecar com `[cobertura perdida] `.
  Ordem final: `[rails] [cobertura perdida] DESCOBERTA: ...`. Nao reordenar.
- **Local — ids sequenciais na lista combinada:** `toContractIssue(f, 0)` e chamado com indice falso
  e o id e reescrito depois da concatenacao. Alternativa (passar `offset`) mudaria a assinatura
  publica de `toContractIssue` — evitado.
- **Local — `ALLOW-*` dedupe por `normalizePath`:** duas stacks leem a MESMA allowlist; a diferenca e
  so quem promoveu. A intersecao por path decide. Em projeto single-stack, `stacks.every` sobre um
  elemento = comportamento atual (CA-04 intacto).
- **Local — `summary.stacks` e `Record<string, ...>`:** com `noUncheckedIndexedAccess`,
  `summary.stacks.rails?.g2Support`. Nao `Record<KnownStack, ...>` — nem toda stack roda.
- **Local — CLI contra o repo do plugin:** `detectStack(.)` devolve `node-ts` (typescript em devDeps),
  sem express → `stacks: {}`, `skipped: [node-ts]`, `issues: []`, sem `blocked`. E o comportamento
  correto e e o item de checklist.
- **Local — secao 11 sem remocao:** `git diff agents/security-auditor.md` deve mostrar SO `+` (mais a
  frase acrescentada ao bullet de `ALLOW-*`, que aparece como `-`/`+` da MESMA linha reescrita —
  aceitavel; conferir que o texto anterior esta contido no novo).
- **Local — `detectStack` engole erros de I/O e nunca lanca;** `auditProject` nao precisa de try/catch
  em volta dela. `auditRouteCoverage` pode lancar se um adaptador lancar (ex.: `readdirSync` em
  diretorio sem permissao) — deixar propagar: a CLI ja imprime `blocked`? NAO — hoje um throw em
  `auditRouteCoverage` derruba o processo com stack trace e o agente registra a falha literal
  (bullet "Se o comando falhar"). Manter; nao engolir excecao de adaptador (seria silencio).

---

## Verificacao

### TDD

- [ ] **RED 1 (registro, arquivo novo):** `bun test skills/security/lib/route-auth-adapters.test.ts` →
  modulo ausente (aceito); apos stub `ADAPTERS = {}`: `-t 'registers nextjs'` → `Expected: [...4], Received: []`
- [ ] **RED 2 (CA-11, por assertion via stub):** `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-11'`
  → `Expected: ["nextjs", "rails"], Received: []`
- [ ] **RED 3 (abuso):** `-t 'never turns a skipped stack'` → `Expected: ["node-ts"], Received: []`
- [ ] **GREEN:** `bun test skills/security/lib/route-auth-adapters.test.ts` → `6 pass`;
  `bun test skills/security/lib/route-auth-matrix.test.ts` → `65 pass, 0 fail` (60 + 5)

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED:** `never turns a skipped stack into approval` FALHOU antes de `skipped`
      existir — uma stack detectada e silenciosamente ignorada e "aprovacao por omissao", o modo de
      falha que RF-04 proibe
- [ ] **CA-11 (RF-06):** Dado um monorepo com Next.js e Rails detectados por `detect-stack.ts`, quando o
      auditor roda, entao os dois adaptadores executam e os findings identificam a stack de origem —
      `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-11'` → 1 pass
- [ ] **CA-01 continua com prefixo:** `-t 'CA-01'` → 2 pass (os testes antigos leem `findings`, nao
      `issues` — o prefixo entra so em `buildProjectIssues`; `buildContractIssues` por stack fica sem prefixo)
- [ ] **DP-9 visivel:** `-t 'DP-9'` → 1 pass; a nota `sem suporte a G2` esta em `summary.stacks.rails.notes`
- [ ] **DP-7 multi-stack:** `-t 'ALLOW issue once'` → 1 pass
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** A secao 11 ganha instrucoes de
      transparencia (dizer o que foi pulado), nao de aprovacao
- [ ] **Nenhum secret literal** na fixture nem no agente: `grep -rniE "SECRET\s*=|API_KEY\s*=" tests/fixtures/route-auth-matrix/monorepo-next-rails agents/security-auditor.md` → vazio (G19)

### Checklist

- [ ] **RED-check do orquestrador (obrigatorio):** com tudo verde, (1) em `selectAdapters`, ignorar
      `applies` (sempre selecionar) → `skips node-ts without express` FALHA e `never turns a skipped`
      FALHA (`node-ts` aparece em `stacks` com `enumerated: 0`); restaurar. (2) Remover o `PREFIX` →
      `CA-11` FALHA (`Received: "ROUTE-001 critical DESCOBERTA: GET /api/adm"`); restaurar. (3) Em
      `selectAdapters`, devolver `skipped: []` para stack sem entrada → `skips react and laravel`
      FALHA; restaurar. (4) Em `buildProjectIssues`, trocar `every` por `some` → `ALLOW issue once`
      FALHA no segundo cenario (`ALLOW-001` emitida apesar da promocao no Rails); restaurar.
      (5) Em `withG2Note`, nunca acrescentar a nota → `DP-9` FALHA; restaurar.
- [ ] `grep -n "switch" skills/security/lib/route-auth-adapters.ts skills/security/lib/route-auth-matrix.ts` → vazio
- [ ] `grep -nE "\bas [A-Z]" skills/security/lib/route-auth-adapters.ts skills/security/lib/route-auth-matrix.ts` → vazio
- [ ] `grep -c "auditRouteCoverage(" skills/security/lib/route-auth-matrix.test.ts` → mesmo numero de
      antes da fase (nenhum teste antigo convertido para `auditProject`)
- [ ] CLI contra o repo do plugin: `bun skills/security/lib/route-auth-matrix.ts . --ref main` devolve
      `summary.detected.primary: "node-ts"`, `summary.skipped` com `node-ts sem express`, `stacks: {}`,
      `issues: []`, sem `blocked`; `bun skills/security/lib/route-auth-matrix.ts tests/fixtures/route-auth-matrix/monorepo-next-rails`
      NAO e repo git → `blocked` com razao (comportamento existente preservado)
- [ ] `git diff agents/security-auditor.md` e so adicao (mais a linha do bullet `ALLOW-*` reescrita com
      o texto anterior contido); o comando Bash da secao 11 esta identico
- [ ] `grep -n "recusad" agents/security-auditor.md skills/verify-work/SKILL.md` → nenhuma ocorrencia
      que afirme que entrada ampla e "recusada" sem a ressalva da promocao (DP-7 substitui a DP-3 do Plano 02)
- [ ] `bun run generate:manifest` sem warning; diff revisado pelo checksum (G3) — 3 arquivos rastreados
- [ ] `bun run agents:contract` verde
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck` (depois do GREEN — G25)
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (G15)
- [ ] GT-fase02-1: `auditProject` entrou como stub junto com o import (RED por assertion registrado)
- [ ] **Nenhum `.ts` novo em `tests/fixtures/` alem de `route.ts`** (G1): `git status --porcelain tests/fixtures | grep '\.ts$'` → so `app/api/admin/route.ts` do monorepo
- [ ] Se `AuditOptions.adapter?` foi introduzido aqui: `DI-fase04-adapter-seam` no MEMORY com o shape exato
- [ ] MEMORY.md: DI/BUG/GT desta fase; Metricas (4/5); contagens reais se diferirem

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/route-auth-adapters.test.ts` retorna `6 pass, 0 fail`
- `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-11|skipped|DP-9|ALLOW issue once|Rails controllers'` retorna `5 pass`
- `bun test skills/security/lib/` retorna `0 fail`
- `bun skills/security/lib/route-auth-matrix.ts . --ref main` imprime JSON com `issues` no topo e `summary.stacks`/`summary.skipped`
- `bun run typecheck`, `bun run agents:contract`, `bun run generate:manifest` sem erro/warning
- `git diff --stat agents/security-auditor.md` mostra so insercoes (uma linha reescrita contendo o texto anterior)

**Por humano:**
- Num monorepo real Next + Rails (ou, na falta, na fixture copiada para um repo git temporario com um
  commit inicial e um segundo commit criando `app/api/admin/route.ts`),
  `/anti-vibe-coding:verify-work` mostra `ROUTE-001 ... [nextjs] DESCOBERTA` e `[rails] ...` na tabela
  de Issues Found e o `reasoning` do auditor cita `node-ts sem express` em `skipped` —
  **pendente de sync do cache do plugin (G1)** e da validacao de `CLAUDE_PLUGIN_ROOT` (Plano 01);
  registrar como divida

---

<!-- Gerado por /plan-feature em 2026-09-06 -->
