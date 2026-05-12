#!/usr/bin/env node
// 2026-05-12 (Luiz/dev): Pre-Mutation Gate (D4, M9, OQ2) — sugestivo, nao bloqueante (CA-23, CA-24)
// Heuristica D26 inlined para evitar require() de path com espacos no Windows (DEV-07-01)
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const HOOK_LOCK_PATH = path.join(os.homedir(), '.claude', 'cache', 'last-hook-fire.json')
const HOOK_LOCK_TTL_MS = 5000
const TELEMETRY_PATH = path.join(os.homedir(), '.claude', 'cache', 'telemetry-pre-mutation.jsonl')

// --- Heuristica D26 (inlined de hooks/lib/heuristic-mutation.cjs) ---
// 2026-05-12 (Luiz/dev): inlined aqui pois require() de path Windows com espacos falha em node CJS

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

function shouldSuggestPlan(prompt) {
  if (typeof prompt !== 'string' || prompt.length < 8) {
    return { suggest: false, why: ['too-short'] }
  }
  // negative-list checada PRIMEIRO — short-circuit (D26)
  for (const re of NEGATIVE_PREFIXES) {
    if (re.test(prompt)) {
      return { suggest: false, why: ['negative-list-match'] }
    }
  }
  const why = []
  const hasVerb = SUBSTANTIAL_VERBS.some((v) => prompt.toLowerCase().includes(v))
  if (hasVerb) why.push('verb-match')
  const hasPath = CODE_PATH_HINTS.some((re) => re.test(prompt))
  if (hasPath) why.push('path-match')
  return { suggest: hasVerb || hasPath, why }
}

// --- I/O handling (same pattern as user-prompt-gate.cjs) ---

let rawInput = ''
let handled = false

function passthrough() {
  // 2026-05-12 (Luiz/dev): hook que nao injeta — emite inject:false para o harness
  if (!handled) {
    handled = true
    try { process.stdout.write(JSON.stringify({ inject: false }) + '\n') } catch (_) { /* ignore broken pipe */ }
  }
  process.exit(0)
}

function output(obj) {
  if (!handled) {
    handled = true
    try { process.stdout.write(JSON.stringify(obj) + '\n') } catch (_) { /* ignore broken pipe */ }
  }
  process.exit(0)
}

// 2026-05-12 (Luiz/dev): safety timeout 500ms — se stdin nao chega, passthrough silencioso
const safetyTimer = setTimeout(() => {
  if (!handled) processInput()
}, 500)

process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  rawInput += chunk
  try {
    JSON.parse(rawInput)
    setImmediate(() => { if (!handled) processInput() })
  } catch {
    // incomplete JSON — wait for more chunks
  }
})
process.stdin.on('end', () => { if (!handled) processInput() })
process.stdin.on('error', () => { process.exit(0) })

async function processInput() {
  if (handled) return
  clearTimeout(safetyTimer)

  let payload = {}
  try { payload = JSON.parse(rawInput || '{}') } catch { /* mal-formed — use empty */ }

  const prompt = (payload && payload.prompt) || ''
  const projectRoot = (payload && payload.cwd) || process.cwd()

  try {
    await runGate(prompt, projectRoot)
  } catch {
    // fail-open: on unexpected error, pass through silently
    passthrough()
  }
}

async function runGate(prompt, projectRoot) {
  // 2026-05-11 (Luiz/dev): fase-08 — disable em ambiente de teste (GT-12 / CA-17)
  if (process.env.ANTI_VIBE_DISABLE_HOOKS === '1') return passthrough()

  // 2026-05-12 (Luiz/dev): G3 — short-circuit se outro hook ja disparou neste prompt (lock compartilhado)
  if (recentlyFired()) {
    emitTelemetry({ event: 'pre_mutation_gate.skipped', reason: 'hook-lock' })
    return passthrough()
  }

  const decision = shouldSuggestPlan(prompt)
  if (!decision.suggest) {
    emitTelemetry({ event: 'pre_mutation_gate.skipped', reason: decision.why.join(',') })
    return passthrough()
  }

  // 2026-05-12 (Luiz/dev): CA-24 — se ha plano ativo, NAO molestar
  const hasActivePlan = projectHasActivePlan(projectRoot)
  if (hasActivePlan) {
    emitTelemetry({ event: 'pre_mutation_gate.skipped', reason: 'active-plan-exists' })
    return passthrough()
  }

  emitTelemetry({ event: 'pre_mutation_gate.suggested', signals: decision.why })
  writeLock()

  // 2026-05-12 (Luiz/dev): CA-23 — emit message SEM block:true (sugestivo)
  const message = [
    'Trabalho substancial detectado e nao ha plano em docs/exec-plans/active/.',
    'Sugestao: /anti-vibe-coding:plan-feature (full) ou /anti-vibe-coding:quick-plan (light).',
  ].join('\n')

  output({
    inject: true,
    message,
    role: 'system',
    block: false,
  })
}

function projectHasActivePlan(projectRoot) {
  // 2026-05-12 (Luiz/dev): heuristica simples — pasta active/ tem >=1 .md alem de README.md
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
  // 2026-05-12 (Luiz/dev): observability silenciosa — errors nunca quebram fluxo
  try {
    fs.mkdirSync(path.dirname(TELEMETRY_PATH), { recursive: true })
    fs.appendFileSync(TELEMETRY_PATH, JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n')
  } catch { /* observability nunca quebra fluxo */ }
}
