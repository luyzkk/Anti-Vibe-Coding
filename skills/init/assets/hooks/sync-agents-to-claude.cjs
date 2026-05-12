// 2026-05-12 (Luiz/dev): Tier 3 do fallback de symlink — re-copia AGENTS.md
// para CLAUDE.md sempre que AGENTS.md eh editado. Disparado por PostToolUse.
// CommonJS porque hooks Claude Code rodam em runtime Node simples.

const fs = require('node:fs')
const path = require('node:path')

const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const agentsPath = path.join(projectRoot, 'AGENTS.md')
const claudePath = path.join(projectRoot, 'CLAUDE.md')

// Hook recebe payload JSON via stdin com tool_input.file_path
let payload = ''
process.stdin.on('data', (chunk) => { payload += chunk })
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(payload)
    const editedPath = event?.tool_input?.file_path
    if (typeof editedPath !== 'string') return

    const resolved = path.resolve(editedPath)
    if (resolved !== path.resolve(agentsPath)) return

    fs.copyFileSync(agentsPath, claudePath)
    process.stdout.write(JSON.stringify({ status: 'synced', from: 'AGENTS.md', to: 'CLAUDE.md' }))
  } catch (err) {
    // silencioso — hook nao bloqueia execucao
    process.stderr.write(`sync-agents-to-claude error: ${err.message}\n`)
  }
})
