# Fase 01: AST Parser — Next.js App Router

**Plano:** Plano 02 ([README](./README.md))
**Sizing:** ~1.5h
**Visual:** false
**Status:** pendente

---

## Objetivo

Criar `skills/lib/capabilities-writer.ts` com a função `discoverNextjsAppRouterCapabilities`. Esta é a tracer bullet do Plano 02: descobre rotas HTTP em projetos Next.js App Router via regex em `app/**/route.ts`, sem nenhuma biblioteca AST.

---

## Arquivos Afetados

| Arquivo | Operação |
|---|---|
| `skills/lib/capabilities-writer.ts` | Criar |
| `skills/lib/__tests__/capabilities-writer.test.ts` | Criar |

---

## Pre-trabalho

Antes de escrever qualquer linha de código:

1. Verificar que `skills/lib/stale-detector.ts` existe (Plano 01 fase-04). Se não existir, criar stub temporário e registrar em MEMORY.md.
2. Verificar package.json: confirmar ausência de `ts-morph` ou qualquer AST library. Usar somente `node:fs/promises` e `node:path`.
3. Verificar o import path correto de `stale-detector.ts` para o import em `capabilities-writer.ts`.

---

## Tipos (topo do arquivo)

```typescript
export type CapabilitySource = 'ast' | 'llm'

export type Capability = {
  kind: 'route'
  method: string
  path: string
  handler: string   // "app/api/checkout/route.ts:14"
  owner_path: string // "app/api/checkout/"
  confidence: number // 0..1
  source: CapabilitySource
}

export type CapabilitiesOutput = {
  capabilities: Capability[]
  coverage_gaps: string[]
  generated_at: string   // ISO 8601
  profile_at_generation: string
  schema_version: '1.0'
}
```

Estes tipos são os únicos exports de tipo nesta fase. `discoverMvcFlatCapabilities` e `discoverCapabilities` chegam na fase-02.

---

## Implementação

### Finder recursivo de route files

```typescript
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

async function findRouteFiles(appDir: string): Promise<string[]> {
  const results: string[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.name === 'route.ts' || entry.name === 'route.tsx') results.push(full)
    }
  }

  await walk(appDir).catch(() => {})
  return results
}
```

Notas:
- `.catch(() => [])` no `readdir` garante que pastas sem permissão de leitura não quebram a recursão.
- `.catch(() => {})` no `walk` externo garante que `app/` inexistente retorna array vazio sem throw.
- Captura tanto `route.ts` quanto `route.tsx` (G4: projetos com JSX no app router).

### Extração de métodos HTTP

```typescript
function extractMethods(content: string): Array<{ method: string; line: number }> {
  const results: Array<{ method: string; line: number }> = []
  content.split('\n').forEach((line, i) => {
    const match = line.match(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/)
    if (match) results.push({ method: match[1], line: i + 1 })
  })
  return results
}
```

Notas:
- Regex captura `export function GET` e `export async function POST`.
- `i + 1` porque `split('\n').forEach` é 0-indexed mas números de linha são 1-indexed.
- Não captura arrow functions (`export const GET = async () => ...`). Se necessário em versão futura, adicionar segundo regex — não agora.

### Conversão de file path para API path

```typescript
function toApiPath(filePath: string, projectRoot: string): string {
  const rel = path.relative(projectRoot, filePath)
  // "app/api/checkout/route.ts" → "/api/checkout"
  const noApp = rel.replace(/^app[/\\]/, '')
  const noRoute = noApp.replace(/[/\\]route\.tsx?$/, '')
  return '/' + noRoute.replace(/\\/g, '/')
}
```

Notas:
- `[/\\]` cobre separadores Windows e Unix — necessário em ambiente Windows (ver env).
- `route\.tsx?$` captura tanto `.ts` quanto `.tsx`.
- Resultado sempre começa com `/`.

### Função principal exportada

```typescript
export async function discoverNextjsAppRouterCapabilities(
  projectRoot: string
): Promise<CapabilitiesOutput> {
  const appDir = path.join(projectRoot, 'app')
  const routeFiles = await findRouteFiles(appDir)

  if (routeFiles.length === 0) {
    return {
      capabilities: [],
      coverage_gaps: [`app/ folder not found or empty — no routes discovered`],
      generated_at: new Date().toISOString(),
      profile_at_generation: 'nextjs-app-router',
      schema_version: '1.0',
    }
  }

  const capabilities: Capability[] = []
  const coverage_gaps: string[] = []

  for (const filePath of routeFiles) {
    const content = await readFile(filePath, 'utf-8').catch(() => null)
    if (!content) {
      coverage_gaps.push(`${path.relative(projectRoot, filePath)} — read failed`)
      continue
    }

    const methods = extractMethods(content)
    if (methods.length === 0) {
      coverage_gaps.push(`${path.relative(projectRoot, filePath)} — no HTTP method exports found`)
      continue
    }

    const apiPath = toApiPath(filePath, projectRoot)
    const ownerPath = path.dirname(path.relative(projectRoot, filePath)).replace(/\\/g, '/') + '/'

    for (const { method, line } of methods) {
      capabilities.push({
        kind: 'route',
        method,
        path: apiPath,
        handler: `${path.relative(projectRoot, filePath).replace(/\\/g, '/')}:${line}`,
        owner_path: ownerPath,
        confidence: 1.0,
        source: 'ast',
      })
    }
  }

  return {
    capabilities,
    coverage_gaps,
    generated_at: new Date().toISOString(),
    profile_at_generation: 'nextjs-app-router',
    schema_version: '1.0',
  }
}
```

---

## Estrutura do arquivo final (fase-01)

```
// capabilities-writer.ts — fase-01
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
// stale-detector import (apenas warning, nunca throw)

// Types: CapabilitySource, Capability, CapabilitiesOutput

// Internal: findRouteFiles()
// Internal: extractMethods()
// Internal: toApiPath()

// Export: discoverNextjsAppRouterCapabilities()
```

Fase-02 adicionará `findMvcRouteFiles`, `discoverMvcFlatCapabilities` e `discoverCapabilities` neste mesmo arquivo.

---

## Testes (TDD — escrever primeiro)

Arquivo: `skills/lib/__tests__/capabilities-writer.test.ts`

Comando para rodar: `bun test skills/lib/__tests__/capabilities-writer.test.ts`

### Setup

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { discoverNextjsAppRouterCapabilities } from '../capabilities-writer'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'caps-test-'))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})
```

### Caso 1: "discovers GET and POST from a single route file"

Fixture: `app/api/checkout/route.ts` com `export async function GET` na linha 5 e `export function POST` na linha 14.

Assertions:
- `capabilities.length` === 2
- Ambas com `path: '/api/checkout'`
- Ambas com `source: 'ast'`
- Ambas com `confidence: 1.0`
- GET com `handler` contendo `:5`
- POST com `handler` contendo `:14`
- `coverage_gaps` === []

### Caso 2: "returns coverage_gap when app/ folder does not exist"

Fixture: tmpDir sem pasta `app/`.

Assertions:
- `capabilities` === []
- `coverage_gaps.length` === 1
- `coverage_gaps[0]` contém `'app/ folder not found or empty'`
- `profile_at_generation` === `'nextjs-app-router'`
- `schema_version` === `'1.0'`

### Caso 3: "handles route.tsx files correctly"

Fixture: `app/dashboard/route.tsx` com `export function GET`.

Assertions:
- `capabilities.length` === 1
- `capabilities[0].path` === `'/dashboard'`
- `capabilities[0].handler` contém `'route.tsx:'`

### Caso 4: "extracts line numbers correctly in handler field"

Fixture: `app/api/users/route.ts` com conteúdo onde `export async function DELETE` está na linha 22 (adicionar 21 linhas de comentário antes).

Assertions:
- `capabilities[0].handler` termina com `:22`
- Formato: `'app/api/users/route.ts:22'`

### Caso 5: "adds coverage_gap for route file with no HTTP method exports"

Fixture: `app/api/empty/route.ts` com conteúdo que não tem exports HTTP.

Assertions:
- `capabilities` === []
- `coverage_gaps[0]` contém `'no HTTP method exports found'`

---

## Verificacao

- [ ] Todos os 5 testes de fase-01 passam: `bun test skills/lib/__tests__/capabilities-writer.test.ts`
- [ ] Typecheck sem erros: `bun run typecheck` (se configurado no package.json)
- [ ] Lint limpo: `bun run lint`
- [ ] route.ts com GET+POST → 2 capabilities com path correto e source `'ast'`
- [ ] projeto sem app/ → coverage_gap no output, capabilities vazio
- [ ] `schema_version` é string `'1.0'` (não número)
- [ ] `generated_at` é ISO 8601 válido
- [ ] Sem imports de ts-morph ou qualquer AST library

---

## Gotchas Específicos desta Fase

- **G1 aplicado aqui:** se tentar `import { Project } from 'ts-morph'`, o build vai explodir. Regex puro.
- **Separadores de path:** `path.relative()` no Windows retorna `app\api\checkout\route.ts`. Todo output de path deve ter `.replace(/\\/g, '/')` antes de compor strings de resultado.
- **`generated_at` não-determinístico nos testes:** não testar o valor exato de `generated_at`. Testar apenas que é uma string não-vazia ou que `Date.parse(result.generated_at)` não retorna NaN.
- **stale-detector.ts:** importar mas não bloquear resultado. Se checksum falhar (stale-detector.ts não existe ainda), o teste não deve quebrar — o import deve ser lazy ou protegido com try/catch no nível do módulo.
