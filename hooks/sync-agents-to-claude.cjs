// PostToolUse: re-copia AGENTS.md -> CLAUDE.md quando AGENTS.md eh editado.
// Convencao do plugin: exporta handle(input). Standalone sibling em
// skills/init/assets/hooks/ usa stdin (instalado em projetos-alvo via Tier-3).

const fs = require('node:fs')
const path = require('node:path')

async function handle(input) {
  try {
    const editedPath = input?.tool_input?.file_path
    if (typeof editedPath !== 'string') return { skipped: 'no file_path' }

    const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd()
    const agentsPath = path.join(projectRoot, 'AGENTS.md')
    const claudePath = path.join(projectRoot, 'CLAUDE.md')

    if (path.resolve(editedPath) !== path.resolve(agentsPath)) {
      return { skipped: 'not AGENTS.md' }
    }
    if (!fs.existsSync(agentsPath)) return { skipped: 'no AGENTS.md' }

    fs.copyFileSync(agentsPath, claudePath)
    return { status: 'synced', from: 'AGENTS.md', to: 'CLAUDE.md' }
  } catch (err) {
    return { error: err.message }
  }
}

module.exports = { handle }
