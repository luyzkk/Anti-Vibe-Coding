import { AbortError } from './abort-error'
import { readManifest } from '../manifest-writer'
import { compareSemver } from '../semver-compare'
import type { Step } from './types'

export type ReentryMode = 'greenfield' | 're-populate' | 'abort'

const ABORT_MESSAGE =
  'Projeto ja inicializado na versao atual. Use /sync para atualizar templates ou /update se houve bump de versao do plugin.'

/**
 * Step gate de reentrada (PRD MH-07, CA-04, CA-09, DQ4).
 * - Sem manifest -> greenfield (prossegue).
 * - Manifest com pluginVersion >= 6.5.0 -> AbortError com mensagem do PRD.
 * - Manifest com pluginVersion < 6.5.0 (ou ausente) -> sinaliza ctx.flags.__reentryMode='re-populate'.
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

    const cmp = compareSemver(manifestVersion, '6.5.0')

    if (cmp >= 0) {
      throw new AbortError({ code: 0, reason: ABORT_MESSAGE })
    }

    flags['__reentryMode'] = 're-populate'
    return {
      mutated: false,
      summary: `re-populate: manifest=${manifestVersion} < 6.5.0`,
    }
  },
}
