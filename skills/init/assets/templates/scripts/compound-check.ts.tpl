#!/usr/bin/env bun
// 2026-05-11 (Luiz/dev): compound-check minimal — fase-01 do plano04 v6.0.0
// Versao esqueleto: coleta arquivos e reporta unreadable. Frontmatter + secoes (CA-29)
// entram em fase-02 do mesmo plano.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

type Failure = { rule: string; file: string; message: string }

async function main(): Promise<void> {
  const failures: Failure[] = []

  const files = await listCompoundFilesLocal(root)
  await ensureReadable(files, failures)

  if (failures.length > 0) {
    console.error('Compound check failed:')
    for (const f of failures) {
      console.error(`  [${f.rule}] ${f.file}: ${f.message}`)
    }
    process.exit(1)
  }

  console.log(`Compound check passed (${files.length} compound notes validated).`)
  process.exit(0)
}

// Helper inlined no template (sem dependencia de `lib/` no projeto-alvo).
// O `lib/compound-files-collector.ts` no plugin e o gerador; o `.tpl` carrega copia inline.
async function listCompoundFilesLocal(rootDir: string): Promise<string[]> {
  const baseDir = path.join(rootDir, 'docs', 'compound')
  return collectMd(baseDir)
}

async function collectMd(dir: string): Promise<string[]> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const skip = new Set(['README.md', 'index.md'])
  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        if (entry.name === '_archived') return []
        return collectMd(path.join(dir, entry.name))
      }
      if (!entry.isFile() || !entry.name.endsWith('.md') || skip.has(entry.name)) return []
      return [path.join(dir, entry.name)]
    }),
  )
  return nested.flat()
}

async function ensureReadable(files: ReadonlyArray<string>, failures: Failure[]): Promise<void> {
  // Paralelizar — G1 do Plano 04 (perf <2s em 100 docs).
  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.readFile(file, 'utf8')
      } catch (err) {
        failures.push({
          rule: 'readable',
          file: path.relative(root, file),
          message: `cannot read file (${(err as Error).message})`,
        })
      }
    }),
  )
}

await main()
