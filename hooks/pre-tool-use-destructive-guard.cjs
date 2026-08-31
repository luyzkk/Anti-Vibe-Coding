#!/usr/bin/env node
// 2026-05-13 (Luiz/dev): Destructive-Bash Guard (D29 item 7, plano08-fase01 audit defer)
// Blocks rm -rf, git reset --hard, git push --force, git clean -f, git branch -D,
// git update-ref, reflog/gc pruning, git checkout -- / git restore ., and --no-verify.
//
// 2026-08-30: tres brechas fechadas depois de um caso real — o bloqueio de `git branch -D` foi
// contornado sem nenhuma intencao de burla, so escrevendo o mesmo comando de outro jeito
// (`git update-ref -d refs/heads/<branch>`). Junto vieram as formas longas de `-D` e a poda de
// reflog/gc, que destroi a recuperabilidade que torna a delecao reversivel.
//
// Set AVC_ALLOW_DESTRUCTIVE=1 to bypass (e.g. intentional cleanup).
// ⚠️ A env e lida do ambiente do HOOK, nao do comando: prefixar `AVC_ALLOW_DESTRUCTIVE=1 git ...`
// no proprio comando NAO funciona (a var iria para o shell do comando, e o hook ja decidiu antes).
// Para liberar de fato, exporte a var no ambiente que lanca o Claude Code.
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
    // Cobre -D, as flags combinadas (-fd/-Df) e as formas longas em qualquer ordem. O regex antigo
    // via so `-D`, entao `git branch --delete --force` passava batido — mesmo comando, outra grafia.
    re: /\bgit\s+branch\b[^\n]*(?:\s-[A-Za-z]*D[A-Za-z]*(?:\s|$)|\s-[A-Za-z]*(?:df|fd)[A-Za-z]*(?:\s|$)|--delete\b[^\n]*--force\b|--force\b[^\n]*--delete\b)/,
    msg: 'git branch -D force-deletes a branch with unmerged commits. Use -d for safe delete, or set AVC_ALLOW_DESTRUCTIVE=1.',
  },
  {
    id: 'git-update-ref',
    // Plumbing que apaga (`-d`) ou reaponta uma ref sem passar por `git branch` — o caminho lateral
    // que tornava o bloqueio acima contornavel sem nenhuma intencao de burla.
    // Bloqueia o comando inteiro, e nao so `-d`: reapontar refs/heads/main destroi historia do mesmo
    // jeito. update-ref nao aparece em fluxo normal; quem precisa dele sabe o que esta fazendo.
    re: /\bgit\s+update-ref\b/,
    msg: 'git update-ref deletes or rewrites a ref directly, bypassing branch safety. Use git branch -d, or set AVC_ALLOW_DESTRUCTIVE=1.',
  },
  {
    id: 'git-history-prune',
    // A rede de recuperacao. Este guard recusa `-D` porque "perde commits" — mas eles sobrevivem no
    // reflog, e e de la que se recupera uma branch apagada por engano. Expirar o reflog ou podar
    // agora torna a perda definitiva: proteger o `-D` e deixar isto passar e protecao so no nome.
    // `git gc --auto` e `git reflog` (leitura) continuam livres — o guard nao pode gritar na rotina.
    re: /\bgit\s+reflog\s+expire\b|\bgit\s+gc\b[^\n]*--prune=(?!never\b)/,
    msg: 'This makes orphaned commits unrecoverable — it destroys the reflog safety net that makes branch deletion reversible. Set AVC_ALLOW_DESTRUCTIVE=1 if that is the intent.',
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
