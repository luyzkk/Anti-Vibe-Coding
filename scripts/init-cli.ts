#!/usr/bin/env bun
// CLI wrapper para /anti-vibe-coding:init. Invocado pelo agente via Bash.
// Mantem runInit() como API programatica para testes e adiciona entrypoint shell-friendly.

import { runInit } from '../skills/init/lib/run-init'
import { parseFlags } from '../skills/init/lib/parse-flags'

// --cwd=TARGET_DIR flag ou primeiro arg posicional como diretorio alvo.
// Sem isso, Claude nao consegue inicializar um projeto diferente do cwd do shell.
const { flags, args: positional } = parseFlags(process.argv.slice(2))
const cwd = typeof flags.cwd === 'string'
  ? flags.cwd
  : positional[0] ?? process.cwd()

// 2026-05-28 (Luiz/dev): wirar askUser para o contrato needsUser do dispatcher.
// Antes desta data o CLI nao injetava askUser, entao todo needsUser era silenciosamente
// ignorado em prod (delivery-loop sempre defaultava skip, gate greenfield do Step 07
// nem existia). Agora: TTY interativo le via prompt() global do Bun; non-TTY (CI)
// retorna string vazia para que steps caiam no fallback (skip silencioso ou abort,
// dependendo do step). PRD D3, CH-01.
async function askUser(promptText: string, options: readonly string[]): Promise<string> {
  if (!process.stdin.isTTY) {
    return ''
  }
  const optionsLabel = options.join('/')
  const answer = prompt(`${promptText}\n[${optionsLabel}]: `)
  return answer ?? ''
}

const result = await runInit(process.argv.slice(2), { cwd, askUser })

if (result.kind === 'aborted') {
  process.exit(result.code)
}
