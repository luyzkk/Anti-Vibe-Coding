import { cpSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '.')

export type FixtureName = 'clean-arch' | 'mvc-flat' | 'vertical-slice' | 'nextjs' | 'unknown'

export function buildFixture(name: FixtureName): string {
  const tmp = mkdtempSync(join(tmpdir(), `arch-e2e-${name}-`))
  cpSync(join(FIXTURES_DIR, name), tmp, { recursive: true })
  return tmp
}
