// tests/e2e/__fixtures__/v7-populate-helpers.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-05 — helper para e2e dos 3 fixtures.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export async function copyFixtureToTmp(fixtureName: string): Promise<string> {
  const src = path.join(import.meta.dir, fixtureName)
  const dst = await fs.mkdtemp(path.join(os.tmpdir(), `avc-e2e-${fixtureName}-`))
  await copyRecursive(src, dst)
  return dst
}

async function copyRecursive(src: string, dst: string): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.gitkeep') continue
    const s = path.join(src, entry.name)
    const d = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      await fs.mkdir(d, { recursive: true })
      await copyRecursive(s, d)
    } else {
      await fs.copyFile(s, d)
    }
  }
}
