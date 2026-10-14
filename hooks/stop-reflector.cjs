#!/usr/bin/env node
// 2026-05-20 (Luiz/dev): Stop hook command-type — substitui prompt-type que loopava
// Causa raiz: prompt-type usa response.includes("no") para decidir block. Prosa do
// subagente quase sempre contem "no" (ex: "no correction detected") -> loop ate cap.
// Doc: docs/compound/2026-05-20-prompt-hook-includes-no-loop.md
'use strict'

const fs = require('node:fs')

const CORRECTION_PATTERNS = [
  /\bisso\s+(est[aá]|ta)\s+errado\b/i,
  /\bn[aã]o\s+era\s+isso\b/i,
  /\breverta\b/i,
  /\bdesfaz(er|a)\b/i,
  /\byou\s+broke\b/i,
  /\bthat\s*('|i)s\s+wrong\b/i,
  /\bundo\b/i,
  /\bvoc[eê]\s+(quebrou|estragou)\b/i,
]

// 2026-10-13 (Luiz/dev): 8.0 fatia 2 — o ramo de "feature concluida" (que travava o fim da resposta
// para sugerir uma lista de revisores) saiu. O dono escolheu manter so o capturador de licoes.

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (chunk) => {
      data += chunk
    })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', () => resolve(''))
  })
}

function extractLastUserMessage(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return ''
  let raw
  try {
    raw = fs.readFileSync(transcriptPath, 'utf-8')
  } catch {
    return ''
  }
  const lines = raw.split(/\r?\n/).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry
    try {
      entry = JSON.parse(lines[i])
    } catch {
      continue
    }
    if (entry && entry.type === 'user' && entry.message) {
      const content = entry.message.content
      if (typeof content === 'string') return content
      if (Array.isArray(content)) {
        return content
          .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
          .map((c) => c.text)
          .join('\n')
      }
    }
  }
  return ''
}

function classify(userText) {
  if (!userText) return null
  if (CORRECTION_PATTERNS.some((re) => re.test(userText))) return 'CORRECTION'
  return null
}

function buildBlockOutput(kind) {
  if (kind === 'CORRECTION') {
    return {
      decision: 'block',
      reason:
        '[CORRECTION_DETECTED] Uma correcao foi detectada. Considere registrar como licao aprendida com /anti-vibe-coding:lessons-learned para evitar o mesmo erro no futuro.',
    }
  }
  return null
}

async function run() {
  const raw = await readStdin()
  let input = {}
  try {
    input = raw ? JSON.parse(raw) : {}
  } catch {
    process.exit(0)
  }

  if (input.stop_hook_active === true) {
    process.exit(0)
  }

  const userText = extractLastUserMessage(input.transcript_path)
  const kind = classify(userText)
  if (!kind) process.exit(0)

  const output = buildBlockOutput(kind)
  process.stdout.write(JSON.stringify(output))
  process.exit(0)
}

// 2026-10-13 (Luiz/dev): o hooks.json carrega este arquivo por require, e o guard abaixo deixava o hook
// morto (nada rodava). O comando agora chama run() exportado; o guard fica para `node stop-reflector.cjs`.
if (require.main === module) {
  run().catch(() => process.exit(0))
}

module.exports = {
  run,
  classify,
  extractLastUserMessage,
  buildBlockOutput,
  CORRECTION_PATTERNS,
}
