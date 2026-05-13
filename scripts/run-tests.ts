#!/usr/bin/env bun
// Wrapper that scans test files outside the claude-code/ archive and feeds them to bun test.
// bun test's positional args are substring filters (not directory scopes), so "tests/" matches
// claude-code/get-shit-done/tests/ too. This script enumerates the real test files explicitly.

import { Glob } from 'bun'

const patterns = ['tests/**/*.test.{ts,tsx}', 'skills/**/*.test.{ts,tsx}', 'scripts/**/*.test.{ts,tsx}']
const files: string[] = []
for (const pattern of patterns) {
  const glob = new Glob(pattern)
  for await (const file of glob.scan({ cwd: '.', absolute: false })) {
    files.push(file)
  }
}

if (files.length === 0) {
  console.error('No test files found.')
  process.exit(1)
}

const proc = Bun.spawn(['bun', 'test', ...files], { stdio: ['inherit', 'inherit', 'inherit'] })
process.exit(await proc.exited)
