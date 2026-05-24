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

const result = await runInit(process.argv.slice(2), { cwd })

if (result.kind === 'aborted') {
  process.exit(result.code)
}
