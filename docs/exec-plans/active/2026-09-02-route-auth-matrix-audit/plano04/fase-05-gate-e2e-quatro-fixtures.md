<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 05: Gate e2e — quatro fixtures, corte da Premissa 3 e fechamento da feature

**Plano:** 04 — Os outros tres adaptadores + multi-stack
**Sizing:** 1h
**Depende de:** fase-04
**Visual:** false

---

## O que esta fase entrega

Um gate e2e que prova CA-08 (o contrato unico serve as quatro stacks: uma fixture por stack passa
por `auditProject` e produz a lista de rotas e os vereditos esperados) e CA-11 (monorepo), mede a
taxa de `indeterminada` por stack e aplica o corte da Premissa 3 (taxa > 0.25 na propria fixture →
o adaptador sai do registro nesta versao, com nota `experimental`, sem afrouxar veredito). Fecha o
MEMORY do plano com as "Notas para Planos Seguintes" — a feature inteira termina aqui.

**DP aplicadas:** DP-11, DP-10 (as quatro fixtures + monorepo), DP-13, DP-15 (fechamento).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/route-auth-four-stacks.test.ts` | Create | 6 testes: CA-08 x4 (golden inline por stack), CA-11 (monorepo), Premissa 3 + segredos |
| `skills/security/lib/route-auth-adapters.ts` (+ `.test.ts`) | Modify (SO se o corte remover alguem) | entrada removida de `ADAPTERS`, `SKIP_REASONS[stack]` com a taxa, teste do registro ajustado |
| `skills/security/lib/route-auth-<stack>.ts` | Modify (SO se o corte remover alguem) | cabecalho `EXPERIMENTAL` com a taxa medida |
| `docs/exec-plans/active/2026-09-02-route-auth-matrix-audit/plano04/MEMORY.md` | Modify | tabela Premissa 3 preenchida; "Notas para Planos Seguintes"; Status: concluido |
| `plugin-manifest.json` | Regenerate (SO se o corte tocou lib) | `bun run generate:manifest` (G3) |

> `tests/e2e/` nao entra no manifest e `bun run test` inclui `tests/**/*.test.ts` (G20). Nenhuma
> fixture nova nesta fase — as cinco ja existem (fases 01–04 + `nextjs-minimal` do Plano 01).

---

## Implementacao

### Passo 1: Golden inline por stack (o que o teste afirma)

`changedFiles` por fixture = TODOS os arquivos de rota da fixture (escopo G1 inteiro — a fixture e o
"diff"). Rotas como `${method} ${path} ${handler ?? '-'}`, ordenadas (`.sort()` nos dois lados —
nao depender da ordem interna do adaptador).

**`nextjs-minimal`** (`changedFiles`: os 5 arquivos `route.ts`/`page.tsx`; `middleware.ts` cobre so
`/dashboard/:path*`; sem allowlist). Conferir a lista contra `enumerateNextjsRoutes` ANTES de
escrever o golden — a fixture e do Plano 01 e pode ter mudado:

| method | path | handler | veredito | severidade |
|---|---|---|---|---|
| GET | `/api/admin` | - | DESCOBERTA | critical (marcador) |
| GET | `/api/preferences` | - | DESCOBERTA | high |
| DELETE | `/api/users/[id]` | - | DESCOBERTA | critical (mutante) |
| GET | `/api/users/[id]` | - | DESCOBERTA | high |
| GET | `/docs/[...slug]` | - | DESCOBERTA | high |
| GET | `/pricing` | - | DESCOBERTA | high |

`detected: { primary: 'nextjs', secondary: ['node-ts'] }`; `skipped: [node-ts sem express]`;
`totals: { enumerated: 6, evaluated: 6, coberta: 0, publicaDeclarada: 0, descoberta: 6, indeterminada: 0 }`.

**`rails-minimal`** (`changedFiles: ['config/routes.rb']`; allowlist com `/health` e `/posts/:id`):

13 rotas (tabela da fase-01). `detected: { primary: 'rails', secondary: [] }`; `skipped: []`.
Vereditos: 9 `coberta` (8 de `Admin::Users` + `GET /posts`), 2 `publica-declarada` (`/health`,
`/posts/:id` promovida — DP-7), 2 `indeterminada` (`GET /` controller ausente; `GET /legacy` `match`
sem `via:`). Findings: `ROUTE-001 medium [rails] indeterminada: GET / ...`, `ROUTE-002 medium [rails]
indeterminada: GET /legacy ...`. `summary.stacks.rails.allowlist`: `accepted: 2`, `wide: 0`, `notes`
contem `promovida`. Taxa `2/13 = 0.15`.

**`express-minimal`** (`changedFiles: ['src/app.mjs', 'src/routes/admin.mjs']`; sem allowlist):

6 rotas (tabela da fase-02). `detected: { primary: 'node-ts', secondary: [] }`; `skipped: []`
(`hasExpress` = true). Vereditos: 4 `coberta`, 1 `DESCOBERTA` (`GET /health`, high), 1
`indeterminada` (`GET /${base}/reports`). Findings: `ROUTE-001 high [node-ts] DESCOBERTA: GET /health
(src/app.mjs:8) sem middleware de auth na cadeia antes da rota e nao declarada publica ...`,
`ROUTE-002 medium [node-ts] indeterminada: GET /${base}/reports (src/app.mjs:16) — cobertura nao
demonstravel: rota nao resolvida estaticamente: path nao literal: template literal com ${}`. Taxa `1/6 = 0.17`.

**`python-fastapi-minimal`** (`changedFiles: ['app/main.py', 'app/routers/admin.py']`; allowlist `/health`):

5 rotas (tabela da fase-03). `detected: { primary: 'python', secondary: [] }`. Vereditos: 3 `coberta`,
1 `publica-declarada` (`/health`), 1 `DESCOBERTA` (`POST /feedback`, critical — mutante). Findings:
`ROUTE-001 critical [python] DESCOBERTA: POST /feedback (app/main.py:20) sem Depends/decorator/middleware
de auth e nao declarada publica ...`. Taxa `0/5 = 0.00`.

**`monorepo-next-rails`** (CA-11 — tabela da fase-04): `stacks: ['nextjs', 'rails']`, `skipped: [node-ts]`,
`ROUTE-001 critical [nextjs] ...`, `ROUTE-002 medium [rails] ...`.

### Passo 2: O teste (`tests/e2e/route-auth-four-stacks.test.ts`)

```ts
// tests/e2e/route-auth-four-stacks.test.ts
// 2026-09-06 (Luiz/dev): gate CA-08 + CA-11 + Premissa 3 — PRD RF-01/RF-06, PLAN "Risks" (fixture
// obrigatoria por stack; adaptador sem fixture verde nao entra). Golden inline, nao arquivo: o
// contrato e pequeno e a diferenca aparece no diff do teste, nao num .json ao lado.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { auditProject, summarizeProject } from '../../skills/security/lib/route-auth-matrix'
import type { ProjectAuditResult } from '../../skills/security/lib/route-auth-matrix'

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

type Golden = { fixture: string; stack: string; changedFiles: string[]; routes: string[]; verdicts: Record<string, string>; issues: string[]; skipped: string[] }

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
      'GET /health HealthController#show', 'GET /legacy LegacyController#handle', 'GET /posts PostsController#index', 'GET /posts/:id PostsController#show',
      'PATCH /admin/users/:id Admin::UsersController#update', 'POST /admin/users Admin::UsersController#create', 'PUT /admin/users/:id Admin::UsersController#update',
    ],
    verdicts: { 'GET / HomeController#index': 'indeterminada', 'GET /health HealthController#show': 'publica-declarada', 'GET /posts/:id PostsController#show': 'publica-declarada', 'GET /legacy LegacyController#handle': 'indeterminada', 'PUT /admin/users/:id Admin::UsersController#update': 'coberta' },
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
  // 2026-09-06 (Luiz/dev): DP-11 — taxa > 0.25 na propria fixture = adaptador fora do registro nesta versao.
  // O teste NAO afrouxa: se cair, a resposta e tirar o adaptador do ADAPTERS (Passo 3), nunca mexer no veredito.
  it('keeps every registered adapter under the indeterminada cut on its own fixture', async () => {
    const rates: Record<string, number> = {}
    for (const g of GOLDENS) rates[g.stack] = rateOf(await auditProject(join(FIXTURES, g.fixture), { changedFiles: g.changedFiles }), g.stack)
    for (const [stack, rate] of Object.entries(rates)) expect({ stack, rate }).toEqual({ stack, rate: expect.any(Number) })
    expect(Object.values(rates).every((r) => r <= CUT)).toBe(true)
    expect(rates).toEqual({ nextjs: 0, rails: 2 / 13, 'node-ts': 1 / 6, python: 0 })   // registrar no MEMORY
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
```

> Se preferir provar contra o validator real em vez da copia das regexes: montar um `AuditContractV2`
> minimo com `payload.issues` e chamar `validateContract` (`skills/lib/subagent-contract.ts:283`),
> afirmando que nenhum erro tem `code: 'SECRET_PATTERN_DETECTED'`. Exige conhecer os campos
> obrigatorios do V2 — decidir na execucao; a copia e suficiente para o gate.

### Passo 3: Corte da Premissa 3 (so se alguma taxa > 0.25)

Esperado pelo planejamento: nenhuma (0 / 0.15 / 0.17 / 0). Se a medicao real de uma stack passar do
corte, o procedimento e — **sem tocar em `unresolved`, `opaque`, `isAuthName` ou qualquer veredito**:

1. Remover a entrada de `ADAPTERS` em `route-auth-adapters.ts`; acrescentar
   `SKIP_REASONS[<stack>] = '<stack>: adaptador experimental — taxa de indeterminada <N>/<M> acima do corte 0.25 na fixture; fora do registro nesta versao'`.
2. Cabecalho no adaptador: `// EXPERIMENTAL (Plano 04 fase-05, 2026-09-06): fora do registro — taxa de indeterminada <N>/<M> > 0.25 em tests/fixtures/route-auth-matrix/<fixture>. Entra quando o subset cobrir mais.`
   O arquivo, os testes unitarios e a fixture FICAM no repo (o trabalho nao e descartado; e medido).
3. `route-auth-adapters.test.ts`: ajustar `registers nextjs, rails, node-ts and python` e o teste de
   `selectAdapters` da stack (agora `skipped` com a razao).
4. Neste e2e: o golden da stack passa a afirmar `result.stacks` vazio e `skipped` com a razao (o
   golden de rotas continua vivo no teste unitario do adaptador).
5. `bun run generate:manifest` (adapters e o adaptador mudaram).
6. MEMORY: `DI-fase05-corte-<stack>` com a taxa medida, o motivo dominante de `indeterminada` (que
   forma sintatica) e o que faltaria no subset para voltar.

### Passo 4: Fechamento do MEMORY (a feature termina aqui)

Preencher `plano04/MEMORY.md`:
- Tabela "Taxa de `indeterminada` por stack" com os numeros REAIS e a decisao (mantido/cortado).
- "Notas para Planos Seguintes" com o minimo listado la (estado final, assinaturas publicas copiadas
  do codigo, RF-07, G2 por stack, Django coverage, monorepo por subdiretorio, DP-7 vs DP-3 do Plano 02,
  G24, `CLAUDE_PLUGIN_ROOT`, compound candidates).
- Metricas: 5/5; contagens reais por arquivo de teste; suite total.
- Status: concluido (data).

O orquestrador (nao o executor) atualiza `STATE.md`, `PLAN.md` (sizing 8.5h — DEV-plan-1) e decide
sobre mover a pasta para `completed/`; `bun run harness:validate` valida a estrutura de docs.

---

## Gotchas

- **G20 do plano:** `bun run harness:validate` depois de editar o MEMORY/README. `bun run test`
  inclui `tests/e2e/` — o gate roda na suite, nao so em `bun run test:e2e`.
- **G16 do plano:** Django NAO tem fixture nem entra na tabela do corte (taxa seria 100% por
  construcao: o adaptador nao promete cobertura Django). Registrar no MEMORY como divida, nao como corte.
- **G11 do plano:** o golden usa o dialeto de cada stack (`[id]`, `:id`, `{user_id}`) — nao
  "normalizar" para comparar entre stacks.
- **Local — o golden do Next foi transcrito do Plano 03 (DP-9), nao lido do disco:** conferir com
  `bun -e "console.log(require('./skills/security/lib/route-auth-nextjs').enumerateNextjsRoutes('tests/fixtures/route-auth-matrix/nextjs-minimal').routes.map(r=>r.method+' '+r.path))"`
  antes de fixar as 6 linhas. Se o Plano 03 (executado antes) tiver alterado a fixture, o golden segue
  o disco — e a fase registra a diferenca.
- **Local — ordem das issues no golden:** por stack (uma so nas fixtures single-stack) e, dentro da
  stack, por severidade e depois path (`SEVERITY_ORDER` + `localeCompare`, inalterados). Os prefixos
  `ROUTE-00N severity [stack]` bastam; o resto da description e coberto pelos testes unitarios.
- **Local — `rates` com fracoes:** `2 / 13` e `1 / 6` como expressoes no `toEqual` (nao literais
  decimais) — igualdade exata de float por construcao identica.
- **Local — este teste e LENTO relativo aos unitarios** (5 fixtures x `detectStack` + scans, x2 pela
  Premissa 3 e x1 pelos segredos ≈ 15 `auditProject`). Aceitavel (< 2s); nao paralelizar com
  `Promise.all` para manter a saida deterministica em falha.
- **Local — nao afrouxar para passar:** se um golden divergir, a pergunta e "o adaptador esta certo ou
  o golden?" — nunca "como faco o teste passar". Divergencia no adaptador volta para a fase dele (DI
  registrada); divergencia no golden e corrigida aqui com a linha exata citada.

---

## Verificacao

### TDD

- [ ] **RED (arquivo novo, por assertion):** escrever o teste com um golden deliberadamente incompleto
  (ex.: sem a rota `GET /legacy ...` no Rails) e ver `bun test tests/e2e/route-auth-four-stacks.test.ts -t 'rails'`
  FALHAR com `Expected length: 12, Received length: 13` — prova que o golden e comparado inteiro;
  completar o golden
- [ ] **GREEN:** `bun test tests/e2e/route-auth-four-stacks.test.ts` → `6 pass, 0 fail`

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED (corte da Premissa 3):** mutar temporariamente `CUT = 0.10` → `keeps every
      registered adapter under the indeterminada cut` FALHA para `rails` (0.15) e `node-ts` (0.17) —
      prova que o corte e real e que a resposta prevista e remover do registro, nao mexer no veredito;
      restaurar `0.25`
- [ ] **CA-08:** `bun test tests/e2e/route-auth-four-stacks.test.ts -t 'CA-08'` → 4 pass (Next, Rails,
      Express, Python) — o contrato unico serve as quatro
- [ ] **CA-11:** `-t 'CA-11'` → 1 pass
- [ ] **CA-05 / CA-10 de ponta a ponta:** `ROUTE-002 medium [node-ts] indeterminada: GET /${base}/reports`
      esta em `issues` (rota nao resolvida vira finding medium, nunca some, nunca `coberta`)
- [ ] **RF-05 de ponta a ponta:** toda issue tem `(arquivo:linha)` — assercao `every(/\(\S+:\d+\)/)` verde
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** As fixtures sao dados; nenhuma allowlist
      de projeto real foi tocada
- [ ] **Nenhum secret literal:** teste `never puts a secret-looking string` verde; alem disso
      `grep -rniE "SECRET\s*=|API_KEY\s*=" tests/fixtures/route-auth-matrix tests/e2e/route-auth-four-stacks.test.ts` → vazio (G19)

### Checklist

- [ ] **RED-check do orquestrador (obrigatorio):** com tudo verde, (1) em `route-auth-rails.ts`, fazer
      `match` sem `via:` virar rota GET normal (remover o `unresolved`) → o golden Rails FALHA em
      `verdicts` (`GET /legacy` esperado `indeterminada`, recebido `DESCOBERTA`) E a taxa muda para
      `1/13`, derrubando `keeps every registered adapter` no `toEqual(rates)`; restaurar. (2) Em
      `selectAdapters`, deixar de pular `node-ts` sem express → golden Next FALHA em `skipped`;
      restaurar. (3) Remover o `PREFIX` em `buildProjectIssues` → CA-11 FALHA; restaurar. (4) Trocar
      `CUT` para `0.10` (abuso acima) → FALHA; restaurar.
- [ ] `bun test tests/e2e/route-auth-four-stacks.test.ts` → `6 pass`
- [ ] Se houve corte: `bun run generate:manifest`; `route-auth-adapters.test.ts` ajustado; DI no MEMORY
- [ ] Se NAO houve corte: `git status --porcelain skills/` → vazio (esta fase nao toca lib)
- [ ] `bun run harness:validate` verde (docs)
- [ ] `bun run agents:contract` verde
- [ ] Testes passam: `bun run test` (suite ~2140; registrar o numero real)
- [ ] TypeCheck: `bun run typecheck`
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (G15)
- [ ] GT-fase02-1: N/A (arquivo de teste novo, sem lib nova)
- [ ] **Nenhum `.ts` novo em `tests/fixtures/`** (G1): `git status --porcelain tests/fixtures | grep '\.ts$'` → vazio
- [ ] Taxa de indeterminada por stack (4 numeros reais) na tabela do MEMORY, com decisao por stack
- [ ] MEMORY.md fechado: "Notas para Planos Seguintes" completa (RF-07, G2 por stack, Django coverage,
      monorepo por subdiretorio, DP-7 vs DP-3 do Plano 02, G24, `CLAUDE_PLUGIN_ROOT`, compound
      candidates); Metricas 5/5; Status: concluido
- [ ] Compound Decision Gate (CLAUDE.md do projeto): esta feature ensinou ao repo pelo menos quatro
      coisas duraveis (DEV-plan-2, DEV-plan-3, G22, G12) — sugerir ao dev rodar
      `/anti-vibe-coding:lessons-learned` (sugerir, nao invocar)

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/route-auth-four-stacks.test.ts` retorna `6 pass, 0 fail`
- `bun test tests/e2e/route-auth-four-stacks.test.ts -t 'CA-08|CA-11'` retorna `5 pass`
- `bun run test` retorna `0 fail`; `bun run typecheck`, `bun run agents:contract`, `bun run harness:validate` sem erro
- `grep -c "taxa" docs/exec-plans/active/2026-09-02-route-auth-matrix-audit/plano04/MEMORY.md` > 0 e a
  tabela da Premissa 3 tem os 4 numeros reais preenchidos

**Por humano:**
- Ler a tabela da Premissa 3 no MEMORY e confirmar a decisao por stack (mantido/cortado) — e a
  Decisao 5 do PRD ("as quatro juntas, mitigado por fixture por stack") fechando com evidencia
- Num projeto real de CADA stack (Next, Rails, Express, FastAPI), `/anti-vibe-coding:security` mostra
  na secao 11 do auditor as stacks detectadas, as puladas com razao e ao menos uma rota do projeto
  com veredito — **pendente de sync do cache do plugin (G1) e de `CLAUDE_PLUGIN_ROOT` (Plano 01)**;
  registrar como divida com a lista das stacks validadas

---

<!-- Gerado por /plan-feature em 2026-09-06 -->
