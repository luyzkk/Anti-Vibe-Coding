// 2026-05-12 (Luiz/dev): D32/M13/CA-46/R15 — PostToolUse hook para STATE.md
// GT-07-01: require() Node nativo falha em paths Windows com espaço → inline lock + spawn bun
'use strict'
const path = require('path')
const fs = require('fs')
const os = require('os')
const { spawnSync } = require('child_process')

const TTL_MS = 30 * 1000

const RELEVANT_PATTERNS = [
  /[\\/]docs[\\/]compound[\\/][^/\\]+\.md$/,
  /[\\/]docs[\\/]design-docs[\\/]ADR-[^/\\]+\.md$/,
  /[\\/]docs[\\/]exec-plans[\\/](?:active|completed)[\\/][^/\\]+\.md$/,
  /(^|[\\/])TODO\.md$/, // 06-A4: case-sensitive
]

// Inline do lock (GT-07-01: require() de .ts falha em paths Windows com espaço)
// Espelha skills/lib/state-md-lock.ts — fonte de verdade permanece no .ts
const LOCK_PATH = path.join(os.homedir(), '.claude', 'cache', 'state-md-last-run.json')

function shouldSkipByRateLimit(projectRoot, ttlMs) {
  const key = path.resolve(projectRoot)
  const now = Date.now()

  let lock = {}
  if (fs.existsSync(LOCK_PATH)) {
    try {
      lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf-8'))
    } catch {
      lock = {}
    }
  }

  const last = (lock[key] && lock[key].timestamp_ms) || 0
  if (now - last < ttlMs) return true

  lock[key] = { timestamp_ms: now }
  const dir = path.dirname(LOCK_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2), 'utf-8')
  return false
}

function isRelevantPath(filePath) {
  return RELEVANT_PATTERNS.some((re) => re.test(filePath))
}

async function handle(input) {
  const tool = (input && input.tool) || ''
  if (!['Edit', 'Write', 'MultiEdit'].includes(tool)) {
    return { success: true, skipped: 'wrong_tool' }
  }

  const filePath = input.tool_input && input.tool_input.file_path
  if (!filePath || typeof filePath !== 'string') {
    return { success: true, skipped: 'no_file_path' }
  }

  if (!isRelevantPath(filePath)) {
    return { success: true, skipped: 'path_not_relevant' }
  }

  const projectRoot = (input && input.project_root) || process.cwd()

  if (shouldSkipByRateLimit(projectRoot, TTL_MS)) {
    return { success: true, skipped: 'rate_limit' }
  }

  // Invocar generator via bun subprocess (evita require de .ts em path com espaço)
  const generatorPath = path.resolve(__dirname, '..', 'skills', 'lib', 'state-md-generator.ts')
  try {
    const result = spawnSync('bun', ['run', generatorPath, projectRoot], {
      encoding: 'utf-8',
      timeout: 10000,
    })
    if (result.status !== 0) {
      return { success: true, regenerated: false, error: result.stderr || 'generator failed' }
    }
    return { success: true, regenerated: true }
  } catch (err) {
    return { success: true, regenerated: false, error: err.message }
  }
}

function main() {
  let raw = ''
  process.stdin.setEncoding('utf-8')
  process.stdin.on('data', (chunk) => {
    raw += chunk
  })
  process.stdin.on('end', async () => {
    try {
      const input = JSON.parse(raw)
      const result = await handle(input)
      process.stdout.write(JSON.stringify(result))
    } catch (err) {
      process.stdout.write(JSON.stringify({ success: true, error: err.message }))
    }
  })
}

if (require.main === module) main()

module.exports = { handle }
