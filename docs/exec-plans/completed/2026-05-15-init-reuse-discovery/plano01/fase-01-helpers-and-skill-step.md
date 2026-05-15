<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-15 (Luiz/dev): FRESH_THRESHOLD_MS=24h — alinhado com PRD §Decisão #3`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Helpers Puros + Step reuse-discovery.0 Minimo

**Plano:** 01 — Reuse-Discovery Helper & SKILL Integration
**Sizing:** 2h
**Depende de:** Nenhuma (primeira fase — TRACER BULLET)
**Visual:** false

---

## O que esta fase entrega

Modulo publico `skills/init/lib/reuse-discovery.ts` com 3 helpers puros + constante `FRESH_THRESHOLD_MS`, e o branch `Step reuse-discovery.0` em `skills/init/SKILL.md` que ativa o atalho quando o cache esta fresh (`<24h`) — prova end-to-end que o atalho funciona antes de investir em observabilidade.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/reuse-discovery.ts` | Create | Modulo com `parseReuseDiscoveryFlag`, `readLastInitTimestamp`, `shouldReuseDiscovery`, `FRESH_THRESHOLD_MS` |
| `skills/init/lib/reuse-discovery.test.ts` | Create | Tests happy path para os 3 helpers (estilo espelhado de `audit-log.test.ts`) |
| `skills/init/SKILL.md` | Modify | Inserir bloco `Step reuse-discovery.0` IMEDIATAMENTE antes da linha 450 (`Passo 0 — Detectar Modo de Inicialização`) |

---

## Implementacao

### Passo 1: Criar `skills/init/lib/reuse-discovery.ts` com 3 helpers + constante

Cobre RF-MH-01, RF-MH-02, RF-MH-03. Decisoes D1 (nome da flag), D2 (source: `agents-log.json.started_at`), D3 (hardcoded threshold).

Snippet de referencia (assinaturas exatas + Comment Provenance G5):

```typescript
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { AgentsLog } from './audit-log'

// 2026-05-15 (Luiz/dev): FRESH_THRESHOLD_MS = 24h — alinhado com PRD §Decisão #3 (hardcoded, não configurável via JSON)
export const FRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000

/**
 * Detecta `--reuse-discovery` em ARGUMENTS da skill /init.
 * Mirror do pattern `parseDryRunFlag` em Step migrate.0 (skills/init/SKILL.md:47-53).
 */
export function parseReuseDiscoveryFlag(args: string[]): { reuseDiscovery: boolean } {
  return { reuseDiscovery: args.includes('--reuse-discovery') }
}

/**
 * Le discovery/agents-log.json e retorna o campo `started_at`.
 * Retorna null se: arquivo ausente, JSON inválido, ou campo `started_at` ausente/não-string.
 * Fallback seguro — nunca lança.
 */
export async function readLastInitTimestamp(projectRoot: string): Promise<string | null> {
  const logPath = path.join(projectRoot, 'discovery', 'agents-log.json')
  try {
    const raw = await fs.readFile(logPath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AgentsLog>
    if (typeof parsed.started_at === 'string') return parsed.started_at
    return null
  } catch {
    return null
  }
}

/**
 * Decide se o cache de discovery anterior pode ser reusado.
 * Retorna true APENAS quando cachedAt é ISO válido E Date.now() - cachedAt < FRESH_THRESHOLD_MS.
 * Retorna false em todos os outros casos (null, string vazia, ISO inválido, >=24h).
 *
 * Contrato publico estavel — consumido por PRD v6.3.0-adaptive-coaching / plano05/fase-01.
 */
export function shouldReuseDiscovery(cachedAt: string | null): boolean {
  if (cachedAt === null || cachedAt === '') return false
  const parsed = Date.parse(cachedAt)
  if (Number.isNaN(parsed)) return false
  return Date.now() - parsed < FRESH_THRESHOLD_MS
}
```

Observacoes:
- NAO usar `as` para `parsed.started_at` — type guard `typeof === 'string'` cobre (CLAUDE.md regra "Nunca use any. Evite as").
- `Date.parse` retorna `NaN` para strings invalidas — type guard via `Number.isNaN`.
- Import de `AgentsLog` para tipar `parsed` sem `any`.

### Passo 2: Criar `skills/init/lib/reuse-discovery.test.ts` com happy path

Espelhar estilo de `skills/init/lib/audit-log.test.ts` (linhas 1-16 — `mkdtemp`, `mkdir discovery/`, cleanup em `afterEach`).

Tests obrigatorios desta fase (RED -> GREEN para cada):

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { tmpdir } from 'node:os'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  parseReuseDiscoveryFlag,
  readLastInitTimestamp,
  shouldReuseDiscovery,
  FRESH_THRESHOLD_MS,
} from './reuse-discovery'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'reuse-discovery-test-'))
  await mkdir(path.join(tmp, 'discovery'), { recursive: true })
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('FRESH_THRESHOLD_MS', () => {
  it('equals 24 hours in milliseconds', () => {
    expect(FRESH_THRESHOLD_MS).toBe(24 * 60 * 60 * 1000)
  })
})

describe('parseReuseDiscoveryFlag', () => {
  it('returns reuseDiscovery true when flag present', () => {
    expect(parseReuseDiscoveryFlag(['--reuse-discovery']).reuseDiscovery).toBe(true)
  })

  it('returns reuseDiscovery false when flag absent', () => {
    expect(parseReuseDiscoveryFlag(['--dry-run']).reuseDiscovery).toBe(false)
  })

  it('returns reuseDiscovery false on empty args', () => {
    expect(parseReuseDiscoveryFlag([]).reuseDiscovery).toBe(false)
  })
})

describe('readLastInitTimestamp', () => {
  it('returns started_at when agents-log.json exists with valid shape', async () => {
    const iso = '2026-05-15T10:00:00.000Z'
    await writeFile(
      path.join(tmp, 'discovery', 'agents-log.json'),
      JSON.stringify({ run_id: 'r1', started_at: iso, entries: [] }),
      'utf-8',
    )
    expect(await readLastInitTimestamp(tmp)).toBe(iso)
  })

  it('returns null when agents-log.json does not exist', async () => {
    expect(await readLastInitTimestamp(tmp)).toBeNull()
  })
})

describe('shouldReuseDiscovery', () => {
  it('returns true when cachedAt is 1 hour ago', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(shouldReuseDiscovery(oneHourAgo)).toBe(true)
  })

  it('returns false when cachedAt is 25 hours ago (stale)', () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    expect(shouldReuseDiscovery(twentyFiveHoursAgo)).toBe(false)
  })

  it('returns false when cachedAt is null', () => {
    expect(shouldReuseDiscovery(null)).toBe(false)
  })
})
```

Esses tests cobrem CA-01 (fresh path), CA-03 (sem agents-log -> null -> false). Edge case CA-04 (JSON corrompido) eh fase-03.

### Passo 3: Inserir `Step reuse-discovery.0` em `skills/init/SKILL.md`

Localizacao EXATA: imediatamente antes da linha 450 (`### Passo 0 — Detectar Modo de Inicialização`). NAO dentro dele — D4 do PRD eh explicito.

Bloco a inserir (espelha pattern de `Step migrate.0` linhas 42-53, com `await import` para G1):

````markdown
### Step reuse-discovery.0: Parse --reuse-discovery flag (Plano 01 fase-01 — CA-01, CA-03)

<!-- Detecta --reuse-discovery em ARGUMENTS antes de qualquer outro passo.
     Quando presente e cache fresh (<24h), pula direto para Step 7 (Capabilities Discovery).
     Quando presente e cache stale/ausente, warn + cai no fluxo normal (Passo 0 abaixo).
     Quando ausente, comportamento byte-identical ao v6.2.x.
     D1/D4 do PRD: flag --reuse-discovery, antes do Passo 0 (não dentro). -->

```javascript
// 2026-05-15 (Luiz/dev): await import em vez de bun -e — GT-04 (bun -e com paths absolutos quebra no Windows)
const { parseReuseDiscoveryFlag, readLastInitTimestamp, shouldReuseDiscovery } = await import('./lib/reuse-discovery.ts')

const argsStr = typeof ARGUMENTS === 'string' ? ARGUMENTS : ''
const { reuseDiscovery } = parseReuseDiscoveryFlag(argsStr.split(/\s+/).filter(Boolean))

if (reuseDiscovery) {
  const cachedAt = await readLastInitTimestamp(process.cwd())
  if (shouldReuseDiscovery(cachedAt)) {
    console.log('[reuse-discovery] cache fresh — skipping Steps 0-1, jumping to Step 7 (Capabilities Discovery)')
    // fall through to Step 7 (fase-02 adicionará audit entry; fase-01 deixa só o skip)
    // IMPORTANT: subsequent Step 0 / Step 0.5 / Steps 1-6 must NOT execute when reuseDiscovery && fresh.
    // Fase-01 (tracer): apenas console.log + comentário direcional. Fase-02 implementa o skip real via control flow.
  } else {
    console.log('[reuse-discovery] cache stale or absent — running full init (Step 0 onward)')
  }
}
```

After this step, when `--reuse-discovery` is passed and cache is fresh, control should jump to Step 7. When stale or absent, control continues to `Passo 0 — Detectar Modo de Inicialização`.

---
````

Observacoes G5 (Comment Provenance): linhagem `// 2026-05-15 (Luiz/dev): ...` aparece UMA VEZ no topo do JS block. Comentarios `<!-- -->` em markdown NAO precisam — G5 aplica so a TS/JS.

### Passo 4: Validar SKILL.md nao quebrou

```bash
bun run harness:validate
```

Deve retornar sem erros — confirma que insercao do bloco nao quebrou parsing de outros steps (G2).

---

## Gotchas

- **G1 do plano (Windows + bun -e):** o bloco JS do Step reuse-discovery.0 usa `await import('./lib/reuse-discovery.ts')` exatamente como `Step migrate.0` linhas 64-66 — NAO usar `bun -e` com path absoluto.
- **G2 do plano (SKILL.md edit-fragility):** inserir EXATAMENTE antes da linha 450 atual. Se a linha mudou, buscar pelo texto literal `### Passo 0 — Detectar Modo de Inicialização` e inserir antes. Validar via `bun run harness:validate`.
- **G3 do plano (semantica de `started_at`):** o helper trata `started_at` como "ultimo init candidato" sem assumir semantica forte — teste `returns started_at when agents-log.json exists with valid shape` confirma o shape explicito.
- **Local (fase-01):** o tracer NAO implementa o skip real do control flow para Step 7 — apenas registra `console.log` direcional. Fase-02 fecha esse loop via audit entry + branch decisivo. Documentar isso em MEMORY.md ao concluir.

---

## Verificacao

### TDD

- [ ] **RED:** Test file `skills/init/lib/reuse-discovery.test.ts` criado importando helpers que ainda nao existem
  - Comando: `bun run test skills/init/lib/reuse-discovery.test.ts`
  - Resultado esperado: erro de import / tests falham por `undefined`

- [ ] **GREEN:** Modulo `reuse-discovery.ts` implementado, todos os tests da fase passam
  - Comando: `bun run test skills/init/lib/reuse-discovery.test.ts`
  - Resultado esperado: `10 passed, 0 failed` (3 testes para `parseReuseDiscoveryFlag` + 2 para `readLastInitTimestamp` + 3 para `shouldReuseDiscovery` + 1 para constante + 1 para shape de import = 10, ajustar quando escrever)

### Checklist

- [ ] Modulo `skills/init/lib/reuse-discovery.ts` exporta: `parseReuseDiscoveryFlag`, `readLastInitTimestamp`, `shouldReuseDiscovery`, `FRESH_THRESHOLD_MS`
- [ ] Modulo importa `AgentsLog` de `./audit-log` (nao redefine o tipo)
- [ ] Nenhum uso de `any` ou `as` no modulo (CLAUDE.md regra estrita)
- [ ] `Step reuse-discovery.0` inserido em SKILL.md ANTES de `Passo 0 — Detectar Modo de Inicialização` (D4)
- [ ] JS block do Step usa `await import` (G1, nao `bun -e`)
- [ ] Test file espelha estilo de `skills/init/lib/audit-log.test.ts` (mkdtemp + mkdir discovery + cleanup)
- [ ] Tests passam: `bun run test skills/init/lib/reuse-discovery.test.ts`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck OK (se configurado): `bun run typecheck`
- [ ] Harness valida SKILL.md: `bun run harness:validate`

---

## Criterio de Aceite

Cobre CA-01 (parcial — happy path do helper) e CA-03 (sem agents-log -> null -> false).

**Por maquina:**
- `bun run test skills/init/lib/reuse-discovery.test.ts` retorna `0 failed`
- `bun run harness:validate` retorna exit 0 apos edit do SKILL.md
- `grep -n 'parseReuseDiscoveryFlag\|readLastInitTimestamp\|shouldReuseDiscovery\|FRESH_THRESHOLD_MS' skills/init/lib/reuse-discovery.ts` retorna >=4 linhas (exports presentes)

**Por humano:**
- Leitura do `Step reuse-discovery.0` em SKILL.md mostra o JS block exato com `await import` e console.logs distintos para fresh vs stale.

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
