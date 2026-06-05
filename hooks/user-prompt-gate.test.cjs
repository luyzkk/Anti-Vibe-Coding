// 2026-05-29 (Luiz/dev): testes para user-prompt-gate.cjs — WORKFLOW_ADVISOR detector (fase-01)
// Cobertura: CA-01 (volume), CA-02 (anti-deadlock), CA-03 (falso-positivo), CA-06 (sem verbo), CA-07 (multi-dominio)
// Padrao: node:test + assert (igual ao stop-reflector.test.cjs)
'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')

const { processPrompt, SCALE_PATTERNS } = require('./user-prompt-gate.cjs')

// ── CA-01: volume/migração com 3+ dígitos → deve emitir [WORKFLOW_ADVISOR] ──────────────────────
test('CA-01: migrar 400 arquivos emite [WORKFLOW_ADVISOR]', () => {
  const out = processPrompt('migrar 400 arquivos para o novo formato')
  assert.ok(typeof out === 'string', `esperava string, recebeu ${typeof out}: ${out}`)
  assert.match(out, /\[WORKFLOW_ADVISOR\]/)
  assert.match(out, /workflow/i)
  assert.match(out, /antes de prosseguir/)
})

test('CA-01b: rename 200 arquivos emite [WORKFLOW_ADVISOR]', () => {
  const out = processPrompt('rename 200 arquivos de configuracao')
  assert.ok(typeof out === 'string', `esperava string, recebeu ${typeof out}: ${out}`)
  assert.match(out, /\[WORKFLOW_ADVISOR\]/)
})

// ── CA-02: anti-deadlock — usuário já optou por workflow/ultracode → null ──────────────────────
test('CA-02: "rode isso como workflow" retorna null', () => {
  const out = processPrompt('rode isso como workflow')
  assert.equal(out, null)
})

test('CA-02b: "/effort ultracode" retorna null', () => {
  const out = processPrompt('/effort ultracode')
  assert.equal(out, null)
})

test('CA-02c: "use ultracode para essa task" retorna null', () => {
  const out = processPrompt('use ultracode para essa task')
  assert.equal(out, null)
})

// ── CA-03: falso-positivo — "12 arquivos" NÃO deve disparar (< 3 dígitos) ─────────────────────
test('CA-03: "renomeie esses 12 arquivos" NAO emite [WORKFLOW_ADVISOR]', () => {
  const out = processPrompt('renomeie esses 12 arquivos')
  assert.ok(
    out === null || (typeof out === 'string' && !out.includes('[WORKFLOW_ADVISOR]')),
    `falso-positivo detectado: ${out}`
  )
})

// ── CA-06: sem verbo de implementação, mas com sinal de escala → deve emitir ──────────────────
test('CA-06: "auditar o codebase inteiro por XSS" emite [WORKFLOW_ADVISOR] (sem verbo de impl)', () => {
  const out = processPrompt('auditar o codebase inteiro por XSS')
  assert.ok(typeof out === 'string', `esperava string, recebeu ${typeof out}: ${out}`)
  assert.match(out, /\[WORKFLOW_ADVISOR\]/)
})

// ── CA-07: escala + multi-domínio → exatamente 1 [WORKFLOW_ADVISOR], 0 [SKILL_ADVISOR] ────────
test('CA-07: escala + multi-dominio emite exatamente 1 [WORKFLOW_ADVISOR] e 0 [SKILL_ADVISOR]', () => {
  // "migrar 300 endpoints de autenticação e cache" → Security + System Design + escala
  const out = processPrompt('migrar 300 endpoints de autenticação e cache para o novo padrão')
  assert.ok(typeof out === 'string', `esperava string, recebeu ${typeof out}: ${out}`)
  const workflowCount = (out.match(/\[WORKFLOW_ADVISOR\]/g) || []).length
  const skillCount = (out.match(/\[SKILL_ADVISOR\]/g) || []).length
  assert.equal(workflowCount, 1, `esperava 1 [WORKFLOW_ADVISOR], recebeu ${workflowCount}: ${out}`)
  assert.equal(skillCount, 0, `esperava 0 [SKILL_ADVISOR], recebeu ${skillCount}: ${out}`)
})

// ── Diretriz: todas as saídas do branch são string; nunca contêm "decision" ou "block" ─────────
test('diretriz: saida de processPrompt é string ou null — nunca objeto com decision/block', () => {
  const probes = [
    'migrar 400 arquivos para o novo formato',
    'auditar o codebase inteiro por XSS',
    'migrar 300 endpoints de autenticação e cache para o novo padrão',
    'renomeie esses 12 arquivos',
    'rode isso como workflow',
  ]
  for (const p of probes) {
    const out = processPrompt(p)
    assert.ok(
      out === null || typeof out === 'string',
      `processPrompt("${p}") retornou ${typeof out} — deve ser string ou null`
    )
    if (typeof out === 'string') {
      assert.ok(!out.includes('"decision"'), `saida contem "decision": ${out}`)
      assert.ok(!out.includes('"block"'), `saida contem "block": ${out}`)
      assert.ok(!out.toLowerCase().includes('invoke workflow tool'), `saida instrui a invocar tool Workflow: ${out}`)
    }
  }
})

// ── SCALE_PATTERNS: verificar que o array existe e tem entradas ────────────────────────────────
test('SCALE_PATTERNS é array não-vazio após GREEN', () => {
  assert.ok(Array.isArray(SCALE_PATTERNS), 'SCALE_PATTERNS deve ser array')
  assert.ok(SCALE_PATTERNS.length > 0, 'SCALE_PATTERNS deve ter pelo menos 1 regex')
})
