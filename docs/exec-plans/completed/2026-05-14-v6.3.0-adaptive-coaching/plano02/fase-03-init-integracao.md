# Fase 03: /init Integration + Audit

**Plano:** Plano 02 ([README](./README.md))
**Sizing:** ~1h
**Visual:** false
**Status:** pendente
**Depende de:** fase-02 ✓

---

## Objetivo

Integrar `discoverCapabilities` no fluxo do `/init` (SKILL.md), escrever `discovery/capabilities.json` após a detecção de arquitetura, validar contra schema existente (soft-fail), e registrar audit entry em `discovery/agents-log.json` via `AuditLogWriter`. Criar smoke test de integração.

---

## Arquivos Afetados

| Arquivo | Operação |
|---|---|
| `skills/init/SKILL.md` | Modificar — adicionar step de capabilities discovery |
| `skills/lib/__tests__/capabilities-writer-integration.test.ts` | Criar |

---

## Pre-trabalho

1. Reler `skills/init/SKILL.md` completo. Identificar o número exato do step "Detect Architecture Profile" e do step seguinte. O novo step vai ENTRE eles.
2. Inspecionar `skills/init/lib/audit-log.ts` para:
   - Assinatura do construtor de `AuditLogWriter`
   - Método de append (ex: `.append()`, `.write()`, `.log()`)
   - Se requer `run_id` e onde buscá-lo (provavelmente de `inventory.json`)
3. Confirmar path correto de `discovery/agents-log.json` no contexto do `/init`.
4. Reler fase-01 e fase-02 MEMORY.md antes de editar qualquer arquivo.

---

## Step a adicionar em `skills/init/SKILL.md`

Inserir APÓS "Step 4 — Detect Architecture Profile", ANTES do step seguinte (verificar número real antes de editar).

```markdown
## Step X — Capabilities Discovery

Runs AFTER architecture profile is detected and written to manifest.

1. Read detected profile from manifest: `profile = readArchitectureProfile(projectRoot)?.profile ?? 'unknown-mixed'`
2. Call `discoverCapabilities(projectRoot, profile)` from `skills/lib/capabilities-writer.ts`
3. Write output to `{projectRoot}/discovery/capabilities.json` (JSON.stringify with 2-space indent)
4. Validate written file against `discovery/_schemas/capabilities-v1.schema.json` (soft-fail: warn if invalid, don't abort /init)
5. Append audit entry to `discovery/agents-log.json` via `AuditLogWriter`:
   ```json
   {
     "timestamp": "<ISO 8601>",
     "subagent_id": "capabilities-discovery",
     "input_paths": ["app/**", "routes/**"],
     "output_struct": {
       "capabilities_count": <N>,
       "coverage_gaps_count": <N>,
       "profile": "<detected profile>",
       "schema_version": "1.0"
     },
     "duration_ms": <elapsed>,
     "retry_count": 0
   }
   ```
6. If coverage_gaps is non-empty: log warning to user:
   "Capabilities discovery: {N} routes found, {M} coverage gaps. Run /init --refresh if routes change."
7. If all capabilities empty AND coverage_gaps present: warn user:
   "Capabilities discovery found no routes. Consider running /init --refresh after adding routes."

Note: This step is SILENT if profile is unknown-mixed — adds empty capabilities.json with coverage_gap.
Note: NEVER abort /init if this step fails — soft-fail only.
```

### Implementação do step em código (pseudo-TypeScript para o executor do SKILL.md)

```typescript
// Wrap entire step in try/catch — soft-fail is non-negotiable
try {
  const startMs = Date.now()

  const profile = readArchitectureProfile(projectRoot)?.profile ?? 'unknown-mixed'
  const output = await discoverCapabilities(projectRoot, profile)

  // Write capabilities.json
  const capsPath = path.join(projectRoot, 'discovery', 'capabilities.json')
  await writeFile(capsPath, JSON.stringify(output, null, 2), 'utf-8')

  // Soft-validate against schema (warn only)
  try {
    const schemaPath = path.join(projectRoot, 'discovery', '_schemas', 'capabilities-v1.schema.json')
    const schema = JSON.parse(await readFile(schemaPath, 'utf-8'))
    // Basic shape check (no ajv dependency — just required fields)
    if (!output.schema_version || output.schema_version !== '1.0') {
      console.warn('[capabilities-discovery] schema_version mismatch — check capabilities-v1.schema.json')
    }
  } catch {
    // schema not found or parse error — continue silently
  }

  // Audit entry
  const auditWriter = new AuditLogWriter(projectRoot) // check actual constructor
  await auditWriter.append({
    timestamp: new Date().toISOString(),
    subagent_id: 'capabilities-discovery',
    input_paths: ['app/**', 'routes/**'],
    output_struct: {
      capabilities_count: output.capabilities.length,
      coverage_gaps_count: output.coverage_gaps.length,
      profile,
      schema_version: '1.0',
    },
    duration_ms: Date.now() - startMs,
    retry_count: 0,
  })

  // User-facing warnings (text output, not stderr)
  if (output.coverage_gaps.length > 0) {
    if (output.capabilities.length === 0) {
      // Warn: no routes found at all
    } else {
      // Warn: some gaps
    }
  }
} catch (err) {
  // Log warning but DO NOT rethrow — /init must continue
  console.warn('[capabilities-discovery] step failed, skipping:', err)
}
```

**IMPORTANTE:** O pseudo-código acima é referência de intenção. O executor DEVE verificar a assinatura real de `AuditLogWriter` em `skills/init/lib/audit-log.ts` antes de usar. Não assumir que o construtor aceita apenas `projectRoot`.

---

## Teste de Integração (smoke test)

Arquivo: `skills/lib/__tests__/capabilities-writer-integration.test.ts`

Comando: `bun test skills/lib/__tests__/capabilities-writer-integration.test.ts`

### Setup

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { discoverCapabilities } from '../capabilities-writer'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'caps-int-'))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})
```

### Caso 1: "end-to-end: discoverCapabilities + JSON.stringify produces valid shape for nextjs project"

Fixture: projeto nextjs mínimo com `app/api/health/route.ts` contendo `export async function GET`.

Steps:
1. Chamar `discoverCapabilities(tmpDir, 'nextjs-app-router')`
2. Serializar com `JSON.stringify(result, null, 2)`
3. Parsear de volta com `JSON.parse`

Assertions:
- `parsed.schema_version` === `'1.0'` (string, não número)
- `parsed.capabilities` é array
- `parsed.capabilities[0].kind` === `'route'`
- `parsed.capabilities[0].source` === `'ast'`
- `parsed.coverage_gaps` é array
- `parsed.profile_at_generation` === `'nextjs-app-router'`
- `Date.parse(parsed.generated_at)` não é NaN (ISO 8601 válido)

### Caso 2: "output shape matches expected fields (basic schema compliance)"

Sem carregar o schema JSON real — verificar apenas os campos obrigatórios.

Fixture: qualquer projeto (pode ser empty).

Assertions para `output = await discoverCapabilities(tmpDir, 'nextjs-app-router')`:
- `typeof output.schema_version` === `'string'`
- `Array.isArray(output.capabilities)` === true
- `Array.isArray(output.coverage_gaps)` === true
- `typeof output.generated_at` === `'string'`
- `typeof output.profile_at_generation` === `'string'`

---

## Verificacao

- [ ] `bun test skills/lib/__tests__/capabilities-writer.test.ts` — todos verde (regressão fase-01+02)
- [ ] `bun test skills/lib/__tests__/capabilities-writer-integration.test.ts` — todos verde
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` sem erros (se configurado)
- [ ] SKILL.md editado com step correto (verificar posição em relação ao step real de detect-architecture)
- [ ] Step envolvido em try/catch — `/init` não aborta se step falhar
- [ ] Warnings ao usuário usam output de texto do Claude, não `console.error` nem stderr
- [ ] `AuditLogWriter` importado de `skills/init/lib/audit-log.ts` — não criado novo
- [ ] `discovery/_schemas/capabilities-v1.schema.json` não criado nem sobrescrito aqui
- [ ] audit entry tem `subagent_id: "capabilities-discovery"` (string exata)

---

## Gotchas Específicos desta Fase

**G-INT-01 — Posição exata do step no SKILL.md**
O SKILL.md do `/init` pode ter numeração não-sequencial ou steps com nomes diferentes do esperado. Reler o arquivo completo antes de editar. Inserir APÓS o step que chama `readArchitectureProfile` e escreve no manifest. NUNCA inserir antes — o profile precisa estar disponível.

**G-INT-02 — Assinatura real do AuditLogWriter**
A documentação do plano assume `new AuditLogWriter(projectRoot)` mas a implementação real pode ter assinatura diferente (ex: `new AuditLogWriter({ projectRoot, runId })`). Verificar `skills/init/lib/audit-log.ts` antes de qualquer chamada. Usar a assinatura correta — não adaptar o construtor.

**G-INT-03 — Soft-fail é obrigatório e inegociável**
Todo o step deve estar em `try { ... } catch { console.warn(...) }`. O PRD diz "Sem impacto na latência de skills" e "NEVER abort /init". Se a descoberta de capabilities falhar (projeto sem `app/`, sem `routes/`, permissão negada), o `/init` continua normalmente.

**G-INT-04 — Warnings ao usuário são texto do Claude**
A mensagem sobre coverage gaps deve ser emitida como output de texto do agente (resposta ao usuário), não via `console.error()`, `process.stderr`, ou qualquer mecanismo de log que vai para stderr. Em SKILL.md, escrever como instrução ao agente: "Tell the user: ...".

**G-INT-05 — schema_version string "1.0" na validação**
A validação soft deve checar `output.schema_version === '1.0'` (string). Se a função retornar `schema_version: 1.0` (number) por bug, a validação deve emitir warning. Isso cobre o G6 do README.

**G-INT-06 — discovery/ já existe quando este step roda**
Ao escrever `capabilities.json`, a pasta `discovery/` já foi criada pelo `/init` em steps anteriores (Plano 01 fase-02). Não chamar `mkdir` antes do `writeFile` — assumir que a pasta existe. Se não existir (bug upstream), o `writeFile` vai falhar e o `try/catch` vai capturar.

**G-INT-07 — Não serializar instâncias de Error no audit entry**
Se `discoverCapabilities` lançar (não deveria, mas por segurança), não tentar serializar o Error no `output_struct`. O campo `output_struct` deve conter apenas dados válidos — pular o append do audit se o discover falhou e foi pego pelo catch externo.
