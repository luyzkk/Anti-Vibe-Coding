#!/usr/bin/env node
// 2026-05-13 (Luiz/dev): Destructive-Bash Guard (D29 item 7, plano08-fase01 audit defer)
// Blocks rm -rf, git reset --hard, git push --force, git clean -f, git branch -D,
// git checkout -- / git restore ., and --no-verify on commit/push.
// Set AVC_ALLOW_DESTRUCTIVE=1 to bypass (e.g. intentional cleanup).
// Pattern: PreToolUse Bash matcher, exit 2 + stderr to block (Claude Code convention).
'use strict'

const PATTERNS = [
  {
    id: 'rm-rf',
    // rm with any combo of flags including r and f (order-agnostic)
    re: /\brm\s+(?:-[A-Za-z]*r[A-Za-z]*f[A-Za-z]*|-[A-Za-z]*f[A-Za-z]*r[A-Za-z]*|--recursive\s+--force|--force\s+--recursive)\b/,
    msg: 'rm -rf is irreversible. Move the path to a trash dir, or set AVC_ALLOW_DESTRUCTIVE=1 if you really mean it.',
  },
  {
    id: 'git-push-force-main',
    re: /\bgit\s+push\b[^\n]*--force(?:-with-lease)?\b[^\n]*\b(?:main|master|origin\/main|origin\/master)\b|\bgit\s+push\b[^\n]*\b(?:main|master)\b[^\n]*--force(?:-with-lease)?\b/,
    msg: 'Force-push to main/master destroys shared history. Coordinate with the team or set AVC_ALLOW_DESTRUCTIVE=1.',
  },
  {
    id: 'git-reset-hard',
    re: /\bgit\s+reset\s+(?:[^\n]*\s)?--hard\b/,
    msg: 'git reset --hard discards uncommitted work. Stash first, or set AVC_ALLOW_DESTRUCTIVE=1.',
  },
  {
    id: 'git-clean-force',
    re: /\bgit\s+clean\s+(?:[^\n]*\s)?-(?:[A-Za-z]*f[A-Za-z]*)\b/,
    msg: 'git clean -f deletes untracked files unrecoverably. Run `git clean -n` first, or set AVC_ALLOW_DESTRUCTIVE=1.',
  },
  {
    id: 'git-branch-delete-force',
    re: /\bgit\s+branch\s+(?:[^\n]*\s)?-D\b/,
    msg: 'git branch -D force-deletes a branch with unmerged commits. Use -d for safe delete, or set AVC_ALLOW_DESTRUCTIVE=1.',
  },
  {
    id: 'git-checkout-discard',
    re: /\bgit\s+checkout\s+--(?:\s|$)|\bgit\s+checkout\s+\.(?:\s|$)|\bgit\s+restore\s+\.(?:\s|$)/,
    msg: 'This discards local changes. Stash them first (git stash), or set AVC_ALLOW_DESTRUCTIVE=1.',
  },
  {
    id: 'git-no-verify',
    re: /\bgit\s+(?:commit|push)\b[^\n]*--no-verify\b/,
    msg: '--no-verify skips hooks (lint/tests/signing). Fix the underlying failure, or set AVC_ALLOW_DESTRUCTIVE=1.',
  },
]

function detect(command) {
  if (typeof command !== 'string' || command.length === 0) return null
  for (const p of PATTERNS) {
    if (p.re.test(command)) return p
  }
  return null
}

function block(pattern, command) {
  const lines = [
    '[DESTRUCTIVE-GUARD] Blocked Bash command (pattern: ' + pattern.id + ')',
    'Command: ' + command.slice(0, 200) + (command.length > 200 ? '...' : ''),
    pattern.msg,
  ]
  process.stderr.write(lines.join('\n') + '\n')
  process.exit(2)
}

function allow() {
  process.exit(0)
}

// --- stdin / dispatch ---

let rawInput = ''
let handled = false

const safetyTimer = setTimeout(() => {
  if (!handled) { handled = true; allow() }
}, 1000)

function run() {
  if (handled) return
  handled = true
  clearTimeout(safetyTimer)

  if (process.env.AVC_ALLOW_DESTRUCTIVE === '1') return allow()

  let input
  try {
    input = JSON.parse(rawInput || '{}')
  } catch {
    return allow() // malformed JSON — fail-open
  }

  const toolName = input.tool_name || input.tool || ''
  if (toolName && toolName !== 'Bash') return allow()

  const toolInput = input.tool_input || input
  const command = (toolInput && toolInput.command) || process.env.CLAUDE_TOOL_INPUT || ''

  const hit = detect(command)
  if (hit) return block(hit, command)
  return allow()
}

process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => { rawInput += chunk })
process.stdin.on('end', run)
process.stdin.on('error', () => { if (!handled) { handled = true; clearTimeout(safetyTimer); allow() } })

// Export for unit tests (require()-time use)
module.exports = { detect, PATTERNS }
