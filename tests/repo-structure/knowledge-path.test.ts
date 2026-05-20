// 2026-05-20 (Luiz/dev): D2 do PRD knowledge-path-cutover — protection test garante que
// git mv nao seja revertido acidentalmente. Usa fs.access async (nao existsSync — risco de
// cache; ver PRD Riscos). Rodar: bun test tests/repo-structure/knowledge-path.test.ts

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

// Repo root: dois niveis acima de tests/repo-structure/
const REPO_ROOT = path.resolve(import.meta.dir, '..', '..')

async function pathExists(p: string): Promise<boolean> {
  return fs.access(p).then(() => true).catch(() => false)
}

describe('knowledge path cutover (D2)', () => {
  it('knowledge/ subdir exists at repo root with at least one stack INDEX.md', async () => {
    const knowledgeDir = path.join(REPO_ROOT, 'knowledge')
    const exists = await pathExists(knowledgeDir)
    expect(exists, `knowledge/ deve existir em ${knowledgeDir}`).toBe(true)

    // Pelo menos uma das stacks canonicas deve ter INDEX.md
    const nodejsIndex = path.join(knowledgeDir, 'nodejs-typescript', 'INDEX.md')
    const railsIndex = path.join(knowledgeDir, 'rails', 'INDEX.md')
    const hasNodejs = await pathExists(nodejsIndex)
    const hasRails = await pathExists(railsIndex)
    expect(
      hasNodejs || hasRails,
      `Pelo menos uma stack deve ter INDEX.md. nodejs-typescript: ${hasNodejs}, rails: ${hasRails}`
    ).toBe(true)
  })

  it('docs/knowledge/ does NOT exist (confirma cutover puro — nao dual-path)', async () => {
    const oldPath = path.join(REPO_ROOT, 'docs', 'knowledge')
    const exists = await pathExists(oldPath)
    expect(exists, `docs/knowledge/ nao deve mais existir pos-cutover. Path: ${oldPath}`).toBe(false)
  })
})
