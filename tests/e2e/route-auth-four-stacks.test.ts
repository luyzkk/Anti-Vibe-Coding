// tests/e2e/route-auth-four-stacks.test.ts
// 2026-09-07 (Luiz/dev): gate CA-08 + CA-11 + Premissa 3 — PRD RF-01/RF-06, PLAN "Risks" (fixture
// obrigatoria por stack; adaptador sem fixture verde nao entra). Golden inline, nao arquivo: o
// contrato e pequeno e a diferenca aparece no diff do teste, nao num .json ao lado.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { auditProject, summarizeProject } from '../../skills/security/lib/route-auth-matrix'
import type { ProjectAuditResult } from '../../skills/security/lib/route-auth-matrix'
import type { KnownStack } from '../../skills/security/lib/route-auth-adapters'

const FIXTURES = join(import.meta.dir, '../fixtures/route-auth-matrix')
const CUT = 0.25   // DP-11 — Premissa 3 do PRD
const key = (r: { method: string; path: string; handler?: string }): string => `${r.method} ${r.path} ${r.handler ?? '-'}`
const routesOf = (result: ProjectAuditResult, stack: string): string[] =>
  (result.stacks.find((s) => s.stack === stack)?.result.verdicts ?? []).map((v) => key(v.route)).sort()
const verdictsOf = (result: ProjectAuditResult, stack: string): Record<string, string> =>
  Object.fromEntries((result.stacks.find((s) => s.stack === stack)?.result.verdicts ?? []).map((v) => [key(v.route), v.verdict]))
const rateOf = (result: ProjectAuditResult, stack: string): number => {
  const s = summarizeProject(result).stacks[stack]
  return s === undefined || s.enumerated === 0 ? 0 : s.indeterminada / s.enumerated
}

type Golden = { fixture: string; stack: KnownStack; changedFiles: string[]; routes: string[]; verdicts: Record<string, string>; issues: string[]; skipped: string[] }

const GOLDENS: Golden[] = [
  {
    fixture: 'nextjs-minimal', stack: 'nextjs',
    changedFiles: ['app/api/admin/route.ts', 'app/api/preferences/route.ts', 'app/api/users/[id]/route.ts', 'app/docs/[...slug]/page.tsx', 'app/(marketing)/pricing/page.tsx'],
    routes: ['DELETE /api/users/[id] -', 'GET /api/admin -', 'GET /api/preferences -', 'GET /api/users/[id] -', 'GET /docs/[...slug] -', 'GET /pricing -'],
    verdicts: { 'GET /api/admin -': 'DESCOBERTA', 'DELETE /api/users/[id] -': 'DESCOBERTA', 'GET /pricing -': 'DESCOBERTA' },
    issues: ['ROUTE-001 critical [nextjs]', 'ROUTE-002 critical [nextjs]', 'ROUTE-003 high [nextjs]', 'ROUTE-004 high [nextjs]', 'ROUTE-005 high [nextjs]', 'ROUTE-006 high [nextjs]'],
    skipped: ['node-ts'],
  },
  {
    fixture: 'rails-minimal', stack: 'rails', changedFiles: ['config/routes.rb'],
    routes: [
      'DELETE /admin/users/:id Admin::UsersController#destroy', 'GET / HomeController#index', 'GET /admin/users Admin::UsersController#index',
      'GET /admin/users/:id Admin::UsersController#show', 'GET /admin/users/:id/edit Admin::UsersController#edit', 'GET /admin/users/new Admin::UsersController#new',
      'GET /health HealthController#show', 'GET /legacy -', 'GET /posts PostsController#index', 'GET /posts/:id PostsController#show',
      'PATCH /admin/users/:id Admin::UsersController#update', 'POST /admin/users Admin::UsersController#create', 'PUT /admin/users/:id Admin::UsersController#update',
    ],
    verdicts: { 'GET / HomeController#index': 'indeterminada', 'GET /health HealthController#show': 'publica-declarada', 'GET /posts/:id PostsController#show': 'publica-declarada', 'GET /legacy -': 'indeterminada', 'PUT /admin/users/:id Admin::UsersController#update': 'coberta' },
    issues: ['ROUTE-001 medium [rails]', 'ROUTE-002 medium [rails]'],
    skipped: [],
  },
  {
    fixture: 'express-minimal', stack: 'node-ts', changedFiles: ['src/app.mjs', 'src/routes/admin.mjs'],
    routes: ['DELETE /admin/users/:id src/routes/admin.mjs:7', 'GET /${base}/reports src/app.mjs:16', 'GET /admin/users src/routes/admin.mjs:6', 'GET /api/preferences src/app.mjs:12', 'GET /health src/app.mjs:8', 'POST /api/preferences src/app.mjs:13'],
    verdicts: { 'GET /health src/app.mjs:8': 'DESCOBERTA', 'GET /${base}/reports src/app.mjs:16': 'indeterminada', 'GET /admin/users src/routes/admin.mjs:6': 'coberta' },
    issues: ['ROUTE-001 high [node-ts]', 'ROUTE-002 medium [node-ts]'],
    skipped: [],
  },
  {
    fixture: 'python-fastapi-minimal', stack: 'python', changedFiles: ['app/main.py', 'app/routers/admin.py'],
    routes: ['DELETE /api/admin/users/{user_id} app.routers.admin.delete_user', 'GET /api/admin/users app.routers.admin.list_users', 'GET /health app.main.health', 'GET /me app.main.me', 'POST /feedback app.main.feedback'],
    verdicts: { 'GET /health app.main.health': 'publica-declarada', 'GET /me app.main.me': 'coberta', 'POST /feedback app.main.feedback': 'DESCOBERTA' },
    issues: ['ROUTE-001 critical [python]'],
    skipped: [],
  },
]

describe('CA-08 — uma fixture por stack passa pelo contrato unico', () => {
  for (const g of GOLDENS) {
    it(`${g.stack}: enumerates the expected routes, verdicts and issues for ${g.fixture}`, async () => {
      const result = await auditProject(join(FIXTURES, g.fixture), { changedFiles: g.changedFiles })
      expect(result.stacks.map((s) => s.stack)).toEqual([g.stack])
      expect(result.skipped.map((s) => s.stack)).toEqual(g.skipped)
      expect(routesOf(result, g.stack)).toEqual(g.routes)
      expect(verdictsOf(result, g.stack)).toMatchObject(g.verdicts)
      expect(result.issues.map((i) => `${i.id} ${i.severity} ${i.description.slice(0, i.description.indexOf(']') + 1)}`)).toEqual(g.issues)
      expect(result.issues.every((i) => /\(\S+:\d+\)/.test(i.description))).toBe(true)   // RF-05: arquivo:linha em toda issue
    })
  }
})

describe('CA-11 — monorepo Next + Rails', () => {
  it('runs both adapters, skips node-ts with a reason, and tags every finding with its stack', async () => {
    const result = await auditProject(join(FIXTURES, 'monorepo-next-rails'), { changedFiles: ['app/api/admin/route.ts', 'config/routes.rb'] })
    expect(result.stacks.map((s) => s.stack)).toEqual(['nextjs', 'rails'])
    expect(result.skipped).toEqual([{ stack: 'node-ts', reason: expect.stringContaining('sem express') }])
    expect(result.issues.map((i) => i.description.slice(0, 8))).toEqual(['[nextjs]', '[rails] '])
    expect(summarizeProject(result).totals.enumerated).toBe(3)
  })
})

describe('Premissa 3 — taxa de indeterminada por stack e higiene do contrato', () => {
  // 2026-09-07 (Luiz/dev): DP-11 — taxa > 0.25 na propria fixture = adaptador fora do registro nesta versao.
  // O teste NAO afrouxa: se cair, a resposta e tirar o adaptador do ADAPTERS (Passo 3), nunca mexer no veredito.
  it('keeps every registered adapter under the indeterminada cut on its own fixture', async () => {
    const rates: Record<string, number> = {}
    for (const g of GOLDENS) rates[g.stack] = rateOf(await auditProject(join(FIXTURES, g.fixture), { changedFiles: g.changedFiles }), g.stack)
    for (const [stack, rate] of Object.entries(rates)) expect({ stack, rate }).toEqual({ stack, rate: expect.any(Number) })
    expect(Object.values(rates).every((r) => r <= CUT)).toBe(true)
    expect(rates).toEqual({ nextjs: 0, rails: 2 / 13, 'node-ts': 1 / 6, python: 0 })   // registrado no MEMORY pelo orquestrador
  })
  // G19: o validator do contrato (skills/lib/subagent-contract.ts SECRET_PATTERNS) recusaria o payload inteiro.
  it('never puts a secret-looking string in an issue description', async () => {
    const SECRET_LIKE = [/API_KEY\s*=\s*['"`]?[A-Za-z0-9_-]{8,}/i, /SECRET\s*=\s*['"`]?[A-Za-z0-9_-]{8,}/i]   // copia de subagent-contract.ts:237-238
    for (const g of [...GOLDENS, { fixture: 'monorepo-next-rails', changedFiles: ['app/api/admin/route.ts', 'config/routes.rb'] }]) {
      const { issues } = await auditProject(join(FIXTURES, g.fixture), { changedFiles: g.changedFiles })
      for (const issue of issues) for (const re of SECRET_LIKE) expect(issue.description).not.toMatch(re)
    }
  })
})
