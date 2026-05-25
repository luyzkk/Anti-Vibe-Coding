// skills/init/lib/steps/11-write-anti-vibe-manifest.ts
// 2026-05-25 (Luiz/dev): Step 11 — escreve .claude/.anti-vibe-manifest.json
// com pluginVersion atual. Fix para bug do registry v7 onde o arquivo nunca
// era atualizado (Plano 01 deletou os steps que faziam o write; Plano 02-05
// nao recriaram). Consequencia: /sync reportava "desatualizado" eternamente.
//
// Schema: AntiVibeManifest minimo — { pluginVersion, initMode: 'fresh',
// installedAt, files: {} }. Migration plans nao sao mais escritos aqui
// (legacy-manifest.json em Step 4 cobre detection de v5 legado).
//
// Backup v5.x: se manifest existente tem pluginVersion '5.x', copia para
// .anti-vibe-manifest.json.backup-v5.<ISO> ANTES de sobrescrever — alinhado
// com convencao detectada por detect-v5-legacy.ts:76.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { readPluginVersion } from '../read-plugin-version'
import { writeManifest, readManifest, type AntiVibeManifest } from '../manifest-writer'
import type { Step } from './types'

const MANIFEST_REL = '.claude/.anti-vibe-manifest.json'

export const writeAntiVibeManifestStep: Step = {
  id: 'write-anti-vibe-manifest',

  async run(ctx) {
    const pluginVersion = await readPluginVersion()
    const existing = await readManifest(ctx.cwd)

    let backedUp = false
    if (existing !== null && existing.pluginVersion.startsWith('5.')) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupRel = `${MANIFEST_REL}.backup-v5.${stamp}`
      const backupAbs = path.join(ctx.cwd, backupRel)
      const sourceAbs = path.join(ctx.cwd, MANIFEST_REL)
      await fs.copyFile(sourceAbs, backupAbs)
      backedUp = true
    }

    const manifest: AntiVibeManifest = {
      pluginVersion,
      initMode: 'fresh',
      installedAt: new Date().toISOString(),
      files: {},
    }
    await writeManifest(ctx.cwd, manifest)

    const summary = backedUp
      ? `manifest written (pluginVersion=${pluginVersion}); v5.x backup created`
      : `manifest written (pluginVersion=${pluginVersion})`
    return { mutated: true, summary }
  },
}
