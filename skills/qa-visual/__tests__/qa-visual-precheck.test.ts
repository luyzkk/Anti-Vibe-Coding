// 2026-05-14 (Luiz/dev): pre-check via tool-registry-inspector — RF-MH-04, CA-06
import { describe, it, expect } from 'bun:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const SKILL_PATH = path.resolve(__dirname, '..', 'SKILL.md')

describe('qa-visual SKILL.md — pre-check refactor', () => {
  it('preserves allowed-tools frontmatter with Playwright MCP tools', async () => {
    const raw = await readFile(SKILL_PATH, 'utf-8')
    const { data } = matter(raw)
    const allowed = typeof data['allowed-tools'] === 'string' ? data['allowed-tools'] : ''
    expect(allowed).toContain('mcp__plugin_playwright_playwright__')
  })

  it('contains pre-check block referencing inspectToolRegistry', async () => {
    const raw = await readFile(SKILL_PATH, 'utf-8')
    expect(raw).toContain('inspectToolRegistry')
    expect(raw).toContain('Playwright MCP nao esta instalado')
  })
})
