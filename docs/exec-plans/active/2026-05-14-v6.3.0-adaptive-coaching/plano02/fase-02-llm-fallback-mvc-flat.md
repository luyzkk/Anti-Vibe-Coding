# Fase 02: LLM Fallback — MVC Flat

**Plano:** Plano 02 ([README](./README.md))
**Sizing:** ~1h
**Visual:** false
**Status:** pendente
**Depende de:** fase-01 ✓

---

## Objetivo

Adicionar descoberta de rotas para projetos `mvc-flat` (Express.js-style `routes/` folders) ao `capabilities-writer.ts`. Marcar como `source: "llm"` e `confidence: 0.7` por ser heurístico não-determinístico. Adicionar dispatcher `discoverCapabilities(projectRoot, profile)` que roteia para a função correta por perfil.

---

## Arquivos Afetados

| Arquivo | Operação |
|---|---|
| `skills/lib/capabilities-writer.ts` | Modificar — adicionar `discoverMvcFlatCapabilities`, `discoverCapabilities`, `MVC_ROUTE_REGEX` |
| `skills/lib/__tests__/capabilities-writer.test.ts` | Modificar — adicionar describe block para mvc-flat e dispatcher |

---

## Pre-trabalho

1. Reler `skills/lib/capabilities-writer.ts` completo antes de editar (regra de integridade de edições).
2. Reler `skills/lib/__tests__/capabilities-writer.test.ts` completo antes de modificar.
3. Confirmar que fase-01 está 100% verde: `bun test skills/lib/__tests__/capabilities-writer.test.ts`.

---

## Implementação

### Regex MVC — Express.js style

```typescript
const MVC_ROUTE_REGEX = /router\.(get|post|put|patch|delete|head)\s*\(\s*['"`](\/[^'"`]*?)['"`]/gi
```

Notas:
- Flag `g` necessária para `matchAll`.
- Flag `i` para capturar `router.GET(` (pouco comum mas válido).
- Captura grupo 1: método HTTP em lowercase → converter com `.toUpperCase()`.
- Captura grupo 2: o path da rota, incluindo o `/` inicial — regex garante que começa com `/`.
- **Não captura** `app.get()` (Express app direto). Ver gotcha G-MVC-01 abaixo.

### Finder de arquivos MVC

```typescript
async function findMvcRouteFiles(projectRoot: string): Promise<string[]> {
  const candidates = [
    path.join(projectRoot, 'routes'),
    path.join(projectRoot, 'src', 'routes'),
    path.join(projectRoot, 'app', 'routes'),
  ]

  const results: string[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) results.push(full)
    }
  }

  for (const candidate of candidates) {
    await walk(candidate)
  }

  return results
}
```

Notas:
- Testa os 3 candidatos mais comuns. Se nenhum existir, retorna array vazio (`.catch(() => [])` no `readdir` garante isso).
- Inclui `.js` além de `.ts` — projetos mvc-flat podem ser JavaScript puro.
- Não deduplica se `app/routes/` e `routes/` coexistirem — improvável em projetos reais, aceitável.

### Função principal mvc-flat

```typescript
export async function discoverMvcFlatCapabilities(
  projectRoot: string
): Promise<CapabilitiesOutput> {
  const routeFiles = await findMvcRouteFiles(projectRoot)

  if (routeFiles.length === 0) {
    return {
      capabilities: [],
      coverage_gaps: ['routes/ and src/routes/ folders not found — mvc-flat discovery skipped'],
      generated_at: new Date().toISOString(),
      profile_at_generation: 'mvc-flat',
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

    const matches = [...content.matchAll(MVC_ROUTE_REGEX)]
    if (matches.length === 0) {
      coverage_gaps.push(`${path.relative(projectRoot, filePath)} — no router.METHOD() calls found`)
      continue
    }

    for (const match of matches) {
      const method = match[1].toUpperCase()
      const routePath = match[2]

      // Find line number from match.index
      const matchIndex = match.index ?? 0
      const line = content.slice(0, matchIndex).split('\n').length
      const relPath = path.relative(projectRoot, filePath).replace(/\\/g, '/')

      capabilities.push({
        kind: 'route',
        method,
        path: routePath,
        handler: `${relPath}:${line}`,
        owner_path: path.dirname(relPath) + '/',
        confidence: 0.7,   // LLM-fallback: non-deterministic across frameworks
        source: 'llm',
      })
    }
  }

  return {
    capabilities,
    coverage_gaps,
    generated_at: new Date().toISOString(),
    profile_at_generation: 'mvc-flat',
    schema_version: '1.0',
  }
}
```

Notas:
- `content.slice(0, matchIndex).split('\n').length` calcula linha 1-indexed sem precisar de `lines` separado. Não declarar `const lines = content.split('\n')` — não é usado aqui.
- `confidence: 0.7` é hardcoded — não parametrizar (RF-CH-02 é Could Have).
- `source: 'llm'` porque regex cross-framework não é determinístico.

### Dispatcher por profile

```typescript
export async function discoverCapabilities(
  projectRoot: string,
  profile: string
): Promise<CapabilitiesOutput> {
  switch (profile) {
    case 'nextjs-app-router':
      return discoverNextjsAppRouterCapabilities(projectRoot)
    case 'mvc-flat':
      return discoverMvcFlatCapabilities(projectRoot)
    default:
      return {
        capabilities: [],
        coverage_gaps: [`profile '${profile}' not supported — best-effort coverage only`],
        generated_at: new Date().toISOString(),
        profile_at_generation: profile,
        schema_version: '1.0',
      }
  }
}
```

Notas:
- `switch` com `case` literals é preferido a hash map aqui porque cada case retorna uma Promise — hash map exigiria um tipo de função async que não simplifica nada.
- `default` retorna output válido com `coverage_gaps` — nunca lança exceção.
- Fase-03 chama `discoverCapabilities` diretamente com o profile detectado pelo `readArchitectureProfile`.

---

## Estrutura do arquivo final (após fase-02)

```
// capabilities-writer.ts — após fase-02
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
// stale-detector import

// Types: CapabilitySource, Capability, CapabilitiesOutput

// Internal: MVC_ROUTE_REGEX (const)
// Internal: findRouteFiles()        — nextjs
// Internal: extractMethods()        — nextjs
// Internal: toApiPath()             — nextjs
// Internal: findMvcRouteFiles()     — mvc-flat

// Export: discoverNextjsAppRouterCapabilities()
// Export: discoverMvcFlatCapabilities()
// Export: discoverCapabilities()    — dispatcher
```

---

## Testes (adicionar ao arquivo existente)

Arquivo: `skills/lib/__tests__/capabilities-writer.test.ts` (modificar — adicionar `describe` block)

Comando para rodar todos: `bun test skills/lib/__tests__/capabilities-writer.test.ts`

### Setup para mvc-flat

Reusar o mesmo `tmpDir` com `beforeEach`/`afterEach` já configurados. Criar fixtures de `routes/` dentro do `tmpDir` existente.

### Caso 1: "discovers GET route from Express-style router.get()"

Fixture: `routes/users.ts` com conteúdo:
```typescript
router.get('/users', async (req, res) => { ... })
router.post('/users', async (req, res) => { ... })
```

Assertions:
- `capabilities.length` === 2
- `capabilities[0].method` === `'GET'`
- `capabilities[0].path` === `'/users'`
- `capabilities[0].source` === `'llm'`
- `capabilities[0].confidence` === 0.7
- `capabilities[1].method` === `'POST'`

### Caso 2: "returns coverage_gap when no routes/ folder exists"

Fixture: tmpDir sem nenhuma pasta `routes/`, `src/routes/`, `app/routes/`.

Assertions:
- `capabilities` === []
- `coverage_gaps.length` === 1
- `coverage_gaps[0]` contém `'mvc-flat discovery skipped'`

### Caso 3: "discoverCapabilities routes to correct function by profile"

Dois sub-testes:
- `discoverCapabilities(tmpDir, 'nextjs-app-router')` → `profile_at_generation === 'nextjs-app-router'`
- `discoverCapabilities(tmpDir, 'mvc-flat')` → `profile_at_generation === 'mvc-flat'`

### Caso 4: "discoverCapabilities returns best-effort for unknown profile"

Fixture: qualquer tmpDir.

Assertions:
- `capabilities` === []
- `coverage_gaps[0]` contém `'not supported'`
- `profile_at_generation` === o profile passado (ex: `'unknown-mixed'`)
- `schema_version` === `'1.0'`

---

## Verificacao

- [ ] Todos os testes de fase-01 ainda passam (regressão)
- [ ] Todos os 4 novos testes de mvc-flat passam
- [ ] `bun test skills/lib/__tests__/capabilities-writer.test.ts` verde completo
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` sem erros (se configurado)
- [ ] `discoverCapabilities('mvc-flat')` retorna `source: 'llm'` e `confidence: 0.7`
- [ ] `discoverCapabilities('nextjs-app-router')` retorna `source: 'ast'` e `confidence: 1.0`
- [ ] dispatcher default case retorna output válido, não lança exceção
- [ ] `const lines` não declarado (variável morta) — lint deve pegar isso se declarado

---

## Gotchas Específicos desta Fase

**G-MVC-01 — app.METHOD() não coberto**
`MVC_ROUTE_REGEX` só captura `router.get(...)`, não `app.get(...)` (padrão Express quando sem Router). Se o projeto usar `app.get` diretamente, as rotas não serão descobertas. Adicionar variante se necessário:
```typescript
const APP_ROUTE_REGEX = /app\.(get|post|put|patch|delete|head)\s*\(\s*['"`](\/[^'"`]*?)['"`]/gi
```
Mas não incluir agora — aguardar evidência de uso real.

**G-MVC-02 — confidence 0.7 não configurável**
`confidence: 0.7` é literal hardcoded. RF-CH-02 (threshold configurável) está marcado como Could Have. Não criar parâmetro de configuração agora.

**G-MVC-03 — variável `lines` morta**
O snippet de referência no PRD declara `const lines = content.split('\n')` mas não usa. Remover da implementação real. O lint vai reportar `'lines' is declared but its value is never read`.

**G-MVC-04 — matchAll requer flag `g`**
`content.matchAll(MVC_ROUTE_REGEX)` lança `TypeError` se a regex não tiver flag `g`. A regex acima tem `gi`. Se remover qualquer flag acidentalmente, todos os testes de mvc-flat vão quebrar com TypeError.

**G-MVC-05 — path.dirname em relPath**
`path.dirname('routes/users.ts')` retorna `'routes'`. Logo `owner_path` será `'routes/'`. Isso é correto — o `owner_path` reflete o diretório do arquivo, não uma URL.
