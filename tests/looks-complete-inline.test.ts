// Drift guard for the inline copy of `looksComplete` in scripts/harness-validate.ts.
// The canonical implementation lives in skills/init/lib/orphan-plan-detector.ts.
// harness-validate.ts is a standalone script and cannot import it, so the regex arrays
// are duplicated. If either side changes, this test fails and forces a sync + hash refresh.

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dir, '..')
const canonicalPath = path.join(repoRoot, 'skills/init/lib/orphan-plan-detector.ts')
const inlinePath = path.join(repoRoot, 'scripts/harness-validate.ts')

// SHA-256 literal embedded in the comment above `looksCompleteInline` in harness-validate.ts.
// Regenerate via the same logic the test uses if the canonical signature changes intentionally.
const EXPECTED_CANONICAL_HASH = '74b0e7be7053b8f74412c092fbe6e951f99a7b0751ff8c29e26637018dfbf296'

function extractFunctionBody(src: string, name: string): string {
  const declIndex = src.indexOf(`function ${name}(`)
  if (declIndex < 0) throw new Error(`function ${name} not found in source`)
  const braceStart = src.indexOf('{', declIndex)
  if (braceStart < 0) throw new Error(`opening brace for ${name} not found`)
  let depth = 0
  let cursor = braceStart
  for (; cursor < src.length; cursor++) {
    const ch = src[cursor]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) break
    }
  }
  if (depth !== 0) throw new Error(`unbalanced braces for ${name}`)
  return src.slice(braceStart + 1, cursor).trim()
}

function hashCanonical(canonicalSource: string): string {
  const looksComplete = extractFunctionBody(canonicalSource, 'looksComplete')
  const hasRemainingMarker = extractFunctionBody(canonicalSource, 'hasRemainingWorkMarker')
  const combined = `${hasRemainingMarker}\n---\n${looksComplete}`
  return crypto.createHash('sha256').update(combined).digest('hex')
}

// Extract the regex literal arrays from the inline copy so we can compare semantics directly.
function extractInlineRegexArrays(inlineSource: string): { remaining: string[]; signals: string[] } {
  const fnBody = extractFunctionBody(inlineSource, 'looksCompleteInline')
  const remaining = extractArrayLiterals(fnBody, 'remaining')
  const signals = extractArrayLiterals(fnBody, 'signals')
  return { remaining, signals }
}

function extractCanonicalRegexArrays(canonicalSource: string): { remaining: string[]; signals: string[] } {
  const markerBody = extractFunctionBody(canonicalSource, 'hasRemainingWorkMarker')
  const looksBody = extractFunctionBody(canonicalSource, 'looksComplete')
  const remaining = extractArrayLiterals(markerBody, 'markers')
  const signals = extractArrayLiterals(looksBody, 'signals')
  return { remaining, signals }
}

function extractArrayLiterals(body: string, varName: string): string[] {
  const re = new RegExp(`const\\s+${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]`, 'm')
  const match = re.exec(body)
  if (!match || !match[1]) throw new Error(`array ${varName} not found in body`)
  return match[1]
    .split('\n')
    .map((line) => line.trim().replace(/,$/, ''))
    .filter((line) => line.length > 0)
}

describe('looksCompleteInline drift guard', () => {
  it('inline regex arrays in harness-validate.ts match canonical skills/init/lib/orphan-plan-detector.ts', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8')
    const inline = await fs.readFile(inlinePath, 'utf8')

    const inlineArrays = extractInlineRegexArrays(inline)
    const canonicalArrays = extractCanonicalRegexArrays(canonical)

    expect(inlineArrays.signals).toEqual(canonicalArrays.signals)
    expect(inlineArrays.remaining).toEqual(canonicalArrays.remaining)
  })

  it('embedded sha256 literal matches the current canonical function bodies', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8')
    const inline = await fs.readFile(inlinePath, 'utf8')

    const actualHash = hashCanonical(canonical)
    expect(actualHash).toBe(EXPECTED_CANONICAL_HASH)

    // The inline comment must also pin the same hash; if it drifts the comment is misleading.
    expect(inline).toContain(`sha256:${EXPECTED_CANONICAL_HASH}`)
  })
})
