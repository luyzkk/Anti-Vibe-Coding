<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-15 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 01: AST real em capabilities-writer (Tracer Bullet)

**Plano:** 01 — Honesty & Wire-up Core
**Sizing:** 2h
**Depende de:** Nenhuma (primeira fase — Tracer Bullet do Plano 01)
**Visual:** false

---

## O que esta fase entrega

`discoverNextjsAppRouterCapabilities()` declara `source: 'ast'` honestamente, porque `extractMethods()` agora usa traversal AST via `@typescript-eslint/parser` em vez de regex line-by-line — RF-MH-01 do PRD v6.3.1, CA-01 + CA-02.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `package.json` | Modify | Adicionar `@typescript-eslint/parser` ^7.0.0 e `@typescript-eslint/types` em `devDependencies` |
| `skills/lib/capabilities-writer.ts` | Modify | Substituir `extractMethods()` (linhas 38-50) por traversal AST. Linhas 4-22 (types) intactas — enum `CapabilitySource = 'ast' \| 'llm'` NÃO bumpado |
| `tests/fixtures/ast-route-fixtures/route-fn-declaration.ts` | Create | Fixture: `export function GET() { return Response.json({}) }` |
| `tests/fixtures/ast-route-fixtures/route-async-fn.ts` | Create | Fixture: `export async function POST() {}` |
| `tests/fixtures/ast-route-fixtures/route-arrow-const.ts` | Create | Fixture: `export const PUT = async () => {}` (regression positiva — regex original missava) |
| `tests/unit/capabilities-writer.ast.test.ts` | Create | 3 testes RED→GREEN cobrindo as 3 formas de export |

---

## Implementacao

### Passo 1 — Adicionar dependências em `package.json`

`devDependencies` recebe duas entradas (manter ordem alfabética):

```json
{
  "devDependencies": {
    "@types/bun": "^1.1.0",
    "@types/js-yaml": "^4.0.9",
    "@typescript-eslint/parser": "^7.0.0",
    "@typescript-eslint/types": "^7.0.0",
    "husky": "^9.1.7",
    "typescript": "^5.4.0"
  }
}
```

Rodar `bun install` após editar — gera lockfile entry.

Pinar `^7.0.0` é decisão G5 do README (compat TS 5.4). Bump maior fica para v6.4+.

### Passo 2 — Substituir `extractMethods()` em `capabilities-writer.ts:38-50`

Conteúdo atual a remover:

```typescript
function extractMethods(content: string): Array<{ method: string; line: number }> {
  const found: Array<{ method: string; line: number }> = []
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === undefined) continue
    const match = line.match(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/)
    if (match?.[1] !== undefined) {
      found.push({ method: match[1], line: i + 1 })
    }
  }
  return found
}
```

Substituir por traversal AST:

```typescript
// 2026-05-15 (Luiz/dev): AST real via @typescript-eslint/parser substitui regex line-by-line.
// Cumpre RF-MH-01 do PRD v6.3.1 (CA-01 + CA-02). Enum CapabilitySource permanece 'ast' | 'llm'
// — D1 do PRD / D4 do ADR-0020 intacto. Auditores downstream confiam em source === 'ast'.
import { parse } from '@typescript-eslint/parser'
import type { TSESTree } from '@typescript-eslint/types'

const HTTP_VERBS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])

function extractMethods(content: string, filePath: string): Array<{ method: string; line: number }> {
  const found: Array<{ method: string; line: number }> = []
  const isJsx = filePath.endsWith('.tsx')
  let ast: TSESTree.Program
  try {
    ast = parse(content, {
      loc: true,
      range: false,
      ecmaVersion: 2022,
      sourceType: 'module',
      jsx: isJsx,
    })
  } catch {
    // 2026-05-15 (Luiz/dev): parse error degrada silenciosamente — coverage_gaps já registra no caller
    return found
  }

  for (const node of ast.body) {
    if (node.type !== 'ExportNamedDeclaration' || node.declaration === null) continue
    const decl = node.declaration

    // case: export function GET() {} | export async function GET() {}
    if (decl.type === 'FunctionDeclaration' && decl.id !== null) {
      const name = decl.id.name
      if (HTTP_VERBS.has(name)) {
        found.push({ method: name, line: decl.loc.start.line })
      }
      continue
    }

    // case: export const GET = async () => {} | export const GET = function () {}
    if (decl.type === 'VariableDeclaration') {
      for (const declarator of decl.declarations) {
        if (declarator.id.type !== 'Identifier') continue
        const name = declarator.id.name
        if (!HTTP_VERBS.has(name)) continue
        const init = declarator.init
        if (init === null || init === undefined) continue
        if (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression') continue
        found.push({ method: name, line: declarator.loc.start.line })
      }
    }
  }

  return found
}
```

Atualizar a chamada em `discoverNextjsAppRouterCapabilities()` (linha 190) para passar `filePath`:

```typescript
// linha ~190 — assinatura nova recebe filePath para detectar .tsx
const methods = extractMethods(content, filePath)
```

### Passo 3 — Criar fixtures AST em `tests/fixtures/ast-route-fixtures/`

**`route-fn-declaration.ts`:**
```typescript
// 2026-05-15 (Luiz/dev): fixture CA-01 — função nomeada não-async
export function GET() {
  return new Response('ok')
}
```

**`route-async-fn.ts`:**
```typescript
// 2026-05-15 (Luiz/dev): fixture CA-01 — função async nomeada (caso comum em route.ts)
export async function POST(req: Request) {
  const body = await req.json()
  return new Response(JSON.stringify(body))
}
```

**`route-arrow-const.ts`:**
```typescript
// 2026-05-15 (Luiz/dev): fixture CA-02 — arrow assignment, regex original missava
export const PUT = async (req: Request) => {
  return new Response('updated')
}
```

### Passo 4 — Testes em `tests/unit/capabilities-writer.ast.test.ts`

```typescript
// 2026-05-15 (Luiz/dev): RED→GREEN para RF-MH-01 (CA-01 + CA-02 do PRD v6.3.1)
import { describe, expect, test } from 'bun:test'
import { discoverNextjsAppRouterCapabilities } from '../../skills/lib/capabilities-writer'
import path from 'node:path'

const FIXTURES_ROOT = path.join(import.meta.dir, '..', 'fixtures', 'ast-route-fixtures')

describe('AST extraction in capabilities-writer', () => {
  test('detects export function GET as source ast', async () => {
    // arrange: project com app/api/foo/route.ts = fixture route-fn-declaration.ts
    // (helper de setup copia fixture para tmpdir/app/api/foo/route.ts)
    const root = await setupRoute(FIXTURES_ROOT, 'route-fn-declaration.ts', 'foo')
    const out = await discoverNextjsAppRouterCapabilities(root)
    expect(out.capabilities.length).toBe(1)
    expect(out.capabilities[0]?.method).toBe('GET')
    expect(out.capabilities[0]?.source).toBe('ast')
    expect(out.capabilities[0]?.confidence).toBe(1.0)
    expect(out.capabilities[0]?.handler).toMatch(/route\.ts:\d+$/)
  })

  test('detects export async function POST as source ast', async () => {
    const root = await setupRoute(FIXTURES_ROOT, 'route-async-fn.ts', 'bar')
    const out = await discoverNextjsAppRouterCapabilities(root)
    expect(out.capabilities[0]?.method).toBe('POST')
    expect(out.capabilities[0]?.source).toBe('ast')
  })

  test('detects export const PUT arrow assignment as source ast (regression positive)', async () => {
    // 2026-05-15 (Luiz/dev): caso que regex original em capabilities-writer.ts:44 missava
    const root = await setupRoute(FIXTURES_ROOT, 'route-arrow-const.ts', 'baz')
    const out = await discoverNextjsAppRouterCapabilities(root)
    expect(out.capabilities[0]?.method).toBe('PUT')
    expect(out.capabilities[0]?.source).toBe('ast')
  })
})
```

Helper `setupRoute(fixturesRoot, fixtureName, routeSlug)` copia o fixture para `<tmpdir>/app/api/<routeSlug>/route.ts` e retorna o tmpdir path. Padrão já usado em outras suites — reaproveitar de `tests/helpers/` se existir, criar inline se não.

### Passo 5 — Benchmark (RNF Performance)

Adicionar smoke benchmark em `tests/perf/capabilities-writer.bench.ts` (ou inline com `test.skip` para CI):

```typescript
test('AST traversal of 50 route.ts under 500ms', async () => {
  // gerar 50 route.ts em tmpdir
  const root = await generate50Routes(FIXTURES_ROOT)
  const start = performance.now()
  await discoverNextjsAppRouterCapabilities(root)
  const elapsed = performance.now() - start
  expect(elapsed).toBeLessThan(500)
})
```

RNF do PRD: AST de 50 route.ts < 500ms (trade-off aceitável vs. < 100ms do regex anterior).

---

## Gotchas

- **G1 do plano:** Enum `CapabilitySource = 'ast' | 'llm'` em `skills/lib/capabilities-writer.ts:4` — NÃO bumpar para `'regex'`. D1 do PRD / D4 do ADR-0020. Tests devem assertar literal `'ast'`.
- **G5 do plano:** `@typescript-eslint/parser` ^7.0.0 — pinar caret-range para compat TS 5.4. Bump maior em v6.4+.
- **G7 do plano:** types vivem em `capabilities-writer.ts:4-22` (não em `capabilities-types.ts` — esse arquivo não existe). Imports de teste devem apontar para `capabilities-writer`.
- **Local — Edge case re-export:** `export { GET } from './handlers'` não é coberto pelo walk atual. Vai para `coverage_gaps` em `discoverNextjsAppRouterCapabilities()` com motivo "re-export not analyzed". Aceitar como gap declarado (mitigação documentada no Risks do PRD).
- **Local — JSX em .tsx:** route.tsx (raro mas legítimo em Next.js) requer `jsx: true` no parser. Detectar por `filePath.endsWith('.tsx')` no Passo 2.
- **Local — Parse error não-fatal:** se arquivo tiver sintaxe inválida, `parse()` lança. Try/catch retorna `[]` e `discoverNextjsAppRouterCapabilities()` já gera `coverage_gaps` entry "no HTTP method exports found" — comportamento mantido.

---

## Verificacao

### TDD

- [ ] **RED:** 3 testes escritos antes da implementação AST. Rodando contra regex atual, o teste `detects export const PUT arrow assignment` FALHA (assertion `capabilities.length === 1` retorna 0).
  - Comando: `bun run test -- --test-name-pattern "AST extraction"`
  - Resultado esperado: `1 fail, 2 pass` (os 2 que casam com regex atual passam por coincidência; o arrow falha)

- [ ] **GREEN:** Após substituir `extractMethods()` por AST walk, os 3 testes passam.
  - Comando: `bun run test -- --test-name-pattern "AST extraction"`
  - Resultado esperado: `3 pass, 0 fail`

### Checklist

- [ ] `bun install` adiciona `@typescript-eslint/parser` e `@typescript-eslint/types` sem warnings
- [ ] `bun run typecheck` limpo (sem erros TS 5.4) após mudança em `extractMethods()`
- [ ] Fixture `route-arrow-const.ts` produz capability com `method: 'PUT', source: 'ast', confidence: 1.0`
- [ ] `handler` contém número de linha real do AST node (regex `/route\.ts:\d+$/`)
- [ ] Benchmark 50 route.ts: `bun run test tests/perf/capabilities-writer.bench.ts` → elapsed < 500ms
- [ ] `bun run harness:validate` não regride (passa após mudança como antes)
- [ ] Teste de regressão das 6 skills profile-aware da v6.3.0: `bun run test` mantém 0 falhas (CA-11 do PRD v6.3.1)

---

## Criterio de Aceite

Mapeia para **CA-01** + **CA-02** do PRD v6.3.1.

**Por maquina:**
- `bun run test -- --test-name-pattern "AST extraction"` → `3 pass, 0 fail`
- `bun run typecheck` → exit 0
- Inspecionar output de teste: capability gerada para `route-fn-declaration.ts` tem `source === 'ast' && confidence === 1.0 && /route\.ts:\d+$/.test(handler) === true`

**Por humano:**
- N/A (sem UI).

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
