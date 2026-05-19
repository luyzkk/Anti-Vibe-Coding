// 2026-05-18 (Luiz/dev): helper de validacao de frontmatter de atomos. Suporta campo opcional rails_versions (array de ranges semver-style). RF4 + CA-10.

import { readFileSync } from 'node:fs'

export interface FrontmatterValidationResult {
  valid: boolean
  errors: string[]
}

const REQUIRED_FIELDS = ['topic', 'stack', 'layer', 'sources', 'tier', 'triggers', 'related_skills', 'updated']

const SEMVER_RANGE = /^(>=|<=|>|<|=|~>)\s*\d+\.\d+(\.\d+)?$/

function extractFrontmatter(content: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  return match ? (match[1] ?? null) : null
}

function hasField(frontmatter: string, field: string): boolean {
  return new RegExp(`^${field}:`, 'm').test(frontmatter)
}

function parseRailsVersionsField(frontmatter: string): { isArray: boolean; items: string[] } {
  const lineMatch = frontmatter.match(/^rails_versions:\s*(.+)$/m)
  if (!lineMatch || lineMatch[1] === undefined) return { isArray: false, items: [] }

  const raw = lineMatch[1].trim()

  // Must be an inline array starting with [
  if (!raw.startsWith('[')) {
    return { isArray: false, items: [] }
  }

  // Empty array check
  if (raw === '[]') {
    return { isArray: true, items: [] }
  }

  // Extract items from inline array like ['>=7.1'] or [">=8.0", "<=9.0"]
  const itemsMatch = raw.match(/\[([^\]]*)\]/)
  if (!itemsMatch || itemsMatch[1] === undefined) return { isArray: false, items: [] }

  const inner = itemsMatch[1]
  const items = inner
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter((s) => s.length > 0)

  return { isArray: true, items }
}

export function validateAtomFrontmatter(filePath: string): FrontmatterValidationResult {
  const content = readFileSync(filePath, 'utf-8')
  const errors: string[] = []

  const frontmatter = extractFrontmatter(content)
  if (!frontmatter) {
    return { valid: false, errors: ['missing frontmatter block'] }
  }

  for (const field of REQUIRED_FIELDS) {
    if (!hasField(frontmatter, field)) {
      errors.push(`missing required field: ${field}`)
    }
  }

  // Validate rails_versions if present
  if (hasField(frontmatter, 'rails_versions')) {
    const { isArray, items } = parseRailsVersionsField(frontmatter)

    if (!isArray) {
      errors.push('rails_versions must be an array, not a string')
    } else if (items.length === 0) {
      errors.push('rails_versions array must not be empty')
    } else {
      for (const item of items) {
        if (!SEMVER_RANGE.test(item)) {
          errors.push(`rails_versions item "${item}" does not match semver range format (e.g. >=7.1)`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
