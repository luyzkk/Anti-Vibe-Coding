<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 05: Gap Rules — Cross Capabilities With Usage

**Plano:** 02 — Use Crossing & Tolerance Cleanup
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-04 (schema v2 + writer com shape rico — `handler: 'app/api/foo/route.ts:42'`)
**Visual:** false

---

## O que esta fase entrega

`gap-rules.crossCapabilitiesWithUsage(capabilities, projectRoot)` cruza cada capability declarada em `capabilities.json` com Grep no `projectRoot` por imports/referências de rota; capabilities sem nenhuma referência geram gap `severity:'nice'` com `suggestion: "declared but not referenced — remove or wire-up"`. Cumpre CA-05 da v6.3.0 (CA-08 do PRD v6.3.1).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/parity-audit/lib/gap-rules.ts` | Modify | Adicionar export `crossCapabilitiesWithUsage` (async) + type augmenting (`GapEntry` reutiliza `ParityGap`) |
| `skills/parity-audit/lib/parity-gaps-writer.ts` | Modify | `computeParityGaps` aceita 2º arg opcional `capabilities?: Capability[]` e concatena resultado de `crossCapabilitiesWithUsage` ao array de gaps |
| `tests/fixtures/use-crossing-fixture/` | Create | Fixture: `capabilities.json` com 2 capabilities (1 usada, 1 órfã) + arquivos-alvo importadores |
| `skills/parity-audit/lib/__tests__/gap-rules.test.ts` | Modify | Adicionar 2 testes (cases: usado / órfão) |

---

## Implementacao

### Passo 1: Estender shape de retorno em `gap-rules.ts`

`ParityGap` em `parity-gaps-writer.ts:8-14` já tem o shape esperado. Reusar — não criar `GapEntry` paralelo.

```typescript
// 2026-05-15 (Luiz/dev): cross-check capabilities declaradas vs uso real — CA-08 PRD v6.3.1
// (cumpre CA-05 v6.3.0). Pure-fn: I/O via fs.promises injetado por default. Sem deps externas.
// Aceita coverage_gaps por design — capabilities.json drift > silent miss.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Capability } from '../../lib/capabilities-writer'
import type { ParityGap } from './parity-gaps-writer'

export async function crossCapabilitiesWithUsage(
  capabilities: Capability[],
  projectRoot: string,
): Promise<ParityGap[]> {
  const gaps: ParityGap[] = []

  for (const cap of capabilities) {
    // 2026-05-15 (Luiz/dev): handler vem como 'app/api/foo/route.ts:42' (schema v2, Plano 01 fase-04).
    // Strip line suffix antes de gerar regex de import.
    const stripped = cap.handler.replace(/:\d+$/, '')

    const isReferenced = await grepReferences(stripped, cap.path, projectRoot)
    if (!isReferenced) {
      gaps.push({
        gap_id: `declared-not-used:${stripped}`,
        task_type: 'use-crossing',
        missing_capability: stripped,
        severity: 'nice',
        suggestion: 'declared but not referenced — remove or wire-up',
      })
    }
  }

  return gaps
}
```

### Passo 2: Helper `grepReferences` — cobertura de imports + rotas

```typescript
// 2026-05-15 (Luiz/dev): cobertura PRAGMATICA — imports estaticos/dinamicos + path literais de rota.
// Casos nao cobertos (re-export barrel sem path, fetch via variavel) caem em severity:nice — nao bloqueia.
// G1 do plano02: schema v2 traz handler com line suffix; ja foi strip em crossCapabilitiesWithUsage.

async function grepReferences(
  handlerPath: string,
  routePath: string,
  projectRoot: string,
): Promise<boolean> {
  const handlerName = path.basename(handlerPath).replace(/\.tsx?$/, '')
  const handlerDir = path.dirname(handlerPath)

  // Patterns:
  // 1. import ... from '<handlerPath>' ou '<handlerDir>' (resolve para barrel)
  // 2. require('<handlerPath>')
  // 3. dynamic: import('<handlerPath>')
  // 4. fetch('<routePath>') / fetch(`<routePath>`)
  // 5. href="<routePath>" ou Link href={`<routePath>`}
  const patterns = [
    new RegExp(`import\\s+[^;]*['"\`][^'"\`]*${escapeRegex(handlerName)}['"\`]`),
    new RegExp(`require\\s*\\(\\s*['"\`][^'"\`]*${escapeRegex(handlerName)}['"\`]`),
    new RegExp(`import\\s*\\(\\s*['"\`][^'"\`]*${escapeRegex(handlerName)}['"\`]`),
    new RegExp(`['"\`]${escapeRegex(routePath)}['"\`]`),
  ]

  const files = await collectSourceFiles(projectRoot)
  for (const file of files) {
    if (path.relative(projectRoot, file).replace(/\\/g, '/') === handlerPath) continue
    const content = await fs.readFile(file, 'utf-8').catch(() => null)
    if (content === null) continue
    if (patterns.some(p => p.test(content))) return true
  }
  return false
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function collectSourceFiles(root: string): Promise<string[]> {
  const out: string[] = []
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.')) continue
        await walk(full)
      } else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
        out.push(full)
      }
    }
  }
  await walk(root)
  return out
}
```

### Passo 3: Integrar em `computeParityGaps`

`parity-gaps-writer.ts:25-49` é o entry-point. Estender assinatura para aceitar capabilities opcionais e concatenar gaps.

```typescript
// 2026-05-15 (Luiz/dev): segundo arg opcional para use-crossing — CA-08 PRD v6.3.1.
// Backwards-compat: chamadas existentes sem capabilities continuam funcionando.

import { crossCapabilitiesWithUsage } from './gap-rules'
import type { Capability } from '../../lib/capabilities-writer'

export async function computeParityGaps(
  snapshot: ToolRegistrySnapshot,
  taskType: string | null,
  rules: GapRule[] = GAP_RULES,
  capabilities?: Capability[],
  projectRoot?: string,
): Promise<ParityGapsOutput> {
  const filtered = taskType ? rules.filter(r => r.task_type === taskType) : rules

  const ruleGaps: ParityGap[] = filtered
    .filter(rule => rule.detect(snapshot))
    .map(rule => ({
      gap_id: rule.gap_id,
      task_type: rule.task_type,
      missing_capability: rule.required_capability,
      severity: rule.severity,
      suggestion: rule.suggestion,
    }))

  const crossGaps: ParityGap[] =
    capabilities && projectRoot
      ? await crossCapabilitiesWithUsage(capabilities, projectRoot)
      : []

  const gaps = [...ruleGaps, ...crossGaps].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  )

  return {
    gaps,
    tool_registry_snapshot: snapshot,
    generated_at: new Date().toISOString(),
    schema_version: '2.0',
  }
}
```

> **Nota:** Quebra de sync→async em `computeParityGaps` é breaking change interno. `scripts/parity-audit.ts` (Plano 01 fase-03) já chama com `await` — sem regressão. Verificar callers via Grep antes de mergear.

### Passo 4: Fixture `tests/fixtures/use-crossing-fixture/`

Estrutura mínima:

```
tests/fixtures/use-crossing-fixture/
├── capabilities.json
├── app/
│   └── api/
│       ├── used-route/route.ts        ← referenciada (importada em components/Page.tsx)
│       └── orphan-route/route.ts      ← NÃO referenciada
└── components/
    └── Page.tsx                       ← contém: import { foo } from '../app/api/used-route/route'
```

`capabilities.json` (shape v2):
```json
{
  "capabilities": [
    {
      "kind": "route",
      "method": "GET",
      "path": "/api/used-route",
      "handler": "app/api/used-route/route.ts:5",
      "owner_path": "app/api/used-route/",
      "confidence": 1.0,
      "source": "ast"
    },
    {
      "kind": "route",
      "method": "POST",
      "path": "/api/orphan-route",
      "handler": "app/api/orphan-route/route.ts:8",
      "owner_path": "app/api/orphan-route/",
      "confidence": 1.0,
      "source": "ast"
    }
  ],
  "coverage_gaps": [],
  "generated_at": "2026-05-15T10:00:00.000Z",
  "profile_at_generation": "nextjs-app-router",
  "schema_version": "2.0"
}
```

### Passo 5: Tests RED→GREEN

`skills/parity-audit/lib/__tests__/gap-rules.test.ts` ganha 2 testes:

```typescript
// 2026-05-15 (Luiz/dev): RED→GREEN — CA-08 PRD v6.3.1
describe('crossCapabilitiesWithUsage', () => {
  const fixtureRoot = path.join(__dirname, '../../../../tests/fixtures/use-crossing-fixture')

  it('returns no gap when handler is imported elsewhere', async () => {
    const used: Capability = {
      kind: 'route', method: 'GET', path: '/api/used-route',
      handler: 'app/api/used-route/route.ts:5',
      owner_path: 'app/api/used-route/',
      confidence: 1.0, source: 'ast',
    }
    const gaps = await crossCapabilitiesWithUsage([used], fixtureRoot)
    expect(gaps).toEqual([])
  })

  it('returns severity:nice gap when handler has zero references', async () => {
    const orphan: Capability = {
      kind: 'route', method: 'POST', path: '/api/orphan-route',
      handler: 'app/api/orphan-route/route.ts:8',
      owner_path: 'app/api/orphan-route/',
      confidence: 1.0, source: 'ast',
    }
    const gaps = await crossCapabilitiesWithUsage([orphan], fixtureRoot)
    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toMatchObject({
      severity: 'nice',
      suggestion: 'declared but not referenced — remove or wire-up',
      gap_id: 'declared-not-used:app/api/orphan-route/route.ts',
    })
  })
})
```

---

## Gotchas

- **G1 do plano:** `crossCapabilitiesWithUsage` só funciona com shape v2 (handler com line suffix). Se rodar contra v1 fixture, regex `/:\d+$/` não casa e handler permanece com sufixo de linha — quebrando o match de `path.basename`.
- **G2 do plano:** Esta fase deve ser independente de fase-06 (stale wire-up). Não importar nada de `stale-detector.ts` aqui.
- **Local:** `collectSourceFiles` walk-aware — pular `node_modules`, `.git`, `discovery/` (gerados). Sem isso, fixture grande pode levar > 5s.
- **Local:** Re-exports barrel-style (`export { GET } from './route'`) NÃO são cobertos pelos patterns deste passo. PRD §Risk linha 192 documenta como aceitável — re-exports caem em gap severity:nice (falso-positivo conservador). NÃO adicionar pattern especial — manter cobertura simples.
- **Local:** `escapeRegex` é OBRIGATÓRIO — handler paths contêm `.` `/` `:` que são meta-caracteres regex. Sem escape, capability `app/api/x.y.ts` casaria contra qualquer string.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (nao por compilation error)
  - Comando: `bun run test -- --grep 'crossCapabilitiesWithUsage'`
  - Resultado esperado: `Expected [], received [{ gap_id: ... }]` ou similar (assertion failure)

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun run test -- --grep 'crossCapabilitiesWithUsage'`
  - Resultado esperado: `2 passed, 0 failed`

### Checklist

- [ ] Função exportada de `skills/parity-audit/lib/gap-rules.ts`: `crossCapabilitiesWithUsage`
- [ ] `computeParityGaps` aceita `capabilities?` + `projectRoot?` sem quebrar callers existentes
- [ ] Fixture criada em `tests/fixtures/use-crossing-fixture/` com 2 capabilities
- [ ] Re-exports barrel não geram falso-negativo crítico (test "used" passa)
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck`
- [ ] Harness: `bun run harness:validate` continua OK (nada de SKILL.md mudou)

---

## Criterio de Aceite

**Por maquina (mapeado a CA-08 do PRD v6.3.1):**
- `bun run test -- --grep 'crossCapabilitiesWithUsage'` retorna `2 passed, 0 failed`
- `bun run typecheck` exit 0
- Snippet de integração:
  ```bash
  bun run -e "
    import { computeParityGaps } from './skills/parity-audit/lib/parity-gaps-writer'
    import caps from './tests/fixtures/use-crossing-fixture/capabilities.json'
    const out = await computeParityGaps(
      { mcps: [], builtin_tools: [], subagents: [], source: 'composite' },
      null, undefined,
      caps.capabilities,
      './tests/fixtures/use-crossing-fixture'
    )
    console.log(out.gaps.filter(g => g.gap_id.startsWith('declared-not-used:')).length)
  "
  ```
  Resultado esperado: `1` (apenas `orphan-route` gera gap).

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
