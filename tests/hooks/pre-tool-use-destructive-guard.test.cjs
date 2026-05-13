#!/usr/bin/env node
// 2026-05-13 (Luiz/dev): Smoke test for hooks/pre-tool-use-destructive-guard.cjs
// Standalone: `node tests/hooks/pre-tool-use-destructive-guard.test.cjs`
// Asserts: malicious commands exit 2 + stderr; safe commands exit 0; non-Bash tools exit 0.
'use strict'

const { spawnSync } = require('child_process')
const path = require('path')

const HOOK = path.resolve(__dirname, '..', '..', 'hooks', 'pre-tool-use-destructive-guard.cjs')

function runHook(payload, env) {
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...(env || {}) },
    timeout: 5000,
  })
  return { code: result.status, stderr: result.stderr || '', stdout: result.stdout || '' }
}

const cases = [
  // BLOCK cases (expect exit 2)
  { name: 'rm -rf /tmp/x', payload: { tool_name: 'Bash', tool_input: { command: 'rm -rf /tmp/foo' } }, expectCode: 2, expectPattern: 'rm-rf' },
  { name: 'rm -fr (flag order swap)', payload: { tool_name: 'Bash', tool_input: { command: 'rm -fr build/' } }, expectCode: 2, expectPattern: 'rm-rf' },
  { name: 'git reset --hard', payload: { tool_name: 'Bash', tool_input: { command: 'git reset --hard HEAD~3' } }, expectCode: 2, expectPattern: 'git-reset-hard' },
  { name: 'git push --force main', payload: { tool_name: 'Bash', tool_input: { command: 'git push --force origin main' } }, expectCode: 2, expectPattern: 'git-push-force-main' },
  { name: 'git push --force-with-lease master', payload: { tool_name: 'Bash', tool_input: { command: 'git push --force-with-lease origin master' } }, expectCode: 2, expectPattern: 'git-push-force-main' },
  { name: 'git clean -fd', payload: { tool_name: 'Bash', tool_input: { command: 'git clean -fd' } }, expectCode: 2, expectPattern: 'git-clean-force' },
  { name: 'git branch -D feature', payload: { tool_name: 'Bash', tool_input: { command: 'git branch -D feature/foo' } }, expectCode: 2, expectPattern: 'git-branch-delete-force' },
  { name: 'git checkout -- file', payload: { tool_name: 'Bash', tool_input: { command: 'git checkout -- src/foo.ts' } }, expectCode: 2, expectPattern: 'git-checkout-discard' },
  { name: 'git restore .', payload: { tool_name: 'Bash', tool_input: { command: 'git restore .' } }, expectCode: 2, expectPattern: 'git-checkout-discard' },
  { name: 'git commit --no-verify', payload: { tool_name: 'Bash', tool_input: { command: 'git commit -m "fix" --no-verify' } }, expectCode: 2, expectPattern: 'git-no-verify' },

  // ALLOW cases (expect exit 0)
  { name: 'safe ls', payload: { tool_name: 'Bash', tool_input: { command: 'ls -la' } }, expectCode: 0 },
  { name: 'safe git status', payload: { tool_name: 'Bash', tool_input: { command: 'git status' } }, expectCode: 0 },
  { name: 'safe git push to feature branch', payload: { tool_name: 'Bash', tool_input: { command: 'git push origin feature/foo' } }, expectCode: 0 },
  { name: 'rm without -rf', payload: { tool_name: 'Bash', tool_input: { command: 'rm /tmp/single-file.txt' } }, expectCode: 0 },
  { name: 'git branch -d (lowercase)', payload: { tool_name: 'Bash', tool_input: { command: 'git branch -d merged-feature' } }, expectCode: 0 },
  { name: 'non-Bash tool (Edit)', payload: { tool_name: 'Edit', tool_input: { file_path: '/tmp/x.md' } }, expectCode: 0 },

  // OVERRIDE case
  { name: 'rm -rf with AVC_ALLOW_DESTRUCTIVE=1', payload: { tool_name: 'Bash', tool_input: { command: 'rm -rf /tmp/x' } }, env: { AVC_ALLOW_DESTRUCTIVE: '1' }, expectCode: 0 },
]

let passed = 0
let failed = 0
const failures = []

for (const c of cases) {
  const res = runHook(c.payload, c.env)
  const codeOk = res.code === c.expectCode
  const patternOk = !c.expectPattern || res.stderr.includes(c.expectPattern)
  if (codeOk && patternOk) {
    passed++
  } else {
    failed++
    failures.push({
      name: c.name,
      expected: { code: c.expectCode, pattern: c.expectPattern || null },
      actual: { code: res.code, stderr: res.stderr.slice(0, 160) },
    })
  }
}

console.log(`pre-tool-use-destructive-guard: ${passed}/${passed + failed} passed`)
if (failed > 0) {
  for (const f of failures) {
    console.error('FAIL:', f.name, JSON.stringify(f, null, 2))
  }
  process.exit(1)
}
process.exit(0)
