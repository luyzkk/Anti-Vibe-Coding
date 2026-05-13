<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 07: Pre-Mutation Gate Hook

**Plano:** 05 — Skill Migration + Hooks
**Sizing:** 2h
**Depende de:** Nenhuma (independente — usa stub do `lib/path-resolver-v6.ts` em paralelo com fase-01; consolidacao final apos fase-01 estar pronta)
**Visual:** false

---

## O que esta fase entrega

Novo hook `hooks/pre-mutation-gate.cjs` que escuta `UserPromptSubmit` e sugere `/plan-feature` ou `/quick-plan` quando detecta **trabalho substancial sem plano ativo** em `docs/exec-plans/active/`. Heuristica D26: verbos positivos + paths positivos + negative-list explanatoria. **Sugestivo, nao bloqueante** (D4, R6, CA-23). Registrado em `hooks/hooks.json`; integra com lock compartilhado com `user-prompt-gate.cjs` para evitar fricção dupla (G3).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/hooks/pre-mutation-gate.cjs` | Create | Hook UserPromptSubmit com heuristica D26 |
| `anti-vibe-coding/hooks/hooks.json` | Modify | Registrar novo hook em `UserPromptSubmit` |
| `anti-vibe-coding/hooks/lib/heuristic-mutation.cjs` | Create | Helper que aplica a heuristica D26 (verbos + paths + negative-list) — isolado para testavel |
| `anti-vibe-coding/tests/pre-mutation-gate.test.ts` | Create | Testes da heuristica + integration test do hook stdin/stdout |

---

## Implementacao

### Passo 1: heuristica isolada — `hooks/lib/heuristic-mutation.cjs`

```javascript
// 2026-05-11 (Luiz/dev): heuristica D26 — verbos + paths + negative-list. Isolada para testavel
'use strict'

// 2026-05-11 (Luiz/dev): listas mantidas como const em modulo — facil ajustar via PR sem reescrever hook
const SUBSTANTIAL_VERBS = [
  'implementar', 'implement',
  'construir', 'build',
  'criar', 'create',
  'adicionar feature', 'add feature',
  'desenvolver', 'develop',
  'migrar', 'migrate',
  'refatorar', 'refactor',
  'reescrever', 'rewrite',
]

const CODE_PATH_HINTS = [
  /\bsrc\//i,
  /\blib\//i,
  /\bcomponents\//i,
  /\bapi\//i,
  /\bservices\//i,
  /\.tsx?\b/i,
  /\.pyc?\b/i,
  /\.rb\b/i,
]

// 2026-05-11 (Luiz/dev): negative-list (D26) — evita falso-positivo em prompts educacionais ou de leitura
const NEGATIVE_PREFIXES = [
  /^\s*explique?\b/i,
  /^\s*como funciona\b/i,
  /^\s*o que (é|e)\b/i,
  /^\s*ensin[ae]\b/i,
  /^\s*me ajude a entender\b/i,
  /^\s*document[ae]\b/i,
  /^\s*revise?\b/i,
  /^\s*analise?\b/i,
  /^\s*pesquise?\b/i,
  /^\s*explain\b/i,
  /^\s*how does\b/i,
  /^\s*what is\b/i,
  /^\s*review\b/i,
]

/**
 * Decide se prompt eh "trabalho substancial" que merece sugestao de plano.
 * Retorna { suggest: boolean, why: string[] } — `why` lista signals para telemetria.
 */
function shouldSuggestPlan(prompt) {
  const why = []
  if (typeof prompt !== 'string' || prompt.length < 8) {
    return { suggest: false, why: ['too-short'] }
  }

  // 2026-05-11 (Luiz/dev): negative-list checada PRIMEIRO — short-circuit (D26)
  for (const re of NEGATIVE_PREFIXES) {
    if (re.test(prompt)) {
      return { suggest: false, why: ['negative-list-match'] }
    }
  }

  const hasVerb = SUBSTANTIAL_VERBS.some((v) => prompt.toLowerCase().includes(v))
  if (hasVerb) why.push('verb-match')

  const hasPath = CODE_PATH_HINTS.some((re) => re.test(prompt))
  if (hasPath) why.push('path-match')

  // 2026-05-11 (Luiz/dev): logica D26 — (verb OR path) AND NOT negative
  return { suggest: hasVerb || hasPath, why }
}

module.exports = { shouldSuggestPlan, SUBSTANTIAL_VERBS, NEGATIVE_PREFIXES, CODE_PATH_HINTS }
```

### Passo 2: hook principal — `hooks/pre-mutation-gate.cjs`

```javascript
// 2026-05-11 (Luiz/dev): Pre-Mutation Gate (D4, M9, OQ2) — sugestivo, nao bloqueante (CA-23)
#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { shouldSuggestPlan } = require('./lib/heuristic-mutation')

const HOOK_LOCK_PATH = path.join(os.homedir(), '.claude', 'cache', 'last-hook-fire.json')
const HOOK_LOCK_TTL_MS = 5000

async function main() {
  // 2026-05-11 (Luiz/dev): hook recebe payload via stdin JSON
  const payload = await readStdinJson()
  const prompt = (payload && payload.prompt) || ''
  const projectRoot = (payload && payload.cwd) || process.cwd()

  // 2026-05-11 (Luiz/dev): G3 — short-circuit se outro hook ja disparou neste prompt (lock compartilhado)
  if (recentlyFired()) {
    emitTelemetry({ event: 'pre_mutation_gate.skipped', reason: 'hook-lock' })
    return passthrough()
  }

  const decision = shouldSuggestPlan(prompt)
  if (!decision.suggest) {
    emitTelemetry({ event: 'pre_mutation_gate.skipped', reason: decision.why.join(',') })
    return passthrough()
  }

  // 2026-05-11 (Luiz/dev): CA-24 — se ha plano ativo, NAO molestar
  const hasActivePlan = await projectHasActivePlan(projectRoot)
  if (hasActivePlan) {
    emitTelemetry({ event: 'pre_mutation_gate.skipped', reason: 'active-plan-exists' })
    return passthrough()
  }

  emitTelemetry({ event: 'pre_mutation_gate.suggested', signals: decision.why })
  writeLock()

  // 2026-05-11 (Luiz/dev): CA-23 — emit message SEM block: true (sugestivo); 2 linhas curtas
  const message = [
    'Trabalho substancial detectado e nao ha plano em docs/exec-plans/active/.',
    'Sugestao: /anti-vibe-coding:plan-feature (full) ou /anti-vibe-coding:quick-plan (light).',
  ].join('\n')

  process.stdout.write(JSON.stringify({
    inject: true,
    message,
    role: 'system',
    block: false,
  }) + '\n')
}

function passthrough() {
  // 2026-05-11 (Luiz/dev): hook que nao injeta nada — emite objeto vazio para o harness
  process.stdout.write(JSON.stringify({ inject: false }) + '\n')
}

async function projectHasActivePlan(projectRoot) {
  // 2026-05-11 (Luiz/dev): heuristica simples — pasta active/ tem >=1 .md alem de README.md
  try {
    const activeDir = path.join(projectRoot, 'docs', 'exec-plans', 'active')
    const entries = fs.readdirSync(activeDir)
    return entries.some((e) => e.endsWith('.md') && e !== 'README.md')
  } catch {
    return false
  }
}

function recentlyFired() {
  try {
    const raw = fs.readFileSync(HOOK_LOCK_PATH, 'utf-8')
    const data = JSON.parse(raw)
    if (typeof data.timestamp === 'number' && Date.now() - data.timestamp < HOOK_LOCK_TTL_MS) {
      return true
    }
  } catch { /* sem lock = ok */ }
  return false
}

function writeLock() {
  try {
    fs.mkdirSync(path.dirname(HOOK_LOCK_PATH), { recursive: true })
    fs.writeFileSync(HOOK_LOCK_PATH, JSON.stringify({
      timestamp: Date.now(),
      hook: 'pre-mutation-gate',
    }))
  } catch { /* nao critico — apenas degrada G3 */ }
}

function emitTelemetry(event) {
  // 2026-05-11 (Luiz/dev): rate-limit 1/minuto por workspace — telemetry-utils existente lida
  try {
    const telemetryPath = path.join(os.homedir(), '.claude', 'cache', 'telemetry-pre-mutation.jsonl')
    fs.mkdirSync(path.dirname(telemetryPath), { recursive: true })
    fs.appendFileSync(telemetryPath, JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n')
  } catch { /* observability nunca quebra fluxo */ }
}

function readStdinJson() {
  return new Promise((resolve) => {
    let buf = ''
    process.stdin.on('data', (chunk) => { buf += chunk })
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(buf)) } catch { resolve({}) }
    })
    // 2026-05-11 (Luiz/dev): se stdin nao chega em 200ms, assume payload vazio (defensivo)
    setTimeout(() => resolve({}), 200)
  })
}

main().catch(() => passthrough())
```

### Passo 3: registrar em `hooks/hooks.json`

```json
{
  "UserPromptSubmit": [
    { "type": "command", "command": "node ${pluginRoot}/hooks/user-prompt-gate.cjs" },
    { "type": "command", "command": "node ${pluginRoot}/hooks/pre-mutation-gate.cjs" }
  ]
}
```

Ordem importa: `user-prompt-gate.cjs` (existente) roda primeiro; `pre-mutation-gate.cjs` checa lock e short-circuit se ja disparou.

---

## Gotchas

- **G4 do plano (D26 heuristica explicita):** Verbos + paths como sinais positivos; negative-list como veto. Documentado em JSDoc + comentarios.
- **G5 do plano (R6 nao bloqueia):** `block: false` ou ausencia da chave; nunca `block: true`. Validar via teste de integracao com regex no stdout JSON.
- **G3 do plano (hook lock):** Shared lock file `~/.claude/cache/last-hook-fire.json` TTL 5s. Se outro hook do plugin disparou recente, pre-mutation-gate skip + telemetria `hook-lock`.
- **G9 do plano (telemetria):** Eventos `pre_mutation_gate.{suggested,skipped}` com `signals` ou `reason`. Rate-limit ja existe no telemetry-utils.
- **Local 07-G1 (CJS vs ESM):** Hook eh `.cjs` (Claude Code runtime expecta CJS). Helper de heuristica tambem `.cjs` para require() funcionar. NAO converter para `.mjs`.
- **Local 07-G2 (stdin timeout defensivo):** Se hook nao recebe stdin em 200ms, assume payload vazio e passthrough. Evita travar a sessao se harness mudar formato.
- **Local 07-G3 (CA-24 — nao molestar se plano ativo):** `projectHasActivePlan` retorna `true` se existe qualquer `.md` em `docs/exec-plans/active/` exceto `README.md`. Heuristica simples mas funcional. Falso-positivo aceitavel (existe plano stale "ativo" e usuario quer fazer outra coisa — ele ignora a ausencia de sugestao).

---

## Verificacao

### TDD

- [ ] **RED unit:** `shouldSuggestPlan("explique como funciona o cache")` retorna `{ suggest: false, why: ['negative-list-match'] }`
  - Comando: `bun test tests/pre-mutation-gate.test.ts --grep 'negative list'`
  - Resultado esperado: falha (versao stub retorna true sempre)

- [ ] **RED integration:** spawn `node hooks/pre-mutation-gate.cjs` com stdin `{ "prompt": "implementar sistema de notificacoes em src/", "cwd": "/tmp/empty" }` espera stdout JSON `{ inject: true, block: false, message: /Trabalho substancial.../ }`
  - Comando: `bun test tests/pre-mutation-gate.test.ts --grep 'integration'`

- [ ] **GREEN:** apos implementacao, ambos passam

### Checklist

- [ ] `shouldSuggestPlan` retorna `true` para `"implementar feature de busca em src/api"` (verb-match + path-match)
- [ ] `shouldSuggestPlan` retorna `false` para `"o que e useEffect?"` (negative-list)
- [ ] `shouldSuggestPlan` retorna `false` para `"oi"` (too-short)
- [ ] `shouldSuggestPlan` retorna `true` para `"create new feature in src/services/notifications.ts"` (English variant)
- [ ] Hook nunca emite `block: true` (validar regex no output JSON em todos os testes)
- [ ] Hook respeita lock: criar `~/.claude/cache/last-hook-fire.json` com timestamp recente → hook emite `inject: false`
- [ ] Hook respeita CA-24: fixture com `docs/exec-plans/active/2026-05-12-foo.md` (alem de README.md) → hook nao injeta mesmo com verbo
- [ ] Telemetria emitida em `~/.claude/cache/telemetry-pre-mutation.jsonl` com formato JSONL
- [ ] `hooks/hooks.json` valida ao parse JSON e contem entry para `pre-mutation-gate.cjs`
- [ ] Hook timeout: stdin sem dados → passthrough em <300ms (nao trava)
- [ ] Testes passam: `bun run test`
- [ ] Lint: `bun run lint` (cobre .cjs?)

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/pre-mutation-gate.test.ts` exit 0 com >=8 casos (4 heuristica + 4 integration)
- `cat hooks/hooks.json | jq '.UserPromptSubmit | length'` retorna `>= 2`
- Output JSON do hook em cenario positivo: `grep -c '"inject":true' stdout` igual a `1` e `grep -c '"block":true' stdout` igual a `0`

**CA do PRD coberto:**
- CA-23 (verbatim): "Dado projeto v6 sem plano em `docs/exec-plans/active/`, quando usuário enviar prompt 'implementar X complexo', então hook injeta sugestão de skill mas **não bloqueia** envio."
- CA-24 (verbatim): "Dado projeto v6 com plano ativo, quando usuário enviar prompt substancial, então hook **não injeta sugestão** (não molesta)."

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
