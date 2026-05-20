import { AbortError } from './abort-error'
import { readManifest } from '../manifest-writer'
import { compareSemver } from '../semver-compare'
import type { Step } from './types'

export type ReentryMode = 'greenfield' | 're-populate' | 'abort'

const ABORT_MESSAGE =
  'Projeto ja inicializado na versao atual. Use /sync para atualizar templates ou /update se houve bump de versao do plugin.'

// 2026-05-20 (Luiz/dev): D6/AR-04 do PRD knowledge-path-cutover — constante inline (nao constants.ts
// central — padrao do arquivo e usar const local, ver ABORT_MESSAGE acima). Projetos com manifest
// < 6.6.0 entram em re-populate: precisam do refresh do path novo knowledge/.
const KNOWLEDGE_PATH_CUTOVER_VERSION = '6.6.0'

/**
 * Step gate de reentrada (PRD MH-07, CA-04, CA-09, DQ4).
 * - Sem manifest -> greenfield (prossegue).
 * - Manifest com pluginVersion >= 6.6.0 -> AbortError com mensagem do PRD.
 * - Manifest com pluginVersion < 6.6.0 (ou ausente) -> sinaliza ctx.flags.__reentryMode='re-populate'.
 */
export const reentryGuardStep: Step = {
  id: '00_2-reentry-guard',
  async run(ctx) {
    const manifest = await readManifest(ctx.cwd)
    const flags = ctx.flags as Record<string, string | boolean>

    if (manifest === null) {
      flags['__reentryMode'] = 'greenfield'
      return { mutated: false, summary: 'greenfield: no manifest at .claude/.anti-vibe-manifest.json' }
    }

    // pluginVersion is typed as required, but older manifests may lack it at runtime
    const rawVersion = (manifest as Record<string, unknown>)['pluginVersion']
    const manifestVersion =
      typeof rawVersion === 'string' && rawVersion.length > 0 ? rawVersion : null

    if (manifestVersion === null) {
      flags['__reentryMode'] = 're-populate'
      return {
        mutated: false,
        summary: 're-populate: manifest sem pluginVersion -> tratar como < 6.5.0',
      }
    }

    const cmp = compareSemver(manifestVersion, KNOWLEDGE_PATH_CUTOVER_VERSION)

    if (cmp >= 0) {
      throw new AbortError({ code: 0, reason: ABORT_MESSAGE })
    }

    flags['__reentryMode'] = 're-populate'
    return {
      mutated: false,
      summary: `re-populate: manifest=${manifestVersion} < ${KNOWLEDGE_PATH_CUTOVER_VERSION}`,
    }
  },
}
