// 2026-05-20 (Luiz/dev): testes para stop-reflector.cjs
// Cobertura: NOTHING, CORRECTION, FEATURE_COMPLETED, stop_hook_active early-exit
'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { classify, extractLastUserMessage, buildBlockOutput } = require('./stop-reflector.cjs')

function writeFixtureTranscript(messages) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-reflector-'))
  const file = path.join(dir, 'transcript.jsonl')
  const lines = messages.map((m) => JSON.stringify(m)).join('\n')
  fs.writeFileSync(file, lines, 'utf-8')
  return file
}

test('classify returns null for normal planning conversation', () => {
  const userText =
    'Vamos comecar com o PRD. Pode invocar /write-prd quando estiver pronto.'
  assert.equal(classify(userText), null)
})

test('classify returns CORRECTION for explicit user correction (PT)', () => {
  assert.equal(classify('reverta isso'), 'CORRECTION')
  assert.equal(classify('isso esta errado, refaca'), 'CORRECTION')
  assert.equal(classify('nao era isso que eu pedi'), 'CORRECTION')
  assert.equal(classify('voce quebrou o teste'), 'CORRECTION')
})

test('classify returns CORRECTION for explicit user correction (EN)', () => {
  assert.equal(classify('you broke the build'), 'CORRECTION')
  assert.equal(classify('undo it'), 'CORRECTION')
  assert.equal(classify("that's wrong, try again"), 'CORRECTION')
})

test('classify returns FEATURE_COMPLETED for explicit completion signals', () => {
  assert.equal(classify('ship it'), 'FEATURE_COMPLETED')
  assert.equal(classify('finalizado'), 'FEATURE_COMPLETED')
  assert.equal(classify('pronto!'), 'FEATURE_COMPLETED')
  assert.equal(classify('done.'), 'FEATURE_COMPLETED')
  assert.equal(classify('pode commitar agora'), 'FEATURE_COMPLETED')
})

test('classify does NOT false-positive on words inside larger sentences', () => {
  // "pronto" so dispara como mensagem standalone, nao em "quando estiver pronto"
  assert.equal(
    classify('Pode invocar /write-prd quando estiver pronto.'),
    null,
  )
  assert.equal(classify('Quando finalizar a task, me avise'), null)
  assert.equal(classify('done is better than perfect, mas continue'), null)
})

test('classify does NOT trip on prose containing the substring "no"', () => {
  // Regressao do bug original: prompt-type hook fazia response.includes("no")
  // e qualquer prosa com "no correction" / "no completion" disparava block.
  const proseWithNo =
    'This is normal conversation, no correction needed, no feature completed.'
  assert.equal(classify(proseWithNo), null)
})

test('classify returns null for empty / whitespace input', () => {
  assert.equal(classify(''), null)
  assert.equal(classify('   '), null)
})

test('buildBlockOutput returns null when no kind given', () => {
  assert.equal(buildBlockOutput(null), null)
  assert.equal(buildBlockOutput('UNKNOWN'), null)
})

test('buildBlockOutput emits CORRECTION_DETECTED marker', () => {
  const out = buildBlockOutput('CORRECTION')
  assert.equal(out.decision, 'block')
  assert.match(out.reason, /CORRECTION_DETECTED/)
  assert.match(out.reason, /lessons-learned/)
})

test('buildBlockOutput emits FEATURE_COMPLETED marker', () => {
  const out = buildBlockOutput('FEATURE_COMPLETED')
  assert.equal(out.decision, 'block')
  assert.match(out.reason, /FEATURE_COMPLETED/)
  assert.match(out.reason, /security-auditor/)
})

test('extractLastUserMessage reads JSONL transcript and returns last user content', () => {
  const file = writeFixtureTranscript([
    { type: 'user', message: { content: 'primeira mensagem' } },
    { type: 'assistant', message: { content: 'resposta' } },
    { type: 'user', message: { content: 'pronto, pode commitar' } },
  ])
  assert.equal(extractLastUserMessage(file), 'pronto, pode commitar')
})

test('extractLastUserMessage handles content as array of text blocks', () => {
  const file = writeFixtureTranscript([
    {
      type: 'user',
      message: {
        content: [
          { type: 'text', text: 'parte 1' },
          { type: 'text', text: 'parte 2' },
        ],
      },
    },
  ])
  assert.equal(extractLastUserMessage(file), 'parte 1\nparte 2')
})

test('extractLastUserMessage returns empty string for missing file', () => {
  assert.equal(extractLastUserMessage('/nonexistent/path.jsonl'), '')
  assert.equal(extractLastUserMessage(''), '')
  assert.equal(extractLastUserMessage(undefined), '')
})

test('extractLastUserMessage tolerates malformed JSONL lines', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-reflector-'))
  const file = path.join(dir, 'transcript.jsonl')
  const content = [
    'not-json-at-all',
    JSON.stringify({ type: 'user', message: { content: 'mensagem valida' } }),
    '{broken',
  ].join('\n')
  fs.writeFileSync(file, content, 'utf-8')
  assert.equal(extractLastUserMessage(file), 'mensagem valida')
})
