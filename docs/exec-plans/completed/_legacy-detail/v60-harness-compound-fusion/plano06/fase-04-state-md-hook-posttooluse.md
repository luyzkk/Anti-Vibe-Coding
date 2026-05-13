<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 04: state-md-hook-posttooluse

**Plano:** 06 — Agent-Native (D31 CRUD + D32 STATE.md hook + D33 completion signal)
**Sizing:** 2h
**Depende de:** fase-03 (helper `regenerateStateMd` disponivel)
**Visual:** false

---

## O que esta fase entrega

`hooks/state-md-hook.cjs` escuta `PostToolUse` da Claude Code, filtra por paths relevantes (`docs/`, `TODO.md`), aplica rate-limit 30s via lock file e invoca `regenerateStateMd` async. Registrado em `hooks/hooks.json` (R15, CA-46).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/hooks/state-md-hook.cjs` | Create | Hook CJS para PostToolUse — filtra path, checa lock, chama generator |
| `anti-vibe-coding/hooks/hooks.json` | Modify | Adicionar entry para `state-md-hook.cjs` em PostToolUse |
| `anti-vibe-coding/hooks/state-md-hook.test.cjs` | Create | Suite de testes simulando chamadas de PostToolUse |
| `anti-vibe-coding/lib/state-md-lock.ts` | Create | Helper TS exportando `checkAndSetLock(projectRoot, ttlMs)` — reusavel se outros hooks precisarem do mesmo padrao |

---

## Implementacao

### Passo 1: Helper TS de lock (reusavel)

```typescript
// anti-vibe-coding/lib/state-md-lock.ts
// 2026-05-11 (Luiz/dev): lock global em ~/.claude/cache/state-md-last-run.json (06-A1)
// chave por projectRoot — projetos paralelos nao se bloqueiam mutuamente
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const LOCK_PATH = path.join(os.homedir(), '.claude', 'cache', 'state-md-last-run.json')

type LockEntry = { timestamp_ms: number }
type LockFile = Record<string, LockEntry> // key = path.resolve(projectRoot)

/**
 * Retorna true se passou MENOS de `ttlMs` desde a ultima chamada para este projectRoot.
 * Side-effect: se passou MAIS de ttlMs (ou nunca chamou), atualiza lock com agora.
 *
 * @returns `true` = should skip (recent run); `false` = should proceed (lock updated)
 */
export function shouldSkipByRateLimit(projectRoot: string, ttlMs: number): boolean {
  const key = path.resolve(projectRoot)
  const now = Date.now()

  let lock: LockFile = {}
  if (fs.existsSync(LOCK_PATH)) {
    try {
      lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf-8')) as LockFile
    } catch {
      // 2026-05-11 (Luiz/dev): lock corrompido — tratamos como ausente
      lock = {}
    }
  }

  const last = lock[key]?.timestamp_ms ?? 0
  if (now - last < ttlMs) {
    return true // skip
  }

  // Atualiza lock atomicamente (best-effort — write file)
  lock[key] = { timestamp_ms: now }
  ensureDir(path.dirname(LOCK_PATH))
  fs.writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2), 'utf-8')
  return false
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}
```

### Passo 2: Hook CJS

```javascript
// anti-vibe-coding/hooks/state-md-hook.cjs
// 2026-05-11 (Luiz/dev): D32/M13/CA-46/R15 — PostToolUse hook para STATE.md
// Filtra path -> rate-limit 30s -> regenera STATE.md async
const path = require('path')
const fs = require('fs')

const TTL_MS = 30 * 1000

// 2026-05-11 (Luiz/dev): patterns que disparam regeneracao (G4)
const RELEVANT_PATTERNS = [
  /[\\/]docs[\\/]compound[\\/].+\.md$/,
  /[\\/]docs[\\/]design-docs[\\/]ADR-.*\.md$/,
  /[\\/]docs[\\/]exec-plans[\\/](active|completed)[\\/].+\.md$/,
  /(^|[\\/])TODO\.md$/, // 06-A4: case-sensitive — usa basename exato 'TODO.md'
]

/**
 * Entry point chamada pelo Claude Code com input via stdin JSON.
 * Input: { tool: string, tool_input: { file_path?: string, ... }, project_root?: string }
 * Output: JSON em stdout (Claude Code aceita { success, message?, skipped? })
 */
function main() {
  let raw = ''
  process.stdin.setEncoding('utf-8')
  process.stdin.on('data', (chunk) => { raw += chunk })
  process.stdin.on('end', async () => {
    try {
      const input = JSON.parse(raw)
      const result = await handle(input)
      process.stdout.write(JSON.stringify(result))
    } catch (err) {
      // 2026-05-11 (Luiz/dev): hook falha = sessao continua (R15 — never block)
      process.stdout.write(JSON.stringify({ success: true, error: err.message }))
    }
  })
}

async function handle(input) {
  // 2026-05-11 (Luiz/dev): so escutamos PostToolUse de Edit/Write/MultiEdit
  const tool = input.tool || ''
  if (!['Edit', 'Write', 'MultiEdit'].includes(tool)) {
    return { success: true, skipped: 'wrong_tool' }
  }

  const filePath = input.tool_input?.file_path
  if (!filePath || typeof filePath !== 'string') {
    return { success: true, skipped: 'no_file_path' }
  }

  // 2026-05-11 (Luiz/dev): filtra por path (G4)
  const matches = RELEVANT_PATTERNS.some((re) => re.test(filePath))
  if (!matches) {
    return { success: true, skipped: 'path_not_relevant' }
  }

  const projectRoot = input.project_root || process.cwd()

  // 2026-05-11 (Luiz/dev): rate-limit 30s (G3/R15/CA-46)
  const { shouldSkipByRateLimit } = loadLockHelper()
  if (shouldSkipByRateLimit(projectRoot, TTL_MS)) {
    return { success: true, skipped: 'rate_limit' }
  }

  // 2026-05-11 (Luiz/dev): fire-and-forget regeneracao
  // Se falhar, log e continua — sessao nao bloqueia
  try {
    const { regenerateStateMd } = loadGenerator()
    await regenerateStateMd(projectRoot)
    return { success: true, regenerated: true }
  } catch (err) {
    return { success: true, error: err.message, regenerated: false }
  }
}

// 2026-05-11 (Luiz/dev): require lazy — hook deve ser leve quando skip ocorre
function loadLockHelper() {
  return require(path.resolve(__dirname, '..', 'lib', 'state-md-lock.ts'))
}
function loadGenerator() {
  return require(path.resolve(__dirname, '..', 'lib', 'state-md-generator.ts'))
}

if (require.main === module) main()

module.exports = { handle } // exportado para testes
```

**Nota:** Carregar `.ts` direto via `require` em CJS exige Bun runtime OR um loader. Se ambiente do hook eh Node puro, precisa transpilar `state-md-lock.ts` e `state-md-generator.ts` para `.cjs` ou usar `bun --bun` no shebang. **Politica:** hook eh executado pelo Claude Code que ja usa Bun nativamente (Plano 05 G8). Se Plano 05 estabeleceu padrao Node-puro, esta fase ajusta. Documentar como **ambiguity 06-A4 secundaria** se necessario.

### Passo 3: Atualizar `hooks/hooks.json`

```json
{
  "hooks": [
    /* ... entradas existentes ... */
    {
      "name": "state-md-hook",
      "event": "PostToolUse",
      "script": "hooks/state-md-hook.cjs",
      "description": "Regenerates docs/STATE.md after relevant file edits (rate-limited 30s)"
    }
  ]
}
```

### Passo 4: Suite de testes do hook

```javascript
// anti-vibe-coding/hooks/state-md-hook.test.cjs
const { describe, it, expect, beforeEach } = require('bun:test')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { handle } = require('./state-md-hook.cjs')

const FIXTURE = path.resolve(__dirname, '..', 'tests', 'fixtures', 'v6-state-fixture')
const LOCK_PATH = path.join(os.homedir(), '.claude', 'cache', 'state-md-last-run.json')

function resetLock() {
  if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH)
}

describe('state-md-hook', () => {
  beforeEach(() => resetLock())

  it('regenerates STATE.md when Edit touches docs/compound/', async () => {
    const result = await handle({
      tool: 'Edit',
      tool_input: { file_path: path.join(FIXTURE, 'docs/compound/2026-05-12-bar.md') },
      project_root: FIXTURE,
    })
    expect(result.regenerated).toBe(true)
    expect(fs.existsSync(path.join(FIXTURE, 'docs/STATE.md'))).toBe(true)
  })

  it('skips when file outside relevant patterns (e.g., src/foo.ts)', async () => {
    const result = await handle({
      tool: 'Edit',
      tool_input: { file_path: path.join(FIXTURE, 'src/foo.ts') },
      project_root: FIXTURE,
    })
    expect(result.skipped).toBe('path_not_relevant')
  })

  it('skips when tool is Bash (wrong tool)', async () => {
    const result = await handle({
      tool: 'Bash',
      tool_input: { command: 'ls' },
      project_root: FIXTURE,
    })
    expect(result.skipped).toBe('wrong_tool')
  })

  it('rate-limits 2 calls within 5s (only first regenerates)', async () => {
    const input = {
      tool: 'Edit',
      tool_input: { file_path: path.join(FIXTURE, 'docs/compound/2026-05-12-bar.md') },
      project_root: FIXTURE,
    }
    const first = await handle(input)
    expect(first.regenerated).toBe(true)
    const second = await handle(input)
    expect(second.skipped).toBe('rate_limit')
  })

  it('matches TODO.md at project root', async () => {
    // criar TODO.md no fixture se nao existe
    const todoPath = path.join(FIXTURE, 'TODO.md')
    if (!fs.existsSync(todoPath)) fs.writeFileSync(todoPath, '- [ ] foo\n')
    const result = await handle({
      tool: 'Edit',
      tool_input: { file_path: todoPath },
      project_root: FIXTURE,
    })
    expect(result.regenerated).toBe(true)
  })

  it('does not crash on missing file_path', async () => {
    const result = await handle({ tool: 'Edit', tool_input: {} })
    expect(result.skipped).toBe('no_file_path')
  })

  it('matches ADR-NNNN-*.md but not README.md in design-docs/', async () => {
    const adr = path.join(FIXTURE, 'docs/design-docs/ADR-0001-x.md')
    const readme = path.join(FIXTURE, 'docs/design-docs/README.md')
    const r1 = await handle({ tool: 'Edit', tool_input: { file_path: adr }, project_root: FIXTURE })
    expect(r1.regenerated).toBe(true)
    resetLock()
    const r2 = await handle({ tool: 'Edit', tool_input: { file_path: readme }, project_root: FIXTURE })
    expect(r2.skipped).toBe('path_not_relevant')
  })
})
```

---

## Gotchas

- **G3 do plano (rate-limit 30s via lock global):** Lock em `~/.claude/cache/state-md-last-run.json` com chave por projectRoot. TTL = 30000ms.
- **G4 do plano (filtragem por path):** Regex match ANTES de checar lock — economiza I/O quando edicao eh irrelevante.
- **G5 do plano (so escutamos Claude Code PostToolUse):** Edits via VSCode externo NAO disparam hook. Aceitar staleness.
- **G15 do plano (mtime tests):** Teste de rate-limit nao depende de mtime do filesystem — usa lock file (mais estavel).
- **06-A1 (lock location):** homedir + chave. Documentado.
- **06-A4 (TODO.md case-sensitive):** Regex `(^|[\\/])TODO\.md$`. Case-sensitive.
- **Local — hook nunca retorna `block: true`:** Mesma politica de R6 do Plano 05 fase-07 (hook nao bloqueia). Mesmo em erro, retorna `{ success: true, error }`.
- **Local — require de `.ts` em CJS:** Validar se o ambiente do hook executa via Bun (que aceita `.ts` em `require`). Se Node puro, transpilar `state-md-lock.ts` para `.cjs` ou usar inline require do source compilado.
- **Local — concorrencia do lock file:** Dois hooks rodando em paralelo (sessoes simultaneas em projetos diferentes) podem ter race condition no write JSON. Risco baixo (TTL 30s diminui probabilidade); se virar problema, usar `proper-lockfile` lib.

---

## Verificacao

### TDD

- [ ] **RED:** Testes do hook escritos antes da implementacao, todos os 7 falham
  - Comando: `cd anti-vibe-coding && bun test hooks/state-md-hook.test.cjs`
  - Resultado esperado: `7 fail`

- [ ] **GREEN:** Hook implementado, todos passam
  - Comando: `cd anti-vibe-coding && bun test hooks/state-md-hook.test.cjs`
  - Resultado esperado: `7 pass, 0 fail`

### Checklist

- [ ] `hooks/hooks.json` contem entrada `state-md-hook` com event `PostToolUse`
- [ ] Edit em `docs/compound/foo.md` regenera STATE.md
- [ ] Edit em `src/foo.ts` NAO regenera (skipped: path_not_relevant)
- [ ] 2 edits em 5s: apenas o 1o regenera (skipped: rate_limit)
- [ ] Apos 30s, lock expira e nova edit regenera
- [ ] Hook nunca emite `{ block: true }` (R6 — politica de hooks)
- [ ] Lock file em `~/.claude/cache/state-md-last-run.json` chaveado por projectRoot
- [ ] Erro no generator NAO crasha hook — retorna `{ success: true, error: ... }`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck do `lib/state-md-lock.ts`: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**

- `cd anti-vibe-coding && bun test hooks/state-md-hook.test.cjs` retorna `7 pass, 0 fail`.
- CA-46 verbatim: editar `docs/compound/X.md` em fixture e medir `fs.statSync('docs/STATE.md').mtime` — deve estar atualizado <500ms apos a edit (medido via testes).
- Duas chamadas consecutivas em 5s: lock pula segunda — `lock.timestamp_ms` igual entre 1a e 2a chamada (segunda nao atualiza).

**Por humano:**

- N/A.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
